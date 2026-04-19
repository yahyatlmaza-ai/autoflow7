# auto Flow — Backend

FastAPI + SQLModel + SQLite backend for the **auto Flow** logistics SaaS platform.

## Local dev

```bash
cd backend
poetry install
AUTOFLOW_DATA_DIR=/tmp/autoflow-dev poetry run uvicorn app.main:app --reload --port 8001
```

Open http://127.0.0.1:8001/docs for the OpenAPI UI.

## Environment variables

- `AUTOFLOW_DATA_DIR` (default `/data`) — directory that holds `app.db`. Falls
  back to `backend/dev.db` when the dir doesn't exist so local dev doesn't need
  `/data` to be writable.
- `AUTOFLOW_JWT_SECRET` — override the JWT signing secret in production.

## Structure

```
app/
  main.py          FastAPI app, CORS, router wiring
  config.py        env-driven settings
  database.py      SQLModel engine + init_db()
  models.py        Tenant, User, Customer, DeliveryAgent, Order, OrderStatusHistory, Notification
  security.py      bcrypt hashing + JWT
  deps.py          get_current_user / tenant / require_active_subscription
  errors.py        structured error responses with stable codes
  routers/
    auth.py            /auth/signup, /auth/login, /auth/me, /auth/change-password
    customers.py       /customers CRUD (tenant-scoped)
    agents.py          /agents CRUD + /agents/{id}/performance
    orders.py          /orders CRUD + /status + /history + /bulk/* + /export.csv
    notifications.py   /notifications + /notifications/mark-read
    subscriptions.py   /subscriptions/status + /subscriptions/upgrade
    dashboard.py       /dashboard/stats (totals, by_status, daily_30d, top_agents)
```

## Multi-tenant model

Every domain table carries `tenant_id`. `Tenant` rows are auto-created on signup
(one per company) and the owner user is linked to it. All query paths go through
`get_current_tenant` and filter on `tenant.id` — no cross-tenant reads are possible
via the HTTP API.

## Order lifecycle

```
pending --confirm--> confirmed --ship--> shipped --deliver--> delivered
   \                      \                  \
    \                      \                  \---cancel---> cancelled
     \----cancel-----------+------cancel-------/
```

`POST /orders/{id}/status` enforces `ALLOWED_TRANSITIONS`; every change appends
to `order_status_history` and emits an in-app notification. Bulk endpoints use
the same state machine and report per-id errors.

## Trial & subscriptions

- Signup creates a `Tenant` with `plan=trial` and `trial_end = now + 14d`.
- `require_active_subscription` gates write endpoints; expired tenants get
  `TRIAL_EXPIRED` (HTTP 402) so the frontend can show the upgrade wall.
- `POST /subscriptions/upgrade` is a dev-only endpoint that marks the plan as
  paid for the configured duration (Professional 180d, VIP 2008d ≈ 5.5y).

## Error shape

All errors return:

```json
{ "error": { "code": "EMAIL_EXISTS", "message": "...", "fields": { "email": "..." } } }
```

The frontend maps `code` to humanized text in EN/FR/AR.
