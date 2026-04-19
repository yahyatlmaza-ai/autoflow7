"""Commissions module — per-agent commission rules + computed payouts + PDF.

A tenant-wide default commission rule is editable via `/commissions/rule`.
Each DeliveryAgent can optionally override it via `/commissions/overrides`.
`/commissions/payouts?start=...&end=...` computes per-agent delivered &
confirmed counts over the period and multiplies by the applicable rates.
A PDF receipt for a single agent is produced by `/commissions/export/{agent_id}.pdf`.
"""
from __future__ import annotations

from datetime import date as date_cls, datetime, time, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import (
    AgentCommissionOverride,
    CommissionRule,
    DeliveryAgent,
    Order,
    OrderStatusHistory,
    Tenant,
)

router = APIRouter(prefix="/commissions", tags=["commissions"])


class RuleIn(BaseModel):
    delivered_bonus: float = Field(ge=0)
    confirmed_bonus: float = Field(ge=0)


class OverrideIn(BaseModel):
    agent_id: int
    delivered_bonus: float = Field(ge=0)
    confirmed_bonus: float = Field(ge=0)


def _get_rule(session: Session, tenant: Tenant) -> CommissionRule:
    assert tenant.id is not None
    rule = session.get(CommissionRule, tenant.id)
    if rule is None:
        rule = CommissionRule(tenant_id=tenant.id)
        session.add(rule)
        session.commit()
        session.refresh(rule)
    return rule


@router.get("/rule")
def get_rule(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> dict:
    r = _get_rule(session, tenant)
    return {
        "tenant_id": r.tenant_id,
        "delivered_bonus": r.delivered_bonus,
        "confirmed_bonus": r.confirmed_bonus,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.put("/rule")
def set_rule(
    body: RuleIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    r = _get_rule(session, tenant)
    r.delivered_bonus = body.delivered_bonus
    r.confirmed_bonus = body.confirmed_bonus
    r.updated_at = datetime.now(timezone.utc)
    session.add(r)
    session.commit()
    session.refresh(r)
    return {
        "tenant_id": r.tenant_id,
        "delivered_bonus": r.delivered_bonus,
        "confirmed_bonus": r.confirmed_bonus,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("/overrides")
def list_overrides(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    rows = session.exec(
        select(AgentCommissionOverride).where(AgentCommissionOverride.tenant_id == tenant.id)
    ).all()
    return [
        {
            "id": o.id,
            "agent_id": o.agent_id,
            "delivered_bonus": o.delivered_bonus,
            "confirmed_bonus": o.confirmed_bonus,
        }
        for o in rows
    ]


@router.post("/overrides", status_code=status.HTTP_201_CREATED)
def upsert_override(
    body: OverrideIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    agent = session.get(DeliveryAgent, body.agent_id)
    if agent is None or agent.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Agent not found", status_code=404)
    existing = session.exec(
        select(AgentCommissionOverride).where(
            (AgentCommissionOverride.tenant_id == tenant.id)
            & (AgentCommissionOverride.agent_id == body.agent_id)
        )
    ).first()
    if existing is None:
        existing = AgentCommissionOverride(
            tenant_id=tenant.id,
            agent_id=body.agent_id,
            delivered_bonus=body.delivered_bonus,
            confirmed_bonus=body.confirmed_bonus,
        )
    else:
        existing.delivered_bonus = body.delivered_bonus
        existing.confirmed_bonus = body.confirmed_bonus
        existing.updated_at = datetime.now(timezone.utc)
    session.add(existing)
    session.commit()
    session.refresh(existing)
    return {
        "id": existing.id,
        "agent_id": existing.agent_id,
        "delivered_bonus": existing.delivered_bonus,
        "confirmed_bonus": existing.confirmed_bonus,
    }


def _parse_date(s: str | None, fallback: date_cls) -> date_cls:
    if not s:
        return fallback
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError as e:
        raise AppError(
            code="VALIDATION_ERROR",
            message="Invalid date, expected YYYY-MM-DD",
            status_code=422,
        ) from e


def _compute_payouts(
    session: Session, tenant: Tenant, start: date_cls, end: date_cls
) -> list[dict]:
    assert tenant.id is not None
    start_dt = datetime.combine(start, time.min, tzinfo=timezone.utc)
    # end is inclusive → use next-day midnight as upper bound.
    end_dt = datetime.combine(end, time.max, tzinfo=timezone.utc)

    rule = _get_rule(session, tenant)
    overrides_rows = session.exec(
        select(AgentCommissionOverride).where(AgentCommissionOverride.tenant_id == tenant.id)
    ).all()
    overrides_by_agent = {o.agent_id: o for o in overrides_rows}

    agents = session.exec(
        select(DeliveryAgent).where(DeliveryAgent.tenant_id == tenant.id)
    ).all()

    # Count confirmations per agent = OrderStatusHistory entries where to_status
    # in {confirmed, delivered} and the owning order has an agent_id. Count
    # deliveries = to_status == delivered.
    histories = session.exec(
        select(OrderStatusHistory).where(
            (OrderStatusHistory.tenant_id == tenant.id)
            & (OrderStatusHistory.created_at >= start_dt)
            & (OrderStatusHistory.created_at <= end_dt)
        )
    ).all()
    order_ids = {h.order_id for h in histories}
    orders_by_id: dict[int, Order] = {}
    if order_ids:
        for o in session.exec(
            select(Order).where(Order.id.in_(order_ids))  # type: ignore[attr-defined]
        ).all():
            if o.tenant_id == tenant.id and o.id is not None:
                orders_by_id[o.id] = o

    confirmed_by_agent: dict[int, int] = {}
    delivered_by_agent: dict[int, int] = {}
    for h in histories:
        order = orders_by_id.get(h.order_id)
        if order is None or order.agent_id is None:
            continue
        if h.to_status == "confirmed":
            confirmed_by_agent[order.agent_id] = confirmed_by_agent.get(order.agent_id, 0) + 1
        elif h.to_status == "delivered":
            delivered_by_agent[order.agent_id] = delivered_by_agent.get(order.agent_id, 0) + 1

    payouts: list[dict] = []
    for a in agents:
        if a.id is None:
            continue
        override = overrides_by_agent.get(a.id)
        delivered_bonus = (
            override.delivered_bonus if override is not None else rule.delivered_bonus
        )
        confirmed_bonus = (
            override.confirmed_bonus if override is not None else rule.confirmed_bonus
        )
        delivered_n = delivered_by_agent.get(a.id, 0)
        confirmed_n = confirmed_by_agent.get(a.id, 0)
        amount = delivered_n * delivered_bonus + confirmed_n * confirmed_bonus
        payouts.append({
            "agent_id": a.id,
            "agent_name": a.name,
            "delivered": delivered_n,
            "confirmed": confirmed_n,
            "delivered_bonus": delivered_bonus,
            "confirmed_bonus": confirmed_bonus,
            "amount": round(amount, 2),
        })
    payouts.sort(key=lambda p: p["amount"], reverse=True)
    return payouts


@router.get("/payouts")
def payouts(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    start: str | None = None,
    end: str | None = None,
) -> dict:
    today = datetime.now(timezone.utc).date()
    start_d = _parse_date(start, today.replace(day=1))
    end_d = _parse_date(end, today)
    if end_d < start_d:
        raise AppError(
            code="VALIDATION_ERROR",
            message="end must be >= start",
            status_code=422,
        )
    rows = _compute_payouts(session, tenant, start_d, end_d)
    return {
        "start": start_d.isoformat(),
        "end": end_d.isoformat(),
        "total": round(sum(r["amount"] for r in rows), 2),
        "rows": rows,
    }


@router.get("/export/{agent_id}.pdf")
def export_pdf(
    agent_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
    start: str | None = None,
    end: str | None = None,
) -> Response:
    """Produce a PDF commission receipt for a single agent.

    We lazy-import reportlab so the rest of the backend still boots if the
    dependency isn't installed (dev environments / older images).
    """
    agent = session.get(DeliveryAgent, agent_id)
    if agent is None or agent.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Agent not found", status_code=404)
    today = datetime.now(timezone.utc).date()
    start_d = _parse_date(start, today.replace(day=1))
    end_d = _parse_date(end, today)
    rows = _compute_payouts(session, tenant, start_d, end_d)
    row = next((r for r in rows if r["agent_id"] == agent_id), None)
    if row is None:
        row = {
            "agent_id": agent_id,
            "agent_name": agent.name,
            "delivered": 0,
            "confirmed": 0,
            "delivered_bonus": 0.0,
            "confirmed_bonus": 0.0,
            "amount": 0.0,
        }

    try:
        from reportlab.lib.pagesizes import A4  # type: ignore
        from reportlab.pdfgen import canvas  # type: ignore
    except ImportError as e:
        raise AppError(
            code="PDF_UNAVAILABLE",
            message="PDF generation not available on this server",
            status_code=503,
        ) from e

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    y = height - 60
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, y, "auto Flow — Commission receipt")
    y -= 30
    c.setFont("Helvetica", 11)
    c.drawString(50, y, f"Agent: {row['agent_name']} (#{row['agent_id']})")
    y -= 18
    c.drawString(50, y, f"Period: {start_d.isoformat()}  →  {end_d.isoformat()}")
    y -= 30
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Breakdown")
    c.setFont("Helvetica", 11)
    y -= 20
    c.drawString(60, y, f"Delivered orders: {row['delivered']}  × {row['delivered_bonus']:.2f} DZD")
    y -= 16
    c.drawString(60, y, f"Confirmed orders: {row['confirmed']}  × {row['confirmed_bonus']:.2f} DZD")
    y -= 30
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, f"Total: {row['amount']:.2f} DZD")
    c.showPage()
    c.save()
    pdf_bytes = buf.getvalue()
    filename = f"commission-{agent_id}-{start_d.isoformat()}-{end_d.isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
