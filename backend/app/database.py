"""SQLModel engine and session setup.

The engine is configured based on the URL scheme:
  * SQLite: adds ``check_same_thread=False`` so FastAPI's threaded request
    handler can share a connection safely.
  * Postgres (Supabase): uses ``pool_pre_ping`` so stale Supavisor connections
    are recycled, and ``pool_recycle`` to keep the pool healthy behind NATs.
"""
from collections.abc import Iterator

from sqlalchemy.engine.url import make_url
from sqlmodel import Session, SQLModel, create_engine

from .config import DATABASE_URL

_url = make_url(DATABASE_URL)
_is_sqlite = _url.get_backend_name() == "sqlite"

if _is_sqlite:
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    # Postgres / Supabase pooler.
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=1800,
    )


def init_db() -> None:
    """Create all tables. Safe to call repeatedly."""
    # Import models so SQLModel.metadata knows about them.
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency that yields a DB session."""
    with Session(engine) as session:
        yield session
