# Burp Suite — JWT lab workflow (KIIS Bank Portal)

Use this flow so **Proxy** and **Repeater** show real JWT traffic on the same host as the live app (e.g. `kiis-bank-portal.onrender.com`).

## Prerequisites

1. Burp Proxy listening (default `127.0.0.1:8080`).
2. Browser proxy set to Burp; install Burp CA and enable HTTPS interception.
3. On Render, set `SECURITY_LAB_MODE=true` and redeploy (lab forge endpoints return 404 when off).
4. Open **https://kiis-bank-portal.onrender.com/#security-lab** (React app, same origin as `/api/*`).

## Step 1 — Capture login (token in response body)

**Option A — Security Lab button (fastest for demos)**

1. Scroll to **Vulnerability Demo — JWT Bypass**.
2. Click **Login as Jane Doe (Burp)**.
3. In Burp **HTTP history**, find:
   - `POST /api/auth/login`
   - Response JSON: `"access_token": "eyJ..."`, `"token_type": "bearer"`, `"role": "customer"`.

**Option B — Full customer modal**

1. **SECURE LOGIN** → Jane Doe / `customer123` → complete biometrics + OTP `111222`.
2. The login request is sent at **password** step (before 2FA); look for the same `POST /api/auth/login` in history.

Copy `access_token` from the response (or from the lab UI after **Login as Jane Doe**).

## Step 2 — See Bearer on API calls in Repeater

**Option A — Lab buttons**

1. **Test with session JWT** → `GET /api/admin/users` with header  
   `Authorization: Bearer <token from login>`  
   Expect **403** (customer cannot access admin API).
2. **Forge alg=none token** → copy forged JWT from the textarea.
3. **Test admin API** → `GET /api/admin/users` with  
   `Authorization: Bearer <forged token>`  
   Expect **200** when lab mode is on.

Send any of these from **HTTP history** → **Send to Repeater**. The **Authorization** header must be present on `/api/admin/users` requests (not on `/api/lab/forge-token/*`, which only returns a token in the JSON body).

**Option B — Manual Repeater**

1. Repeater → paste request (or use **Copy Repeater template** in the lab).
2. Set header: `Authorization: Bearer <paste token here>`.
3. Send `GET /api/admin/users HTTP/1.1` to the same `Host` as the site.

## Step 3 — Forge via lab API (optional)

In Repeater or browser:

```http
GET /api/lab/forge-token/none?username=Jane%20Doe&role=admin HTTP/1.1
Host: kiis-bank-portal.onrender.com
Accept: application/json
```

Copy `token` from the JSON response into:

```http
GET /api/admin/users HTTP/1.1
Host: kiis-bank-portal.onrender.com
Authorization: Bearer <forged-token>
Accept: application/json
```

## Common mistakes

| Symptom | Cause |
|--------|--------|
| No JWT in Repeater | You sent `/api/lab/forge-token/...` to Repeater — token is in the **response**, not `Authorization`. Use `/api/admin/users` or login `POST`. |
| Requests go to `localhost:8000` | Old static `dashboard.html` + `app.js` before fix; rebuild and use same-origin. React lab always uses `window.location.origin`. |
| `access_token` missing in login response | Backend unreachable → offline mode (`mock-customer-token`). Fix proxy/host and retry. |
| Lab forge returns 404 | `SECURITY_LAB_MODE` not enabled on server. |

## Dashboard traffic

After login, `/dashboard.html` loads `app.js`, which calls `/api/*` on **the same host** with `Authorization: Bearer` from `localStorage` (`kiis_portal_token`). Those requests also appear in Burp when the dashboard is used.
