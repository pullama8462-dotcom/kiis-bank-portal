import datetime
import uuid
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, default="customer", nullable=False) # 'customer', 'employee', 'manager', 'admin'
    
    # Relationships
    accounts = relationship("Account", back_populates="owner", cascade="all, delete-orphan")
    fixed_deposits = relationship("FixedDeposit", back_populates="owner", cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    balance = Column(Float, default=0.0, nullable=False)
    account_type = Column(String, default="savings", nullable=False) # 'savings', 'current', 'premium', 'student'
    vkyc_status = Column(String, default="pending", nullable=False) # 'pending', 'approved', 'rejected'
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="accounts")
    vkyc_submissions = relationship("VkycSubmission", back_populates="account", cascade="all, delete-orphan")

class VkycSubmission(Base):
    __tablename__ = "vkyc_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    identity_proof_type = Column(String, nullable=False) # 'passport', 'national_id', 'driver_license'
    document_url = Column(String, nullable=False)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    account = relationship("Account", back_populates="vkyc_submissions")

class Transaction(Base):
    __tablename__ = "transactions"
    
    reference_uuid = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    receiver_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False)
    tx_type = Column(String, nullable=False) # 'deposit', 'withdrawal', 'transfer'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class FixedDeposit(Base):
    __tablename__ = "fixed_deposits"
    
    id = Column(Integer, primary_key=True, index=True)
    principal = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False) # annual percentage e.g., 0.08 for 8%
    tenure_months = Column(Integer, nullable=False)
    maturity_amount = Column(Float, nullable=False)
    auto_renew = Column(Boolean, default=False, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="fixed_deposits")
