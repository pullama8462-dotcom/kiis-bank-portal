import os

class Settings:
    PROJECT_NAME: str = "KIIS Bank Mainframe Backend"
    
    # DATABASE CONFIG
    # Default to postgresql, fallback to sqlite locally for quick standalone execution
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./kiis_bank.db"
    )
    
    # JWT CONFIG
    # Standard cryptographically secure fallback
    SECRET_KEY: str = os.getenv("SECRET_KEY") or os.getenv(
        "JWT_SECRET",
        "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Security lab (presentation only) — set SECURITY_LAB_MODE=true to enable JWT bypass demos
    SECURITY_LAB_MODE: bool = os.getenv("SECURITY_LAB_MODE", "").lower() in (
        "1",
        "true",
        "yes",
    )
    LAB_JWT_WEAK_SECRET: str = os.getenv("LAB_JWT_WEAK_SECRET", "kiis-lab-weak-secret")

settings = Settings()
