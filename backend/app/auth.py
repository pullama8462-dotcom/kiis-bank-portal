from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app import models, schemas
from app import lab_jwt

# OAuth2 Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Password Crypt utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

# Token Utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def _user_from_token_payload(
    payload: dict, db: Session, trust_token_role: bool = False
) -> Optional[models.User]:
    username = payload.get("sub")
    if not username:
        return None
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        return None
    # LAB VULN: honor role claim from JWT without re-checking DB (privilege escalation demo)
    if trust_token_role and payload.get("role"):
        user.role = payload.get("role")
    return user


# Dependency: Extract authenticated user from headers
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate mainframe access tokens",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user = _user_from_token_payload(payload, db, trust_token_role=False)
        if user:
            return user
    except JWTError:
        pass

    # --- Intentional vulnerabilities (SECURITY_LAB_MODE only) ---
    lab_payload = lab_jwt.try_lab_jwt_bypass(token)
    if lab_payload:
        user = _user_from_token_payload(lab_payload, db, trust_token_role=True)
        if user:
            return user

    raise credentials_exception

# Dependency: API Gateway Role Authorization Dependency Checker
class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles
        
    def __call__(self, current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Security lockout: Access restricted. Requires roles: {self.allowed_roles}."
            )
        return current_user
