"""
Security presentation endpoints — disabled unless SECURITY_LAB_MODE=true.
"""
from fastapi import APIRouter, HTTPException, Query
from app.config import settings
from app import lab_jwt

router = APIRouter(prefix="/api/lab", tags=["Security Lab (Presentation)"])


def _require_lab_mode():
    if not settings.SECURITY_LAB_MODE:
        raise HTTPException(
            status_code=404,
            detail="Security lab mode is disabled. Set SECURITY_LAB_MODE=true for presentations.",
        )


@router.get("/status")
def lab_status():
    _require_lab_mode()
    return {
        "security_lab_mode": True,
        "warning": "Intentional JWT vulnerabilities are ACTIVE — demo / classroom only.",
        "bypasses_enabled": [
            "alg=none (unsigned token accepted)",
            "weak secret (kiis-lab-weak-secret)",
            "unverified token when lab_bypass claim is true",
            "role claim trusted from token (privilege escalation)",
        ],
    }


@router.get("/forge-token/none")
def forge_alg_none_token(
    username: str = Query(..., description="Existing username, e.g. Jane Doe"),
    role: str = Query("admin", description="Escalated role for demo"),
):
    """Returns a forged alg=none JWT you can paste into Authorization: Bearer ..."""
    _require_lab_mode()
    token = lab_jwt.create_alg_none_token(username=username, role=role)
    return {
        "attack": "JWT alg=none bypass",
        "token": token,
        "usage": f'curl -H "Authorization: Bearer {token}" https://<your-host>/api/admin/users',
        "demo_steps": [
            "1. Log in normally as a customer and note you cannot access /api/admin/users.",
            "2. Call this endpoint to get a forged admin token for the same username.",
            "3. Replay the forged token — admin API accepts it (lab mode only).",
        ],
    }


@router.get("/forge-token/weak-secret")
def forge_weak_secret_token(
    username: str = Query(...),
    role: str = Query("admin"),
):
    """Token signed with the known weak lab secret (brute-force / hardcoded key demo)."""
    _require_lab_mode()
    from datetime import datetime, timedelta
    from jose import jwt as jose_jwt

    payload = {
        "sub": username,
        "role": role,
        "lab_bypass": True,
        "exp": datetime.utcnow() + timedelta(hours=2),
    }
    weak_token = jose_jwt.encode(
        payload, settings.LAB_JWT_WEAK_SECRET, algorithm=settings.ALGORITHM
    )
    return {
        "attack": "JWT signed with weak known secret",
        "weak_secret": settings.LAB_JWT_WEAK_SECRET,
        "token": weak_token,
        "usage": 'Authorization: Bearer <token> then GET /api/admin/users',
    }
