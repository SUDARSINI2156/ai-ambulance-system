import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import (
    auth_router,
    hospital_router,
    ambulance_router,
    emergency_router,
    ai_router,
    websocket_router
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Powered Real-Time Ambulance Routing & Hospital Availability Optimization System",
    description="Final-Year Advanced AI Project Backend with XGBoost ETA, Hospital Suitability Engine, Surge Forecaster, and WebSockets",
    version="2.0.0"
)

# Allow all origins for seamless local multi-interface development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router)
app.include_router(hospital_router.router)
app.include_router(ambulance_router.router)
app.include_router(emergency_router.router)
app.include_router(ai_router.router)
app.include_router(websocket_router.router)

@app.get("/")
def root():
    return {
        "system": "AI-Powered Real-Time Ambulance Routing & Hospital Availability Optimization System",
        "status": "online",
        "docs_url": "/docs",
        "websocket_url": "/ws"
    }

@app.get("/api/health")
def healthcheck():
    return {
        "status": "healthy",
        "services": {
            "database": "connected",
            "ai_eta_model": "active",
            "ai_hospital_recommender": "active",
            "ai_surge_forecaster": "active",
            "websocket_hub": "listening"
        }
    }
