import logging
import os
from contextlib import contextmanager
from urllib.parse import parse_qsl, urlencode, urlparse

import env_bootstrap  # noqa: F401 — .env / google_cloud.json wg LOCAL_ONLY
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, configure_mappers, sessionmaker

from models import Base  # ensure all models are registered, incl. comments

configure_mappers()

logger = logging.getLogger(__name__)


def build_sqlalchemy_url() -> str:
    raw = os.getenv("DATABASE_URL")
    if not raw:
        raise RuntimeError("DATABASE_URL is not set")
    u = urlparse(raw)
    host = u.hostname or ""
    if u.port:
        host = f"{host}:{u.port}"
    if u.username is not None:
        auth = f"{u.username}:{u.password}@" if u.password is not None else f"{u.username}@"
    else:
        auth = ""
    path = u.path or ""
    # Zachowaj parametry z URL (Neon: sslmode, channel_binding); nie nadpisuj całości jednym sslmode.
    params = dict(parse_qsl(u.query, keep_blank_values=True))
    if "POSTGRES_SSLMODE" in os.environ:
        params["sslmode"] = os.environ["POSTGRES_SSLMODE"]
    elif "sslmode" not in params:
        params["sslmode"] = "require"
    query = urlencode(params)
    qs = f"?{query}" if query else ""
    return f"postgresql+psycopg2://{auth}{host}{path}{qs}"


engine = create_engine(build_sqlalchemy_url(), echo=True)

# Ensure tables exist (no-op if already present)
Base.metadata.create_all(engine)


def ensure_user_profile_columns() -> None:
    """Dodaje kolumny profilu do istniejącej tabeli users (PostgreSQL)."""
    try:
        insp = inspect(engine)
        tables = insp.get_table_names()
        if "users" not in tables:
            return
        cols = {c["name"] for c in insp.get_columns("users")}
        with engine.begin() as conn:
            if "bio" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
                logger.info("Migracja: dodano kolumnę users.bio")
            if "avatar_url" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))
                logger.info("Migracja: dodano kolumnę users.avatar_url")
            if "profile_public" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN profile_public BOOLEAN NOT NULL DEFAULT true"
                    )
                )
                logger.info("Migracja: dodano kolumnę users.profile_public")
    except Exception as e:
        logger.warning("Nie udało się zweryfikować migracji users: %s", e)


ensure_user_profile_columns()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def get_db():
    """
    Context manager that yields a database session and ensures it's closed when done.
    Usage:
        with get_db() as db:
            users = db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

# For FastAPI dependency
def get_db_session():
    """
    For FastAPI dependency injection.
    Usage:
        @app.get("/users/")
        def get_users(db: Session = Depends(get_db_session)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
