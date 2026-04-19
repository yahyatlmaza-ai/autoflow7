"""Per-tenant settings: branding, automation toggles, customer templates."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..models import Tenant, TenantSettings

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsIn(BaseModel):
    company_name: str = Field(default="", max_length=200)
    company_address: str = Field(default="", max_length=300)
    company_phone: str = Field(default="", max_length=40)
    logo_url: str = Field(default="", max_length=500)
    default_currency: str = Field(default="DZD", max_length=8)
    whatsapp_number: str = Field(default="", max_length=40)
    sms_sender_id: str = Field(default="", max_length=40)
    auto_confirm_enabled: bool = False
    auto_assign_enabled: bool = False
    customer_sms_template: str = Field(default="", max_length=1000)
    fraud_return_threshold: float = Field(default=0.4, ge=0, le=1)


def _ensure_settings(session: Session, tenant_id: int) -> TenantSettings:
    ts = session.get(TenantSettings, tenant_id)
    if ts is None:
        ts = TenantSettings(tenant_id=tenant_id)
        session.add(ts)
        session.commit()
        session.refresh(ts)
    return ts


def _serialize(ts: TenantSettings) -> dict:
    return {
        "tenant_id": ts.tenant_id,
        "company_name": ts.company_name,
        "company_address": ts.company_address,
        "company_phone": ts.company_phone,
        "logo_url": ts.logo_url,
        "default_currency": ts.default_currency,
        "whatsapp_number": ts.whatsapp_number,
        "sms_sender_id": ts.sms_sender_id,
        "auto_confirm_enabled": ts.auto_confirm_enabled,
        "auto_assign_enabled": ts.auto_assign_enabled,
        "customer_sms_template": ts.customer_sms_template,
        "fraud_return_threshold": ts.fraud_return_threshold,
        "updated_at": ts.updated_at.isoformat() if ts.updated_at else None,
    }


@router.get("")
def get_settings(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> dict:
    return _serialize(_ensure_settings(session, tenant.id))


@router.put("")
def update_settings(
    body: SettingsIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    ts = _ensure_settings(session, tenant.id)
    for k, v in body.model_dump().items():
        setattr(ts, k, v)
    ts.updated_at = datetime.now(timezone.utc)
    session.add(ts)
    session.commit()
    session.refresh(ts)
    return _serialize(ts)
