"""Webhook endpoints — outbound notifications for events."""
from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import Tenant, WebhookEndpoint

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


EVENTS = [
    "order.created",
    "order.status_changed",
    "shipment.updated",
    "return.created",
    "*",
]


class WebhookIn(BaseModel):
    event: str = Field(min_length=1, max_length=64)
    url: str = Field(min_length=1, max_length=500)
    active: bool = True


def _serialize(w: WebhookEndpoint) -> dict:
    return {
        "id": w.id,
        "event": w.event,
        "url": w.url,
        "secret_set": bool(w.secret),
        "active": w.active,
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }


def _get_owned(session: Session, tenant: Tenant, wh_id: int) -> WebhookEndpoint:
    w = session.get(WebhookEndpoint, wh_id)
    if w is None or w.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Webhook not found", status_code=404)
    return w


@router.get("/events")
def list_events() -> dict:
    return {"events": EVENTS}


@router.get("")
def list_webhooks(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    stmt = select(WebhookEndpoint).where(WebhookEndpoint.tenant_id == tenant.id)
    return [_serialize(w) for w in session.exec(stmt).all()]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_webhook(
    body: WebhookIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    if body.event not in EVENTS:
        raise AppError(
            code="VALIDATION_ERROR",
            message="Unknown event",
            status_code=422,
            fields={"event": f"must be one of: {', '.join(EVENTS)}"},
        )
    w = WebhookEndpoint(
        tenant_id=tenant.id,
        event=body.event,
        url=body.url,
        secret=secrets.token_urlsafe(24),
        active=body.active,
    )
    session.add(w)
    session.commit()
    session.refresh(w)
    # Include the secret ONCE on creation so the user can save it.
    data = _serialize(w)
    data["secret"] = w.secret
    return data


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(
    webhook_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    w = _get_owned(session, tenant, webhook_id)
    session.delete(w)
    session.commit()
