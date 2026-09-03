import os
import datetime
import pandas as pd
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "load_model.joblib")
_cached_surge_models = None

def get_surge_models():
    global _cached_surge_models
    if _cached_surge_models is None:
        if os.path.exists(MODEL_PATH):
            try:
                _cached_surge_models = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"Warning: Failed to load surge model: {e}")
                _cached_surge_models = None
    return _cached_surge_models

def forecast_hospital_surge(
    hospital_id: int,
    hospital_name: str,
    total_er_beds: int,
    available_er_beds: int,
    recent_arrivals_1h: int = 4,
    critical_cases: int = 2
) -> dict:
    """
    Predicts 30-minute ahead emergency load percentage and surge risk tier
    (LOW, MEDIUM, HIGH, CRITICAL).
    """
    current_occupancy = ((total_er_beds - available_er_beds) / max(1, total_er_beds)) * 100.0
    now = datetime.datetime.now()
    hour = now.hour
    day = now.weekday()
    is_weekend = 1 if day >= 5 else 0

    surge_bundle = get_surge_models()
    if surge_bundle is not None:
        try:
            reg = surge_bundle["regressor"]
            clf = surge_bundle["classifier"]
            X = pd.DataFrame([{
                "hospital_id": hospital_id,
                "current_occupancy_pct": float(current_occupancy),
                "recent_arrivals_1h": int(recent_arrivals_1h),
                "critical_cases": int(critical_cases),
                "hour_of_day": int(hour),
                "day_of_week": int(day),
                "is_weekend": int(is_weekend)
            }])
            pred_load = float(reg.predict(X)[0])
            pred_tier_idx = int(clf.predict(X)[0])
        except Exception as e:
            print(f"Surge model inference error, using analytical fallback: {e}")
            surge_bundle = None

    if surge_bundle is None:
        # Calibrated formula fallback
        surge_delta = (recent_arrivals_1h * 3.2) + (critical_cases * 2.5) - 3.0
        pred_load = max(10.0, min(100.0, current_occupancy + surge_delta))
        if pred_load < 60:
            pred_tier_idx = 0
        elif pred_load < 75:
            pred_tier_idx = 1
        elif pred_load < 88:
            pred_tier_idx = 2
        else:
            pred_tier_idx = 3

    tier_names = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    tier_colors = ["#10B981", "#F59E0B", "#F97316", "#EF4444"]
    recommendations = [
        "Normal operations. Adequate bed headroom.",
        "Moderate capacity pressure. Fast-track stable discharges.",
        "High surge imminent in 30 mins. Alert on-call emergency physicians.",
        "CRITICAL SATURATION IMMINENT. Prepare diversion protocol or open surge beds."
    ]

    tier_name = tier_names[pred_tier_idx]
    
    return {
        "hospital_id": hospital_id,
        "hospital_name": hospital_name,
        "current_occupancy_pct": round(current_occupancy, 1),
        "predicted_30m_load_pct": round(pred_load, 1),
        "surge_risk_tier": tier_name,
        "risk_color": tier_colors[pred_tier_idx],
        "recommendation": recommendations[pred_tier_idx]
    }
