"""Stores — external e-commerce connections (Shopify / WooCommerce / …)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import STORE_PLATFORMS, Store, Tenant

router = APIRouter(prefix="/stores", tags=["stores"])


class StoreIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    platform: str = Field(default="custom", max_length=32)
    url: str = Field(default="", max_length=300)
    api_key: str = Field(default="", max_length=500)
    api_secret: str = Field(default="", max_length=500)
    active: bool = True


def _mask(val: str) -> str:
    if not val:
        return ""
    if len(val) <= 4:
        return "****"
    return val[:2] + "*" * (len(val) - 4) + val[-2:]


def _serialize(s: Store) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "platform": s.platform,
        "url": s.url,
        "api_key_preview": _mask(s.api_key),
        "api_secret_set": bool(s.api_secret),
        "active": s.active,
        "orders_imported": s.orders_imported,
        "last_sync_at": s.last_sync_at.isoformat() if s.last_sync_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _get_owned(session: Session, tenant: Tenant, store_id: int) -> Store:
    store = session.get(Store, store_id)
    if store is None or store.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Store not found", status_code=404)
    return store


def _validate_platform(platform: str) -> str:
    p = (platform or "custom").lower()
    if p not in STORE_PLATFORMS:
        raise AppError(
            code="VALIDATION_ERROR",
            message="Unknown platform",
            status_code=422,
            fields={"platform": f"must be one of: {', '.join(STORE_PLATFORMS)}"},
        )
    return p


@router.get("/platforms")
def list_platforms() -> dict:
    return {"platforms": STORE_PLATFORMS}


@router.get("")
def list_stores(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    stmt = select(Store).where(Store.tenant_id == tenant.id)
    return [_serialize(s) for s in session.exec(stmt).all()]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_store(
    body: StoreIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    platform = _validate_platform(body.platform)
    store = Store(
        tenant_id=tenant.id,
        name=body.name,
        platform=platform,
        url=body.url,
        api_key=body.api_key,
        api_secret=body.api_secret,
        active=body.active,
    )
    session.add(store)
    session.commit()
    session.refresh(store)
    return _serialize(store)


@router.put("/{store_id}")
def update_store(
    store_id: int,
    body: StoreIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    store = _get_owned(session, tenant, store_id)
    store.name = body.name
    store.platform = _validate_platform(body.platform)
    store.url = body.url
    if body.api_key:
        store.api_key = body.api_key
    if body.api_secret:
        store.api_secret = body.api_secret
    store.active = body.active
    session.add(store)
    session.commit()
    session.refresh(store)
    return _serialize(store)


@router.post("/{store_id}/sync")
def sync_store(
    store_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    """Stub for "import orders from the connected store".

    In a real deployment this would call the store's API (Shopify/WooCommerce) and
    create orders.  Here we just stamp `last_sync_at` so the UI can show it.
    """
    store = _get_owned(session, tenant, store_id)
    store.last_sync_at = datetime.now(timezone.utc)
    session.add(store)
    session.commit()
    session.refresh(store)
    return {"ok": True, "store": _serialize(store)}


@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_store(
    store_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    store = _get_owned(session, tenant, store_id)
    session.delete(store)
    session.commit()
