from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# Include API Router
app.include_router(api_router)

@app.get("/")
def root():
    return {
        "app": "SERVIYA.do API 🇩🇴",
        "tagline": "Trabajo • Confianza • Oportunidades",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}
