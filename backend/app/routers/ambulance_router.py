import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Ambulance, Emergency, Hospital
from ..schemas import AmbulanceOut, AmbulanceLocationUpdate
from .websocket_router import ws_manager
from ..simulation.simulator import create_route_waypoints, run_ambulance_simulation_step

router = APIRouter(prefix="/api/ambulances", tags=["Ambulances"])

@router.get("", response_model=List[AmbulanceOut])
def list_ambulances(db: Session = Depends(get_db)):
    ambulances = db.query(Ambulance).all()
    return ambulances

@router.get("/{ambulance_id}", response_model=AmbulanceOut)
def get_ambulance(ambulance_id: int, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return amb

@router.put("/{ambulance_id}/location", response_model=AmbulanceOut)
async def update_location(
    ambulance_id: int,
    payload: AmbulanceLocationUpdate,
    db: Session = Depends(get_db)
):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    amb.current_lat = payload.latitude
    amb.current_lng = payload.longitude
    amb.speed_kmh = payload.speed_kmh
    amb.heading = payload.heading
    if payload.status:
        amb.status = payload.status

    db.commit()
    db.refresh(amb)

    await ws_manager.broadcast({
        "type": "AMBULANCE_GPS_UPDATE",
        "ambulance_id": amb.id,
        "vehicle_number": amb.vehicle_number,
        "latitude": amb.current_lat,
        "longitude": amb.current_lng,
        "speed_kmh": amb.speed_kmh,
        "heading": amb.heading,
        "status": amb.status,
        "current_emergency_id": amb.current_emergency_id
    })

    return amb

@router.put("/{ambulance_id}/status")
async def update_status(
    ambulance_id: int,
    status_str: str,
    db: Session = Depends(get_db)
):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    amb.status = status_str
    db.commit()
    db.refresh(amb)

    await ws_manager.broadcast({
        "type": "AMBULANCE_STATUS_UPDATE",
        "ambulance_id": amb.id,
        "vehicle_number": amb.vehicle_number,
        "status": amb.status
    })
    return {"status": "success", "ambulance": amb.vehicle_number, "new_status": amb.status}

async def _simulate_trip_background(ambulance_id: int, waypoints: list):
    # Callback to broadcast and update DB
    async def broadcast_step(step_data):
        from ..database import SessionLocal
        from ..models import Ambulance
        
        # Broadcast via websocket
        await ws_manager.broadcast(step_data)
        
        # Persist to database
        db = SessionLocal()
        try:
            amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
            if amb:
                amb.current_lat = step_data["latitude"]
                amb.current_lng = step_data["longitude"]
                amb.speed_kmh = step_data["speed_kmh"]
                amb.heading = step_data["heading"]
                db.commit()
        finally:
            db.close()

    await run_ambulance_simulation_step(ambulance_id, waypoints, broadcast_step, step_delay_sec=1.2)

@router.post("/{ambulance_id}/simulate-trip")
async def trigger_trip_simulation(
    ambulance_id: int,
    background_tasks: BackgroundTasks,
    target_lat: float,
    target_lng: float,
    db: Session = Depends(get_db)
):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    start_pt = (amb.current_lat, amb.current_lng)
    end_pt = (target_lat, target_lng)
    waypoints = create_route_waypoints(start_pt, end_pt, waypoints_count=20)

    amb.status = "PATIENT_ON_BOARD"
    db.commit()

    background_tasks.add_task(_simulate_trip_background, ambulance_id, waypoints)

    return {
        "status": "simulation_started",
        "ambulance_id": ambulance_id,
        "total_waypoints": len(waypoints),
        "target": {"lat": target_lat, "lng": target_lng}
    }
