import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

import config

# Defaults to SQLite for local development, but supports PostgreSQL via DATABASE_URL.
SQLALCHEMY_DATABASE_URL = config.DATABASE_URL or os.getenv("DATABASE_URL", "sqlite:///./securesync.db")

engine_kwargs = {"pool_pre_ping": True}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
