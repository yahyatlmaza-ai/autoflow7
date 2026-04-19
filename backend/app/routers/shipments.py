"""Shipments — order handoffs to a carrier, with tracking numbers + labels."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import Carrier, Order, Shipment, Tenant

router = APIRouter(prefix="/shipments", tags=["shipments"])


class ShipmentIn(BaseModel):
    order_id: int
    carrier_id: int | None = None
    delivery_type: str = Field(default="home", pattern="^(home|desk)$")
    cost: float = Field(default=0.0, ge=0)
    notes: str = Field(default="", max_length=1000)


class ShipmentStatusIn(BaseModel):
    status: str = Field(pattern="^(pending|printed|in_transit|delivered|failed)$")


def _serialize(s: Shipment, carrier_name: str | None = None) -> dict:
    return {
        "id": s.id,
        "order_id": s.order_id,
        "carrier_id": s.carrier_id,
        "carrier_name": carrier_name,
        "tracking_number": s.tracking_number,
        "label_url": s.label_url,
        "status": s.status,
        "delivery_type": s.delivery_type,
        "cost": s.cost,
        "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def _get_owned(session: Session, tenant: Tenant, shipment_id: int) -> Shipment:
    s = session.get(Shipment, shipment_id)
    if s is None or s.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Shipment not found", status_code=404)
    return s


def _carrier_name(session: Session, tenant_id: int, carrier_id: int | None) -> str | None:
    if carrier_id is None:
        return None
    c = session.get(Carrier, carrier_id)
    if c and c.tenant_id == tenant_id:
        return c.name
    return None


@router.get("")
def list_shipments(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    status_filter: str | None = None,
) -> list[dict]:
    stmt = select(Shipment).where(Shipment.tenant_id == tenant.id)
    if status_filter:
        stmt = stmt.where(Shipment.status == status_filter)
    items = session.exec(stmt).all()
    return [_serialize(s, _carrier_name(session, tenant.id, s.carrier_id)) for s in items]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_shipment(
    body: ShipmentIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    order = session.get(Order, body.order_id)
    if order is None or order.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Order not found", status_code=404)
    if body.carrier_id is not None:
        c = session.get(Carrier, body.carrier_id)
        if c is None or c.tenant_id != tenant.id:
            raise AppError(code="NOT_FOUND", message="Carrier not found", status_code=404)

    # Cheap pseudo tracking-number.  Real integrations would call the carrier API.
    tracking = f"AF{tenant.id:03d}{secrets.token_hex(4).upper()}"
    shipment = Shipment(
        tenant_id=tenant.id,
        order_id=body.order_id,
        carrier_id=body.carrier_id,
        tracking_number=tracking,
        status="pending",
        delivery_type=body.delivery_type,
        cost=body.cost,
        notes=body.notes,
    )
    session.add(shipment)
    session.commit()
    session.refresh(shipment)
    return _serialize(shipment, _carrier_name(session, tenant.id, shipment.carrier_id))


@router.post("/{shipment_id}/status")
def change_status(
    shipment_id: int,
    body: ShipmentStatusIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    s = _get_owned(session, tenant, shipment_id)
    s.status = body.status
    s.updated_at = datetime.now(timezone.utc)
    session.add(s)
    session.commit()
    session.refresh(s)
    return _serialize(s, _carrier_name(session, tenant.id, s.carrier_id))


@router.post("/{shipment_id}/label")
def print_label(
    shipment_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    """Stub: marks shipment as printed and returns a placeholder label_url."""
    s = _get_owned(session, tenant, shipment_id)
    s.status = "printed" if s.status == "pending" else s.status
    s.label_url = f"/labels/{s.id}-{s.tracking_number}.pdf"
    s.updated_at = datetime.now(timezone.utc)
    session.add(s)
    session.commit()
    session.refresh(s)
    return _serialize(s, _carrier_name(session, tenant.id, s.carrier_id))


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shipment(
    shipment_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    s = _get_owned(session, tenant, shipment_id)
    session.delete(s)
    session.commit()
