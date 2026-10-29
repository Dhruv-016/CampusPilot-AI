# CampusPilot AI — How to Run in VS Code

Welcome to **CampusPilot AI** — Intelligent Student Support Assistant.

This guide provides step-by-step instructions to open, install, and run the complete application in Visual Studio Code.

---

## 📁 System Architecture Overview

The project consists of two main components:
1. **Backend (FastAPI + LangGraph + SQLite)**: Runs on `http://localhost:8000`
   - Handles authentication, student profile, course policy retrieval (BM25), academic calendar, fee balance queries, and agentic workflows.
2. **Frontend (Next.js 14 + Tailwind CSS + Framer Motion)**: Runs on `http://localhost:3000`
   - Dark-first, premium user interface with interactive student assistant chat, live telemetry traces, and student information views.

---

## 🚀 Quick Start Guide (VS Code)

### Step 1: Open the Project in VS Code
1. Open Visual Studio Code.
2. Click **File** → **Open Folder...** (or `Cmd + O` on macOS / `Ctrl + O` on Windows).
3. Select the extracted `campuspilot-ai` folder.

---

### Step 2: Start the Backend (Terminal 1)

1. Open a new terminal in VS Code:
   - Shortcut: ``Ctrl + ` `` (Windows/Linux) or ``Cmd + ` `` (macOS).
2. Run the following commands:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create a Python virtual environment (if not already created)
python3 -m venv .venv

# 3. Activate the virtual environment
# On macOS / Linux:
source .venv/bin/activate
# On Windows (Command Prompt):
# .venv\Scripts\activate.bat
# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Start the FastAPI backend server
uvicorn app.main:app --reload --port 8000
```

✅ **Verification**:
- Open `http://localhost:8000/api/v1/health` in your browser. You should see `{"status":"ok","database":"ok",...}`.
- Interactive API documentation is available at `http://localhost:8000/docs`.

---

### Step 3: Start the Frontend (Terminal 2)

1. Open a **second** terminal tab in VS Code (click the `+` icon or split terminal in the terminal panel).
2. Run the following commands:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node.js packages (if running for the first time)
npm install

# 3. Start the Next.js development server
npm run dev
```

✅ **Verification**:
- Open `http://localhost:3000` in your web browser.
- You will see the CampusPilot AI landing page.

---

## 🔑 Accounts & Authentication

### Option A: Create a Real Registered Account
1. Click **Sign In** or **Register** on the website (`http://localhost:3000/signup`).
2. Enter:
   - **Full Legal Name**: e.g. `Alex Vance`
   - **University Email**: Must use institutional domain `@university.edu` (e.g. `alex.vance@university.edu` or `student@eng.university.edu`).
     *(Note: Personal emails like `@gmail.com` or `@yahoo.com` are strictly rejected by security policy).*
   - **Password**: Minimum 8 characters.
3. Click **Create Student Account**. You will be logged in and assigned a unique student ID (e.g. `STU-2026-XXXX`).

### Option B: Instant Demo Mode
- On the login or registration page, click **"Instant Enter →"** or **"Launch Demo"** to access the pre-seeded demo student account (`Aarav Mehta · STU-DEMO-1001`).

---

## 🧪 Running Automated Tests

To verify that all 28 automated tests and 14 security/isolation checks pass:

```bash
# In the backend terminal (with .venv active):
cd backend
pytest

# To run the end-to-end production verification suite:
cd ..
python scripts/verify_system.py
```

---

## 📂 Which Key Files to Know

| File / Directory | Description |
| :--- | :--- |
| `backend/app/main.py` | FastAPI application entry point, database schema migrations, and route registration |
| `backend/app/api.py` | All REST endpoints (`/auth/*`, `/chat`, `/conversations`, `/student/*`, `/traces`) |
| `backend/app/auth.py` | Scrypt password hashing, session tokens, and university domain validation |
| `backend/app/agent.py` | LangGraph state graph and deterministic routing |
| `backend/app/retrieval.py` | BM25 lexical search engine over student handbook |
| `data/sample_student_handbook.md` | Official policies on courses, registration, attendance (75%), and fees |
| `frontend/app/page.tsx` | Main landing page |
| `frontend/app/login/page.tsx` | University login page with instant demo access |
| `frontend/app/signup/page.tsx` | Student registration page with live password meter |
| `frontend/app/app/page.tsx` | Student assistant chat interface |
| `frontend/app/how-it-works/page.tsx` | Visual LangGraph State Transition architecture diagram |
| `frontend/lib/api.ts` | Frontend API client with JWT/Bearer token handling |
