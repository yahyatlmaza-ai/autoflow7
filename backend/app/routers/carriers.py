"""Carriers — delivery-company integrations, delivery rate matrix, wilaya list."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import (
    ALGERIAN_WILAYAS,
    CARRIER_PROVIDERS,
    Carrier,
    DeliveryRate,
    Tenant,
)

router = APIRouter(prefix="/carriers", tags=["carriers"])


class CarrierIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    provider: str = Field(default="custom", max_length=32)
    api_id: str = Field(default="", max_length=300)
    api_token: str = Field(default="", max_length=500)
    active: bool = True
    supports_cod: bool = True
    supports_desk: bool = True
    supports_home: bool = True


class DeliveryRateIn(BaseModel):
    carrier_id: int
    wilaya: str = Field(min_length=1, max_length=80)
    home_price: float = Field(default=0.0, ge=0)
    desk_price: float = Field(default=0.0, ge=0)
    product_id: int | None = None


def _mask(val: str) -> str:
    if not val:
        return ""
    if len(val) <= 4:
        return "****"
    return val[:2] + "*" * (len(val) - 4) + val[-2:]


def _serialize_carrier(c: Carrier) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "provider": c.provider,
        "api_id_preview": _mask(c.api_id),
        "api_token_set": bool(c.api_token),
        "active": c.active,
        "supports_cod": c.supports_cod,
        "supports_desk": c.supports_desk,
        "supports_home": c.supports_home,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _serialize_rate(r: DeliveryRate) -> dict:
    return {
        "id": r.id,
        "carrier_id": r.carrier_id,
        "wilaya": r.wilaya,
        "home_price": r.home_price,
        "desk_price": r.desk_price,
        "product_id": r.product_id,
    }


def _validate_provider(p: str) -> str:
    pr = (p or "custom").lower()
    if pr not in CARRIER_PROVIDERS:
        raise AppError(
            code="VALIDATION_ERROR",
            message="Unknown carrier provider",
            status_code=422,
            fields={"provider": f"must be one of: {', '.join(CARRIER_PROVIDERS)}"},
        )
    return pr


def _get_owned(session: Session, tenant: Tenant, carrier_id: int) -> Carrier:
    c = session.get(Carrier, carrier_id)
    if c is None or c.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Carrier not found", status_code=404)
    return c


@router.get("/providers")
def list_providers() -> dict:
    return {"providers": CARRIER_PROVIDERS, "wilayas": ALGERIAN_WILAYAS}


@router.get("")
def list_carriers(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    stmt = select(Carrier).where(Carrier.tenant_id == tenant.id)
    return [_serialize_carrier(c) for c in session.exec(stmt).all()]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_carrier(
    body: CarrierIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    carrier = Carrier(
        tenant_id=tenant.id,
        name=body.name,
        provider=_validate_provider(body.provider),
        api_id=body.api_id,
        api_token=body.api_token,
        active=body.active,
        supports_cod=body.supports_cod,
        supports_desk=body.supports_desk,
        supports_home=body.supports_home,
    )
    session.add(carrier)
    session.commit()
    session.refresh(carrier)
    return _serialize_carrier(carrier)


@router.put("/{carrier_id}")
def update_carrier(
    carrier_id: int,
    body: CarrierIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    c = _get_owned(session, tenant, carrier_id)
    c.name = body.name
    c.provider = _validate_provider(body.provider)
    if body.api_id:
        c.api_id = body.api_id
    if body.api_token:
        c.api_token = body.api_token
    c.active = body.active
    c.supports_cod = body.supports_cod
    c.supports_desk = body.supports_desk
    c.supports_home = body.supports_home
    session.add(c)
    session.commit()
    session.refresh(c)
    return _serialize_carrier(c)


@router.delete("/{carrier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_carrier(
    carrier_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    c = _get_owned(session, tenant, carrier_id)
    # Cascade delete rates for this carrier
    rates = session.exec(
        select(DeliveryRate).where(
            (DeliveryRate.tenant_id == tenant.id) & (DeliveryRate.carrier_id == carrier_id)
        )
    ).all()
    for r in rates:
        session.delete(r)
    session.delete(c)
    session.commit()


# ---------------------------------------------------------------------------
# Delivery rates (price matrix)
# ---------------------------------------------------------------------------


@router.get("/{carrier_id}/rates")
def list_rates(
    carrier_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    _get_owned(session, tenant, carrier_id)
    stmt = select(DeliveryRate).where(
        (DeliveryRate.tenant_id == tenant.id) & (DeliveryRate.carrier_id == carrier_id)
    )
    return [_serialize_rate(r) for r in session.exec(stmt).all()]


@router.post("/{carrier_id}/rates", status_code=status.HTTP_201_CREATED)
def create_rate(
    carrier_id: int,
    body: DeliveryRateIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    _get_owned(session, tenant, carrier_id)
    if body.carrier_id != carrier_id:
        raise AppError(
            code="VALIDATION_ERROR",
            message="carrier_id mismatch",
            status_code=422,
            fields={"carrier_id": "must match the URL"},
        )
    rate = DeliveryRate(
        tenant_id=tenant.id,
        carrier_id=carrier_id,
        wilaya=body.wilaya,
        home_price=body.home_price,
        desk_price=body.desk_price,
        product_id=body.product_id,
    )
    session.add(rate)
    session.commit()
    session.refresh(rate)
    return _serialize_rate(rate)


@router.delete("/rates/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rate(
    rate_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    r = session.get(DeliveryRate, rate_id)
    if r is None or r.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Rate not found", status_code=404)
    session.delete(r)
    session.commit()
