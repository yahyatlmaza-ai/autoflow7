"""Call Center module — reusable confirmation scripts + per-order call logs.

Call logs reuse the existing `confirmation_attempts` table (so the Orders
timeline and Team confirmation counts stay consistent), but we expose them
under a call-center-specific endpoint so the UI doesn't need to think about
TeamMember relationships for quick dial flows.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, get_current_user, require_active_subscription
from ..errors import AppError
from ..models import (
    CallScript,
    ConfirmationAttempt,
    Customer,
    Notification,
    Order,
    OrderStatusHistory,
    Tenant,
    User,
)

router = APIRouter(prefix="/callcenter", tags=["callcenter"])


# --- Scripts ---------------------------------------------------------------


class ScriptIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    body: str = Field(default="", max_length=4000)
    active: bool = True


def _serialize_script(s: CallScript) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "body": s.body,
        "active": s.active,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _get_script(session: Session, tenant: Tenant, sid: int) -> CallScript:
    s = session.get(CallScript, sid)
    if s is None or s.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Script not found", status_code=404)
    return s


@router.get("/scripts")
def list_scripts(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    rows = session.exec(select(CallScript).where(CallScript.tenant_id == tenant.id)).all()
    return [_serialize_script(s) for s in rows]


@router.post("/scripts", status_code=status.HTTP_201_CREATED)
def create_script(
    body: ScriptIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    s = CallScript(tenant_id=tenant.id, **body.model_dump())
    session.add(s)
    session.commit()
    session.refresh(s)
    return _serialize_script(s)


@router.put("/scripts/{script_id}")
def update_script(
    script_id: int,
    body: ScriptIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    s = _get_script(session, tenant, script_id)
    for k, v in body.model_dump().items():
        setattr(s, k, v)
    session.add(s)
    session.commit()
    session.refresh(s)
    return _serialize_script(s)


@router.delete("/scripts/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_script(
    script_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    s = _get_script(session, tenant, script_id)
    session.delete(s)
    session.commit()


# --- Queue (pending orders that need a call) -------------------------------


@router.get("/queue")
def list_queue(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    """Pending orders that still need a confirmation call, newest first."""
    orders = session.exec(
        select(Order)
        .where((Order.tenant_id == tenant.id) & (Order.status == "pending"))
        .order_by(Order.created_at.desc())  # type: ignore[attr-defined]
    ).all()
    customer_ids = {o.customer_id for o in orders if o.customer_id}
    customers = (
        session.exec(select(Customer).where(Customer.id.in_(customer_ids))).all()  # type: ignore[attr-defined]
        if customer_ids
        else []
    )
    c_by_id = {c.id: c for c in customers if c.tenant_id == tenant.id}
    out: list[dict] = []
    for o in orders:
        c = c_by_id.get(o.customer_id) if o.customer_id else None
        out.append({
            "order_id": o.id,
            "reference": o.reference,
            "product_name": o.product_name,
            "quantity": o.quantity,
            "price": o.price,
            "currency": o.currency,
            "customer_name": c.name if c else "",
            "customer_phone": c.phone if c else "",
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })
    return out


# --- Call log -------------------------------------------------------------


class CallLogIn(BaseModel):
    order_id: int
    result: str = Field(pattern="^(no_answer|confirmed|rejected|callback|wrong_number)$")
    note: str = Field(default="", max_length=500)


@router.post("/log", status_code=status.HTTP_201_CREATED)
def log_call(
    body: CallLogIn,
    tenant: Tenant = Depends(require_active_subscription),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    order = session.get(Order, body.order_id)
    if order is None or order.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Order not found", status_code=404)
    attempt = ConfirmationAttempt(
        tenant_id=tenant.id,
        order_id=body.order_id,
        team_member_id=None,
        result=body.result,
        note=body.note,
    )
    session.add(attempt)
    # When the caller confirms, mirror the state transition so Orders timeline
    # + bell stay in sync with a manual Confirm click.
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
            note=body.note or "Confirmed from call center",
        ))
        session.add(Notification(
            tenant_id=tenant.id,
            user_id=user.id,
            kind="order_status",
            title=f"Order {order.reference}: {from_status} → confirmed",
            body=body.note or "Confirmed from call center",
            related_order_id=order.id,
        ))
    session.commit()
    session.refresh(attempt)
    return {
        "id": attempt.id,
        "order_id": attempt.order_id,
        "result": attempt.result,
        "note": attempt.note,
        "created_at": attempt.created_at.isoformat() if attempt.created_at else None,
    }


@router.get("/log")
def list_log(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    order_id: int | None = None,
) -> list[dict]:
    stmt = select(ConfirmationAttempt).where(ConfirmationAttempt.tenant_id == tenant.id)
    if order_id is not None:
        stmt = stmt.where(ConfirmationAttempt.order_id == order_id)
    stmt = stmt.order_by(ConfirmationAttempt.created_at.desc())  # type: ignore[attr-defined]
    return [
        {
            "id": a.id,
            "order_id": a.order_id,
            "result": a.result,
            "note": a.note,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in session.exec(stmt).all()
    ]
