"""Service meta for the header (planner module, REQ-12).

모두의 AI has no confirmed public API, so its status is the mock adapter boundary (arch AD-14):
when a real path exists, add a provider under `ai/` and report its status here. Fixed text only:
no setting (endpoint, region, deployment) is ever read into this response (REQ-10).
"""

from fastapi import APIRouter

from app.schemas.meta import Meta

router = APIRouter(tags=["meta"])

META = Meta(
    service_name="EDUCONNECT",
    subtitle="모두의 AI 교육 에이전트",
    modu_ai_status="mock",
    ai_provider_label="Azure OpenAI(국내 리전)",
)


@router.get("/meta")
async def get_meta() -> Meta:
    return META
