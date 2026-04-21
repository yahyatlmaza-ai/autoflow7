"""Authentication: signup (auto-creates tenant + 14d trial), login, me."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select

from ..deps import get_current_tenant, get_current_user
from ..database import get_session
from ..errors import AppError
from ..models import Notification, Tenant, User
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    company_name: str = Field(default="", max_length=120)
    phone: str = Field(default="", max_length=32)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]
    tenant: dict[str, Any]


def _slugify(text: str) -> str:
    safe = "".join(c.lower() if c.isalnum() else "-" for c in text).strip("-")
    return safe or "workspace"


def _serialize_user(u: User) -> dict[str, Any]:
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "phone": u.phone,
        "role": u.role,
        "tenant_id": u.tenant_id,
        "email_verified": u.email_verified,
    }


def _serialize_tenant(t: Tenant) -> dict[str, Any]:
    return {
        "id": t.id,
        "name": t.name,
        "slug": t.slug,
        "plan": t.plan,
        "trial_end": t.trial_end.isoformat() if t.trial_end else None,
        "subscription_end": t.subscription_end.isoformat() if t.subscription_end else None,
    }


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, session: Session = Depends(get_session)) -> AuthResponse:
    # Emails are stored lowercased (see line 94) so the duplicate check must
    # also normalise — otherwise "User@example.com" bypasses this guard and
    # then trips the DB unique constraint with a 500.
    existing = session.exec(select(User).where(User.email == body.email.lower())).first()
    if existing:
        raise AppError(
            code="EMAIL_EXISTS",
            message="An account with this email already exists.",
            status_code=status.HTTP_409_CONFLICT,
            fields={"email": "Already registered"},
        )

    # Auto-create tenant with unique slug. Start `suffix` at 0 and increment
    # BEFORE composing the string so the first collision resolves to
    # `{base}-1`, then `{base}-2`, … without skipping `-1`.
    base_slug = _slugify(body.company_name or body.email.split("@", 1)[0])
    slug = base_slug
    suffix = 0
    while session.exec(select(Tenant).where(Tenant.slug == slug)).first():
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    # Create tenant + user + welcome notification in a single transaction so a
    # partial failure (e.g. email uniqueness race on the user INSERT) can't
    # leave an orphan tenant behind. flush() populates auto-generated PKs
    # without committing; a single commit() at the end is atomic.
    tenant = Tenant(name=body.company_name or body.full_name, slug=slug, plan="trial")
    session.add(tenant)
    session.flush()
    session.refresh(tenant)

    user = User(
        tenant_id=tenant.id,  # type: ignore[arg-type]
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
        role="owner",
        email_verified=True,  # OTP flow can be layered on later
    )
    session.add(user)
    session.flush()
    session.refresh(user)

    # Welcome notification + trial status.
    session.add(
        Notification(
            tenant_id=tenant.id,  # type: ignore[arg-type]
            user_id=user.id,
            kind="generic",
            title="Welcome to auto Flow",
            body=f"Your free trial has started. It ends on {tenant.trial_end:%Y-%m-%d}.",
        )
    )
    session.commit()

    token = create_access_token(
        user_id=user.id,  # type: ignore[arg-type]
        tenant_id=tenant.id,  # type: ignore[arg-type]
        email=user.email,
    )
    return AuthResponse(
        access_token=token,
        user=_serialize_user(user),
        tenant=_serialize_tenant(tenant),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)) -> AuthResponse:
    user = session.exec(select(User).where(User.email == body.email.lower())).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise AppError(
            code="INVALID_CREDENTIALS",
            message="Incorrect email or password.",
            status_code=status.HTTP_401_UNAUTHORIZED,
            fields={"email": "Check your email and password"},
        )
    tenant = session.get(Tenant, user.tenant_id)
    if tenant is None:
        raise AppError(code="TENANT_NOT_FOUND", message="Workspace not found", status_code=404)

    user.last_login_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()

    token = create_access_token(user_id=user.id, tenant_id=tenant.id, email=user.email)  # type: ignore[arg-type]
    return AuthResponse(
        access_token=token,
        user=_serialize_user(user),
        tenant=_serialize_tenant(tenant),
    )


@router.get("/me", response_model=AuthResponse)
def me(
    user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
) -> AuthResponse:
    # Same envelope as login/signup so the frontend can use a single shape.
    token = create_access_token(
        user_id=user.id,  # type: ignore[arg-type]
        tenant_id=tenant.id,  # type: ignore[arg-type]
        email=user.email,
    )
    return AuthResponse(
        access_token=token,
        user=_serialize_user(user),
        tenant=_serialize_tenant(tenant),
    )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    if not verify_password(body.current_password, user.password_hash):
        raise AppError(
            code="INVALID_CREDENTIALS",
            message="Current password is incorrect.",
            status_code=status.HTTP_401_UNAUTHORIZED,
            fields={"current_password": "Incorrect"},
        )
    user.password_hash = hash_password(body.new_password)
    session.add(user)
    session.commit()
