"""Dashboard stats computed from real tables, tenant-scoped."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant
from ..models import Customer, DeliveryAgent, Order, Tenant

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> dict:
    orders = session.exec(select(Order).where(Order.tenant_id == tenant.id)).all()
    customers = session.exec(select(Customer).where(Customer.tenant_id == tenant.id)).all()
    agents = session.exec(select(DeliveryAgent).where(DeliveryAgent.tenant_id == tenant.id)).all()

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=29)

    total = len(orders)
    by_status: dict[str, int] = defaultdict(int)
    revenue = 0.0
    revenue_delivered = 0.0
    daily: dict[str, dict[str, float]] = {}
    for i in range(30):
        day = (window_start + timedelta(days=i)).strftime("%Y-%m-%d")
        daily[day] = {"orders": 0, "delivered": 0, "revenue": 0.0}

    for o in orders:
        by_status[o.status] += 1
        amount = (o.price or 0.0) * (o.quantity or 1)
        revenue += amount
        if o.status == "delivered":
            revenue_delivered += amount
        created = o.created_at
        if created is not None:
            created = created.replace(tzinfo=timezone.utc) if created.tzinfo is None else created
            if created >= window_start:
                d = created.strftime("%Y-%m-%d")
                if d in daily:
                    daily[d]["orders"] += 1
                    if o.status == "delivered":
                        daily[d]["delivered"] += 1
                        daily[d]["revenue"] += amount

    top_agents = []
    for a in agents:
        a_orders = [o for o in orders if o.agent_id == a.id]
        delivered = sum(1 for o in a_orders if o.status == "delivered")
        top_agents.append({
            "id": a.id,
            "name": a.name,
            "zone": a.zone,
            "delivered": delivered,
            "total": len(a_orders),
        })
    top_agents.sort(key=lambda r: r["delivered"], reverse=True)

    delivered_count = by_status.get("delivered", 0)
    cancelled_count = by_status.get("cancelled", 0)
    # Conversion rate = delivered / non-cancelled; avoids penalising fraud cancellations.
    non_cancelled = total - cancelled_count
    conversion_rate = (delivered_count / non_cancelled) if non_cancelled > 0 else 0.0
    # Fulfilment rate over the whole pipeline (including cancelled orders).
    fulfilment_rate = (delivered_count / total) if total > 0 else 0.0

    return {
        "totals": {
            "orders": total,
            "customers": len(customers),
            "agents": len([a for a in agents if a.active]),
            "revenue": round(revenue, 2),
            "revenue_delivered": round(revenue_delivered, 2),
        },
        "by_status": {
            "pending": by_status.get("pending", 0),
            "confirmed": by_status.get("confirmed", 0),
            "shipped": by_status.get("shipped", 0),
            "delivered": delivered_count,
            "cancelled": cancelled_count,
        },
        "rates": {
            "conversion_rate": round(conversion_rate, 4),
            "fulfilment_rate": round(fulfilment_rate, 4),
        },
        "daily_30d": [
            {"date": d, **daily[d]} for d in sorted(daily.keys())
        ],
        "top_agents": top_agents[:5],
    }
