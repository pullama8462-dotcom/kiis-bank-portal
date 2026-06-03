from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
import os
from app.database import engine, Base
from app.routers import auth, customer, employee, manager, admin

# Proactively bind declarative database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KIIS Bank mainframe core",
    description="Secure mainframe API backend for dynamic digital banking simulations.",
    version="1.0.0"
)

# Enable CORS policies for localhost portal integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https://.*\.(onrender\.com|trycloudflare\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount security sub-routing desks
app.include_router(auth.router)
app.include_router(customer.router)
app.include_router(employee.router)
app.include_router(manager.router)
app.include_router(admin.router)

@app.get("/staff/login")
@app.get("/staff")
def redirect_to_staff():
    return RedirectResponse(url="/index.html#staff")

# Serve frontend assets
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
dist_dir = os.path.join(project_root, "frontend", "dist")

@app.get("/")
def read_root():
    index_path = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "status": "ONLINE",
        "system": "KIIS Bank Core Mainframe",
        "api_gateway": "RBAC SECURE v1.0",
        "database_state": "SYNCHRONIZED"
    }

# Mount /assets if it exists in the built frontend
if os.path.exists(os.path.join(dist_dir, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="react_assets")

# Mount root directory for main static files (index.html, dashboard.html, app.js, styles.css)
app.mount("/", StaticFiles(directory=project_root, html=True), name="root_static")
