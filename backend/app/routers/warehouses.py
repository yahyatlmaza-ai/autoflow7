"""Multi-warehouse module — warehouses, per-product stock per warehouse, transfers.

Stock is stored as one row per (warehouse, product) in `warehouse_stock`. We
don't rely on a DB-level unique index because SQLite and Postgres differ in
how partial unique constraints are expressed; instead, all write paths look up
an existing row by (tenant, warehouse, product) before inserting, keeping the
semantics portable.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import (
    Product,
    StockTransfer,
    Tenant,
    Warehouse,
    WarehouseStock,
)

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


class WarehouseIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    location: str = Field(default="", max_length=300)
    is_default: bool = False
    active: bool = True


class StockIn(BaseModel):
    product_id: int
    qty: int = Field(ge=0)


class TransferIn(BaseModel):
    from_warehouse_id: int
    to_warehouse_id: int
    product_id: int
    qty: int = Field(gt=0)
    note: str = Field(default="", max_length=300)


def _serialize_warehouse(w: Warehouse) -> dict:
    return {
        "id": w.id,
        "name": w.name,
        "location": w.location,
        "is_default": w.is_default,
        "active": w.active,
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }


def _serialize_stock(s: WarehouseStock, product_name: str = "") -> dict:
    return {
        "id": s.id,
        "warehouse_id": s.warehouse_id,
        "product_id": s.product_id,
        "product_name": product_name,
        "qty": s.qty,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def _serialize_transfer(t: StockTransfer) -> dict:
    return {
        "id": t.id,
        "from_warehouse_id": t.from_warehouse_id,
        "to_warehouse_id": t.to_warehouse_id,
        "product_id": t.product_id,
        "qty": t.qty,
        "note": t.note,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _get_warehouse(session: Session, tenant: Tenant, wid: int) -> Warehouse:
    w = session.get(Warehouse, wid)
    if w is None or w.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Warehouse not found", status_code=404)
    return w


def _get_product(session: Session, tenant: Tenant, pid: int) -> Product:
    p = session.get(Product, pid)
    if p is None or p.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Product not found", status_code=404)
    return p


def _upsert_stock(
    session: Session, tenant: Tenant, warehouse_id: int, product_id: int, qty: int
) -> WarehouseStock:
    row = session.exec(
        select(WarehouseStock).where(
            (WarehouseStock.tenant_id == tenant.id)
            & (WarehouseStock.warehouse_id == warehouse_id)
            & (WarehouseStock.product_id == product_id)
        )
    ).first()
    if row is None:
        row = WarehouseStock(
            tenant_id=tenant.id,
            warehouse_id=warehouse_id,
            product_id=product_id,
            qty=qty,
        )
    else:
        row.qty = qty
        row.updated_at = datetime.now(timezone.utc)
    session.add(row)
    return row


@router.get("")
def list_warehouses(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    rows = session.exec(select(Warehouse).where(Warehouse.tenant_id == tenant.id)).all()
    return [_serialize_warehouse(w) for w in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_warehouse(
    body: WarehouseIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    # If this one is default, unset any previous default to avoid ambiguity.
    if body.is_default:
        existing = session.exec(
            select(Warehouse).where(
                (Warehouse.tenant_id == tenant.id) & (Warehouse.is_default.is_(True))  # type: ignore[attr-defined]
            )
        ).all()
        for e in existing:
            e.is_default = False
            session.add(e)
    w = Warehouse(tenant_id=tenant.id, **body.model_dump())
    session.add(w)
    session.commit()
    session.refresh(w)
    return _serialize_warehouse(w)


@router.put("/{warehouse_id}")
def update_warehouse(
    warehouse_id: int,
    body: WarehouseIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    w = _get_warehouse(session, tenant, warehouse_id)
    if body.is_default and not w.is_default:
        others = session.exec(
            select(Warehouse).where(
                (Warehouse.tenant_id == tenant.id) & (Warehouse.is_default.is_(True))  # type: ignore[attr-defined]
            )
        ).all()
        for o in others:
            o.is_default = False
            session.add(o)
    for k, v in body.model_dump().items():
        setattr(w, k, v)
    session.add(w)
    session.commit()
    session.refresh(w)
    return _serialize_warehouse(w)


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_warehouse(
    warehouse_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    w = _get_warehouse(session, tenant, warehouse_id)
    # Cascade: remove per-product stock rows for this warehouse so they don't
    # orphan foreign keys after the warehouse is gone.
    rows = session.exec(
        select(WarehouseStock).where(
            (WarehouseStock.tenant_id == tenant.id)
            & (WarehouseStock.warehouse_id == warehouse_id)
        )
    ).all()
    for r in rows:
        session.delete(r)
    session.delete(w)
    session.commit()


@router.get("/{warehouse_id}/stock")
def list_stock(
    warehouse_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    _get_warehouse(session, tenant, warehouse_id)
    rows = session.exec(
        select(WarehouseStock).where(
            (WarehouseStock.tenant_id == tenant.id)
            & (WarehouseStock.warehouse_id == warehouse_id)
        )
    ).all()
    # Fetch product names for display.
    pids = {r.product_id for r in rows}
    products = (
        session.exec(select(Product).where(Product.id.in_(pids))).all()  # type: ignore[attr-defined]
        if pids
        else []
    )
    name_by_id = {p.id: p.name for p in products if p.tenant_id == tenant.id}
    return [_serialize_stock(r, name_by_id.get(r.product_id, "")) for r in rows]


@router.post("/{warehouse_id}/stock", status_code=status.HTTP_201_CREATED)
def set_stock(
    warehouse_id: int,
    body: StockIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    _get_warehouse(session, tenant, warehouse_id)
    product = _get_product(session, tenant, body.product_id)
    row = _upsert_stock(session, tenant, warehouse_id, body.product_id, body.qty)
    session.commit()
    session.refresh(row)
    return _serialize_stock(row, product.name)


@router.post("/transfer", status_code=status.HTTP_201_CREATED)
def create_transfer(
    body: TransferIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    if body.from_warehouse_id == body.to_warehouse_id:
        raise AppError(
            code="VALIDATION_ERROR",
            message="Source and destination warehouses must differ",
            status_code=422,
            fields={"to_warehouse_id": "must differ from from_warehouse_id"},
        )
    _get_warehouse(session, tenant, body.from_warehouse_id)
    _get_warehouse(session, tenant, body.to_warehouse_id)
    product = _get_product(session, tenant, body.product_id)

    # Decrement source (must have enough stock).
    src = session.exec(
        select(WarehouseStock).where(
            (WarehouseStock.tenant_id == tenant.id)
            & (WarehouseStock.warehouse_id == body.from_warehouse_id)
            & (WarehouseStock.product_id == body.product_id)
        )
    ).first()
    if src is None or src.qty < body.qty:
        raise AppError(
            code="INSUFFICIENT_STOCK",
            message="Not enough stock in source warehouse",
            status_code=409,
            fields={"qty": f"available: {src.qty if src else 0}"},
        )
    src.qty -= body.qty
    src.updated_at = datetime.now(timezone.utc)
    session.add(src)

    # Increment destination.
    dst = session.exec(
        select(WarehouseStock).where(
            (WarehouseStock.tenant_id == tenant.id)
            & (WarehouseStock.warehouse_id == body.to_warehouse_id)
            & (WarehouseStock.product_id == body.product_id)
        )
    ).first()
    if dst is None:
        dst = WarehouseStock(
            tenant_id=tenant.id,
            warehouse_id=body.to_warehouse_id,
            product_id=body.product_id,
            qty=body.qty,
        )
    else:
        dst.qty += body.qty
        dst.updated_at = datetime.now(timezone.utc)
    session.add(dst)

    transfer = StockTransfer(
        tenant_id=tenant.id,
        from_warehouse_id=body.from_warehouse_id,
        to_warehouse_id=body.to_warehouse_id,
        product_id=body.product_id,
        qty=body.qty,
        note=body.note,
    )
    session.add(transfer)
    session.commit()
    session.refresh(transfer)
    # Prefix unused-variable silencing: pull product into locals for hint but
    # we intentionally don't need it in the response shape.
    _ = product
    return _serialize_transfer(transfer)


@router.get("/transfers")
def list_transfers(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    rows = session.exec(
        select(StockTransfer)
        .where(StockTransfer.tenant_id == tenant.id)
        .order_by(StockTransfer.created_at.desc())  # type: ignore[attr-defined]
    ).all()
    return [_serialize_transfer(t) for t in rows]
