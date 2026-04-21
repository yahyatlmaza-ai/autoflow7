"""Subscription + trial status."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlmodel import Session

from ..database import get_session
from ..deps import get_current_tenant, get_current_user
from ..errors import AppError
from ..models import Tenant, User

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
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    """Activate a paid plan for the tenant.

    This endpoint does NOT process a real payment; it just flips the tenant to
    the requested plan. Because of that, it is restricted on two axes so it
    cannot be abused:

    1. Only the tenant owner (User.role == "owner") can call it. A staff user
       cannot grant themselves VIP.
    2. In production (default), it is disabled unless the operator explicitly
       opts in by setting ``AUTOFLOW_ALLOW_DEV_UPGRADE=1``. This exists so QA
       and self-hosted demos can still run the upgrade path without integrating
       a payment gateway.

    Once a real payment gateway is wired up, this endpoint should be replaced
    by one that verifies a webhook/receipt from the gateway.
    """
    if os.environ.get("AUTOFLOW_ALLOW_DEV_UPGRADE") != "1":
        raise AppError(
            code="UPGRADE_DISABLED",
            message="Self-service upgrade is not available. Contact support to activate a paid plan.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if user.role != "owner":
        raise AppError(
            code="FORBIDDEN",
            message="Only the account owner can change the subscription plan.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
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
