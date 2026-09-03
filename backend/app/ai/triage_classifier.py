import os
import pandas as pd
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "triage_model.joblib")
_cached_triage_model = None

def get_triage_model():
    global _cached_triage_model
    if _cached_triage_model is None:
        if os.path.exists(MODEL_PATH):
            try:
                _cached_triage_model = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"Warning: Failed to load triage model: {e}")
                _cached_triage_model = None
    return _cached_triage_model

def classify_triage_priority(
    chief_complaint: str,
    heart_rate: float,
    systolic_bp: float,
    oxygen_sat: float,
    gcs_score: int,
    pain_scale: int
) -> dict:
    """
    Classifies patient emergency priority (CRITICAL, HIGH, MEDIUM, LOW)
    using ML model and clinical decision support rules.
    """
    # Keyword analysis
    complaint_lower = chief_complaint.lower()
    complaint_type = 5 # default minor/general
    if any(k in complaint_lower for k in ["chest pain", "heart", "stemi", "cardiac", "angina"]):
        complaint_type = 0
    elif any(k in complaint_lower for k in ["breath", "dyspnea", "asthma", "choking", "oxygen"]):
        complaint_type = 1
    elif any(k in complaint_lower for k in ["accident", "fall", "bleeding", "trauma", "crash", "fracture"]):
        complaint_type = 2
    elif any(k in complaint_lower for k in ["stroke", "seizure", "unconscious", "head injury", "faint", "coma"]):
        complaint_type = 3
    elif any(k in complaint_lower for k in ["abdomen", "stomach", "vomiting", "appendix"]):
        complaint_type = 4

    clinical_flags = []
    if oxygen_sat < 90:
        clinical_flags.append(f"Severe Hypoxemia (SpO2 {oxygen_sat}%)")
    elif oxygen_sat < 94:
        clinical_flags.append(f"Moderate Hypoxemia (SpO2 {oxygen_sat}%)")

    if systolic_bp < 90:
        clinical_flags.append(f"Hypotension / Shock (BP {systolic_bp} mmHg)")
    elif systolic_bp > 180:
        clinical_flags.append(f"Hypertensive Crisis (BP {systolic_bp} mmHg)")

    if heart_rate > 130:
        clinical_flags.append(f"Severe Tachycardia (HR {heart_rate} bpm)")
    elif heart_rate < 50:
        clinical_flags.append(f"Severe Bradycardia (HR {heart_rate} bpm)")

    if gcs_score <= 8:
        clinical_flags.append(f"Comatose / Severe Neurological Impairment (GCS {gcs_score}/15)")
    elif gcs_score <= 12:
        clinical_flags.append(f"Moderate Altered Mental Status (GCS {gcs_score}/15)")

    if pain_scale >= 8:
        clinical_flags.append(f"Excruciating Pain ({pain_scale}/10)")

    model = get_triage_model()
    pred_priority_idx = 1 # Default Medium

    if model is not None:
        try:
            X = pd.DataFrame([{
                "heart_rate": float(heart_rate),
                "systolic_bp": float(systolic_bp),
                "oxygen_sat": float(oxygen_sat),
                "gcs_score": int(gcs_score),
                "pain_scale": int(pain_scale),
                "complaint_type": int(complaint_type)
            }])
            pred_priority_idx = int(model.predict(X)[0])
        except Exception as e:
            print(f"Triage model inference error: {e}")
            model = None

    if model is None:
        # Safety rules override
        if oxygen_sat < 88 or gcs_score <= 8 or systolic_bp < 80 or systolic_bp > 200 or heart_rate > 145:
            pred_priority_idx = 3 # CRITICAL
        elif complaint_type in [0, 1, 3] or pain_scale >= 8:
            pred_priority_idx = 2 # HIGH
        elif complaint_type in [2, 4] or pain_scale >= 5:
            pred_priority_idx = 1 # MEDIUM
        else:
            pred_priority_idx = 0 # LOW

    priority_names = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    priority = priority_names[pred_priority_idx]
    suggested_equipment = "ALS" if pred_priority_idx >= 2 else "BLS"

    return {
        "priority": priority,
        "severity_score": pred_priority_idx + 1,
        "clinical_flags": clinical_flags if clinical_flags else ["Vitals within stable emergency baseline"],
        "suggested_equipment": suggested_equipment
    }
