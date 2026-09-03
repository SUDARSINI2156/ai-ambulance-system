from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Hospital, Emergency, Ambulance
from ..schemas import HospitalOut, HospitalCapacityUpdate, SurgeForecastResponse
from ..ai.load_forecaster import forecast_hospital_surge
from .websocket_router import ws_manager

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])

@router.get("", response_model=List[HospitalOut])
def list_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    return hospitals

@router.get("/{hospital_id}", response_model=HospitalOut)
def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hosp

@router.put("/{hospital_id}/capacity", response_model=HospitalOut)
async def update_capacity(
    hospital_id: int,
    payload: HospitalCapacityUpdate,
    db: Session = Depends(get_db)
):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")

    hosp.available_er_beds = payload.available_er_beds
    hosp.available_icu_beds = payload.available_icu_beds
    hosp.available_ventilators = payload.available_ventilators
    if payload.doctors_on_duty is not None:
        hosp.doctors_on_duty = payload.doctors_on_duty
    if payload.current_wait_time_minutes is not None:
        hosp.current_wait_time_minutes = payload.current_wait_time_minutes
    if payload.emergency_status:
        hosp.emergency_status = payload.emergency_status

    db.commit()
    db.refresh(hosp)

    # Broadcast real-time capacity change to all clients
    await ws_manager.broadcast({
        "type": "HOSPITAL_CAPACITY_CHANGED",
        "hospital_id": hosp.id,
        "name": hosp.name,
        "available_er_beds": hosp.available_er_beds,
        "available_icu_beds": hosp.available_icu_beds,
        "available_ventilators": hosp.available_ventilators,
        "emergency_status": hosp.emergency_status,
        "current_wait_time_minutes": hosp.current_wait_time_minutes
    })

    return hosp

@router.get("/{hospital_id}/incoming")
def get_incoming_ambulances(hospital_id: int, db: Session = Depends(get_db)):
    # Find all active emergencies heading to this hospital
    active_emergencies = db.query(Emergency).filter(
        Emergency.assigned_hospital_id == hospital_id,
        Emergency.status.in_(["DISPATCHED", "TRANSPORTING", "REROUTED"])
    ).all()

    incoming_list = []
    for emg in active_emergencies:
        amb = None
        if emg.assigned_ambulance_id:
            amb = db.query(Ambulance).filter(Ambulance.id == emg.assigned_ambulance_id).first()

        incoming_list.append({
            "emergency_id": emg.id,
            "emergency_code": emg.emergency_code,
            "patient_name": emg.patient_name,
            "patient_age": emg.patient_age,
            "patient_gender": emg.patient_gender,
            "priority": emg.priority,
            "chief_complaint": emg.chief_complaint,
            "heart_rate": emg.heart_rate,
            "systolic_bp": emg.systolic_bp,
            "oxygen_sat": emg.oxygen_sat,
            "ambulance_vehicle": amb.vehicle_number if amb else "Unassigned",
            "ambulance_status": amb.status if amb else "UNKNOWN",
            "ambulance_lat": amb.current_lat if amb else emg.pickup_lat,
            "ambulance_lng": amb.current_lng if amb else emg.pickup_lng,
            "ambulance_speed": amb.speed_kmh if amb else 0.0,
            "status": emg.status
        })
    return incoming_list

@router.get("/{hospital_id}/surge-forecast", response_model=SurgeForecastResponse)
def get_surge_forecast(hospital_id: int, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")

    # Count active inbound critical cases
    critical_inbound = db.query(Emergency).filter(
        Emergency.assigned_hospital_id == hospital_id,
        Emergency.priority.in_(["CRITICAL", "HIGH"]),
        Emergency.status.in_(["DISPATCHED", "TRANSPORTING"])
    ).count()

    forecast = forecast_hospital_surge(
        hospital_id=hosp.id,
        hospital_name=hosp.name,
        total_er_beds=hosp.total_er_beds,
        available_er_beds=hosp.available_er_beds,
        recent_arrivals_1h=max(2, critical_inbound * 2),
        critical_cases=critical_inbound
    )
    return forecast
