"""planner routes: recommendations, plans, adjustment, organization impact counts.

501 until #6 (recommendations), #7·#8 (plans) and #9 (impact, adjustment) (AD-3).
"""

from fastapi import APIRouter

from app.core.authz import OrgStaff, Parent
from app.core.errors import error_responses, not_implemented
from app.schemas.catalog import OrgImpact
from app.schemas.planner import (
    Adjustment,
    Plan,
    PlanDraftRequest,
    PlanUpdate,
    RecommendationList,
    RecommendationRequest,
)

router = APIRouter(tags=["planner"])
OWNED = error_responses(401, 403, 404, 501)


@router.post("/recommendations", responses=OWNED)
async def recommend_programs(body: RecommendationRequest, session: Parent) -> RecommendationList:
    raise not_implemented()


@router.post("/plans/draft", responses=error_responses(401, 403, 404, 422, 501))
async def create_plan_draft(body: PlanDraftRequest, session: Parent) -> Plan:
    raise not_implemented()


@router.get("/plans", responses=error_responses(401, 403, 501))
async def list_plans(session: Parent, child_id: str | None = None) -> list[Plan]:
    raise not_implemented()


@router.get("/plans/{plan_id}", responses=OWNED)
async def get_plan(plan_id: str, session: Parent) -> Plan:
    raise not_implemented()


@router.put("/plans/{plan_id}", responses=OWNED)
async def update_plan(plan_id: str, body: PlanUpdate, session: Parent) -> Plan:
    raise not_implemented()


@router.post("/plans/{plan_id}/confirm", responses=error_responses(401, 403, 404, 409, 501))
async def confirm_plan(plan_id: str, session: Parent) -> Plan:
    raise not_implemented()


@router.get("/plans/{plan_id}/adjustment", responses=error_responses(401, 403, 404, 422, 501))
async def get_adjustment(plan_id: str, session: Parent) -> Adjustment:
    raise not_implemented()


@router.post(
    "/plans/{plan_id}/adjustment/accept",
    responses=error_responses(401, 403, 404, 409, 422, 501),
)
async def accept_adjustment(plan_id: str, session: Parent) -> Plan:
    raise not_implemented()


@router.post("/plans/{plan_id}/adjustment/reject", responses=OWNED)
async def reject_adjustment(plan_id: str, session: Parent) -> Plan:
    raise not_implemented()


@router.get("/org/impact", responses=error_responses(401, 403, 501))
async def get_org_impact(
    session: OrgStaff, program_id: str | None = None, grade: int | None = None
) -> OrgImpact:
    raise not_implemented()
