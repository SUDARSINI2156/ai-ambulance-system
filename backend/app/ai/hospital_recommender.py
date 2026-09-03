import math
from typing import List, Dict, Any
from .eta_predictor import predict_travel_time

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def evaluate_hospitals_for_emergency(
    pickup_lat: float,
    pickup_lng: float,
    patient_priority: str,
    chief_complaint: str,
    hospitals: List[Any],
    traffic_conditions: Dict[int, int] = None, # hospital_id -> traffic_level (1-4)
    weather: int = 0
) -> Dict[str, Any]:
    """
    Core AI Decision Engine for selecting the optimal hospital.
    Combines XGBoost ETA, Live ER capacity, ICU/Ventilator status, 
    specialized medical capability, and waiting time.
    """
    if traffic_conditions is None:
        traffic_conditions = {}

    priority_map = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
    num_priority = priority_map.get(patient_priority.upper(), 2)

    is_cardiac = any(k in chief_complaint.lower() for k in ["chest pain", "heart", "stemi", "cardiac", "angina"])
    is_stroke = any(k in chief_complaint.lower() for k in ["stroke", "paralysis", "slurred speech", "facial droop"])
    is_trauma = any(k in chief_complaint.lower() for k in ["accident", "fall", "bleeding", "trauma", "fracture"])

    evaluated_list = []

    # Optimization weights (Sum to 1.0)
    # If Critical, ETA and ICU/Ventilator capacity carry highest urgency
    if num_priority == 3: # CRITICAL
        weights = {"eta": 0.35, "icu": 0.25, "beds": 0.20, "capability": 0.12, "wait": 0.08}
    elif num_priority == 2: # HIGH
        weights = {"eta": 0.30, "icu": 0.20, "beds": 0.25, "capability": 0.15, "wait": 0.10}
    else: # MEDIUM / LOW
        weights = {"eta": 0.20, "icu": 0.10, "beds": 0.30, "capability": 0.15, "wait": 0.25}

    for hosp in hospitals:
        # Distance calculation
        dist_km = haversine_distance(pickup_lat, pickup_lng, hosp.latitude, hosp.longitude)
        
        # Route traffic (default moderate=2 if not specified)
        traffic_level = traffic_conditions.get(hosp.id, 2)
        
        # Predict ETA via XGBoost AI
        eta_res = predict_travel_time(
            distance_km=dist_km,
            traffic_level=traffic_level,
            priority=num_priority,
            weather=weather
        )
        predicted_eta = eta_res["predicted_eta_minutes"]

        # 1. ETA Score: 0 to 100 (Max score for < 5 min, 0 for > 35 min)
        eta_score = max(0.0, min(100.0, (1.0 - (predicted_eta / 35.0)) * 100.0))

        # 2. ER Bed Capacity Score
        bed_ratio = (hosp.available_er_beds / max(1, hosp.total_er_beds))
        bed_score = min(100.0, bed_ratio * 100.0)

        # 3. ICU & Ventilator Score (Severe penalty if 0 available during critical case)
        if num_priority >= 2:
            icu_ratio = hosp.available_icu_beds / max(1, hosp.total_icu_beds)
            vent_ratio = hosp.available_ventilators / max(1, hosp.total_ventilators)
            icu_score = ((icu_ratio * 0.6) + (vent_ratio * 0.4)) * 100.0
            if hosp.available_icu_beds == 0 or hosp.available_ventilators == 0:
                icu_score = max(0.0, icu_score - 50.0) # Heavy critical shortage penalty
        else:
            icu_score = 80.0

        # 4. Clinical Specialization Capability Score
        capability_score = 70.0
        if is_cardiac and getattr(hosp, "cardiac_cath_lab", False):
            capability_score = 100.0
        elif is_stroke and getattr(hosp, "stroke_unit", False):
            capability_score = 100.0
        elif is_trauma and getattr(hosp, "trauma_center_level", 3) == 1:
            capability_score = 100.0
        elif (is_cardiac and not getattr(hosp, "cardiac_cath_lab", False)) or \
             (is_stroke and not getattr(hosp, "stroke_unit", False)):
            capability_score = 30.0 # Lacks required cath lab / stroke center

        # 5. Waiting Time Score
        wait_time = getattr(hosp, "current_wait_time_minutes", 15.0)
        wait_score = max(0.0, min(100.0, (1.0 - (wait_time / 60.0)) * 100.0))

        # Divert penalty if hospital flagged as DIVERTING / OVERLOADED
        status_multiplier = 1.0
        if getattr(hosp, "emergency_status", "OPEN") == "OVERLOADED":
            status_multiplier = 0.75
        elif getattr(hosp, "emergency_status", "OPEN") == "DIVERTING":
            status_multiplier = 0.20

        raw_score = (
            weights["eta"] * eta_score +
            weights["beds"] * bed_score +
            weights["icu"] * icu_score +
            weights["capability"] * capability_score +
            weights["wait"] * wait_score
        ) * status_multiplier

        suitability_score = round(max(0.0, min(100.0, raw_score)), 1)

        evaluated_list.append({
            "hospital_id": hosp.id,
            "hospital_name": hosp.name,
            "distance_km": dist_km,
            "traffic_level": traffic_level,
            "predicted_eta_minutes": predicted_eta,
            "available_er_beds": hosp.available_er_beds,
            "available_icu_beds": hosp.available_icu_beds,
            "available_ventilators": hosp.available_ventilators,
            "current_wait_time_minutes": wait_time,
            "suitability_score": suitability_score,
            "breakdown": {
                "eta_score": round(eta_score, 1),
                "bed_score": round(bed_score, 1),
                "icu_score": round(icu_score, 1),
                "capability_score": round(capability_score, 1),
                "wait_score": round(wait_score, 1)
            }
        })

    # Sort by Suitability Score descending
    evaluated_list.sort(key=lambda x: x["suitability_score"], reverse=True)

    # Assign ranks and generate explainability
    for rank_idx, item in enumerate(evaluated_list, 1):
        item["rank"] = rank_idx
        item["is_recommended"] = (rank_idx == 1)

    top = evaluated_list[0]
    
    # Generate transparent explainability rationale comparing Top vs Nearest
    nearest = min(evaluated_list, key=lambda x: x["distance_km"])
    if nearest["hospital_id"] == top["hospital_id"]:
        top["explainability"] = (
            f"Hospital {top['hospital_name']} is both the closest ({top['distance_km']} km) "
            f"and provides optimal emergency readiness with {top['available_er_beds']} ER beds "
            f"and {top['available_icu_beds']} ICU beds available. Predicted ETA: {top['predicted_eta_minutes']} min."
        )
    else:
        top["explainability"] = (
            f"AI recommended {top['hospital_name']} (Score: {top['suitability_score']}) over "
            f"the nearest facility {nearest['hospital_name']} ({nearest['distance_km']} km). "
            f"Although {nearest['hospital_name']} is closer, {top['hospital_name']} saves crucial time "
            f"(ETA {top['predicted_eta_minutes']}m vs {nearest['predicted_eta_minutes']}m in current traffic) "
            f"and guarantees immediate specialized emergency capacity ({top['available_icu_beds']} ICU beds free)."
        )

    for item in evaluated_list[1:]:
        item["explainability"] = (
            f"Rank #{item['rank']}: Suitability {item['suitability_score']}/100. "
            f"ETA: {item['predicted_eta_minutes']} min ({item['distance_km']} km). "
            f"ER Beds: {item['available_er_beds']}, ICU: {item['available_icu_beds']}."
        )

    return {
        "recommended_hospital": top,
        "all_evaluated_hospitals": evaluated_list,
        "optimization_weights": weights
    }
