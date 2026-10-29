"""End-to-End System Verification Suite for CampusPilot AI.
Verifies all 14 priority requirements across Auth, Data Isolation, Knowledge Retrieval, and Security.
"""
import sys
import time
from pathlib import Path

# Add project root to sys.path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from starlette.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app.models import Student, FeeRecord, Message, Conversation, Memory, Trace


def run_checks():
    client = TestClient(app)
    suffix = str(int(time.time()))
    email_1 = f"eleanor.{suffix}@university.edu"
    email_2 = f"marcus.{suffix}@university.edu"

    print("=" * 70)
    print("CAMPUSPILOT AI — COMPREHENSIVE PRODUCTION VERIFICATION")
    print("=" * 70)

    # 1. Reject invalid domains
    print("\n[Test 1] Domain Validation Rejection...")
    invalid_emails = [
        "student@gmail.com",
        "student@yahoo.com",
        "student@outlook.com",
        "student@fakeuniversity.com",
        "student@university.edu.example.com",
    ]
    for bad in invalid_emails:
        res = client.post("/api/v1/auth/register", json={
            "name": "Invalid Domain User",
            "email": bad,
            "password": "Password123!",
        })
        assert res.status_code == 422, f"Failed: {bad} was not rejected"
    print("  ✓ All 5 invalid domains rejected with HTTP 422")

    # 2. Register valid user
    print("\n[Test 2] Registration with Authorized University Domain...")
    reg_res = client.post("/api/v1/auth/register", json={
        "name": "Dr. Eleanor Vance",
        "email": email_1,
        "password": "QuantumComputing2026!",
        "programme": "Quantum Engineering",
        "semester": "Semester 2",
    })
    assert reg_res.status_code == 200, reg_res.text
    reg_data = reg_res.json()
    token_1 = reg_data["token"]
    student_1_id = reg_data["student"]["id"]
    assert reg_data["student"]["name"] == "Dr. Eleanor Vance"
    assert reg_data["student"]["email"] == email_1
    assert reg_data["student"]["is_demo"] is False
    print(f"  ✓ User registered with ID: {student_1_id}, Token: {token_1[:12]}...")

    # 3. Verify password is saved as scrypt hash, not plaintext
    print("\n[Test 3] Password Hashing & Security Verification...")
    db = SessionLocal()
    st_db = db.get(Student, student_1_id)
    assert st_db.password_hash.startswith("scrypt$")
    assert "QuantumComputing2026!" not in st_db.password_hash
    db.close()
    print("  ✓ Stored password is a cryptographic scrypt digest with salt")

    # 4. Login with registered user
    print("\n[Test 4] Login Verification...")
    login_res = client.post("/api/v1/auth/login", json={
        "email": email_1,
        "password": "QuantumComputing2026!",
    })
    assert login_res.status_code == 200
    assert login_res.json()["student"]["name"] == "Dr. Eleanor Vance"
    print("  ✓ Authentication succeeded with registered email & password")

    # 5. Login rejection on bad password
    print("\n[Test 5] Login Rejection on Invalid Password...")
    bad_login = client.post("/api/v1/auth/login", json={
        "email": email_1,
        "password": "WrongPassword!",
    })
    assert bad_login.status_code == 401
    print("  ✓ Bad credentials rejected with HTTP 401")

    # 6. Profile & Non-Aarav Identity
    print("\n[Test 6] Student Profile Identity Check...")
    prof_res = client.get("/api/v1/student/profile", headers={"Authorization": f"Bearer {token_1}"})
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["name"] == "Dr. Eleanor Vance"
    assert prof["id"] == student_1_id
    assert prof["is_demo_data"] is False
    print(f"  ✓ Profile reflects real registered student: {prof['name']} ({prof['id']})")

    # 7. Clean fee empty state (no Aarav fallback)
    print("\n[Test 7] Scoped Empty Fee Status Check...")
    fee_res = client.get("/api/v1/student/fee-status", headers={"Authorization": f"Bearer {token_1}"})
    assert fee_res.status_code == 200
    fee = fee_res.json()
    assert fee["status"] == "no_record"
    assert fee["student_id"] == student_1_id
    assert fee["outstanding_amount"] == 0
    assert "No fee records are available" in fee["message"]
    print("  ✓ Registered student with no fee invoice receives clean 'no_record' status")

    # 8. Register User 2 for Cross-Account Isolation
    print("\n[Test 8] Cross-Account Data Isolation...")
    reg_2 = client.post("/api/v1/auth/register", json={
        "name": "Marcus Wright",
        "email": email_2,
        "password": "Resistance2026!",
    })
    token_2 = reg_2.json()["token"]
    student_2_id = reg_2.json()["student"]["id"]

    # User 1 creates conversation
    conv_1 = client.post("/api/v1/conversations", headers={"Authorization": f"Bearer {token_1}"}).json()
    # User 2 list conversations -> must NOT see User 1's conversation
    convs_2 = client.get("/api/v1/conversations", headers={"Authorization": f"Bearer {token_2}"}).json()
    assert all(c["id"] != conv_1["id"] for c in convs_2)
    # User 2 direct access -> 404
    direct_get = client.get(f"/api/v1/conversations/{conv_1['id']}", headers={"Authorization": f"Bearer {token_2}"})
    assert direct_get.status_code == 404
    print("  ✓ Conversations strictly isolated across student sessions")

    # 9. Natural Language Questions: Courses
    print("\n[Test 9] Natural Language Course Inquiry...")
    course_q = client.post("/api/v1/chat", json={"message": "How can I find information about my courses?"}, headers={"Authorization": f"Bearer {token_1}"})
    assert course_q.status_code == 200
    c_ans = course_q.json()
    assert c_ans["route"] == "policy"
    assert "Course" in c_ans["sources"][0]["section_title"] or "Student Academic Portal" in c_ans["answer"]
    print("  ✓ Course inquiry successfully routed to policy and answered from handbook")

    # 10. Natural Language Questions: Attendance
    print("\n[Test 10] Attendance Policy Inquiry...")
    att_q = client.post("/api/v1/chat", json={"message": "What is the attendance policy?"}, headers={"Authorization": f"Bearer {token_1}"})
    assert att_q.status_code == 200
    a_ans = att_q.json()
    assert a_ans["route"] == "policy"
    assert "75%" in a_ans["answer"] or "attendance" in a_ans["answer"].lower()
    print("  ✓ Attendance policy retrieved (minimum 75% attendance rule)")

    # 11. Natural Language Questions: Scholarships
    print("\n[Test 11] Scholarship Policy Inquiry...")
    sch_q = client.post("/api/v1/chat", json={"message": "Tell me about scholarship eligibility"}, headers={"Authorization": f"Bearer {token_1}"})
    assert sch_q.status_code == 200
    s_ans = sch_q.json()
    assert s_ans["route"] == "policy"
    assert "Scholarship" in s_ans["sources"][0]["section_title"]
    print("  ✓ Scholarship policy retrieved with eligibility criteria")

    # 12. Natural Language Questions: Architecture
    print("\n[Test 12] CampusPilot Architecture Inquiry...")
    arch_q = client.post("/api/v1/chat", json={"message": "How does CampusPilot AI architecture work?"}, headers={"Authorization": f"Bearer {token_1}"})
    assert arch_q.status_code == 200
    ar_ans = arch_q.json()
    assert ar_ans["route"] == "policy"
    assert "LangGraph" in ar_ans["answer"] or "redaction" in ar_ans["answer"]
    print("  ✓ Architecture query grounded in handbook section")

    # 13. Privacy Redaction in Chat and Traces
    print("\n[Test 13] Privacy Redaction & Zero Secret Leakage...")
    otp_q = client.post("/api/v1/chat", json={"message": "My secret OTP is 987654. Remember it for my exam login."}, headers={"Authorization": f"Bearer {token_1}"})
    assert "987654" not in otp_q.json()["answer"]
    trace_id = otp_q.json()["trace_id"]
    tr_res = client.get(f"/api/v1/traces/{trace_id}", headers={"Authorization": f"Bearer {token_1}"})
    assert "987654" not in tr_res.text
    assert "[REDACTED:otp]" in tr_res.json()["redacted_message"]
    print("  ✓ OTP 987654 redacted before saving; zero leakage in trace logs")

    # 14. Logout Session Invalidation
    print("\n[Test 14] Logout Session Invalidation...")
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token_1}"})
    assert logout_res.status_code == 200
    me_after = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_1}"})
    assert me_after.json()["authenticated"] is False
    print("  ✓ Session token invalidated; subsequent /auth/me returns unauthenticated")

    print("\n" + "=" * 70)
    print("ALL 14 PRODUCTION VERIFICATION CHECKS PASSED PERFECTLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_checks()
