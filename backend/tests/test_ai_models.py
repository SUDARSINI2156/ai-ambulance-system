import pytest
from app.ai.eta_predictor import predict_travel_time
from app.ai.triage_classifier import classify_triage_priority
from app.ai.load_forecaster import forecast_hospital_surge
from app.ai.hospital_recommender import evaluate_hospitals_for_emergency
from app.simulation.road_network import CHENNAI_HOSPITALS

class MockHospital:
    def __init__(self, data):
        for k, v in data.items():
            setattr(self, k, v)

def test_xgboost_eta_prediction():
    # Test typical urban emergency trip: 6.5 km in moderate traffic
    res = predict_travel_time(
        distance_km=6.5,
        traffic_level=2,
        priority=3 # Critical siren
    )
    assert "predicted_eta_minutes" in res
    eta = res["predicted_eta_minutes"]
    assert 3.0 <= eta <= 25.0
    assert res["confidence_interval_min"] <= eta <= res["confidence_interval_max"]

def test_critical_clinical_triage():
    # Severe chest pain with hypoxemia and hypotension -> must be CRITICAL ALS
    res = classify_triage_priority(
        chief_complaint="Crushing central chest pain, radiating to arm, heavy diaphoresis",
        heart_rate=125,
        systolic_bp=82, # Shock/Hypotension
        oxygen_sat=86,  # Severe Hypoxemia
        gcs_score=13,
        pain_scale=10
    )
    assert res["priority"] == "CRITICAL"
    assert res["suggested_equipment"] == "ALS"
    assert len(res["clinical_flags"]) >= 1

def test_hospital_surge_forecaster():
    res = forecast_hospital_surge(
        hospital_id=1,
        hospital_name="Apollo Hospitals",
        total_er_beds=25,
        available_er_beds=4, # High occupancy
        recent_arrivals_1h=8,
        critical_cases=4
    )
    assert "predicted_30m_load_pct" in res
    assert res["surge_risk_tier"] in ["HIGH", "CRITICAL"]
    assert "recommendation" in res

def test_hospital_recommendation_engine():
    hospitals = [MockHospital(h) for h in CHENNAI_HOSPITALS]
    # Pickup at T. Nagar (13.0415, 80.2405)
    res = evaluate_hospitals_for_emergency(
        pickup_lat=13.0415,
        pickup_lng=80.2405,
        patient_priority="CRITICAL",
        chief_complaint="Acute myocardial infarction STEMI",
        hospitals=hospitals
    )
    assert "recommended_hospital" in res
    top = res["recommended_hospital"]
    assert top["rank"] == 1
    assert top["suitability_score"] > 0
    assert "explainability" in top
    assert len(res["all_evaluated_hospitals"]) == len(CHENNAI_HOSPITALS)
