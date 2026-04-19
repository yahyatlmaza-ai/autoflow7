"""One-time SQLite -> Postgres data migration.

Used when auto Flow's backend flips its DATABASE_URL from the legacy local
SQLite (on the Fly persistent volume at /data/app.db) to a Postgres instance
(Supabase). On boot, main.py calls ``maybe_migrate_sqlite_to_target()``.

The migration is idempotent-by-design:
  * It only runs when the target Postgres DB is a postgres URL, the legacy
    SQLite file exists, AND the target Postgres has no tenants yet (i.e.
    it has not been migrated / seeded already).
  * After a successful copy it renames the SQLite file to ``app.db.migrated``
    so it will not be migrated again on subsequent boots.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Iterable

from sqlalchemy.engine.url import make_url
from sqlmodel import Session, SQLModel, create_engine, select, text

logger = logging.getLogger("autoflow.migrations.sqlite_to_postgres")


# Order matters: parents before children so foreign keys resolve.
MIGRATION_ORDER: list[str] = [
    "Tenant",
    "TenantSettings",
    "User",
    "OTPSession",
    "Customer",
    "DeliveryAgent",
    "Store",
    "Carrier",
    "Product",
    "DeliveryRate",
    "Order",
    "OrderStatusHistory",
    "Shipment",
    "ReturnItem",
    "TeamMember",
    "ConfirmationAttempt",
    "WebhookEndpoint",
    "Notification",
]


def _iter_rows(session: Session, model_cls) -> Iterable:
    return session.exec(select(model_cls)).all()


def _copy_model(src: Session, dst: Session, model_cls) -> int:
    rows = list(_iter_rows(src, model_cls))
    copied = 0
    for row in rows:
        # Rebuild as a new detached instance to avoid bringing SQLite session
        # state across. Use model_dump so we stay schema-agnostic.
        payload = row.model_dump()
        dst.add(model_cls(**payload))
        copied += 1
    if copied:
        dst.flush()
    return copied


def _reset_sequences(dst: Session, model_cls) -> None:
    """After bulk insert with explicit IDs, bump the Postgres sequence so
    subsequent inserts without an explicit ID don't collide.
    """
    table = model_cls.__tablename__
    pk_cols = [c.name for c in model_cls.__table__.primary_key.columns]
    # TenantSettings uses tenant_id as PK (not a generated column) — skip.
    if pk_cols != ["id"]:
        return
    seq = f"{table}_id_seq"
    try:
        dst.exec(text(
            f"SELECT setval('{seq}', COALESCE((SELECT MAX(id) FROM {table}), 1))"
        ))
    except Exception as exc:  # pragma: no cover - best-effort
        logger.warning("sequence reset failed for %s: %s", table, exc)


def maybe_migrate_sqlite_to_target(target_engine) -> bool:
    """Run a one-shot SQLite -> Postgres copy if the conditions are right.

    Returns True if a migration actually ran, False if skipped.
    """
    target_url = make_url(str(target_engine.url))
    if target_url.get_backend_name() == "sqlite":
        return False  # Target IS sqlite; nothing to migrate.

    sqlite_path_str = os.environ.get(
        "AUTOFLOW_LEGACY_SQLITE_PATH",
        "/data/app.db",
    )
    sqlite_path = Path(sqlite_path_str)
    if not sqlite_path.exists():
        logger.info("no legacy sqlite at %s, skipping migration", sqlite_path)
        return False

    # Guard: if the target already has tenants, assume migration was done.
    with Session(target_engine) as probe:
        existing = probe.exec(text("SELECT COUNT(*) FROM tenants")).first()
        count = int(existing[0]) if existing else 0
    if count > 0:
        logger.info(
            "target Postgres already has %d tenants; skipping sqlite migration",
            count,
        )
        return False

    logger.info(
        "starting one-shot sqlite -> postgres migration from %s", sqlite_path
    )
    src_engine = create_engine(
        f"sqlite:///{sqlite_path}",
        echo=False,
        connect_args={"check_same_thread": False},
    )

    # Resolve model classes by name lazily to avoid circular imports at import
    # time of this module.
    from .. import models as m  # noqa: WPS433

    name_to_cls = {cls.__name__: cls for cls in SQLModel.__subclasses__() if hasattr(cls, "__tablename__")}
    # Some models in models.py may not be direct subclasses; fall back to getattr.
    for name in MIGRATION_ORDER:
        if name not in name_to_cls:
            cls = getattr(m, name, None)
            if cls is not None:
                name_to_cls[name] = cls

    with Session(src_engine) as src, Session(target_engine) as dst:
        total = 0
        for name in MIGRATION_ORDER:
            cls = name_to_cls.get(name)
            if cls is None:
                logger.warning("model %s not found; skipping", name)
                continue
            try:
                n = _copy_model(src, dst, cls)
                total += n
                if n:
                    logger.info("  copied %3d rows into %s", n, cls.__tablename__)
            except Exception as exc:  # pragma: no cover
                logger.error("failed copying %s: %s", name, exc)
                raise
        dst.commit()

        # Fix auto-increment sequences so next insert doesn't clash.
        for name in MIGRATION_ORDER:
            cls = name_to_cls.get(name)
            if cls is not None:
                _reset_sequences(dst, cls)
        dst.commit()

    # Rename the legacy file so the migration is not re-attempted.
    try:
        sqlite_path.rename(sqlite_path.with_suffix(sqlite_path.suffix + ".migrated"))
    except Exception as exc:  # pragma: no cover
        logger.warning("could not rename legacy sqlite file: %s", exc)

    logger.info("sqlite -> postgres migration complete (%d rows total)", total)
    return True
