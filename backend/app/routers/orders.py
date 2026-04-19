"""Orders CRUD + lifecycle state machine + bulk actions + CSV export."""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, get_current_user, require_active_subscription
from ..errors import AppError
from ..models import (
    ALLOWED_TRANSITIONS,
    Customer,
    DeliveryAgent,
    Notification,
    Order,
    OrderStatusHistory,
    Tenant,
    User,
)

router = APIRouter(prefix="/orders", tags=["orders"])


class OrderIn(BaseModel):
    reference: str = Field(default="", max_length=60)
    customer_id: Optional[int] = None
    agent_id: Optional[int] = None
    product_name: str = Field(min_length=1, max_length=200)
    quantity: int = Field(default=1, ge=1, le=100000)
    price: float = Field(default=0.0, ge=0)
    currency: str = Field(default="DZD", max_length=3)
    shipping_address: str = Field(default="", max_length=300)
    shipping_city: str = Field(default="", max_length=80)
    notes: str = Field(default="", max_length=500)


class OrderStatusIn(BaseModel):
    status: str
    note: str = ""


class OrderBulkIn(BaseModel):
    ids: list[int]
    note: str = ""


@router.get("")
def list_orders(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    status_: Optional[str] = Query(default=None, alias="status"),
    q: str = "",
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[dict]:
    stmt = select(Order).where(Order.tenant_id == tenant.id)
    if status_:
        stmt = stmt.where(Order.status == status_)
    orders = session.exec(stmt).all()
    if q:
        needle = q.lower()
        orders = [
            o for o in orders
            if needle in (o.reference or "").lower()
            or needle in (o.product_name or "").lower()
            or needle in (o.shipping_city or "").lower()
        ]
    orders = list(reversed(orders))[:limit]
    customers = {c.id: c for c in session.exec(select(Customer).where(Customer.tenant_id == tenant.id)).all()}
    agents = {a.id: a for a in session.exec(select(DeliveryAgent).where(DeliveryAgent.tenant_id == tenant.id)).all()}
    return [_serialize(o, customers, agents) for o in orders]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    body: OrderIn,
    tenant: Tenant = Depends(require_active_subscription),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    _validate_refs(session, tenant, body.customer_id, body.agent_id)
    reference = (body.reference or _gen_reference(session, tenant)).strip()
    order = Order(
        tenant_id=tenant.id,  # type: ignore[arg-type]
        reference=reference,
        customer_id=body.customer_id,
        agent_id=body.agent_id,
        status="pending",
        product_name=body.product_name,
        quantity=body.quantity,
        price=body.price,
        currency=body.currency,
        shipping_address=body.shipping_address,
        shipping_city=body.shipping_city,
        notes=body.notes,
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    session.add(OrderStatusHistory(
        tenant_id=tenant.id, order_id=order.id, from_status=None,  # type: ignore[arg-type]
        to_status="pending", changed_by_user_id=user.id, note="Created",
    ))
    session.add(Notification(
        tenant_id=tenant.id, user_id=user.id, kind="order_created",  # type: ignore[arg-type]
        title=f"New order {order.reference}",
        body=f"{order.product_name} (x{order.quantity})",
        related_order_id=order.id,
    ))
    session.commit()

    customers = {c.id: c for c in session.exec(select(Customer).where(Customer.tenant_id == tenant.id)).all()}
    agents = {a.id: a for a in session.exec(select(DeliveryAgent).where(DeliveryAgent.tenant_id == tenant.id)).all()}
    return _serialize(order, customers, agents)


@router.put("/{order_id}")
def update_order(
    order_id: int,
    body: OrderIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    order = _get_owned(session, tenant, order_id)
    _validate_refs(session, tenant, body.customer_id, body.agent_id)
    for k, v in body.model_dump().items():
        # Don't let PUT change status — use the dedicated status endpoint.
        if k in ("status",):
            continue
        if k == "reference" and not v:
            continue
        setattr(order, k, v)
    order.updated_at = datetime.now(timezone.utc)
    session.add(order)
    session.commit()
    session.refresh(order)

    customers = {c.id: c for c in session.exec(select(Customer).where(Customer.tenant_id == tenant.id)).all()}
    agents = {a.id: a for a in session.exec(select(DeliveryAgent).where(DeliveryAgent.tenant_id == tenant.id)).all()}
    return _serialize(order, customers, agents)


@router.post("/{order_id}/status")
def change_status(
    order_id: int,
    body: OrderStatusIn,
    tenant: Tenant = Depends(require_active_subscription),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    order = _get_owned(session, tenant, order_id)
    _transition(session, tenant, order, body.status, user, body.note)
    session.refresh(order)
    customers = {c.id: c for c in session.exec(select(Customer).where(Customer.tenant_id == tenant.id)).all()}
    agents = {a.id: a for a in session.exec(select(DeliveryAgent).where(DeliveryAgent.tenant_id == tenant.id)).all()}
    return _serialize(order, customers, agents)


@router.get("/{order_id}/history")
def order_history(
    order_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    order = _get_owned(session, tenant, order_id)
    rows = session.exec(
        select(OrderStatusHistory).where(
            OrderStatusHistory.tenant_id == tenant.id,
            OrderStatusHistory.order_id == order.id,
        )
    ).all()
    return [
        {
            "id": r.id,
            "from_status": r.from_status,
            "to_status": r.to_status,
            "note": r.note,
            "changed_by_user_id": r.changed_by_user_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    order = _get_owned(session, tenant, order_id)
    # Cascade delete history rows so SQLite FK constraints don't complain.
    for h in session.exec(
        select(OrderStatusHistory).where(OrderStatusHistory.order_id == order.id)
    ).all():
        session.delete(h)
    session.delete(order)
    session.commit()


@router.post("/bulk/confirm")
def bulk_confirm(
    body: OrderBulkIn,
    tenant: Tenant = Depends(require_active_subscription),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    return _bulk_status(session, tenant, user, body, "confirmed")


@router.post("/bulk/cancel")
def bulk_cancel(
    body: OrderBulkIn,
    tenant: Tenant = Depends(require_active_subscription),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    return _bulk_status(session, tenant, user, body, "cancelled")


@router.get("/export.csv")
def export_csv(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> StreamingResponse:
    orders = session.exec(select(Order).where(Order.tenant_id == tenant.id)).all()
    customers = {c.id: c for c in session.exec(select(Customer).where(Customer.tenant_id == tenant.id)).all()}
    agents = {a.id: a for a in session.exec(select(DeliveryAgent).where(DeliveryAgent.tenant_id == tenant.id)).all()}

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "reference", "status", "product", "quantity", "price", "currency",
        "customer", "customer_phone", "city", "agent", "created_at",
    ])
    for o in orders:
        c = customers.get(o.customer_id) if o.customer_id else None
        a = agents.get(o.agent_id) if o.agent_id else None
        w.writerow([
            o.reference, o.status, o.product_name, o.quantity, o.price, o.currency,
            c.name if c else "", c.phone if c else "",
            o.shipping_city, a.name if a else "",
            o.created_at.isoformat() if o.created_at else "",
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="orders.csv"'},
    )


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _bulk_status(
    session: Session,
    tenant: Tenant,
    user: User,
    body: OrderBulkIn,
    target: str,
) -> dict:
    updated = 0
    errors: list[dict] = []
    for oid in body.ids:
        order = session.get(Order, oid)
        if order is None or order.tenant_id != tenant.id:
            errors.append({"id": oid, "code": "NOT_FOUND"})
            continue
        try:
            _transition(session, tenant, order, target, user, body.note or f"Bulk {target}")
            updated += 1
        except AppError as e:
            errors.append({"id": oid, "code": e.code})
    return {"updated": updated, "errors": errors}


def _transition(
    session: Session,
    tenant: Tenant,
    order: Order,
    to_status: str,
    user: User,
    note: str,
) -> None:
    if to_status not in ALLOWED_TRANSITIONS:
        raise AppError(code="INVALID_STATUS", message=f"Unknown status '{to_status}'", status_code=400)
    if to_status == order.status:
        return
    allowed = ALLOWED_TRANSITIONS.get(order.status, set())
    if to_status not in allowed:
        raise AppError(
            code="INVALID_TRANSITION",
            message=f"Cannot move order from '{order.status}' to '{to_status}'.",
            status_code=409,
        )
    from_status = order.status
    order.status = to_status
    order.updated_at = datetime.now(timezone.utc)
    session.add(order)
    session.add(OrderStatusHistory(
        tenant_id=tenant.id, order_id=order.id, from_status=from_status,  # type: ignore[arg-type]
        to_status=to_status, changed_by_user_id=user.id, note=note,
    ))
    # Update agent aggregates.
    if order.agent_id:
        agent = session.get(DeliveryAgent, order.agent_id)
        if agent and agent.tenant_id == tenant.id:
            if to_status == "delivered":
                agent.delivered_count += 1
                session.add(agent)
            elif to_status == "cancelled" and from_status in ("shipped", "confirmed"):
                agent.failed_count += 1
                session.add(agent)
    # Notify.
    session.add(Notification(
        tenant_id=tenant.id, user_id=user.id, kind="order_status",  # type: ignore[arg-type]
        title=f"Order {order.reference}: {from_status} → {to_status}",
        body=note,
        related_order_id=order.id,
    ))
    session.commit()


def _validate_refs(
    session: Session,
    tenant: Tenant,
    customer_id: int | None,
    agent_id: int | None,
) -> None:
    if customer_id is not None:
        c = session.get(Customer, customer_id)
        if c is None or c.tenant_id != tenant.id:
            raise AppError(
                code="INVALID_CUSTOMER", message="Customer not found in your workspace",
                status_code=400, fields={"customer_id": "Unknown customer"},
            )
    if agent_id is not None:
        a = session.get(DeliveryAgent, agent_id)
        if a is None or a.tenant_id != tenant.id:
            raise AppError(
                code="INVALID_AGENT", message="Agent not found in your workspace",
                status_code=400, fields={"agent_id": "Unknown agent"},
            )


def _get_owned(session: Session, tenant: Tenant, order_id: int) -> Order:
    order = session.get(Order, order_id)
    if order is None or order.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Order not found", status_code=404)
    return order


def _gen_reference(session: Session, tenant: Tenant) -> str:
    # Derive the next reference from the MAX existing numeric suffix rather
    # than the current count, so deletions don't cause collisions.
    # (counting + 1 could reuse a freed slot and yield a duplicate reference
    # since `reference` has no DB unique constraint.)
    existing = session.exec(
        select(Order.reference).where(Order.tenant_id == tenant.id)
    ).all()
    prefix = f"AF-{tenant.id}-"
    max_seq = 0
    for ref in existing:
        if not ref or not ref.startswith(prefix):
            continue
        tail = ref[len(prefix):]
        if tail.isdigit():
            max_seq = max(max_seq, int(tail))
    return f"{prefix}{max_seq + 1:04d}"


def _serialize(o: Order, customers: dict, agents: dict) -> dict:
    customer = customers.get(o.customer_id) if o.customer_id else None
    agent = agents.get(o.agent_id) if o.agent_id else None
    return {
        "id": o.id,
        "reference": o.reference,
        "status": o.status,
        "product_name": o.product_name,
        "quantity": o.quantity,
        "price": o.price,
        "currency": o.currency,
        "customer_id": o.customer_id,
        "customer": {"id": customer.id, "name": customer.name, "phone": customer.phone} if customer else None,
        "agent_id": o.agent_id,
        "agent": {"id": agent.id, "name": agent.name, "zone": agent.zone} if agent else None,
        "shipping_address": o.shipping_address,
        "shipping_city": o.shipping_city,
        "notes": o.notes,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
    }
