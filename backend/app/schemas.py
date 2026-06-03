from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import datetime

# ==================== TOKEN SCHEMAS ====================
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# ==================== USER SCHEMAS ====================
class UserBase(BaseModel):
    username: str
    email: EmailStr
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "customer" # Default to customer, admin can explicitly override

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    
    class Config:
        from_attributes = True


# ==================== ACCOUNT SCHEMAS ====================
class AccountBase(BaseModel):
    account_type: str = "savings" # 'savings', 'current', 'premium', 'student'

class AccountCreate(AccountBase):
    user_id: int
    initial_deposit: float = Field(..., ge=0.0)

class AccountResponse(BaseModel):
    id: int
    account_number: str
    balance: float
    account_type: str
    vkyc_status: str
    user_id: int
    
    class Config:
        from_attributes = True


# ==================== VKYC SCHEMAS ====================
class VkycUploadRequest(BaseModel):
    identity_proof_type: str # 'passport', 'national_id', 'driver_license'
    document_url: str

class VkycVerifyRequest(BaseModel):
    status: str # 'approved', 'rejected'


# ==================== TRANSACTION SCHEMAS ====================
class TransactionBase(BaseModel):
    amount: float = Field(..., gt=0.0)

class TransferRequest(TransactionBase):
    sender_account_number: str
    receiver_account_number: str

class TransactionResponse(BaseModel):
    reference_uuid: str
    sender_id: Optional[int] = None
    receiver_id: Optional[int] = None
    amount: float
    tx_type: str
    timestamp: datetime.datetime
    
    class Config:
        from_attributes = True


# ==================== FIXED DEPOSIT SCHEMAS ====================
class FixedDepositCreate(BaseModel):
    principal: float = Field(..., gt=0.0)
    interest_rate: float = Field(..., gt=0.0, le=1.0) # e.g. 0.08 for 8%
    tenure_months: int = Field(..., gt=0)
    auto_renew: bool = False

class FixedDepositResponse(BaseModel):
    id: int
    principal: float
    interest_rate: float
    tenure_months: int
    maturity_amount: float
    auto_renew: bool
    user_id: int
    
    class Config:
        from_attributes = True
