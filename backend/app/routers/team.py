"""Team members + confirmation attempts archive."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, get_current_user, require_active_subscription
from ..errors import AppError
from ..models import (
    ConfirmationAttempt,
    Notification,
    Order,
    OrderStatusHistory,
    TeamMember,
    Tenant,
    User,
)

router = APIRouter(prefix="/team", tags=["team"])


class TeamMemberIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    role: str = Field(default="confirmer", max_length=40)
    phone: str = Field(default="", max_length=32)
    email: str = Field(default="", max_length=120)
    pay_per_confirmed: float = Field(default=0.0, ge=0)
    active: bool = True


class ConfirmationIn(BaseModel):
    order_id: int
    team_member_id: int | None = None
    result: str = Field(pattern="^(no_answer|confirmed|rejected|callback|wrong_number)$")
    note: str = Field(default="", max_length=500)


def _serialize_member(m: TeamMember, confirmed: int = 0) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "role": m.role,
        "phone": m.phone,
        "email": m.email,
        "pay_per_confirmed": m.pay_per_confirmed,
        "active": m.active,
        "confirmed_count": confirmed,
        "payout_due": round(confirmed * m.pay_per_confirmed, 2),
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _serialize_attempt(a: ConfirmationAttempt) -> dict:
    return {
        "id": a.id,
        "order_id": a.order_id,
        "team_member_id": a.team_member_id,
        "result": a.result,
        "note": a.note,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _get_member(session: Session, tenant: Tenant, member_id: int) -> TeamMember:
    m = session.get(TeamMember, member_id)
    if m is None or m.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Team member not found", status_code=404)
    return m


@router.get("")
def list_members(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    members = session.exec(
        select(TeamMember).where(TeamMember.tenant_id == tenant.id)
    ).all()
    attempts = session.exec(
        select(ConfirmationAttempt).where(ConfirmationAttempt.tenant_id == tenant.id)
    ).all()
    confirmed_by: dict[int, int] = {}
    for a in attempts:
        if a.result == "confirmed" and a.team_member_id:
            confirmed_by[a.team_member_id] = confirmed_by.get(a.team_member_id, 0) + 1
    return [_serialize_member(m, confirmed_by.get(m.id or 0, 0)) for m in members]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_member(
    body: TeamMemberIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    m = TeamMember(tenant_id=tenant.id, **body.model_dump())
    session.add(m)
    session.commit()
    session.refresh(m)
    return _serialize_member(m, 0)


@router.put("/{member_id}")
def update_member(
    member_id: int,
    body: TeamMemberIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    m = _get_member(session, tenant, member_id)
    for k, v in body.model_dump().items():
        setattr(m, k, v)
    session.add(m)
    session.commit()
    session.refresh(m)
    return _serialize_member(m, 0)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    member_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    m = _get_member(session, tenant, member_id)
    session.delete(m)
    session.commit()


# ---------------------------------------------------------------------------
# Confirmation attempts archive
# ---------------------------------------------------------------------------


@router.get("/confirmations")
def list_confirmations(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    order_id: int | None = None,
) -> list[dict]:
    stmt = select(ConfirmationAttempt).where(
        ConfirmationAttempt.tenant_id == tenant.id
    )
    if order_id is not None:
        stmt = stmt.where(ConfirmationAttempt.order_id == order_id)
    stmt = stmt.order_by(ConfirmationAttempt.created_at.desc())  # type: ignore[attr-defined]
    return [_serialize_attempt(a) for a in session.exec(stmt).all()]


@router.post("/confirmations", status_code=status.HTTP_201_CREATED)
def record_confirmation(
    body: ConfirmationIn,
    tenant: Tenant = Depends(require_active_subscription),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    order = session.get(Order, body.order_id)
    if order is None or order.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Order not found", status_code=404)
    if body.team_member_id is not None:
        _get_member(session, tenant, body.team_member_id)
    a = ConfirmationAttempt(
        tenant_id=tenant.id,
        order_id=body.order_id,
        team_member_id=body.team_member_id,
        result=body.result,
        note=body.note,
    )
    session.add(a)
    # Auto-confirm the order if the attempt marks it so. We mirror the side
    # effects of orders._transition inline here (status history + notification
    # + updated_at) so the timeline + notifications bell stay consistent with
    # a manual confirmation. Using the helper directly would create a hard
    # cross-router import cycle.
    if body.result == "confirmed" and order.status == "pending":
        from_status = order.status
        order.status = "confirmed"
        order.updated_at = datetime.now(timezone.utc)
        session.add(order)
        session.add(OrderStatusHistory(
            tenant_id=tenant.id,
            order_id=order.id,
            from_status=from_status,
            to_status="confirmed",
            changed_by_user_id=user.id,
            note=body.note or "Auto-confirmed from confirmation call",
        ))
        session.add(Notification(
            tenant_id=tenant.id,
            user_id=user.id,
            kind="order_status",
            title=f"Order {order.reference}: {from_status} → confirmed",
            body=body.note or "Auto-confirmed from confirmation call",
            related_order_id=order.id,
        ))
    session.commit()
    session.refresh(a)
    return _serialize_attempt(a)
