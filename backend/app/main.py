import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.api.v1.router import api_router

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

# Robust search for built dist frontend directory across working directories
possible_dist_dirs = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "dist")),
    os.path.abspath(os.path.join(os.getcwd(), "dist")),
    os.path.abspath(os.path.join(os.getcwd(), "..", "dist")),
]

dist_dir = None
for d in possible_dist_dirs:
    if os.path.exists(d) and os.path.exists(os.path.join(d, "index.html")):
        dist_dir = d
        break

if dist_dir:
    # Mount assets subfolder if present
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve SPA index.html on root
    @app.get("/", include_in_schema=False)
    def serve_frontend_root():
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {
            "app": "SERVIYA.do API 🇩🇴",
            "tagline": "Trabajo • Confianza • Oportunidades",
            "status": "online",
            "docs": "/docs"
        }

    # Catch-all route for static files & SPA client-side routing
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend_spa(full_path: str):
        # Do not intercept API, docs, or openapi routes
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None

        # Check if direct file exists in dist/ (e.g. sw.js, manifest.webmanifest, registerSW.js)
        target_file = os.path.join(dist_dir, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)

        # Fallback to SPA index.html
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)

        return {
            "app": "SERVIYA.do API 🇩🇴",
            "tagline": "Trabajo • Confianza • Oportunidades",
            "status": "online",
            "docs": "/docs"
        }
else:
    @app.get("/")
    def root():
        return {
            "app": "SERVIYA.do API 🇩🇴",
            "tagline": "Trabajo • Confianza • Oportunidades",
            "status": "online",
            "docs": "/docs"
        }
