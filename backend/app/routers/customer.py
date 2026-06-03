from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/customer", tags=["Customer Portal"])

# Gateway Clearance Restriction: Customers only
customer_clearance = auth.RoleChecker(["customer"])

@router.get("/accounts", response_model=list[schemas.AccountResponse])
def get_my_accounts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(customer_clearance)
):
    accounts = db.query(models.Account).filter(models.Account.user_id == current_user.id).all()
    return accounts

# ==================== vKYC SUBSYSTEM ====================
@router.post("/vkyc/upload", status_code=status.HTTP_201_CREATED)
def upload_vkyc_documents(
    payload: schemas.VkycUploadRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(customer_clearance)
):
    # Fetch primary customer account
    account = db.query(models.Account).filter(models.Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active account not found for this customer. Contact Admin to provision one."
        )
        
    # Register vKYC document record
    submission = models.VkycSubmission(
        account_id=account.id,
        identity_proof_type=payload.identity_proof_type,
        document_url=payload.document_url
    )
    db.add(submission)
    
    # Reset status back to pending if was previously rejected
    account.vkyc_status = "pending"
    
    db.commit()
    return {"message": "vKYC verification documents uploaded successfully. Core state pending.", "account_id": account.id}


# ==================== LIVE TRANSACTION ENGINE (ACID LOCKING) ====================
@router.post("/transfer", response_model=schemas.TransactionResponse)
def execute_transfer(
    payload: schemas.TransferRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(customer_clearance)
):
    # Retrieve and validate sender account
    # Prevent double-spending by acquiring an immediate row-level WRITE lock (SELECT ... FOR UPDATE)
    sender_acct = db.query(models.Account).filter(
        models.Account.account_number == payload.sender_account_number
    ).with_for_update().first()
    
    if not sender_acct:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Sender account code not found"
        )
        
    # Authorization checks
    if sender_acct.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Authorization denied: You do not own this sender account"
        )
        
    # Compliance check: vKYC must be verified first
    if sender_acct.vkyc_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Account clearance locked. vKYC status must be approved to execute transfers."
        )
        
    # Fetch and lock receiver account (to avoid concurrent updates/overwrites)
    receiver_acct = db.query(models.Account).filter(
        models.Account.account_number == payload.receiver_account_number
    ).with_for_update().first()
    
    if not receiver_acct:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Receiver account code not found"
        )
        
    # Check balance availability
    if sender_acct.balance < payload.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Transaction failed: Insufficient vault reserves in sender account"
        )
        
    # Atomic transaction execution (decreases sender, increases receiver simultaneously)
    sender_acct.balance -= payload.amount
    receiver_acct.balance += payload.amount
    
    # Write ledger entry
    txn = models.Transaction(
        sender_id=sender_acct.id,
        receiver_id=receiver_acct.id,
        amount=payload.amount,
        tx_type="transfer"
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    
    return txn


# ==================== FIXED DEPOSIT MANAGER ====================
@router.post("/fixed-deposit", response_model=schemas.FixedDepositResponse, status_code=status.HTTP_201_CREATED)
def create_fixed_deposit(
    payload: schemas.FixedDepositCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(customer_clearance)
):
    P = payload.principal
    r = payload.interest_rate
    n = 12 # compounding frequency per year (monthly compounding)
    t = payload.tenure_months / 12.0 # tenure in years
    
    # Compound Interest Formula: A = P * (1 + r/n)**(n*t)
    maturity_amt = P * ((1 + (r / n)) ** (n * t))
    
    fd = models.FixedDeposit(
        principal=payload.principal,
        interest_rate=payload.interest_rate,
        tenure_months=payload.tenure_months,
        maturity_amount=round(maturity_amt, 2),
        auto_renew=payload.auto_renew,
        user_id=current_user.id
    )
    
    db.add(fd)
    db.commit()
    db.refresh(fd)
    
    return fd

@router.get("/fixed-deposits", response_model=list[schemas.FixedDepositResponse])
def get_my_fixed_deposits(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(customer_clearance)
):
    fds = db.query(models.FixedDeposit).filter(models.FixedDeposit.user_id == current_user.id).all()
    return fds
