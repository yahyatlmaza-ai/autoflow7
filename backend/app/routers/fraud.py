"""Fraud detection module — phone blacklist and per-customer fraud score.

Blacklisting here is advisory: entries are surfaced on the order-creation UI
and in the /score endpoint so the user can decide whether to reject. We do NOT
automatically reject blacklisted phones on the orders router yet because most
tenants want to review before blocking; a future hardening pass can flip a
per-tenant "auto_block_blacklisted" flag.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import Customer, Order, PhoneBlacklist, ReturnItem, Tenant

router = APIRouter(prefix="/fraud", tags=["fraud"])


class BlacklistIn(BaseModel):
    phone: str = Field(min_length=3, max_length=32)
    reason: str = Field(default="", max_length=200)


def _serialize_bl(b: PhoneBlacklist) -> dict:
    return {
        "id": b.id,
        "phone": b.phone,
        "reason": b.reason,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("/blacklist")
def list_blacklist(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    rows = session.exec(
        select(PhoneBlacklist)
        .where(PhoneBlacklist.tenant_id == tenant.id)
        .order_by(PhoneBlacklist.created_at.desc())  # type: ignore[attr-defined]
    ).all()
    return [_serialize_bl(b) for b in rows]


@router.post("/blacklist", status_code=status.HTTP_201_CREATED)
def add_blacklist(
    body: BlacklistIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    phone = body.phone.strip()
    existing = session.exec(
        select(PhoneBlacklist).where(
            (PhoneBlacklist.tenant_id == tenant.id) & (PhoneBlacklist.phone == phone)
        )
    ).first()
    if existing is not None:
        return _serialize_bl(existing)
    b = PhoneBlacklist(tenant_id=tenant.id, phone=phone, reason=body.reason)
    session.add(b)
    session.commit()
    session.refresh(b)
    return _serialize_bl(b)


@router.delete("/blacklist/{bl_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_blacklist(
    bl_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    b = session.get(PhoneBlacklist, bl_id)
    if b is None or b.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Entry not found", status_code=404)
    session.delete(b)
    session.commit()


def _score_for_phone(session: Session, tenant_id: int, phone: str) -> dict:
    """Compute a simple fraud score from order + return history for this phone.

    Score ranges 0..100 (higher = more suspicious). Factors:
      * In blacklist -> +70
      * Cancelled-orders-ratio on this phone -> +0..20
      * Returns-to-orders ratio on this phone -> +0..20
    """
    phone = phone.strip()
    customers = session.exec(
        select(Customer).where(
            (Customer.tenant_id == tenant_id) & (Customer.phone == phone)
        )
    ).all()
    ids = [c.id for c in customers if c.id is not None]
    orders: list[Order] = []
    if ids:
        orders = session.exec(
            select(Order).where(
                (Order.tenant_id == tenant_id) & (Order.customer_id.in_(ids))  # type: ignore[attr-defined]
            )
        ).all()
    total_orders = len(orders)
    cancelled = sum(1 for o in orders if o.status == "cancelled")
    order_ids = [o.id for o in orders if o.id is not None]
    returns_count = 0
    if order_ids:
        returns_count = len(
            session.exec(
                select(ReturnItem).where(
                    (ReturnItem.tenant_id == tenant_id)
                    & (ReturnItem.order_id.in_(order_ids))  # type: ignore[attr-defined]
                )
            ).all()
        )

    score = 0.0
    is_blacklisted = (
        session.exec(
            select(PhoneBlacklist).where(
                (PhoneBlacklist.tenant_id == tenant_id) & (PhoneBlacklist.phone == phone)
            )
        ).first()
        is not None
    )
    if is_blacklisted:
        score += 70.0
    if total_orders > 0:
        cancel_ratio = cancelled / total_orders
        return_ratio = returns_count / total_orders
        score += min(cancel_ratio * 20.0, 20.0)
        score += min(return_ratio * 20.0, 20.0)
    return {
        "phone": phone,
        "score": round(min(score, 100.0), 1),
        "blacklisted": is_blacklisted,
        "total_orders": total_orders,
        "cancelled_orders": cancelled,
        "returns": returns_count,
    }


@router.get("/score/{phone}")
def score(
    phone: str,
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> dict:
    assert tenant.id is not None
    return _score_for_phone(session, tenant.id, phone)
