"""SQLModel definitions for auto Flow.

Multi-tenant: every row that belongs to a company has a `tenant_id` column.
All reads/writes MUST filter on tenant_id via the dependencies in deps.py.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlmodel import Field, SQLModel

from .config import TRIAL_DAYS


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def trial_end_default() -> datetime:
    return utcnow() + timedelta(days=TRIAL_DAYS)


# ---------------------------------------------------------------------------
# Tenants + Users
# ---------------------------------------------------------------------------


class Tenant(SQLModel, table=True):
    __tablename__ = "tenants"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    slug: str = Field(index=True, unique=True)
    plan: str = Field(default="trial")  # trial | starter | professional | vip | expired
    trial_end: datetime = Field(default_factory=trial_end_default)
    subscription_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    full_name: str = ""
    phone: str = ""
    role: str = Field(default="owner")  # owner | admin | staff
    email_verified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)
    last_login_at: Optional[datetime] = None


class OTPSession(SQLModel, table=True):
    __tablename__ = "otp_sessions"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    code_hash: str
    purpose: str = Field(default="verify_email")  # verify_email | reset_password
    expires_at: datetime
    consumed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------


class Customer(SQLModel, table=True):
    __tablename__ = "customers"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    name: str
    phone: str = ""
    email: str = ""
    address: str = ""
    city: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------------------
# Delivery agents
# ---------------------------------------------------------------------------


class DeliveryAgent(SQLModel, table=True):
    __tablename__ = "delivery_agents"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    name: str
    phone: str = ""
    zone: str = ""  # city / region
    active: bool = Field(default=True)
    delivered_count: int = Field(default=0)
    failed_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


ORDER_STATUSES = ("pending", "confirmed", "shipped", "delivered", "cancelled")

# Allowed transitions. Keys are current status, values are the statuses you
# can move TO from that current status.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"shipped", "cancelled"},
    "shipped": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}


class Order(SQLModel, table=True):
    __tablename__ = "orders"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    reference: str = Field(index=True)  # tenant-scoped human reference
    customer_id: Optional[int] = Field(default=None, foreign_key="customers.id")
    agent_id: Optional[int] = Field(default=None, foreign_key="delivery_agents.id")
    status: str = Field(default="pending", index=True)
    product_name: str
    quantity: int = Field(default=1)
    price: float = Field(default=0.0)
    currency: str = Field(default="DZD")
    shipping_address: str = ""
    shipping_city: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class OrderStatusHistory(SQLModel, table=True):
    __tablename__ = "order_status_history"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    from_status: Optional[str] = None
    to_status: str
    changed_by_user_id: Optional[int] = None
    note: str = ""
    created_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    kind: str  # order_created | order_status | trial_expiring | trial_expired | generic
    title: str
    body: str = ""
    related_order_id: Optional[int] = None
    read: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------------------
# Octomatic-style extensions: stores, carriers, products, shipments, returns,
# team, confirmation attempts, delivery rates, webhooks, tenant settings.
# ---------------------------------------------------------------------------


class Store(SQLModel, table=True):
    """External store (Shopify / WooCommerce / custom) that feeds in orders."""
    __tablename__ = "stores"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    name: str
    platform: str = Field(default="custom")  # shopify | woocommerce | magento | opencart | custom
    url: str = ""
    api_key: str = ""  # stored opaque; never echoed back in full
    api_secret: str = ""
    active: bool = Field(default=True)
    last_sync_at: Optional[datetime] = None
    orders_imported: int = Field(default=0)
    created_at: datetime = Field(default_factory=utcnow)


class Carrier(SQLModel, table=True):
    """Delivery company (Yalidine, ZR Express, …) integration."""
    __tablename__ = "carriers"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    name: str
    provider: str = Field(default="custom")  # yalidine | zr_express | noest | amana | ems | dhl | fedex | ups | aramex | custom
    api_id: str = ""
    api_token: str = ""
    active: bool = Field(default=True)
    supports_cod: bool = Field(default=True)
    supports_desk: bool = Field(default=True)
    supports_home: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow)


class DeliveryRate(SQLModel, table=True):
    """Custom pricing matrix per carrier × wilaya × delivery type."""
    __tablename__ = "delivery_rates"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    carrier_id: int = Field(foreign_key="carriers.id", index=True)
    wilaya: str  # e.g. "Algiers" / "16"
    home_price: float = Field(default=0.0)
    desk_price: float = Field(default=0.0)
    product_id: Optional[int] = Field(default=None, foreign_key="products.id")
    created_at: datetime = Field(default_factory=utcnow)


class Product(SQLModel, table=True):
    """Catalog item. Orders can optionally reference a product id."""
    __tablename__ = "products"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    sku: str = Field(default="", index=True)
    name: str
    description: str = ""
    price: float = Field(default=0.0)
    cost: float = Field(default=0.0)
    stock: int = Field(default=0)
    active: bool = Field(default=True)
    image_url: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class Shipment(SQLModel, table=True):
    """A shipment is a concrete handoff of an order to a carrier."""
    __tablename__ = "shipments"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    carrier_id: Optional[int] = Field(default=None, foreign_key="carriers.id")
    tracking_number: str = Field(default="", index=True)
    label_url: str = ""
    status: str = Field(default="pending", index=True)  # pending | printed | in_transit | delivered | failed
    delivery_type: str = Field(default="home")  # home | desk
    cost: float = Field(default=0.0)
    notes: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ReturnItem(SQLModel, table=True):
    __tablename__ = "returns"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    reason: str = ""
    status: str = Field(default="requested", index=True)  # requested | received | restocked | refunded | rejected
    notes: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class TeamMember(SQLModel, table=True):
    """A non-owner employee: order confirmer, packer, etc. Not a login user.

    Lightweight record used for assignment and payouts. Performance aggregates
    are computed from ConfirmationAttempts + Orders.
    """
    __tablename__ = "team_members"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    name: str
    role: str = Field(default="confirmer")  # confirmer | packer | manager | custom
    phone: str = ""
    email: str = ""
    pay_per_confirmed: float = Field(default=0.0)  # DZD per confirmed order
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow)


class ConfirmationAttempt(SQLModel, table=True):
    """Archive of call attempts to confirm an order with the customer."""
    __tablename__ = "confirmation_attempts"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    team_member_id: Optional[int] = Field(default=None, foreign_key="team_members.id")
    result: str = Field(default="no_answer")  # no_answer | confirmed | rejected | callback | wrong_number
    note: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class WebhookEndpoint(SQLModel, table=True):
    __tablename__ = "webhook_endpoints"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    event: str  # order.created | order.status_changed | shipment.updated | return.created | *
    url: str
    secret: str = ""
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow)


class TenantSettings(SQLModel, table=True):
    """Per-tenant configuration: branding, automation toggles, default values."""
    __tablename__ = "tenant_settings"
    tenant_id: int = Field(primary_key=True, foreign_key="tenants.id")
    company_name: str = ""
    company_address: str = ""
    company_phone: str = ""
    logo_url: str = ""
    default_currency: str = Field(default="DZD")
    whatsapp_number: str = ""
    sms_sender_id: str = ""
    auto_confirm_enabled: bool = Field(default=False)
    auto_assign_enabled: bool = Field(default=False)
    customer_sms_template: str = Field(
        default="Your order {{reference}} is now {{status}}. Thanks for choosing us!"
    )
    fraud_return_threshold: float = Field(default=0.4)  # block customers above this return rate
    updated_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------------------
# Phase 5 Octomatic-parity modules: warehouses, call center scripts, fraud
# blacklist, commissions, COD reconciliation.
# ---------------------------------------------------------------------------


class Warehouse(SQLModel, table=True):
    """Physical warehouse/stock location. Multi-tenant."""
    __tablename__ = "warehouses"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    name: str
    location: str = ""  # free-form address
    is_default: bool = Field(default=False)
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow)


class WarehouseStock(SQLModel, table=True):
    """Per-(warehouse, product) on-hand quantity. Uniqueness is enforced in code."""
    __tablename__ = "warehouse_stock"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    warehouse_id: int = Field(foreign_key="warehouses.id", index=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    qty: int = Field(default=0)
    updated_at: datetime = Field(default_factory=utcnow)


class StockTransfer(SQLModel, table=True):
    """Movement of product quantity between two warehouses."""
    __tablename__ = "stock_transfers"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    from_warehouse_id: int = Field(foreign_key="warehouses.id")
    to_warehouse_id: int = Field(foreign_key="warehouses.id")
    product_id: int = Field(foreign_key="products.id")
    qty: int = Field(default=1)
    note: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class CallScript(SQLModel, table=True):
    """Reusable call-center confirmation script."""
    __tablename__ = "call_scripts"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    name: str
    body: str = ""
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow)


class PhoneBlacklist(SQLModel, table=True):
    """Phone numbers blocked from creating new orders (per tenant)."""
    __tablename__ = "phone_blacklist"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    phone: str = Field(index=True)
    reason: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class CommissionRule(SQLModel, table=True):
    """Per-tenant default commission rates (delivery bonus + confirmation bonus)."""
    __tablename__ = "commission_rules"
    tenant_id: int = Field(primary_key=True, foreign_key="tenants.id")
    delivered_bonus: float = Field(default=0.0)  # DZD per delivered order
    confirmed_bonus: float = Field(default=0.0)  # DZD per confirmed order
    updated_at: datetime = Field(default_factory=utcnow)


class AgentCommissionOverride(SQLModel, table=True):
    """Optional per-agent override of the tenant-wide commission rule."""
    __tablename__ = "agent_commission_overrides"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    agent_id: int = Field(foreign_key="delivery_agents.id", index=True)
    delivered_bonus: float = Field(default=0.0)
    confirmed_bonus: float = Field(default=0.0)
    updated_at: datetime = Field(default_factory=utcnow)


class CODRecord(SQLModel, table=True):
    """Daily cash-on-delivery reconciliation record for an agent."""
    __tablename__ = "cod_records"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    agent_id: int = Field(foreign_key="delivery_agents.id", index=True)
    date: str = Field(index=True)  # ISO YYYY-MM-DD (string keeps DB-portable)
    amount_collected: float = Field(default=0.0)
    amount_reconciled: float = Field(default=0.0)
    reconciled: bool = Field(default=False)
    notes: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# Static list of Algerian wilayas — used by Carriers / DeliveryRates UI.
ALGERIAN_WILAYAS = [
    "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Bejaia", "Biskra",
    "Bechar", "Blida", "Bouira", "Tamanrasset", "Tebessa", "Tlemcen", "Tiaret",
    "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Setif", "Saida", "Skikda",
    "Sidi Bel Abbes", "Annaba", "Guelma", "Constantine", "Medea", "Mostaganem",
    "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi",
    "Bordj Bou Arreridj", "Boumerdes", "El Tarf", "Tindouf", "Tissemsilt",
    "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Ain Defla",
    "Naama", "Ain Temouchent", "Ghardaia", "Relizane", "Timimoun",
    "Bordj Badji Mokhtar", "Ouled Djellal", "Beni Abbes", "In Salah",
    "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa",
]

# Known carrier providers.
CARRIER_PROVIDERS = [
    "yalidine", "zr_express", "noest", "amana", "ems",
    "dhl", "fedex", "ups", "aramex", "custom",
]

# Known store platforms.
STORE_PLATFORMS = [
    "shopify", "woocommerce", "magento", "opencart", "custom",
]
