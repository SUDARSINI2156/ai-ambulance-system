import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Emergency, Hospital, Ambulance, AIRatingLog
from ..schemas import EmergencyCreate, EmergencyOut, EmergencyStatusUpdate, RerouteRequest
from ..ai.hospital_recommender import evaluate_hospitals_for_emergency, haversine_distance
from ..ai.triage_classifier import classify_triage_priority
from ..simulation.simulator import sim_state
from .websocket_router import ws_manager
from ..services.sms_service import send_emergency_sms

router = APIRouter(prefix="/api/emergencies", tags=["Emergencies"])

@router.post("", response_model=EmergencyOut)
async def create_emergency(payload: EmergencyCreate, db: Session = Depends(get_db)):
    # 1. AI Triage if priority is not supplied
    priority = payload.priority
    if not priority:
        triage_res = classify_triage_priority(
            chief_complaint=payload.chief_complaint,
            heart_rate=payload.heart_rate,
            systolic_bp=payload.systolic_bp,
            oxygen_sat=payload.oxygen_sat,
            gcs_score=payload.gcs_score,
            pain_scale=payload.pain_scale
        )
        priority = triage_res["priority"]

    # 2. Query all hospitals
    all_hospitals = db.query(Hospital).all()
    if not all_hospitals:
        raise HTTPException(status_code=400, detail="No hospitals configured in system")

    # 3. Run AI Hospital Recommendation Engine
    eval_result = evaluate_hospitals_for_emergency(
        pickup_lat=payload.pickup_lat,
        pickup_lng=payload.pickup_lng,
        patient_priority=priority,
        chief_complaint=payload.chief_complaint,
        hospitals=all_hospitals,
        traffic_conditions=sim_state.traffic_conditions
    )
    recommended_hosp_info = eval_result["recommended_hospital"]
    assigned_hospital_id = recommended_hosp_info["hospital_id"]

    # 4. Find closest available ambulance
    # Prioritize ALS equipment for Critical / High cases
    ambulances = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE").all()
    assigned_amb = None
    if ambulances:
        if priority in ["CRITICAL", "HIGH"]:
            # Prefer ALS
            als_ambs = [a for a in ambulances if a.equipment_level == "ALS"]
            pool = als_ambs if als_ambs else ambulances
        else:
            pool = ambulances

        # Pick closest to pickup location
        assigned_amb = min(
            pool,
            key=lambda a: haversine_distance(a.current_lat, a.current_lng, payload.pickup_lat, payload.pickup_lng)
        )

    # 5. Generate Emergency Code
    emg_code = f"EMG-{str(uuid.uuid4())[:6].upper()}"

    new_emergency = Emergency(
        emergency_code=emg_code,
        patient_name=payload.patient_name,
        patient_age=payload.patient_age,
        patient_gender=payload.patient_gender,
        chief_complaint=payload.chief_complaint,
        priority=priority,
        heart_rate=payload.heart_rate,
        systolic_bp=payload.systolic_bp,
        oxygen_sat=payload.oxygen_sat,
        gcs_score=payload.gcs_score,
        pain_scale=payload.pain_scale,
        pickup_lat=payload.pickup_lat,
        pickup_lng=payload.pickup_lng,
        pickup_address=payload.pickup_address,
        status="DISPATCHED" if assigned_amb else "PENDING",
        assigned_ambulance_id=assigned_amb.id if assigned_amb else None,
        assigned_hospital_id=assigned_hospital_id,
        initial_hospital_id=assigned_hospital_id,
        reroute_count=0
    )
    db.add(new_emergency)
    db.commit()
    db.refresh(new_emergency)

    # 6. Mark ambulance as dispatched
    if assigned_amb:
        assigned_amb.status = "DISPATCHED"
        assigned_amb.current_emergency_id = new_emergency.id
        assigned_amb.assigned_hospital_id = assigned_hospital_id
        db.commit()

    # 7. Log AI evaluations for full academic explainability
    for h_eval in eval_result["all_evaluated_hospitals"]:
        log_entry = AIRatingLog(
            emergency_id=new_emergency.id,
            hospital_id=h_eval["hospital_id"],
            predicted_eta_minutes=h_eval["predicted_eta_minutes"],
            distance_km=h_eval["distance_km"],
            traffic_level=h_eval["traffic_level"],
            suitability_score=h_eval["suitability_score"],
            rank=h_eval["rank"],
            explainability_reason=h_eval["explainability"],
            is_selected=(h_eval["hospital_id"] == assigned_hospital_id)
        )
        db.add(log_entry)
    db.commit()

    # 8. Real-time WebSocket broadcast
    await ws_manager.broadcast({
        "type": "NEW_EMERGENCY",
        "emergency": {
            "id": new_emergency.id,
            "code": new_emergency.emergency_code,
            "patient": new_emergency.patient_name,
            "priority": new_emergency.priority,
            "complaint": new_emergency.chief_complaint,
            "pickup_address": new_emergency.pickup_address,
            "pickup_coords": [new_emergency.pickup_lat, new_emergency.pickup_lng],
            "assigned_ambulance_id": new_emergency.assigned_ambulance_id,
            "assigned_hospital_id": new_emergency.assigned_hospital_id,
            "recommended_hospital_name": recommended_hosp_info["hospital_name"],
            "predicted_eta": recommended_hosp_info["predicted_eta_minutes"],
            "suitability_score": recommended_hosp_info["suitability_score"],
            "explainability": recommended_hosp_info["explainability"]
        }
    })

    # 9. Real-time SMS Gateway Alert (using Fast2SMS / Gateway)
    sms_text = f"108 ALERT: {emg_code} [{new_emergency.priority}]. Amb: {assigned_amb.vehicle_number if assigned_amb else 'Dispatched'}. Dest: {recommended_hosp_info['hospital_name']} (ETA ~{recommended_hosp_info['predicted_eta_minutes']}m)."
    try:
        # Send to driver or default alert line
        phone = assigned_amb.phone if assigned_amb else "9840111081"
        send_emergency_sms(phone, sms_text)
    except Exception as e:
        print(f"SMS dispatch skipped: {e}")

    return new_emergency

@router.get("", response_model=List[EmergencyOut])
def list_emergencies(db: Session = Depends(get_db)):
    return db.query(Emergency).order_by(Emergency.created_at.desc()).all()

@router.get("/active", response_model=List[EmergencyOut])
def get_active_emergencies(db: Session = Depends(get_db)):
    return db.query(Emergency).filter(
        Emergency.status.in_(["PENDING", "DISPATCHED", "TRANSPORTING", "REROUTED"])
    ).order_by(Emergency.created_at.desc()).all()

@router.get("/{emergency_id}", response_model=EmergencyOut)
def get_emergency(emergency_id: int, db: Session = Depends(get_db)):
    emg = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emg:
        raise HTTPException(status_code=404, detail="Emergency not found")
    return emg

@router.put("/{emergency_id}/status")
async def update_emergency_status(
    emergency_id: int,
    payload: EmergencyStatusUpdate,
    db: Session = Depends(get_db)
):
    emg = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emg:
        raise HTTPException(status_code=404, detail="Emergency not found")

    emg.status = payload.status
    if payload.status == "COMPLETED":
        emg.completed_at = datetime.datetime.utcnow()
        # Free up ambulance
        if emg.assigned_ambulance_id:
            amb = db.query(Ambulance).filter(Ambulance.id == emg.assigned_ambulance_id).first()
            if amb:
                amb.status = "AVAILABLE"
                amb.current_emergency_id = None
                amb.assigned_hospital_id = None

    db.commit()
    db.refresh(emg)

    await ws_manager.broadcast({
        "type": "EMERGENCY_STATUS_UPDATED",
        "emergency_id": emg.id,
        "status": emg.status
    })

    return emg

@router.post("/{emergency_id}/reroute")
async def reroute_emergency(
    emergency_id: int,
    payload: RerouteRequest,
    db: Session = Depends(get_db)
):
    emg = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emg:
        raise HTTPException(status_code=404, detail="Emergency not found")

    new_hosp = db.query(Hospital).filter(Hospital.id == payload.new_hospital_id).first()
    if not new_hosp:
        raise HTTPException(status_code=404, detail="Target hospital not found")

    old_hosp_id = emg.assigned_hospital_id
    emg.assigned_hospital_id = new_hosp.id
    emg.reroute_count += 1
    emg.reroute_reason = payload.reason
    emg.status = "REROUTED"

    # Also update assigned ambulance target
    if emg.assigned_ambulance_id:
        amb = db.query(Ambulance).filter(Ambulance.id == emg.assigned_ambulance_id).first()
        if amb:
            amb.assigned_hospital_id = new_hosp.id

    db.commit()
    db.refresh(emg)

    # Broadcast dynamic reroute notification
    await ws_manager.broadcast({
        "type": "DYNAMIC_REROUTE_ALERT",
        "emergency_id": emg.id,
        "emergency_code": emg.emergency_code,
        "patient_name": emg.patient_name,
        "priority": emg.priority,
        "old_hospital_id": old_hosp_id,
        "new_hospital_id": new_hosp.id,
        "new_hospital_name": new_hosp.name,
        "reason": payload.reason,
        "reroute_count": emg.reroute_count
    })

    return {
        "status": "rerouted",
        "emergency_id": emg.id,
        "new_hospital": new_hosp.name,
        "reason": payload.reason
    }
