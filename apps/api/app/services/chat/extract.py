"""Condition extraction from one chat sentence (REQ-05, AD-5, AD-10).

The LLM fills a strict schema; anything it cannot give (no key, error, schema mismatch, values
Pydantic rejects) falls back to `rule_extract`, which returns the same shape. Budget phrasing
is resolved here, never by the LLM: "N원 전후" → target N, cap N×1.1; "N원 안에서·이하" →
target = cap = N.
"""

import re
from typing import Any, Literal, get_args

from pydantic import BaseModel, ValidationError

from app.ai.port import LlmUnavailable, Message, Provider, complete_json
from app.core.vocab import DOW_CODES, DOW_LABELS, Density, Dow, ProgramType, normalize_subject

TASK = "extract_conditions"
_TYPE_CODES = list(get_args(ProgramType))
AROUND_CAP_RATE = 1.1

BudgetMode = Literal["around", "within"]

# Subjects the rules know even before any program is registered; catalog subjects are added.
BASE_SUBJECTS = ("국어", "영어", "수학", "과학", "사회", "코딩", "논술", "피아노", "미술", "체육")


class Extracted(BaseModel):
    """What one sentence says. None or empty = not mentioned (keep the saved value)."""

    subjects: list[str] = []
    budget_amount: int | None = None
    budget_mode: BudgetMode | None = None
    types: list[ProgramType] = []
    days: list[Dow] = []
    density: Density | None = None


SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["subjects", "budget_amount", "budget_mode", "types", "days", "density"],
    "properties": {
        "subjects": {"type": "array", "items": {"type": "string"}},
        "budget_amount": {"type": ["integer", "null"]},
        "budget_mode": {"type": ["string", "null"], "enum": ["around", "within", None]},
        "types": {"type": "array", "items": {"type": "string", "enum": _TYPE_CODES}},
        "days": {"type": "array", "items": {"type": "string", "enum": list(DOW_CODES)}},
        "density": {"type": ["string", "null"], "enum": ["tight", "normal", None]},
    },
}

SYSTEM_PROMPT = """너는 보호자의 한 문장에서 자녀 학원 조건을 뽑는다. JSON만 답한다.
- subjects: 말한 과목(한국어, 예: 영어, 수학). 알려진 과목: {subjects}
- budget_amount: 월 예산(원, 정수). "100만원"은 1000000. 말하지 않았으면 null
- budget_mode: "전후·정도·내외·쯤"이면 around, "안에서·이하·이내"면 within, 금액이 없으면 null
- types: academy(교과 학원), arts(예체능 학원), other(기타), after_school(방과후). 없으면 []
- days: mon~sun 중 말한 요일. 말하지 않았으면 []
- density: "촘촘하게"면 tight, "여유 있게·보통"이면 normal, 말하지 않았으면 null
자녀: {child}"""


def child_context(alias: str, grade_label: str, interests: list[str]) -> str:
    """Only alias, grade and interests go into the prompt (AD-10)."""
    hobbies = ", ".join(interests) if interests else "없음"
    return f"별칭 {alias}, 학년 {grade_label}, 관심사 {hobbies}"


def build_messages(text: str, child: str, known_subjects: list[str]) -> list[Message]:
    system = SYSTEM_PROMPT.format(subjects=", ".join(known_subjects), child=child)
    return [{"role": "system", "content": system}, {"role": "user", "content": text}]


async def extract(
    text: str,
    *,
    child: str,
    known_subjects: list[str],
    provider: Provider | None = None,
) -> tuple[Extracted, Literal["llm", "fallback"]]:
    messages = build_messages(text, child, known_subjects)
    try:
        value = await complete_json(TASK, SCHEMA, messages, provider=provider)
        extracted = Extracted.model_validate(value)
    except LlmUnavailable, ValidationError:
        return rule_extract(text, known_subjects), "fallback"
    if extracted.budget_amount is not None and extracted.budget_amount < 0:
        return rule_extract(text, known_subjects), "fallback"
    extracted.subjects = _unique(normalize_subject(s) for s in extracted.subjects if s.strip())
    return extracted, "llm"


# --- rule extraction -----------------------------------------------------------------------

_AMOUNT = re.compile(r"(\d[\d,]*(?:\.\d+)?)\s*(억|천만|백만|만)?\s*원")
_UNITS = {"억": 100_000_000, "천만": 10_000_000, "백만": 1_000_000, "만": 10_000, None: 1}
_AROUND = ("전후", "정도", "내외", "쯤", "안팎")
_WITHIN = ("안에서", "안으로", "이하", "이내", "넘지 않", "까지")
_TYPE_WORDS: tuple[tuple[str, ProgramType], ...] = (
    ("방과후", "after_school"),
    ("예체능", "arts"),
    ("교과", "academy"),
)
# a run of day letters that starts a word and ends before 요일·에·만 (월 100만원, 수학 are not days)
_DAY_RUN = re.compile(
    r"(?<![가-힣])[월화수목금토일](?:\s*[·,/]?\s*[월화수목금토일])*(?=\s*(?:요일|에|만|$))"
)
_LABEL_TO_DOW = {label: code for code, label in DOW_LABELS.items()}


def rule_extract(text: str, known_subjects: list[str]) -> Extracted:
    """Deterministic fallback: same input, same output (AC-05.5)."""
    return Extracted(
        subjects=[s for s in _unique(known_subjects) if s and s in text],
        **_budget(text),
        types=_unique(code for word, code in _TYPE_WORDS if word in text),
        days=_days(text),
        density=_density(text),
    )


def _budget(text: str) -> dict[str, Any]:
    match = _AMOUNT.search(text)
    if match is None:
        return {}
    amount = round(float(match.group(1).replace(",", "")) * _UNITS[match.group(2)])
    after = text[match.end() : match.end() + 12]
    if any(word in after for word in _WITHIN):
        mode: BudgetMode = "within"
    elif any(word in after for word in _AROUND):
        mode = "around"
    else:
        mode = "within"  # a bare amount is read as the most the parent wants to pay
    return {"budget_amount": amount, "budget_mode": mode}


def _days(text: str) -> list[Dow]:
    if "평일" in text:
        return list(DOW_CODES[:5])  # type: ignore[arg-type]
    if "주말" in text:
        return ["sat", "sun"]
    found: list[str] = []
    for match in _DAY_RUN.finditer(text):
        found += [_LABEL_TO_DOW[ch] for ch in match.group(0) if ch in _LABEL_TO_DOW]
    return sorted(set(found), key=DOW_CODES.index)  # type: ignore[return-value]


def _density(text: str) -> Density | None:
    if "촘촘" in text or "빡빡" in text:
        return "tight"
    if "여유" in text or "느슨" in text or "보통" in text:
        return "normal"
    return None


def budget_range(extracted: Extracted) -> tuple[int, int] | None:
    """(target, cap) or None when no amount was said."""
    if extracted.budget_amount is None:
        return None
    amount = extracted.budget_amount
    if extracted.budget_mode == "around":
        return amount, round(amount * AROUND_CAP_RATE)
    return amount, amount


def _unique[T](values) -> list[T]:
    return list(dict.fromkeys(values))
