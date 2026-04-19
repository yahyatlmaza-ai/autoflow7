"""Products — the catalog item for auto Flow orders."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import Product, Tenant

router = APIRouter(prefix="/products", tags=["products"])


class ProductIn(BaseModel):
    sku: str = Field(default="", max_length=64)
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    price: float = Field(default=0.0, ge=0)
    cost: float = Field(default=0.0, ge=0)
    stock: int = Field(default=0, ge=0)
    active: bool = True
    image_url: str = Field(default="", max_length=500)


def _serialize(p: Product) -> dict:
    return {
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "description": p.description,
        "price": p.price,
        "cost": p.cost,
        "stock": p.stock,
        "active": p.active,
        "image_url": p.image_url,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _get_owned(session: Session, tenant: Tenant, product_id: int) -> Product:
    p = session.get(Product, product_id)
    if p is None or p.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Product not found", status_code=404)
    return p


@router.get("")
def list_products(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    q: str = "",
) -> list[dict]:
    stmt = select(Product).where(Product.tenant_id == tenant.id)
    items = session.exec(stmt).all()
    if q:
        needle = q.lower()
        items = [
            p for p in items
            if needle in (p.name or "").lower()
            or needle in (p.sku or "").lower()
        ]
    return [_serialize(p) for p in items]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    p = Product(tenant_id=tenant.id, **body.model_dump())
    session.add(p)
    session.commit()
    session.refresh(p)
    return _serialize(p)


@router.put("/{product_id}")
def update_product(
    product_id: int,
    body: ProductIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    p = _get_owned(session, tenant, product_id)
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    session.add(p)
    session.commit()
    session.refresh(p)
    return _serialize(p)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    p = _get_owned(session, tenant, product_id)
    session.delete(p)
    session.commit()
