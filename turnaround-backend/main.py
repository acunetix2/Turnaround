"""
Turnaround Backend — Top-level ASGI entry point.

Start dev server:
    uvicorn main:app --reload --port 8000

Or via run.py:
    python run.py
"""
from app.main import app

__all__ = ["app"]
