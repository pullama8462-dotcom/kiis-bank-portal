from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/admin", tags=["Admin Mainframe"])

# Gateway Clearance Restriction: Admins only
admin_clearance = auth.RoleChecker(["admin"])

@router.post("/users", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_access_node(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(admin_clearance)
):
    # Verify username uniqueness
    existing_user = db.query(models.User).filter(
        (models.User.email == user_in.email) | (models.User.username == user_in.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error: Node username or email is already registered."
        )
        
    hashed_pwd = auth.get_password_hash(user_in.password)
    
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
    
    # Automatically provision account for new customers
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

@router.get("/users", response_model=list[schemas.UserResponse])
def list_global_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(admin_clearance)
):
    users = db.query(models.User).all()
    return users

@router.post("/accounts/provision", response_model=schemas.AccountResponse, status_code=status.HTTP_201_CREATED)
def provision_user_account(
    payload: schemas.AccountCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(admin_clearance)
):
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User identity node not found"
        )
        
    # Provision custom account
    acct = models.Account(
        balance=payload.initial_deposit,
        account_type=payload.account_type,
        vkyc_status="approved", # Admin overrides are pre-approved
        user_id=payload.user_id
    )
    db.add(acct)
    db.commit()
    db.refresh(acct)
    
    return acct
