import os
import sys

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import User, Hospital, Ambulance, Emergency, AIRatingLog
from app.auth import get_password_hash
from app.simulation.road_network import CHENNAI_HOSPITALS, INITIAL_AMBULANCES

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Seed Users
    print("Seeding users...")
    users = [
        User(
            name="City Central Dispatcher",
            email="dispatcher@emergency.ai",
            password_hash=get_password_hash("password123"),
            role="DISPATCHER"
        ),
        User(
            name="System Administrator",
            email="admin@emergency.ai",
            password_hash=get_password_hash("password123"),
            role="ADMIN"
        ),
        User(
            name="Paramedic Selvakumar (Ambulance 1081)",
            email="selva@ambulance.ai",
            password_hash=get_password_hash("password123"),
            role="AMBULANCE",
            assigned_ambulance_id=1
        ),
        User(
            name="Apollo Greams ER Command",
            email="apollo@hospital.ai",
            password_hash=get_password_hash("password123"),
            role="HOSPITAL",
            assigned_hospital_id=1
        ),
        User(
            name="Rajiv Gandhi GH ER Staff",
            email="rggh@hospital.ai",
            password_hash=get_password_hash("password123"),
            role="HOSPITAL",
            assigned_hospital_id=2
        ),
    ]

    for u in users:
        existing = db.query(User).filter(User.email == u.email).first()
        if not existing:
            db.add(u)
    db.commit()

    # 2. Seed Hospitals
    print("Seeding hospitals...")
    for h_data in CHENNAI_HOSPITALS:
        existing = db.query(Hospital).filter(Hospital.id == h_data["id"]).first()
        if not existing:
            h = Hospital(
                id=h_data["id"],
                name=h_data["name"],
                latitude=h_data["latitude"],
                longitude=h_data["longitude"],
                address=h_data["address"],
                phone=h_data["phone"],
                emergency_status="OPEN",
                total_er_beds=h_data["total_er_beds"],
                available_er_beds=h_data["available_er_beds"],
                total_icu_beds=h_data["total_icu_beds"],
                available_icu_beds=h_data["available_icu_beds"],
                total_ventilators=h_data["total_ventilators"],
                available_ventilators=h_data["available_ventilators"],
                doctors_on_duty=h_data["doctors_on_duty"],
                current_wait_time_minutes=h_data["current_wait_time_minutes"],
                cardiac_cath_lab=h_data["cardiac_cath_lab"],
                stroke_unit=h_data["stroke_unit"],
                trauma_center_level=h_data["trauma_center_level"]
            )
            db.add(h)
    db.commit()

    # 3. Seed Ambulances
    print("Seeding ambulances...")
    for a_data in INITIAL_AMBULANCES:
        existing = db.query(Ambulance).filter(Ambulance.id == a_data["id"]).first()
        if not existing:
            a = Ambulance(
                id=a_data["id"],
                vehicle_number=a_data["vehicle_number"],
                driver_name=a_data["driver_name"],
                phone=a_data["phone"],
                status=a_data["status"],
                equipment_level=a_data["equipment_level"],
                current_lat=a_data["current_lat"],
                current_lng=a_data["current_lng"],
                speed_kmh=a_data["speed_kmh"],
                heading=a_data["heading"]
            )
            db.add(a)
    db.commit()

    # 4. Seed sample active emergency
    existing_emg = db.query(Emergency).filter(Emergency.emergency_code == "EMG-1024").first()
    if not existing_emg:
        emg = Emergency(
            emergency_code="EMG-1024",
            patient_name="Mr. K. Narayanan",
            patient_age=54,
            patient_gender="Male",
            chief_complaint="Acute crushing chest pain, radiating to left arm, sweating, shortness of breath",
            priority="CRITICAL",
            heart_rate=118.0,
            systolic_bp=165.0,
            oxygen_sat=91.0,
            gcs_score=14,
            pain_scale=9,
            pickup_lat=13.0415,
            pickup_lng=80.2405, # Near Pondy Bazaar, T. Nagar
            pickup_address="45 Usman Road, T. Nagar, Chennai",
            status="DISPATCHED",
            assigned_ambulance_id=1,
            assigned_hospital_id=1, # Apollo
            initial_hospital_id=1,
            reroute_count=0
        )
        db.add(emg)
        db.commit()

        # Update ambulance 1
        amb1 = db.query(Ambulance).filter(Ambulance.id == 1).first()
        if amb1:
            amb1.status = "DISPATCHED"
            amb1.current_emergency_id = emg.id
            amb1.assigned_hospital_id = 1
            db.commit()

    print("[SUCCESS] Seed data populated successfully!")
    db.close()

if __name__ == "__main__":
    seed()
