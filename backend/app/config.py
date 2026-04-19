"""Application configuration loaded from environment.

We load ``backend/.env`` at import time via python-dotenv so that credentials
baked into the Docker image (DATABASE_URL, SUPABASE_*, AUTOFLOW_JWT_SECRET) are
available at runtime even when the deploy tooling does not forward env vars.
``dotenv`` is a no-op if the file is missing (e.g. local pytest runs), and it
does NOT override variables that are already set in the environment — so Fly
secrets or developer shell exports always win over the baked-in file.
"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - dotenv is a soft dep
    load_dotenv = None  # type: ignore[assignment]


if load_dotenv is not None:
    # Look for a .env next to the backend package (…/backend/.env).
    _env_file = Path(__file__).resolve().parent.parent / ".env"
    if _env_file.is_file():
        load_dotenv(_env_file, override=False)


def _env(name: str, default: str) -> str:
    # Use `is not None` rather than truthiness so that an explicitly-set empty
    # string is honoured instead of silently falling back to the hardcoded
    # default. For `AUTOFLOW_JWT_SECRET` especially, swapping an accidental
    # `FOO=` for the known-public default would let an attacker forge JWTs.
    value = os.environ.get(name)
    return value if value is not None else default


# Database selection:
#  - If DATABASE_URL is set in the environment, we honour it verbatim. This is
#    how production (auto Flow on Supabase Postgres) is configured: the Fly
#    secret DATABASE_URL points at the Supavisor pooler and overrides
#    everything below. Any postgres://... URL is normalised to postgresql://.
#  - Otherwise we fall back to the SQLite volume at /data/app.db (for local
#    dev and old deployments without Supabase).
_explicit_db_url = os.environ.get("DATABASE_URL") or os.environ.get("AUTOFLOW_DATABASE_URL")
if _explicit_db_url:
    # SQLAlchemy 2.x wants the "postgresql://" scheme, not "postgres://".
    if _explicit_db_url.startswith("postgres://"):
        _explicit_db_url = "postgresql://" + _explicit_db_url[len("postgres://"):]
    # We install psycopg (v3) — force SQLAlchemy to use it rather than the
    # legacy psycopg2 driver it picks by default when the scheme is just
    # "postgresql://".
    if _explicit_db_url.startswith("postgresql://"):
        _explicit_db_url = "postgresql+psycopg://" + _explicit_db_url[len("postgresql://"):]
    DATABASE_URL = _explicit_db_url
    DATA_DIR = Path(_env("AUTOFLOW_DATA_DIR", "/data"))
    DB_PATH = DATA_DIR / "app.db"  # kept for legacy tooling; unused when Postgres is active
else:
    # Legacy SQLite fallback.
    DATA_DIR = Path(_env("AUTOFLOW_DATA_DIR", "/data"))
    DB_PATH = DATA_DIR / "app.db"
    if not DATA_DIR.exists():
        DATA_DIR = Path(__file__).resolve().parent.parent
        DB_PATH = DATA_DIR / "dev.db"
    DATABASE_URL = f"sqlite:///{DB_PATH}"

# JWT
#
# A stable default is used when AUTOFLOW_JWT_SECRET is not set so that every
# worker process (and every restart of the same process) signs tokens with the
# same key. A random-per-process fallback looks safe but silently logs users
# out on every restart and causes intermittent 401s in multi-worker
# deployments (uvicorn --workers, Fly scaling). Production deployments must
# still override AUTOFLOW_JWT_SECRET with a real secret.
JWT_SECRET = _env(
    "AUTOFLOW_JWT_SECRET",
    "change-me-in-production-autoflow-insecure-default-key",
)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Trial
TRIAL_DAYS = 14

# Platform
PLATFORM_NAME = "auto Flow"
SUPPORT_WHATSAPP = "+213794157508"
