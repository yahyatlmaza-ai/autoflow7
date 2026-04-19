"""Delivery agents CRUD + performance aggregates."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_tenant, require_active_subscription
from ..errors import AppError
from ..models import DeliveryAgent, Order, Tenant

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(default="", max_length=32)
    zone: str = Field(default="", max_length=120)
    active: bool = True


@router.get("")
def list_agents(
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> list[dict]:
    agents = session.exec(select(DeliveryAgent).where(DeliveryAgent.tenant_id == tenant.id)).all()
    return [_serialize(a, _assigned_count(session, tenant, a.id)) for a in agents]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_agent(
    body: AgentIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    agent = DeliveryAgent(tenant_id=tenant.id, **body.model_dump())  # type: ignore[arg-type]
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _serialize(agent, 0)


@router.put("/{agent_id}")
def update_agent(
    agent_id: int,
    body: AgentIn,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> dict:
    agent = _get_owned(session, tenant, agent_id)
    for k, v in body.model_dump().items():
        setattr(agent, k, v)
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _serialize(agent, _assigned_count(session, tenant, agent.id))


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(
    agent_id: int,
    tenant: Tenant = Depends(require_active_subscription),
    session: Session = Depends(get_session),
) -> None:
    agent = _get_owned(session, tenant, agent_id)
    session.delete(agent)
    session.commit()


@router.get("/{agent_id}/performance")
def agent_performance(
    agent_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    session: Session = Depends(get_session),
) -> dict:
    agent = _get_owned(session, tenant, agent_id)
    orders = session.exec(
        select(Order).where(Order.tenant_id == tenant.id, Order.agent_id == agent.id)
    ).all()
    delivered = sum(1 for o in orders if o.status == "delivered")
    cancelled = sum(1 for o in orders if o.status == "cancelled")
    in_progress = sum(1 for o in orders if o.status in ("confirmed", "shipped"))
    total = len(orders)
    success_rate = round((delivered / total) * 100, 1) if total else 0.0
    return {
        "agent_id": agent.id,
        "name": agent.name,
        "zone": agent.zone,
        "total_assigned": total,
        "delivered": delivered,
        "cancelled": cancelled,
        "in_progress": in_progress,
        "success_rate": success_rate,
    }


def _get_owned(session: Session, tenant: Tenant, agent_id: int) -> DeliveryAgent:
    agent = session.get(DeliveryAgent, agent_id)
    if agent is None or agent.tenant_id != tenant.id:
        raise AppError(code="NOT_FOUND", message="Delivery agent not found", status_code=404)
    return agent


def _assigned_count(session: Session, tenant: Tenant, agent_id: int | None) -> int:
    if agent_id is None:
        return 0
    stmt = select(Order).where(
        Order.tenant_id == tenant.id,
        Order.agent_id == agent_id,
        Order.status.in_(["confirmed", "shipped"]),  # type: ignore[attr-defined]
    )
    return len(session.exec(stmt).all())


def _serialize(a: DeliveryAgent, assigned: int) -> dict:
    total = a.delivered_count + a.failed_count
    on_time_rate = round((a.delivered_count / total) * 100, 1) if total else 0.0
    return {
        "id": a.id,
        "name": a.name,
        "phone": a.phone,
        "zone": a.zone,
        "active": a.active,
        "delivered_count": a.delivered_count,
        "failed_count": a.failed_count,
        "on_time_rate": on_time_rate,
        "assigned_open": assigned,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }
