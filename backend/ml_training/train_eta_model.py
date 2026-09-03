import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

def train_eta_model():
    data_path = os.path.join("data", "historical_emergency_trips.csv")
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Running generator first...")
        from generate_synthetic_data import generate_emergency_trip_data
        os.makedirs("data", exist_ok=True)
        df = generate_emergency_trip_data(15000)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)

    feature_cols = [
        "distance_km",
        "traffic_level",
        "traffic_speed_kmh",
        "hour_of_day",
        "day_of_week",
        "is_weekend",
        "weather",
        "road_type",
        "priority"
    ]
    target_col = "travel_time_minutes"

    X = df[feature_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    print(f"Training XGBoost ETA Regressor on {len(X_train)} samples...")
    model = XGBRegressor(
        n_estimators=180,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    # Baseline comparison: Naive Constant Speed (e.g., assuming average 40 km/h)
    naive_speed_kmh = 40.0
    baseline_pred = (X_test["distance_km"] / naive_speed_kmh) * 60.0
    baseline_mae = float(mean_absolute_error(y_test, baseline_pred))
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, baseline_pred)))
    baseline_r2 = float(r2_score(y_test, baseline_pred))

    print("=" * 60)
    print(">> XGBoost Model Evaluation Results:")
    print(f"  * MAE:  {mae:.2f} minutes  (Baseline Naive: {baseline_mae:.2f} min)")
    print(f"  * RMSE: {rmse:.2f} minutes  (Baseline Naive: {baseline_rmse:.2f} min)")
    print(f"  * R2:   {r2:.4f}          (Baseline Naive: {baseline_r2:.4f})")
    print(f"  * Improvement: {((baseline_mae - mae) / baseline_mae * 100):.1f}% reduction in travel time error")
    print("=" * 60)

    # Save model and metadata
    target_dir = os.path.join("..", "app", "ai", "models")
    os.makedirs(target_dir, exist_ok=True)
    model_save_path = os.path.join(target_dir, "eta_model.joblib")
    joblib.dump(model, model_save_path)
    print(f"Saved trained model to {model_save_path}")

    # Save metrics JSON for the frontend analytics view and viva report
    metrics = {
        "model_name": "XGBoost ETA Regressor",
        "features": feature_cols,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "mae_minutes": round(mae, 2),
        "rmse_minutes": round(rmse, 2),
        "r2_score": round(r2, 4),
        "baseline_mae": round(baseline_mae, 2),
        "baseline_rmse": round(baseline_rmse, 2),
        "baseline_r2": round(baseline_r2, 4),
        "improvement_pct": round(((baseline_mae - mae) / baseline_mae * 100), 1),
        "feature_importances": {
            feat: round(float(imp), 4)
            for feat, imp in zip(feature_cols, model.feature_importances_)
        }
    }
    metrics_path = os.path.join(target_dir, "eta_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved metrics to {metrics_path}")

if __name__ == "__main__":
    train_eta_model()
