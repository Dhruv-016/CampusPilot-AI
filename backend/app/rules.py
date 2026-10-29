"""Deterministic routing heuristics and memory-candidate extraction. Pure functions."""
import re
from .retrieval import tokenize

ROUTES = {"direct", "fee", "calendar", "policy", "memory", "clarify", "fallback"}

_GREETING = re.compile(r"^\s*(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you)\b|what can you (help|do)|who are you", re.I)
_MEMORY = re.compile(r"\b(remember|save this|note that|keep in mind)\b", re.I)
_FEE = re.compile(r"\b(fee status|fees status|outstanding|balance|how much (do i|have i|am i)|amount (paid|due|pending)|my fees?|pending fees?)\b", re.I)
_POLICY_CUES = re.compile(r"\b(handbook|policy|policies|portal|deadline|scholarship|scholarships|course|courses|subject|subjects|syllabus|curriculum|registration|attendance|leave|exam|exams|examination|grade|grades|gpa|credit|credits|campuspilot|architecture|system|working day|refund|late fee|rule|rules|contact|office|allowed|can i|payment)\b", re.I)
_CALENDAR = re.compile(r"\b(calendar|academic event|next event|semester (begin|start)|exam|events? (in|scheduled)|when does|when is the next)\b", re.I)


def route_heuristic(message: str, student_id: str | None) -> str:
    m = message.strip()
    if _MEMORY.search(m):
        return "memory"
    if _GREETING.search(m) and len(m) < 80:
        return "direct"
    if _FEE.search(m) and not re.search(r"\b(handbook|policy|portal|deadline)\b", m, re.I):
        return "fee" if student_id else "clarify"
    if _CALENDAR.search(m):
        return "calendar"
    if _POLICY_CUES.search(m) or "?" in m or m.lower().startswith(("what", "how", "when", "where", "who", "can", "is", "are", "do")):
        return "policy" if tokenize(m) else "clarify"
    return "direct"


_STYLE = re.compile(r"\b(concise|brief|short|bullet|detailed|simple|step[- ]by[- ]step)\b", re.I)
_LANG = re.compile(r"\b(?:in|use|speak)\s+(english|hindi|gujarati|marathi|tamil|telugu|bengali|spanish|french|german)\b", re.I)
_PROG = re.compile(r"\bi(?:'m| am)?\s*(?:study|studying)\s+(.{3,60})", re.I)


def extract_memory_candidate(message: str) -> tuple[str, str] | None:
    """Return (category, content) for an allowed, non-sensitive preference, else None.
    Allowed categories: response_style, language, programme."""
    text = re.sub(r"(?i)^\s*(please\s+)?(remember|note|keep in mind)( that)?[:,]?\s*", "", message.strip()).strip(" .!")
    if not text:
        return None
    if _STYLE.search(text):
        return "response_style", text[:200]
    if _LANG.search(text):
        return "language", text[:200]
    if _PROG.search(text):
        return "programme", text[:200]
    return None
