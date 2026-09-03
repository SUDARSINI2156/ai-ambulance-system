import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, accuracy_score, classification_report

def train_load_models():
    data_path = os.path.join("data", "hospital_surge_history.csv")
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Running generator first...")
        from generate_synthetic_data import generate_hospital_surge_data
        os.makedirs("data", exist_ok=True)
        df = generate_hospital_surge_data(8000)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)

    feature_cols = [
        "hospital_id",
        "current_occupancy_pct",
        "recent_arrivals_1h",
        "critical_cases",
        "hour_of_day",
        "day_of_week",
        "is_weekend"
    ]

    X = df[feature_cols]
    y_reg = df["predicted_30m_load_pct"]
    y_clf = df["surge_risk_tier"]

    # 1. Train Load Percentage Regressor
    X_train, X_test, y_reg_train, y_reg_test = train_test_split(X, y_reg, test_size=0.2, random_state=42)
    reg_model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
    reg_model.fit(X_train, y_reg_train)
    y_reg_pred = reg_model.predict(X_test)
    mae = float(mean_absolute_error(y_reg_test, y_reg_pred))

    # 2. Train Surge Risk Tier Classifier
    _, _, y_clf_train, y_clf_test = train_test_split(X, y_clf, test_size=0.2, random_state=42)
    clf_model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
    clf_model.fit(X_train, y_clf_train)
    y_clf_pred = clf_model.predict(X_test)
    acc = float(accuracy_score(y_clf_test, y_clf_pred))

    print("=" * 60)
    print(">> Hospital Surge Prediction Results:")
    print(f"  * Load % Prediction MAE: {mae:.2f}%")
    print(f"  * Risk Tier Classification Accuracy: {acc * 100:.1f}%")
    print("=" * 60)

    # Save models
    target_dir = os.path.join("..", "app", "ai", "models")
    os.makedirs(target_dir, exist_ok=True)
    
    payload = {
        "regressor": reg_model,
        "classifier": clf_model,
        "features": feature_cols
    }
    joblib.dump(payload, os.path.join(target_dir, "load_model.joblib"))

    metrics = {
        "model_name": "Hospital Surge & Load Forecaster",
        "features": feature_cols,
        "load_mae_percent": round(mae, 2),
        "risk_tier_accuracy": round(acc * 100, 1),
        "risk_tier_labels": ["LOW (<60%)", "MEDIUM (60-75%)", "HIGH (75-88%)", "CRITICAL (>88%)"]
    }
    with open(os.path.join(target_dir, "load_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    print("Saved surge models and metrics.")

if __name__ == "__main__":
    train_load_models()
