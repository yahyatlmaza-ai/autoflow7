"""Subscription + trial status."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlmodel import Session

from ..database import get_session
from ..deps import get_current_tenant
from ..errors import AppError
from ..models import Tenant

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


PLANS = {
    "starter": {"price_dzd": 0, "duration_days": 10, "orders": 500},
    "professional": {"price_dzd": 20000, "duration_days": 180, "orders": 5000},
    "vip": {"price_dzd": 45000, "duration_days": 2008, "orders": 10_000_000},  # ~5.5y
}


class UpgradeRequest(BaseModel):
    plan: str  # starter | professional | vip


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/status")
def status_(tenant: Tenant = Depends(get_current_tenant)) -> dict:
    now = _now()
    trial_end = tenant.trial_end.replace(tzinfo=timezone.utc) if tenant.trial_end and tenant.trial_end.tzinfo is None else tenant.trial_end
    sub_end = None
    if tenant.subscription_end:
        sub_end = tenant.subscription_end.replace(tzinfo=timezone.utc) if tenant.subscription_end.tzinfo is None else tenant.subscription_end

    active = False
    source = "trial"
    expires_at = trial_end
    days_left = 0
    if tenant.plan in ("professional", "vip", "starter") and sub_end and sub_end > now:
        active = True
        source = tenant.plan
        expires_at = sub_end
        days_left = max(0, (sub_end - now).days)
    elif trial_end and trial_end > now:
        active = True
        source = "trial"
        expires_at = trial_end
        days_left = max(0, (trial_end - now).days)

    return {
        "plan": tenant.plan,
        "active": active,
        "source": source,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "days_left": days_left,
        "plans": PLANS,
    }


@router.post("/upgrade", status_code=status.HTTP_200_OK)
def upgrade(
    body: UpgradeRequest,
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> dict:
    """DEV-ONLY convenience: marks the subscription as paid without a real payment.

    Production integrates with a payment gateway; this endpoint exists so the app
    can demo the upgrade flow and escape a trial-expired state during testing.
    """
    plan_key = body.plan.lower()
    if plan_key not in PLANS:
        raise AppError(code="INVALID_PLAN", message="Unknown plan", status_code=400)
    days = PLANS[plan_key]["duration_days"]
    tenant.plan = plan_key
    tenant.subscription_end = _now() + timedelta(days=int(days))
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return status_(tenant)  # type: ignore[return-value]
