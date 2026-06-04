"""
Intentionally vulnerable JWT helpers — ONLY when SECURITY_LAB_MODE=true.
For security awareness presentations; never enable on real production systems.
"""
import base64
import json
from datetime import datetime, timedelta
from typing import Any, Optional

from jose import jwt, JWTError

from app.config import settings


def is_lab_mode_enabled() -> bool:
    return settings.SECURITY_LAB_MODE


def create_alg_none_token(username: str, role: str, hours: int = 2) -> str:
    """Build a classic alg=none JWT (no signature) for demo exploits."""
    header = {"alg": "none", "typ": "JWT"}
    payload = {
        "sub": username,
        "role": role,
        "lab_bypass": True,
        "exp": int((datetime.utcnow() + timedelta(hours=hours)).timestamp()),
    }

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

    header_b64 = b64url(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = b64url(json.dumps(payload, separators=(",", ":")).encode())
    return f"{header_b64}.{payload_b64}."


def try_lab_jwt_bypass(token: str) -> Optional[dict[str, Any]]:
    """
    Demo-only bypasses (when SECURITY_LAB_MODE is on):
    1) alg=none — accept unsigned token
    2) weak secret — accept tokens signed with LAB_JWT_WEAK_SECRET
    3) no signature verify — trust any well-formed JWT claims
    """
    if not is_lab_mode_enabled():
        return None

    parts = token.split(".")
    if len(parts) != 3:
        return None

    try:
        pad = "=" * (-len(parts[0]) % 4)
        header = json.loads(base64.urlsafe_b64decode(parts[0] + pad))
    except (json.JSONDecodeError, ValueError):
        header = {}

    # 1) alg=none
    if header.get("alg", "").lower() == "none":
        try:
            pad = "=" * (-len(parts[1]) % 4)
            payload = json.loads(base64.urlsafe_b64decode(parts[1] + pad))
            if payload.get("sub"):
                return payload
        except (json.JSONDecodeError, ValueError):
            pass

    # 2) weak signing key (brute-force / default secret demo)
    try:
        payload = jwt.decode(
            token,
            settings.LAB_JWT_WEAK_SECRET,
            algorithms=[settings.ALGORITHM],
        )
        if payload.get("sub"):
            return payload
    except JWTError:
        pass

    # 3) skip signature verification entirely (broken verify path)
    try:
        payload = jwt.get_unverified_claims(token)
        if payload.get("sub") and payload.get("lab_bypass") is True:
            return payload
    except JWTError:
        pass

    return None
