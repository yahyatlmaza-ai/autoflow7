"""In-app notifications. Frontend polls GET /notifications every 20s."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant
from ..errors import AppError
from ..models import Notification, Tenant

router = APIRouter(prefix="/notifications", tags=["notifications"])


class MarkReadIn(BaseModel):
    ids: list[int] = []
    all: bool = False


@router.get("")
def list_notifications(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    limit: int = 50,
) -> dict:
    rows = session.exec(
        select(Notification).where(Notification.tenant_id == tenant.id)
    ).all()
    # Compute unread across ALL rows before slicing to `limit`; otherwise the
    # bell badge silently caps at `limit` even when more unread rows exist.
    unread = len([n for n in rows if not n.read])
    rows = list(reversed(rows))[:limit]
    return {
        "items": [
            {
                "id": n.id,
                "kind": n.kind,
                "title": n.title,
                "body": n.body,
                "related_order_id": n.related_order_id,
                "read": n.read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in rows
        ],
        "unread": unread,
    }


@router.post("/mark-read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    body: MarkReadIn,
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> None:
    if body.all:
        rows = session.exec(
            select(Notification).where(Notification.tenant_id == tenant.id, Notification.read == False)  # noqa: E712
        ).all()
        for n in rows:
            n.read = True
            session.add(n)
        session.commit()
        return
    if not body.ids:
        raise AppError(code="VALIDATION_ERROR", message="No notification ids provided", status_code=400)
    for nid in body.ids:
        n = session.get(Notification, nid)
        if n and n.tenant_id == tenant.id:
            n.read = True
            session.add(n)
    session.commit()
