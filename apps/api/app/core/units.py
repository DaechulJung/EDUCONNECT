"""Unit conversion between DB integers and API strings (AD-6). Convert only here.

DB: minutes from midnight, weekday 0=mon..6=sun, won, grade 1~6 elementary / 7~9 middle.
API: "HH:MM", "mon".."sun", won, grade.
"""

import re
from typing import Annotated

from pydantic import StringConstraints

from app.core.vocab import DOW_CODES

HHMM_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"
Hhmm = Annotated[str, StringConstraints(pattern=HHMM_PATTERN)]
_HHMM = re.compile(HHMM_PATTERN)


def hhmm_to_min(value: str) -> int:
    if not _HHMM.match(value):
        raise ValueError(f"invalid time: {value!r}")
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def min_to_hhmm(value: int) -> str:
    if not 0 <= value < 24 * 60:
        raise ValueError(f"minutes out of range: {value}")
    return f"{value // 60:02d}:{value % 60:02d}"


def dow_to_int(code: str) -> int:
    return DOW_CODES.index(code)


def int_to_dow(value: int) -> str:
    return DOW_CODES[value]


def dows_to_ints(codes: list[str]) -> list[int]:
    return sorted({dow_to_int(code) for code in codes})


def ints_to_dows(values: list[int]) -> list[str]:
    return [int_to_dow(value) for value in sorted(values)]


def grade_label(grade: int) -> str:
    if 1 <= grade <= 6:
        return f"초{grade}"
    if 7 <= grade <= 9:
        return f"중{grade - 6}"
    raise ValueError(f"grade out of range: {grade}")


def dismissal_to_db(value: dict[str, str]) -> dict[str, int]:
    """{"wed": "13:40"} -> {"2": 820}; JSON object keys are strings."""
    return {str(dow_to_int(dow)): hhmm_to_min(time) for dow, time in value.items()}


def dismissal_to_api(value: dict[str, int] | None) -> dict[str, str]:
    return {int_to_dow(int(dow)): min_to_hhmm(time) for dow, time in sorted((value or {}).items())}
