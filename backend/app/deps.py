"""FastAPI dependencies: current user, tenant, and trial gate."""
from datetime import datetime, timezone

from fastapi import Depends, Header, status
from sqlmodel import Session

from .database import get_session
from .errors import AppError
from .models import Tenant, User
from .security import decode_access_token


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError(
            code="UNAUTHORIZED",
            message="Missing or invalid Authorization header",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    return authorization.split(" ", 1)[1].strip()


def get_current_user(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    token = _extract_token(authorization)
    try:
        payload = decode_access_token(token)
    except ValueError:
        raise AppError(
            code="UNAUTHORIZED",
            message="Session expired or invalid. Please log in again.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    user_id = int(payload["sub"])
    user = session.get(User, user_id)
    if user is None:
        raise AppError(
            code="UNAUTHORIZED",
            message="Account no longer exists",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    return user


def get_current_tenant(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Tenant:
    tenant = session.get(Tenant, user.tenant_id)
    if tenant is None:
        raise AppError(
            code="TENANT_NOT_FOUND",
            message="Workspace not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return tenant


def require_active_subscription(
    tenant: Tenant = Depends(get_current_tenant),
) -> Tenant:
    """Gate that blocks write access once the trial (or paid subscription) has ended.

    Read-only endpoints can use get_current_tenant directly so the user can still
    see existing data to convince them to upgrade.
    """
    now = datetime.now(timezone.utc)

    # Normalize timezone for comparisons (SQLite may return naive datetimes).
    def _aware(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    trial_end = _aware(tenant.trial_end)
    sub_end = _aware(tenant.subscription_end)

    if tenant.plan in ("professional", "vip", "starter") and sub_end and sub_end > now:
        return tenant
    if trial_end and trial_end > now:
        return tenant

    raise AppError(
        code="TRIAL_EXPIRED",
        message="Your free trial has ended. Upgrade your plan to continue.",
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
    )
