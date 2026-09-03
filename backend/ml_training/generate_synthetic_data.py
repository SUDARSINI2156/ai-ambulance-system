import os
import numpy as np
import pandas as pd

def generate_emergency_trip_data(num_samples: int = 15000, seed: int = 42) -> pd.DataFrame:
    """
    Generates realistic historical ambulance trip records for AI training.
    Accounts for urban road networks, peak hours, weather conditions,
    traffic levels, priority sirens, and intersection delays.
    """
    np.random.seed(seed)

    # 1. Distance (km) - skewed towards 3 - 12 km urban radius
    distance_km = np.random.gamma(shape=3.0, scale=2.5, size=num_samples)
    distance_km = np.clip(distance_km, 0.8, 30.0).round(2)

    # 2. Time features
    hour_probs = np.array([
        0.02, 0.015, 0.015, 0.015, 0.02, 0.03,
        0.04, 0.06, 0.08, 0.07, 0.06, 0.05,
        0.045, 0.045, 0.045, 0.05, 0.06, 0.08,
        0.08, 0.06, 0.05, 0.04, 0.03, 0.025
    ])
    hour_probs = hour_probs / hour_probs.sum()
    hour_of_day = np.random.choice(range(24), size=num_samples, p=hour_probs)
    day_of_week = np.random.randint(0, 7, size=num_samples) # 0=Mon, 6=Sun
    is_weekend = (day_of_week >= 5).astype(int)

    # 3. Weather: 0=Clear (70%), 1=Rain (18%), 2=Heavy Rain (8%), 3=Fog (4%)
    weather = np.random.choice([0, 1, 2, 3], size=num_samples, p=[0.70, 0.18, 0.08, 0.04])

    # 4. Road Type: 0=Expressway (30%), 1=Arterial Urban (50%), 2=Narrow Residential (20%)
    road_type = np.random.choice([0, 1, 2], size=num_samples, p=[0.30, 0.50, 0.20])

    # 5. Ambulance Priority: 0=Low, 1=Medium, 2=High, 3=Critical
    priority = np.random.choice([0, 1, 2, 3], size=num_samples, p=[0.15, 0.35, 0.35, 0.15])

    # 6. Traffic level & speed derivation
    # Rush hour indicator
    is_peak = ((hour_of_day >= 8) & (hour_of_day <= 11)) | ((hour_of_day >= 17) & (hour_of_day <= 21))
    
    # Base traffic index (1=Low, 2=Moderate, 3=Heavy, 4=Severe)
    p_peak = np.array([0.05, 0.20, 0.45, 0.30])
    p_offpeak = np.array([0.40, 0.35, 0.18, 0.07])

    # Sample traffic level per row
    traffic_level = np.array([
        np.random.choice([1, 2, 3, 4], p=(p_peak if (is_peak[i] and not is_weekend[i]) else p_offpeak))
        for i in range(num_samples)
    ])

    # Traffic speed (km/h)
    speed_means = {
        (0, 1): 75, (0, 2): 60, (0, 3): 42, (0, 4): 25, # Expressway
        (1, 1): 45, (1, 2): 32, (1, 3): 20, (1, 4): 12, # Arterial
        (2, 1): 30, (2, 2): 22, (2, 3): 14, (2, 4): 8,  # Residential
    }

    base_speed = np.array([
        speed_means.get((r, t), 30) + np.random.normal(0, 2.5)
        for r, t in zip(road_type, traffic_level)
    ])
    base_speed = np.clip(base_speed, 6.0, 95.0)

    # Emergency siren boost: Critical and High priorities cut through traffic (+10% to +25%)
    priority_speed_multiplier = np.where(priority == 3, 1.25,
                                np.where(priority == 2, 1.15,
                                np.where(priority == 1, 1.05, 1.0)))

    # Weather impact: Rain reduces speed by 10%, Heavy Rain by 25%, Fog by 20%
    weather_multiplier = np.where(weather == 1, 0.90,
                         np.where(weather == 2, 0.75,
                         np.where(weather == 3, 0.80, 1.0)))

    effective_speed = base_speed * priority_speed_multiplier * weather_multiplier
    effective_speed = np.clip(effective_speed, 5.0, 100.0)

    # Calculate travel time in minutes
    # Time = (Distance / Speed) * 60 + intersection/signal delays
    # Intersections average ~ 1 per km on arterial, fewer on highway
    intersections_per_km = np.where(road_type == 0, 0.2, np.where(road_type == 1, 1.2, 1.8))
    num_signals = (distance_km * intersections_per_km).round()
    # High priority saves ~50% red light waiting time
    signal_delay_sec = np.where(priority >= 2, 12, 30) 
    total_signal_delay_min = (num_signals * signal_delay_sec) / 60.0

    raw_travel_time_min = (distance_km / effective_speed) * 60.0 + total_signal_delay_min
    
    # Add realistic stochastic dispatch/turn variance (+- 5%)
    noise = np.random.normal(1.0, 0.05, size=num_samples)
    travel_time_minutes = np.maximum(1.5, (raw_travel_time_min * noise)).round(2)

    df = pd.DataFrame({
        "distance_km": distance_km,
        "traffic_level": traffic_level,
        "traffic_speed_kmh": effective_speed.round(1),
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "weather": weather,
        "road_type": road_type,
        "priority": priority,
        "travel_time_minutes": travel_time_minutes
    })

    return df


def generate_hospital_surge_data(num_samples: int = 8000, seed: int = 42) -> pd.DataFrame:
    """
    Generates historical time-series emergency department load data
    for predicting 30-minute surge saturation risk.
    """
    np.random.seed(seed)

    hospital_ids = np.random.choice([1, 2, 3, 4, 5, 6], size=num_samples)
    hour = np.random.randint(0, 24, size=num_samples)
    day = np.random.randint(0, 7, size=num_samples)
    is_weekend = (day >= 5).astype(int)

    # Base occupancy %
    base_occupancy = np.random.uniform(40.0, 85.0, size=num_samples)
    
    # Recent arrivals in past 1 hour (0 to 12)
    recent_arrivals = np.random.poisson(lam=4.0, size=num_samples)
    
    # Peak hour pressure
    peak_multiplier = np.where(((hour >= 18) & (hour <= 23)) | ((hour >= 8) & (hour <= 12)), 1.25, 0.9)
    
    # Critical patients currently in ER
    critical_cases = np.random.randint(0, 8, size=num_samples)

    # 30-minute ahead load percentage
    load_delta = (recent_arrivals * 3.5 * peak_multiplier) + (critical_cases * 2.0) - np.random.uniform(1.0, 6.0, size=num_samples)
    future_load_percent = np.clip(base_occupancy + load_delta, 10.0, 100.0).round(1)

    # Surge risk tier:
    # 0: LOW (<60%), 1: MEDIUM (60-75%), 2: HIGH (75-88%), 3: CRITICAL (>88%)
    surge_risk = np.where(future_load_percent < 60.0, 0,
                 np.where(future_load_percent < 75.0, 1,
                 np.where(future_load_percent < 88.0, 2, 3)))

    df = pd.DataFrame({
        "hospital_id": hospital_ids,
        "current_occupancy_pct": base_occupancy.round(1),
        "recent_arrivals_1h": recent_arrivals,
        "critical_cases": critical_cases,
        "hour_of_day": hour,
        "day_of_week": day,
        "is_weekend": is_weekend,
        "predicted_30m_load_pct": future_load_percent,
        "surge_risk_tier": surge_risk
    })
    return df


if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    
    print("Generating synthetic emergency trip dataset...")
    trip_df = generate_emergency_trip_data(15000)
    trip_path = os.path.join("data", "historical_emergency_trips.csv")
    trip_df.to_csv(trip_path, index=False)
    print(f"Saved {len(trip_df)} trip records to {trip_path}")

    print("Generating synthetic hospital surge dataset...")
    surge_df = generate_hospital_surge_data(8000)
    surge_path = os.path.join("data", "hospital_surge_history.csv")
    surge_df.to_csv(surge_path, index=False)
    print(f"Saved {len(surge_df)} hospital surge records to {surge_path}")
