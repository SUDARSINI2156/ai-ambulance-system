import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "system" in data

def test_healthcheck():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["services"]["database"] == "connected"

def test_get_hospitals():
    response = client.get("/api/hospitals")
    assert response.status_code == 200
    hospitals = response.json()
    assert len(hospitals) >= 5
    assert "name" in hospitals[0]
    assert "available_er_beds" in hospitals[0]

def test_get_ambulances():
    response = client.get("/api/ambulances")
    assert response.status_code == 200
    ambulances = response.json()
    assert len(ambulances) >= 4
    assert "vehicle_number" in ambulances[0]
    assert "status" in ambulances[0]

def test_ai_metrics_endpoint():
    response = client.get("/api/ai/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "eta_model" in data
    assert data["eta_model"]["r2_score"] > 0.85
