from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/employee", tags=["Employee Mainframe"])

# Gateway Clearance Restriction: Employees only
employee_clearance = auth.RoleChecker(["employee"])

@router.get("/vkyc/pending", response_model=list[schemas.AccountResponse])
def list_pending_vkyc_accounts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(employee_clearance)
):
    # Query accounts with pending vKYC submissions
    pending_accounts = db.query(models.Account).filter(models.Account.vkyc_status == "pending").all()
    return pending_accounts

@router.post("/vkyc/verify/{account_id}", response_model=schemas.AccountResponse)
def verify_customer_vkyc(
    account_id: int,
    payload: schemas.VkycVerifyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(employee_clearance)
):
    if payload.status not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vKYC decision status. Must be 'approved' or 'rejected'."
        )
        
    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account node not found"
        )
        
    # Update state
    account.vkyc_status = payload.status
    db.commit()
    db.refresh(account)
    
    return account
