import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.database.base import Base
from app.database.database import engine
from app.api.v1.router import api_router

# Ensure all DB tables exist on application boot
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Notice on DB table initialization: {e}")

app = FastAPI(
    title="SERVIYA.do API 🇩🇴",
    description="API para la plataforma de servicios SERVIYA.do en República Dominicana",
    version=settings.VERSION,
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS Configuration
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router FIRST
app.include_router(api_router)

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}

# Absolute path based on __file__
# __file__ = /.../repo_root/backend/app/main.py
# .parent.parent.parent = /.../repo_root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DIST_DIR = BASE_DIR / "dist"
INDEX_FILE = DIST_DIR / "index.html"
ASSETS_DIR = DIST_DIR / "assets"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

@app.get("/", include_in_schema=False)
async def serve_frontend_root():
    if INDEX_FILE.exists():
        return FileResponse(str(INDEX_FILE))
    alt_index = Path.cwd() / "dist" / "index.html"
    if alt_index.exists():
        return FileResponse(str(alt_index))
    return {
        "app": "SERVIYA.do API 🇩🇴",
        "tagline": "Trabajo • Confianza • Oportunidades",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend_spa(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        raise HTTPException(status_code=404, detail="Not found")

    target_file = DIST_DIR / full_path
    if target_file.is_file():
        return FileResponse(str(target_file))

    if INDEX_FILE.exists():
        return FileResponse(str(INDEX_FILE))

    alt_index = Path.cwd() / "dist" / "index.html"
    if alt_index.exists():
        return FileResponse(str(alt_index))

    return {
        "app": "SERVIYA.do API 🇩🇴",
        "tagline": "Trabajo • Confianza • Oportunidades",
        "status": "online",
        "docs": "/docs"
    }
