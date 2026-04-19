"""One-shot migration utilities invoked from main.startup()."""
from .sqlite_to_postgres import maybe_migrate_sqlite_to_target

__all__ = ["maybe_migrate_sqlite_to_target"]
