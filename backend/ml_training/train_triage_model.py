import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score

def generate_and_train_triage():
    np.random.seed(42)
    n = 6000

    # Vitals simulation
    # heart_rate: 40 - 180 bpm
    hr = np.random.normal(85, 22, n).clip(40, 190).round()
    # systolic_bp: 70 - 210 mmHg
    sbp = np.random.normal(125, 25, n).clip(60, 220).round()
    # oxygen_saturation: 75% - 100%
    spo2 = np.random.beta(a=12, b=1.5, size=n) * 30 + 70
    spo2 = np.clip(spo2, 70, 100).round()
    # Glasgow Coma Scale (GCS): 3 - 15 (15 = fully conscious)
    gcs = np.random.choice([15, 14, 13, 12, 11, 10, 8, 5, 3], size=n, p=[0.72, 0.10, 0.05, 0.04, 0.03, 0.02, 0.02, 0.01, 0.01])
    # Severe pain scale 0-10
    pain = np.random.randint(0, 11, n)
    # Chief complaint category:
    # 0=Cardiac/Chest Pain, 1=Respiratory/Breathless, 2=Trauma/Accident, 3=Neurological/Stroke, 4=Abdominal, 5=Minor
    complaint = np.random.choice([0, 1, 2, 3, 4, 5], size=n, p=[0.20, 0.20, 0.22, 0.13, 0.15, 0.10])

    # Rule-informed clinical triage target (0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL)
    priority = np.ones(n, dtype=int)  # default Medium

    for i in range(n):
        # Critical criteria
        if spo2[i] < 88 or gcs[i] <= 8 or sbp[i] < 80 or sbp[i] > 200 or hr[i] > 145 or hr[i] < 45:
            priority[i] = 3 # CRITICAL
        elif complaint[i] in [0, 1, 3] and (spo2[i] < 92 or pain[i] >= 8 or gcs[i] <= 13):
            priority[i] = 3 # CRITICAL
        elif complaint[i] == 2 and pain[i] >= 8:
            priority[i] = 2 # HIGH
        elif complaint[i] in [0, 1, 3]:
            priority[i] = 2 # HIGH
        elif complaint[i] == 4 and pain[i] >= 6:
            priority[i] = 1 # MEDIUM
        elif complaint[i] == 5 and pain[i] <= 4 and spo2[i] >= 96:
            priority[i] = 0 # LOW
        else:
            priority[i] = 1

    df = pd.DataFrame({
        "heart_rate": hr,
        "systolic_bp": sbp,
        "oxygen_sat": spo2,
        "gcs_score": gcs,
        "pain_scale": pain,
        "complaint_type": complaint,
        "priority_level": priority
    })

    X = df[["heart_rate", "systolic_bp", "oxygen_sat", "gcs_score", "pain_scale", "complaint_type"]]
    y = df["priority_level"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print("=" * 60)
    print(f">> Clinical Triage Classifier Accuracy: {acc * 100:.2f}%")
    print("=" * 60)

    target_dir = os.path.join("..", "app", "ai", "models")
    os.makedirs(target_dir, exist_ok=True)
    joblib.dump(model, os.path.join(target_dir, "triage_model.joblib"))

    metrics = {
        "model_name": "Gradient Boosting Triage Classifier",
        "accuracy": round(acc * 100, 2),
        "classes": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "complaint_map": {
            0: "Cardiac / Chest Pain",
            1: "Respiratory / Dyspnea",
            2: "Trauma / Road Accident",
            3: "Neurological / Stroke",
            4: "Acute Abdominal",
            5: "Minor Trauma / General"
        }
    }
    with open(os.path.join(target_dir, "triage_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    print("Saved triage model and metrics.")

if __name__ == "__main__":
    generate_and_train_triage()
