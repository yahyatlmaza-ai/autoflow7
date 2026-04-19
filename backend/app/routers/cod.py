"""COD reconciliation — per-agent daily cash collected + reconcile state + CSV export.

Each (agent, date) has at most one CODRecord. Records are manually created or
auto-upserted when the user posts a reconcile/adjustment. A CSV export returns
a tenant-wide report filterable by date range and agent.
"""
from __future__ import annotations

import csv
from datetime import datetime, timezone
from io import StringIO

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import CODRecord, DeliveryAgent, Tenant

router = APIRouter(prefix="/cod", tags=["cod"])


class CODIn(BaseModel):
    agent_id: int
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    amount_collected: float = Field(ge=0)
    amount_reconciled: float = Field(default=0.0, ge=0)
    reconciled: bool = False
    notes: str = Field(default="", max_length=500)


def _serialize(r: CODRecord, agent_name: str = "") -> dict:
    return {
        "id": r.id,
        "agent_id": r.agent_id,
        "agent_name": agent_name,
        "date": r.date,
        "amount_collected": r.amount_collected,
        "amount_reconciled": r.amount_reconciled,
        "reconciled": r.reconciled,
        "notes": r.notes,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def _get_agent(session: Session, tenant: Tenant, aid: int) -> DeliveryAgent:
    a = session.get(DeliveryAgent, aid)
    if a is None or a.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Agent not found", status_code=404)
    return a


def _agents_map(session: Session, tenant: Tenant) -> dict[int, DeliveryAgent]:
    rows = session.exec(
        select(DeliveryAgent).where(DeliveryAgent.tenant_id == tenant.id)
    ).all()
    return {a.id: a for a in rows if a.id is not None}


@router.get("")
def list_records(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    start: str | None = None,
    end: str | None = None,
    agent_id: int | None = None,
) -> list[dict]:
    stmt = select(CODRecord).where(CODRecord.tenant_id == tenant.id)
    if start:
        stmt = stmt.where(CODRecord.date >= start)  # type: ignore[arg-type]
    if end:
        stmt = stmt.where(CODRecord.date <= end)  # type: ignore[arg-type]
    if agent_id is not None:
        stmt = stmt.where(CODRecord.agent_id == agent_id)
    stmt = stmt.order_by(CODRecord.date.desc(), CODRecord.id.desc())  # type: ignore[attr-defined]
    rows = session.exec(stmt).all()
    amap = _agents_map(session, tenant)
    return [
        _serialize(r, amap[r.agent_id].name if r.agent_id in amap else "")
        for r in rows
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def upsert_record(
    body: CODIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    agent = _get_agent(session, tenant, body.agent_id)
    existing = session.exec(
        select(CODRecord).where(
            (CODRecord.tenant_id == tenant.id)
            & (CODRecord.agent_id == body.agent_id)
            & (CODRecord.date == body.date)
        )
    ).first()
    if existing is None:
        existing = CODRecord(tenant_id=tenant.id, **body.model_dump())
    else:
        existing.amount_collected = body.amount_collected
        existing.amount_reconciled = body.amount_reconciled
        existing.reconciled = body.reconciled
        existing.notes = body.notes
        existing.updated_at = datetime.now(timezone.utc)
    session.add(existing)
    session.commit()
    session.refresh(existing)
    return _serialize(existing, agent.name)


@router.put("/{record_id}/reconcile")
def reconcile(
    record_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    r = session.get(CODRecord, record_id)
    if r is None or r.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Record not found", status_code=404)
    r.reconciled = True
    r.amount_reconciled = r.amount_collected
    r.updated_at = datetime.now(timezone.utc)
    session.add(r)
    session.commit()
    session.refresh(r)
    amap = _agents_map(session, tenant)
    return _serialize(r, amap[r.agent_id].name if r.agent_id in amap else "")


@router.get("/export.csv")
def export_csv(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    start: str | None = None,
    end: str | None = None,
) -> Response:
    stmt = select(CODRecord).where(CODRecord.tenant_id == tenant.id)
    if start:
        stmt = stmt.where(CODRecord.date >= start)  # type: ignore[arg-type]
    if end:
        stmt = stmt.where(CODRecord.date <= end)  # type: ignore[arg-type]
    stmt = stmt.order_by(CODRecord.date.asc(), CODRecord.id.asc())  # type: ignore[attr-defined]
    rows = session.exec(stmt).all()
    amap = _agents_map(session, tenant)

    buf = StringIO()
    w = csv.writer(buf)
    w.writerow(["date", "agent_id", "agent_name", "collected", "reconciled_amount", "reconciled", "notes"])
    for r in rows:
        w.writerow([
            r.date,
            r.agent_id,
            amap[r.agent_id].name if r.agent_id in amap else "",
            f"{r.amount_collected:.2f}",
            f"{r.amount_reconciled:.2f}",
            "yes" if r.reconciled else "no",
            r.notes,
        ])
    content = buf.getvalue()
    filename = f"cod-{start or 'all'}-{end or 'all'}.csv"
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
