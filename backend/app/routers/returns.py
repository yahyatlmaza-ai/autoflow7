"""Returns — the return/refund workflow per order."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import Order, ReturnItem, Tenant

router = APIRouter(prefix="/returns", tags=["returns"])


class ReturnIn(BaseModel):
    order_id: int
    reason: str = Field(default="", max_length=300)
    status: str = Field(default="requested", pattern="^(requested|received|restocked|refunded|rejected)$")
    notes: str = Field(default="", max_length=1000)


def _serialize(r: ReturnItem) -> dict:
    return {
        "id": r.id,
        "order_id": r.order_id,
        "reason": r.reason,
        "status": r.status,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def _get_owned(session: Session, tenant: Tenant, return_id: int) -> ReturnItem:
    r = session.get(ReturnItem, return_id)
    if r is None or r.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Return not found", status_code=404)
    return r


@router.get("")
def list_returns(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    stmt = select(ReturnItem).where(ReturnItem.tenant_id == tenant.id)
    return [_serialize(r) for r in session.exec(stmt).all()]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_return(
    body: ReturnIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    order = session.get(Order, body.order_id)
    if order is None or order.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Order not found", status_code=404)
    r = ReturnItem(
        tenant_id=tenant.id,
        order_id=body.order_id,
        reason=body.reason,
        status=body.status,
        notes=body.notes,
    )
    session.add(r)
    session.commit()
    session.refresh(r)
    return _serialize(r)


@router.put("/{return_id}")
def update_return(
    return_id: int,
    body: ReturnIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    r = _get_owned(session, tenant, return_id)
    r.reason = body.reason
    r.status = body.status
    r.notes = body.notes
    r.updated_at = datetime.now(timezone.utc)
    session.add(r)
    session.commit()
    session.refresh(r)
    return _serialize(r)


@router.delete("/{return_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_return(
    return_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    r = _get_owned(session, tenant, return_id)
    session.delete(r)
    session.commit()


@router.get("/stats")
def return_stats(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> dict:
    all_returns = session.exec(
        select(ReturnItem).where(ReturnItem.tenant_id == tenant.id)
    ).all()
    total_orders = session.exec(select(Order).where(Order.tenant_id == tenant.id)).all()
    total = len(all_returns)
    by_status: dict[str, int] = {}
    for r in all_returns:
        by_status[r.status] = by_status.get(r.status, 0) + 1
    rate = (total / len(total_orders)) if total_orders else 0.0
    return {"total": total, "by_status": by_status, "return_rate": round(rate, 4)}
