from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, init_db
from .errors import register_error_handlers
from .migrations import maybe_migrate_sqlite_to_target
from .routers import (
    agents,
    auth,
    carriers,
    customers,
    dashboard,
    notifications,
    orders,
    products,
    returns,
    settings as settings_router,
    shipments,
    stores,
    subscriptions,
    team,
    webhooks,
)

app = FastAPI(title="auto Flow API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

register_error_handlers(app)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    # One-shot SQLite -> Postgres migration (runs only when DATABASE_URL
    # points at Postgres, /data/app.db exists, and the Postgres side is
    # empty). Safe to call on every boot: it no-ops afterwards.
    try:
        maybe_migrate_sqlite_to_target(engine)
    except Exception:  # noqa: BLE001
        # Never crash the API on migration failure — log and continue.
        import logging
        logging.getLogger("autoflow").exception("sqlite->postgres migration failed")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "auto Flow API"}


app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(agents.router)
app.include_router(orders.router)
app.include_router(notifications.router)
app.include_router(subscriptions.router)
app.include_router(dashboard.router)
# Octomatic-style extensions
app.include_router(stores.router)
app.include_router(carriers.router)
app.include_router(products.router)
app.include_router(shipments.router)
app.include_router(returns.router)
app.include_router(team.router)
app.include_router(settings_router.router)
app.include_router(webhooks.router)
