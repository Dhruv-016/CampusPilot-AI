"""LangGraph agent. Each node is real behaviour; the graph is bounded (no cycles, max tool calls enforced)."""
import json
import operator
import re
import time
from typing import Annotated, TypedDict

from langgraph.graph import END, StateGraph
from sqlalchemy import select

from . import llm, memory as memsvc, tools
from .config import settings
from .context import budget_chunks, clip, select_history, select_memories
from .models import Memory, Message
from .rules import ROUTES, extract_memory_candidate, route_heuristic
from .safety import sanitize

MSG_NOT_FOUND = "I couldn't find a matching record in the synthetic demo dataset."
MSG_TOOL_ERR = "The student-record tool is temporarily unavailable. Please try again."
MSG_NO_EVIDENCE = ("I couldn't verify that from the available handbook. The sample handbook doesn't establish an answer, "
                   "so please contact the Student Help Desk (helpdesk@campuspilot.example).")
MSG_CLARIFY = "Could you tell me a bit more about what you need? For example, ask about your fee status, a handbook policy, or an academic-calendar date."
MSG_SENSITIVE = "I won't save sensitive information as long-term memory."
MSG_MEM_UNSUPPORTED = "I can only save simple, non-sensitive preferences, such as response style, preferred language or your programme."
MSG_DIRECT = ("Hi! I'm CampusPilot AI. I can check your demo fee status, look up academic-calendar events, search the sample "
              "student handbook for policies, and remember simple preferences like how you like answers written.")
MONTHS = {m: i + 1 for i, m in enumerate("january february march april may june july august september october november december".split())}


class AgentState(TypedDict, total=False):
    request_id: str
    conversation_id: str
    student_id: str | None
    user_message: str
    sanitized_message: str
    redactions: list
    use_llm: bool
    fault: str | None
    t0: float
    history: list
    memories: list
    route: str
    router_source: str
    tool_calls: Annotated[list, operator.add]
    tool_results: dict
    chunks: list
    answer: str
    error_category: str | None
    fallback_used: bool
    provider_status: str
    llm_calls: int
    llm_calls_with_usage: int
    input_tokens: int
    output_tokens: int
    total_tokens: int
    context_meta: dict
    memory_saved: dict | None
    notices: list
    retrieval_mode: str | None
    events: Annotated[list, operator.add]


def ev(state: dict, stage: str, detail: str = "") -> dict:
    return {"stage": stage, "t_ms": round((time.perf_counter() - state.get("t0", time.perf_counter())) * 1000, 1), "detail": detail}

def _count_usage(state: dict, res: llm.LLMResult) -> dict:
    out = {"llm_calls": state.get("llm_calls", 0) + 1, "llm_calls_with_usage": state.get("llm_calls_with_usage", 0)}
    if res.total_tokens is not None:
        out["llm_calls_with_usage"] += 1
        out["input_tokens"] = state.get("input_tokens", 0) + (res.input_tokens or 0)
        out["output_tokens"] = state.get("output_tokens", 0) + (res.output_tokens or 0)
        out["total_tokens"] = state.get("total_tokens", 0) + res.total_tokens
    return out


def _use_llm(state: dict) -> bool:
    return bool(state.get("use_llm", True)) and llm.configured()


def build_graph(db):
    # ---------- nodes ----------
    def validate(s):
        msg = (s.get("user_message") or "").strip()
        if not msg:
            return {"route": "fallback", "answer": MSG_CLARIFY, "error_category": "invalid_request", "events": [ev(s, "validate", "empty message")]}
        return {"user_message": msg[: settings.max_message_chars], "events": [ev(s, "request_received", f"{len(msg)} chars")]}

    def sanitize_node(s):
        clean, cats = sanitize(s["user_message"])
        return {"sanitized_message": clean, "redactions": cats,
                "events": [ev(s, "sanitize", f"{len(cats)} sensitive pattern(s) redacted" if cats else "no sensitive patterns found")]}

    def load_context(s):
        rows = db.scalars(select(Message).where(Message.conversation_id == s["conversation_id"]).order_by(Message.id.desc()).limit(12)).all()
        history_all = [{"role": r.role, "content": r.content} for r in reversed(rows)]
        history, truncated = select_history(history_all)
        mems, picked = [], []
        if settings.memory_enabled and s.get("student_id"):
            mems = memsvc.list_memories(db, s["student_id"])
            picked = select_memories(mems, s["sanitized_message"])
        meta = {"history_selected": len(history), "history_available": len(history_all), "memories_selected": len(picked),
                "memories_available": len(mems), "truncated": truncated}
        return {"history": history, "memories": picked, "context_meta": meta,
                "events": [ev(s, "context_selected", f"{len(history)} recent messages, {len(picked)} permitted memories")]}

    def decide(s):
        if s.get("route"):  # set by validate on invalid input
            return {"router_source": "validation"}
        h = route_heuristic(s["sanitized_message"], s.get("student_id"))
        route, source = h, "heuristic"
        if h not in ("memory", "clarify") and _use_llm(s):
            try:
                res = llm.chat([
                    {"role": "system", "content": "Classify the student's message into exactly one route: direct (greeting/capabilities), fee (their own fee status), "
                     "calendar (academic dates/events), policy (handbook rules/procedures). Reply with JSON only: {\"route\": \"...\"}"},
                    {"role": "user", "content": s["sanitized_message"]}], max_tokens=30, temperature=0)
                upd = _count_usage(s, res)
                m = re.search(r"\{.*\}", res.text, re.S)
                cand = json.loads(m.group(0)).get("route") if m else None
                if cand in {"direct", "fee", "calendar", "policy"}:
                    route, source = cand, "llm"
                else:
                    source = "heuristic_after_invalid_llm_output"
                return {"route": route, "router_source": source, **upd, "events": [ev(s, "action_selected", f"{route} via {source}")]}
            except (llm.LLMError, ValueError, KeyError):
                source = "heuristic_after_llm_error"
        if route == "fee" and not s.get("student_id"):
            route = "clarify"
        return {"route": route, "router_source": source, "events": [ev(s, "action_selected", f"{route} via {source}")]}

    def fee_node(s):
        sid = s.get("student_id")
        if not sid:
            return {"route": "clarify", "answer": MSG_CLARIFY, "events": [ev(s, "tool_skipped", "missing student id")]}
        rec, res = _call(s, "get_fee_status", {"student_id": sid}, lambda: tools.get_fee_status(db, sid, fault=s.get("fault")), "Checked the demo fee record")
        out = {"tool_calls": [rec], "events": [ev(s, "tool_executed", f"get_fee_status → {rec['status']}")]}
        if rec["status"] == "error":
            out.update(error_category="tool_error", answer=MSG_TOOL_ERR)
        elif res["status"] == "not_found":
            out["answer"] = MSG_NOT_FOUND
        else:
            out["tool_results"] = {"fee": res["data"]}
        return out

    def calendar_node(s):
        msg = s["sanitized_message"].lower()
        month = next((n for name, n in MONTHS.items() if name in msg), None)
        etype = "semester" if "semester" in msg and re.search(r"begin|start", msg) else ("exam" if "exam" in msg else None)
        rec, res = _call(s, "get_academic_calendar", {"month": month, "event_type": etype},
                         lambda: tools.get_academic_calendar(db, month=month, event_type=etype, limit=1 if not month else 5), "Looked up the academic calendar")
        out = {"tool_calls": [rec], "events": [ev(s, "tool_executed", f"get_academic_calendar → {rec['status']}")]}
        if rec["status"] == "error":
            out.update(error_category="tool_error", answer=MSG_TOOL_ERR)
        elif res["status"] == "empty":
            out["answer"] = "I couldn't find a matching upcoming event in the demo academic calendar."
        else:
            out["tool_results"] = {"calendar": res["data"]}
        return out

    def policy_node(s):
        rec, res = _call(s, "search_student_policy", {"query": clip(s["sanitized_message"], 200)},
                         lambda: tools.search_student_policy(db, s["sanitized_message"], fault=s.get("fault")), "Retrieved handbook sections")
        out = {"tool_calls": [rec]}
        if rec["status"] == "error":
            out.update(error_category="tool_error", answer=MSG_TOOL_ERR, events=[ev(s, "tool_executed", "search_student_policy → error")])
            return out
        chunks, truncated = budget_chunks(res["data"]["chunks"])
        meta = dict(s.get("context_meta", {}), chunks_retrieved=len(res["data"]["chunks"]), chunks_selected=len(chunks))
        meta["truncated"] = meta.get("truncated", False) or truncated
        out.update(chunks=chunks, retrieval_mode=res["data"]["mode"], context_meta=meta,
                   events=[ev(s, "tool_executed", f"search_student_policy → {len(chunks)} chunk(s)")])
        if not chunks:
            out.update(route="fallback", answer=MSG_NO_EVIDENCE)
        return out

    def memory_node(s):
        if s.get("redactions"):
            return {"answer": MSG_SENSITIVE, "notices": [MSG_SENSITIVE], "events": [ev(s, "memory_blocked", "sensitive content detected; nothing saved")]}
        if not settings.memory_enabled:
            return {"answer": "Long-term memory is disabled in this configuration.", "events": [ev(s, "memory_disabled")]}
        cand = extract_memory_candidate(s["sanitized_message"])
        if not cand or not s.get("student_id"):
            return {"answer": MSG_MEM_UNSUPPORTED, "events": [ev(s, "memory_rejected", "not an allowed preference")]}
        try:
            m, created = memsvc.add_memory(db, s["student_id"], *cand)
        except ValueError:
            return {"answer": "You've reached the memory limit. Please delete a saved preference first.", "events": [ev(s, "memory_rejected", "limit")]}
        return {"memory_saved": m, "answer": f"Saved your preference: “{m['content']}”." if created else f"I already have that saved: “{m['content']}”.",
                "events": [ev(s, "memory_saved" if created else "memory_duplicate", m["category"])]}

    def direct_node(s):
        return {"events": [ev(s, "direct_answer", "no tool required")]}

    def clarify_node(s):
        return {"answer": s.get("answer") or MSG_CLARIFY, "events": [ev(s, "clarification")]}

    def fallback_node(s):
        return {"answer": s.get("answer") or MSG_NO_EVIDENCE, "fallback_used": True, "events": [ev(s, "safe_fallback")]}

    def generate(s):
        if s.get("answer"):
            return {"provider_status": "not_applicable", "events": [ev(s, "response_ready", "deterministic message")]}
        local = compose_local(s)
        if not _use_llm(s):
            return {"answer": local, "provider_status": "limited_mode_no_llm", "fallback_used": True,
                    "events": [ev(s, "response_generated", "limited mode (no live LLM)")]}
        try:
            res = llm.chat(build_prompt(s), max_tokens=450)
            upd = _count_usage(s, res)
            if not res.text:
                raise llm.LLMError("llm_empty_output")
            if s["route"] == "fee" and str(s["tool_results"]["fee"]["outstanding_amount"]) not in res.text.replace(",", ""):
                raise llm.LLMError("llm_ungrounded_output")
            return {"answer": res.text, "provider_status": "live_llm", **upd, "events": [ev(s, "response_generated", "live LLM")]}
        except llm.LLMError as e:
            return {"answer": local, "provider_status": "llm_error_fallback", "error_category": e.category, "fallback_used": True,
                    "events": [ev(s, "response_generated", f"fallback after {e.category}")]}

    # ---------- helpers ----------
    def _call(s, name, args, fn, summary):
        if name not in tools.TOOL_REGISTRY or len(s.get("tool_calls", [])) >= settings.max_tool_calls:
            raise RuntimeError("tool not allowed")
        t = time.perf_counter()
        rec = {"name": name, "args": args, "summary": summary}
        try:
            res = fn()
            rec["status"] = res["status"]
        except Exception as e:  # noqa: BLE001 - safe category only
            res, rec["status"], rec["error"] = None, "error", type(e).__name__
        rec["duration_ms"] = round((time.perf_counter() - t) * 1000, 2)
        return rec, res

    g = StateGraph(AgentState)
    for name, fn in [("validate", validate), ("sanitize", sanitize_node), ("load_context", load_context), ("decide", decide),
                     ("fee_node", fee_node), ("calendar_node", calendar_node), ("policy_node", policy_node), ("memory_node", memory_node),
                     ("direct_node", direct_node), ("clarify_node", clarify_node), ("fallback_node", fallback_node), ("generate", generate)]:
        g.add_node(name, fn)
    g.set_entry_point("validate")
    g.add_edge("validate", "sanitize")
    g.add_edge("sanitize", "load_context")
    g.add_edge("load_context", "decide")
    g.add_conditional_edges("decide", lambda s: s["route"], {r: f"{r}_node" for r in ROUTES})
    for r in ROUTES:
        g.add_edge(f"{r}_node", "generate")
    g.add_edge("generate", END)
    return g.compile()


# ---------- composition ----------
def _wants_concise(s) -> bool:
    return any(re.search(r"concise|brief|short", m["content"], re.I) for m in s.get("memories", []))


def compose_local(s) -> str:
    """Deterministic answer from tool data. Used in limited mode and as LLM fallback. NOT a live LLM answer."""
    concise = _wants_concise(s)
    if s["route"] == "fee":
        f = s["tool_results"]["fee"]
        line = (f"{f['semester']}: total INR {f['total_fee']:,}, paid INR {f['paid_amount']:,}, outstanding INR {f['outstanding_amount']:,} "
                f"({f['status'].replace('_', ' ').title()}), due {f['due_date']}.")
        return line + ("" if concise else f"\n\nThis is synthetic demo data for {f['student_name']}.")
    if s["route"] == "calendar":
        ev_ = s["tool_results"]["calendar"]["events"]
        return "\n".join(f"- {e['title']} — {e['date']}" + ("" if concise else f" ({e['description']})") for e in ev_)
    if s["route"] == "policy":
        chunks = s["chunks"][:1] if concise else s["chunks"][:2]
        parts = []
        for c in chunks:
            body = c["content"].split("\n", 1)[-1]
            if concise:
                body = " ".join(re.split(r"(?<=[.!?])\s+", body)[:2])
            parts.append(f"**{c['section_title']}** ({c['source_location']}): {clip(body, 600)}")
        return "Limited mode (no live LLM) — showing the most relevant handbook text:\n\n" + "\n\n".join(parts)
    return MSG_DIRECT


def build_prompt(s) -> list[dict]:
    sys = ("You are CampusPilot AI, an intelligent student-support assistant for university students. "
           "Answer accurately and helpfully using the provided tool data, handbook excerpts, and academic guidance. "
           "Never invent unverified fee amounts or calendar dates. "
           "When answering official policies or procedures, ground your answer in the handbook excerpts and mention relevant sections or portals. "
           "Provide clear, actionable, step-by-step guidance for course inquiries, attendance rules, registration, and campus procedures. "
           "Keep answers polite, professional, and well-structured.")
    prefs = [m["content"] for m in s.get("memories", [])]
    if prefs:
        sys += " The student's saved preferences (follow them): " + "; ".join(prefs)
    ctx = ""
    if s.get("tool_results"):
        ctx += "TOOL DATA:\n" + json.dumps(s["tool_results"], default=str)[:2500] + "\n"
    if s.get("chunks"):
        ctx += "HANDBOOK EXCERPTS:\n" + "\n---\n".join(f"[{c['source_location']} · {c['section_title']}]\n{c['content']}" for c in s["chunks"]) + "\n"
    msgs = [{"role": "system", "content": sys}]
    msgs += [{"role": m["role"], "content": m["content"]} for m in s.get("history", [])][-4:]
    msgs.append({"role": "user", "content": f"{ctx}\nQUESTION: {s['sanitized_message']}"})
    return msgs
