from typing import Optional, Dict, Any, List
from .hospital_recommender import evaluate_hospitals_for_emergency, haversine_distance

def check_dynamic_reroute_condition(
    current_ambulance_lat: float,
    current_ambulance_lng: float,
    current_hospital_id: int,
    patient_priority: str,
    chief_complaint: str,
    all_hospitals: List[Any],
    traffic_conditions: Dict[int, int] = None,
    weather: int = 0
) -> Optional[Dict[str, Any]]:
    """
    Evaluates whether an active emergency route should be dynamically diverted
    due to sudden en-route traffic congestion, accident bottlenecks,
    or hospital emergency department saturation.
    """
    if not current_hospital_id or not all_hospitals:
        return None

    # Run AI evaluation from the current live ambulance position
    evaluation = evaluate_hospitals_for_emergency(
        pickup_lat=current_ambulance_lat,
        pickup_lng=current_ambulance_lng,
        patient_priority=patient_priority,
        chief_complaint=chief_complaint,
        hospitals=all_hospitals,
        traffic_conditions=traffic_conditions,
        weather=weather
    )

    top_choice = evaluation["recommended_hospital"]
    
    # Locate current assigned hospital in the evaluation
    current_choice = next((h for h in evaluation["all_evaluated_hospitals"] if h["hospital_id"] == current_hospital_id), None)
    
    if not current_choice:
        return None

    # Check reroute trigger criteria:
    # 1. Assigned hospital is in DIVERTING or 0 ER beds
    # 2. Top choice suitability is at least 12 points higher OR saves >= 4 minutes
    score_diff = top_choice["suitability_score"] - current_choice["suitability_score"]
    time_saved_min = current_choice["predicted_eta_minutes"] - top_choice["predicted_eta_minutes"]

    should_reroute = False
    reroute_reason = ""

    if current_choice["available_er_beds"] == 0:
        should_reroute = True
        reroute_reason = f"Original hospital {current_choice['hospital_name']} reached zero ER bed capacity."
    elif time_saved_min >= 4.0 and score_diff >= 12.0:
        should_reroute = True
        reroute_reason = (
            f"Severe traffic detected on route to {current_choice['hospital_name']} "
            f"(ETA {current_choice['predicted_eta_minutes']}m). Diverting to {top_choice['hospital_name']} "
            f"saves {round(time_saved_min, 1)} minutes (ETA {top_choice['predicted_eta_minutes']}m) "
            f"with {top_choice['available_icu_beds']} ICU beds ready."
        )
    elif score_diff >= 20.0 and top_choice["hospital_id"] != current_hospital_id:
        should_reroute = True
        reroute_reason = (
            f"AI suitability for {top_choice['hospital_name']} ({top_choice['suitability_score']}) "
            f"significantly exceeds {current_choice['hospital_name']} ({current_choice['suitability_score']})."
        )

    if should_reroute and top_choice["hospital_id"] != current_hospital_id:
        return {
            "should_reroute": True,
            "current_hospital": current_choice,
            "recommended_hospital": top_choice,
            "score_difference": round(score_diff, 1),
            "time_saved_minutes": max(0.0, round(time_saved_min, 1)),
            "reason": reroute_reason
        }

    return None
