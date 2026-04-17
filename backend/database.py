import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

import config

# Defaults to SQLite for local development, but supports PostgreSQL via DATABASE_URL.
SQLALCHEMY_DATABASE_URL = config.DATABASE_URL or os.getenv("DATABASE_URL", "sqlite:///./securesync.db")

engine_kwargs = {"pool_pre_ping": True}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000") # 64MB Cache
        cursor.execute("PRAGMA temp_store=MEMORY") # Sort in RAM
        cursor.execute("PRAGMA mmap_size=30000000000") # Memory-map DB
        # Ensure timeout handles concurrent lock waits
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
