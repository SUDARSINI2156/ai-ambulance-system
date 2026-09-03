import os
import datetime
import numpy as np
import pandas as pd
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "eta_model.joblib")
_cached_model = None

def get_eta_model():
    global _cached_model
    if _cached_model is None:
        if os.path.exists(MODEL_PATH):
            try:
                _cached_model = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"Warning: Failed to load ETA model from {MODEL_PATH}: {e}")
                _cached_model = None
    return _cached_model

def predict_travel_time(
    distance_km: float,
    traffic_level: int = 2,
    traffic_speed_kmh: float = None,
    hour_of_day: int = None,
    day_of_week: int = None,
    is_weekend: int = None,
    weather: int = 0,
    road_type: int = 1,
    priority: int = 2
) -> dict:
    """
    Predicts ambulance ETA in minutes using trained XGBoost model
    or calibrated urban traffic physics fallback.
    """
    now = datetime.datetime.now()
    if hour_of_day is None:
        hour_of_day = now.hour
    if day_of_week is None:
        day_of_week = now.weekday()
    if is_weekend is None:
        is_weekend = 1 if day_of_week >= 5 else 0

    if traffic_speed_kmh is None:
        # Fallback approximation for speed
        base_speeds = {1: 45.0, 2: 32.0, 3: 18.0, 4: 10.0}
        traffic_speed_kmh = base_speeds.get(traffic_level, 28.0)

    model = get_eta_model()

    if model is not None:
        features = pd.DataFrame([{
            "distance_km": float(distance_km),
            "traffic_level": int(traffic_level),
            "traffic_speed_kmh": float(traffic_speed_kmh),
            "hour_of_day": int(hour_of_day),
            "day_of_week": int(day_of_week),
            "is_weekend": int(is_weekend),
            "weather": int(weather),
            "road_type": int(road_type),
            "priority": int(priority)
        }])
        try:
            pred_time = float(model.predict(features)[0])
            pred_time = max(1.5, round(pred_time, 1))
            return {
                "predicted_eta_minutes": pred_time,
                "confidence_interval_min": max(1.0, round(pred_time * 0.88, 1)),
                "confidence_interval_max": round(pred_time * 1.15, 1),
                "model_version": "XGBoost-v2.1-Live"
            }
        except Exception as e:
            print(f"Inference error, falling back to analytical formula: {e}")

    # Calibrated analytical fallback
    effective_speed = max(8.0, traffic_speed_kmh)
    # Siren advantage
    if priority == 3: # Critical
        effective_speed *= 1.25
    elif priority == 2: # High
        effective_speed *= 1.15

    # Weather slowdown
    if weather == 1:
        effective_speed *= 0.90
    elif weather >= 2:
        effective_speed *= 0.75

    raw_min = (distance_km / effective_speed) * 60.0 + (distance_km * 0.6)
    pred_time = max(1.5, round(raw_min, 1))

    return {
        "predicted_eta_minutes": pred_time,
        "confidence_interval_min": max(1.0, round(pred_time * 0.88, 1)),
        "confidence_interval_max": round(pred_time * 1.15, 1),
        "model_version": "Analytical-Calibrated-Fallback"
    }
