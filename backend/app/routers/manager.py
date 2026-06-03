from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/manager", tags=["Manager Mainframe"])

# Gateway Clearance Restriction: Managers only
manager_clearance = auth.RoleChecker(["manager"])

@router.get("/transactions", response_model=list[schemas.TransactionResponse])
def get_global_transaction_ledger(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(manager_clearance)
):
    # Retrieve all transaction vectors
    transactions = db.query(models.Transaction).order_by(models.Transaction.timestamp.desc()).all()
    return transactions

@router.get("/fixed-deposits", response_model=list[schemas.FixedDepositResponse])
def get_global_fixed_deposits(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(manager_clearance)
):
    fds = db.query(models.FixedDeposit).all()
    return fds

@router.get("/liquidity")
def get_mainframe_liquidity_telemetry(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(manager_clearance)
):
    # Perform math aggregation over all active accounts
    total_liquidity = db.query(func.sum(models.Account.balance)).scalar() or 0.0
    account_count = db.query(models.Account).count()
    fd_total = db.query(func.sum(models.FixedDeposit.principal)).scalar() or 0.0
    
    return {
        "bank_name": "KIIS Bank Core Mainframe",
        "total_reserves_usd": total_liquidity,
        "fixed_deposits_total_usd": fd_total,
        "active_account_count": account_count,
        "system_status": "OPERATIONAL"
    }
