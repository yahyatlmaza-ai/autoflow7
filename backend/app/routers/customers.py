"""Customers CRUD, scoped to the caller's tenant."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import Customer, Tenant

router = APIRouter(prefix="/customers", tags=["customers"])


class CustomerIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(default="", max_length=32)
    email: str = Field(default="", max_length=120)
    address: str = Field(default="", max_length=300)
    city: str = Field(default="", max_length=80)
    notes: str = Field(default="", max_length=500)


@router.get("")
def list_customers(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    q: str = "",
) -> list[dict]:
    stmt = select(Customer).where(Customer.tenant_id == tenant.id)
    customers = session.exec(stmt).all()
    if q:
        needle = q.lower()
        customers = [
            c for c in customers
            if needle in (c.name or "").lower()
            or needle in (c.phone or "")
            or needle in (c.email or "").lower()
            or needle in (c.city or "").lower()
        ]
    return [_serialize(c) for c in customers]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_customer(
    body: CustomerIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    customer = Customer(tenant_id=tenant.id, **body.model_dump())  # type: ignore[arg-type]
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return _serialize(customer)


@router.put("/{customer_id}")
def update_customer(
    customer_id: int,
    body: CustomerIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    customer = _get_owned(session, tenant, customer_id)
    for k, v in body.model_dump().items():
        setattr(customer, k, v)
    customer.updated_at = datetime.now(timezone.utc)
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return _serialize(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    customer = _get_owned(session, tenant, customer_id)
    session.delete(customer)
    session.commit()


def _get_owned(session: Session, tenant: Tenant, customer_id: int) -> Customer:
    customer = session.get(Customer, customer_id)
    if customer is None or customer.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Customer not found", status_code=404)
    return customer


def _serialize(c: Customer) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "address": c.address,
        "city": c.city,
        "notes": c.notes,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }
