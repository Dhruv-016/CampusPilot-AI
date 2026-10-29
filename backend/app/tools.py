"""Explicitly registered tools. Every tool returns {"status": ok|not_found|empty|error, "data": ...}."""
import re
from datetime import date
from sqlalchemy import select
from .config import settings
from .models import CalendarEvent, FeeRecord, Student
from .retrieval_service import get_retriever

STUDENT_ID_RX = re.compile(r"^STU-(?:DEMO|\d{4}|[A-Za-z0-9]+)(?:-[A-Za-z0-9]+)*$")
TOOL_REGISTRY = ("get_fee_status", "get_academic_calendar", "search_student_policy")


class ToolError(Exception):
    pass


def get_fee_status(db, student_id: str, fault: str | None = None) -> dict:
    if fault == "tool_error":
        raise ToolError("injected fault")
    if not STUDENT_ID_RX.match(student_id or ""):
        return {"status": "not_found", "data": None}
    student = db.get(Student, student_id)
    fee = db.scalars(select(FeeRecord).where(FeeRecord.student_id == student_id).order_by(FeeRecord.due_date.desc())).first()
    if not student or not fee:
        return {"status": "not_found", "data": None}
    outstanding = fee.total_fee - fee.paid_amount
    status = "PAID" if outstanding <= 0 else ("UNPAID" if fee.paid_amount == 0 else "PARTIALLY_PAID")
    return {"status": "ok", "data": {
        "student_id": student_id, "student_name": student.name, "semester": fee.semester,
        "total_fee": fee.total_fee, "paid_amount": fee.paid_amount, "outstanding_amount": outstanding,
        "status": status, "due_date": fee.due_date.isoformat(), "currency": fee.currency, "is_demo_data": bool(student.is_demo)}}


def today() -> date:
    return date.fromisoformat(settings.demo_today) if settings.demo_today else date.today()


def get_academic_calendar(db, month: int | None = None, event_type: str | None = None, limit: int = 3) -> dict:
    t = today()
    q = select(CalendarEvent).order_by(CalendarEvent.event_date)
    if event_type:
        q = q.where(CalendarEvent.event_type == event_type)
    rows = db.scalars(q).all()
    start = t.replace(day=1) if month else t
    rows = [r for r in rows if r.event_date >= start and (month is None or r.event_date.month == month)][:limit]
    if not rows:
        return {"status": "empty", "data": {"events": [], "as_of": t.isoformat()}}
    return {"status": "ok", "data": {"as_of": t.isoformat(), "events": [
        {"title": r.title, "date": r.event_date.isoformat(), "type": r.event_type, "description": r.description} for r in rows]}}


def search_student_policy(db, query: str, limit: int = 3, fault: str | None = None) -> dict:
    if fault == "no_retrieval":
        return {"status": "empty", "data": {"chunks": [], "mode": "lexical-bm25"}}
    r = get_retriever(db)
    hits = r.search(query, limit=limit)
    return {"status": "ok" if hits else "empty", "data": {"chunks": hits, "mode": r.mode}}
