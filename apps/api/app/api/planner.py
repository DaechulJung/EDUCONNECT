"""planner routes: recommendations, plans, adjustment, organization impact counts.

Recommendations are #6, draft create·read #7, plan list·edit·confirm #8; impact and adjustment
are 501 until #9 (AD-3).
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import OrgStaff, Parent, deny_not_found
from app.core.db import get_session
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
from app.services.planner import inputs, plans, recommend

router = APIRouter(tags=["planner"])
OWNED = error_responses(401, 403, 404, 501)
Db = Annotated[AsyncSession, Depends(get_session)]


@router.post("/recommendations", responses=error_responses(401, 403, 404, 422))
async def recommend_programs(
    body: RecommendationRequest, session: Parent, db: Db
) -> RecommendationList:
    try:
        return await recommend.recommend(db, session.account_id, body.child_id)
    except inputs.NotOwned:
        await deny_not_found(session, "/api/recommendations")


@router.post("/plans/draft", responses=error_responses(401, 403, 404, 422))
async def create_plan_draft(body: PlanDraftRequest, session: Parent, db: Db) -> Plan:
    try:
        return await plans.create_draft(db, session.account_id, body.child_id)
    except inputs.NotOwned:
        await deny_not_found(session, "/api/plans/draft")


@router.get("/plans", responses=error_responses(401, 403, 404))
async def list_plans(session: Parent, db: Db, child_id: str | None = None) -> list[Plan]:
    try:
        return await plans.list_plans(db, session.account_id, child_id)
    except inputs.NotOwned:
        await deny_not_found(session, f"/api/plans?child_id={child_id}")


@router.get("/plans/{plan_id}", responses=error_responses(401, 403, 404))
async def get_plan(plan_id: str, session: Parent, db: Db) -> Plan:
    try:
        return await plans.get(db, session.account_id, plan_id)
    except plans.PlanNotFound:
        await deny_not_found(session, f"/api/plans/{plan_id}")


@router.put("/plans/{plan_id}", responses=error_responses(401, 403, 404, 409, 422))
async def update_plan(plan_id: str, body: PlanUpdate, session: Parent, db: Db) -> Plan:
    try:
        return await plans.update_draft(db, session.account_id, plan_id, body.program_ids)
    except plans.PlanNotFound:
        await deny_not_found(session, f"/api/plans/{plan_id}")


@router.post("/plans/{plan_id}/confirm", responses=error_responses(401, 403, 404, 409))
async def confirm_plan(plan_id: str, session: Parent, db: Db) -> Plan:
    try:
        return await plans.confirm(db, session.account_id, plan_id)
    except plans.PlanNotFound:
        await deny_not_found(session, f"/api/plans/{plan_id}/confirm")


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
