import sys
import os
# Adjust path to import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app import models, auth

def seed_mainframe_database():
    print("Connecting to secure mainframe registers...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if users already seeded
        if db.query(models.User).count() > 0:
            print("Mainframe registers already populated. Seeding aborted.")
            return
            
        print("Purging database nodes...")
        db.query(models.User).delete()
        db.query(models.Account).delete()
        db.query(models.Transaction).delete()
        db.query(models.FixedDeposit).delete()
        db.commit()

        print("Provisioning default credentials registers...")
        
        # 1. Admin - Alex Mercer
        admin = models.User(
            username="Alex Mercer",
            email="alex@kiisbank.com",
            phone="+41 44 234 5678",
            hashed_password=auth.get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin)
        
        # 2. Manager - Marcus Lee
        manager = models.User(
            username="Marcus Lee",
            email="marcus@kiisbank.com",
            phone="+41 44 234 5679",
            hashed_password=auth.get_password_hash("manager123"),
            role="manager"
        )
        db.add(manager)
        
        # 3. Employee - Sam Kovac
        employee = models.User(
            username="Sam Kovac",
            email="sam@kiisbank.com",
            phone="+41 44 234 5680",
            hashed_password=auth.get_password_hash("employee123"),
            role="employee"
        )
        db.add(employee)
        
        # 4. Approved HNW Customer - Jane Doe
        customer1 = models.User(
            username="Jane Doe",
            email="jane@gmail.com",
            phone="+41 79 123 4567",
            hashed_password=auth.get_password_hash("customer123"),
            role="customer"
        )
        db.add(customer1)
        
        # 5. Pending Customer - John Smith (for Employee vKYC approval testing!)
        customer2 = models.User(
            username="John Smith",
            email="john@gmail.com",
            phone="+41 79 987 6543",
            hashed_password=auth.get_password_hash("john123"),
            role="customer"
        )
        db.add(customer2)
        
        db.commit()
        db.refresh(customer1)
        db.refresh(customer2)
        
        print("Provisioning initial ledger accounts...")
        # Provision Pre-approved Vault Account for Jane Doe
        acct1 = models.Account(
            account_number="KIIS-VAL-09432-SEC",
            balance=1248500.00,
            account_type="premium",
            vkyc_status="approved",
            user_id=customer1.id
        )
        db.add(acct1)
        
        # Provision Pending Account for John Smith (for Employee review workflows)
        acct2 = models.Account(
            account_number="KIIS-VAL-88210-PEN",
            balance=5000.00,
            account_type="savings",
            vkyc_status="pending",
            user_id=customer2.id
        )
        db.add(acct2)
        
        # Provision savings account for Alex Mercer to execute administrative transfers if needed
        db.commit()
        
        # Seed default Fixed Deposit compound ledger for Jane Doe
        fd = models.FixedDeposit(
            principal=100000.0,
            interest_rate=0.08,
            tenure_months=12,
            maturity_amount=108300.00, # compounded monthly
            auto_renew=True,
            user_id=customer1.id
        )
        db.add(fd)
        db.commit()
        
        print("Mainframe registers successfully seeded!")
        print("\nDefault Access Matrix:")
        print("----------------------------------------------------------------------")
        print("Admin:    Alex Mercer   | Password: admin123    | Token: 888999")
        print("Manager:  Marcus Lee    | Password: manager123  | Token: 777888")
        print("Employee: Sam Kovac     | Password: employee123 | Token: 555666")
        print("Customer: Jane Doe      | Password: customer123 | Token: 111222")
        print("John Smith (Pending)    | Password: john123     | Token: (Requires register)")
        print("----------------------------------------------------------------------")
        
    except Exception as e:
        print(f"Mainframe seed failure: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_mainframe_database()
