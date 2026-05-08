import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
from sqlalchemy.orm import sessionmaker

load_dotenv()

from models.base import Base  # noqa: F401
import models  # noqa: F401 — register all models on Base.metadata

from database import engine

Session = sessionmaker(bind=engine)
session = Session()

Base.metadata.create_all(engine)
print("Database tables created successfully.")
