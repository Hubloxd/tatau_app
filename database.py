from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, configure_mappers
from contextlib import contextmanager
from dotenv import load_dotenv
from urllib.parse import urlparse
import os


from models import Base  # ensure all models are registered, incl. comments

load_dotenv()
configure_mappers()


def build_sqlalchemy_url() -> str:
    raw = os.getenv("DATABASE_URL")
    if not raw:
        raise RuntimeError("DATABASE_URL is not set")
    u = urlparse(raw)
    sslmode = os.getenv("POSTGRES_SSLMODE", "require")
    host = u.hostname or ""
    if u.port:
        host = f"{host}:{u.port}"
    if u.username is not None:
        auth = f"{u.username}:{u.password}@" if u.password is not None else f"{u.username}@"
    else:
        auth = ""
    path = u.path or ""
    return f"postgresql+psycopg2://{auth}{host}{path}?sslmode={sslmode}"


engine = create_engine(build_sqlalchemy_url(), echo=True)

# Ensure tables exist (no-op if already present)
Base.metadata.create_all(engine)

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
