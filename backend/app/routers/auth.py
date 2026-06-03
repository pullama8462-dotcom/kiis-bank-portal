from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check duplicate email/username
    existing_user = db.query(models.User).filter(
        (models.User.email == user_in.email) | (models.User.username == user_in.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered in KIIS Bank registers"
        )
    
    # Hash password
    hashed_pwd = auth.get_password_hash(user_in.password)
    
    # Create user
    new_user = models.User(
        username=user_in.username,
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=hashed_pwd,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Proactively provision default account for Customer signups
    if new_user.role == "customer":
        default_account = models.Account(
            balance=0.0,
            account_type="savings",
            vkyc_status="pending",
            user_id=new_user.id
        )
        db.add(default_account)
        db.commit()
        
    return new_user

@router.post("/login", response_model=schemas.Token)
def login_user(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    # Verify user
    user = db.query(models.User).filter(models.User.username == user_credentials.username).first()
    
    if not user or not auth.verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid security credentials entered"
        )
        
    # Generate JWT token encoding role claims
    access_token_expires = timedelta(minutes=auth.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role, "email": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }
