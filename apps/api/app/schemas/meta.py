"""meta response model (planner module, REQ-12)."""

from typing import Literal

from pydantic import BaseModel


class Meta(BaseModel):
    service_name: str  # EDUCONNECT
    subtitle: str  # 모두의 AI 교육 에이전트
    modu_ai_status: Literal["mock"]
    ai_provider_label: str  # Azure OpenAI(국내 리전)
