import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(30), nullable=False, default="DISPATCHER") # ADMIN, AMBULANCE, HOSPITAL, DISPATCHER
    assigned_ambulance_id = Column(Integer, nullable=True)
    assigned_hospital_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(250), nullable=False)
    phone = Column(String(50), default="+91 44 2829 0200")
    emergency_status = Column(String(30), default="OPEN") # OPEN, OVERLOADED, DIVERTING
    
    # Capacity Tracking
    total_er_beds = Column(Integer, default=20)
    available_er_beds = Column(Integer, default=8)
    total_icu_beds = Column(Integer, default=10)
    available_icu_beds = Column(Integer, default=3)
    total_ventilators = Column(Integer, default=8)
    available_ventilators = Column(Integer, default=4)
    doctors_on_duty = Column(Integer, default=6)
    current_wait_time_minutes = Column(Float, default=12.0)
    
    # Advanced Capabilities
    cardiac_cath_lab = Column(Boolean, default=True)
    stroke_unit = Column(Boolean, default=True)
    trauma_center_level = Column(Integer, default=1) # 1=Comprehensive, 2=Major, 3=General
    
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    emergencies = relationship("Emergency", back_populates="assigned_hospital", foreign_keys="Emergency.assigned_hospital_id")

class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(50), unique=True, nullable=False)
    driver_name = Column(String(100), nullable=False)
    phone = Column(String(50), default="+91 98400 12345")
    status = Column(String(40), default="AVAILABLE") # AVAILABLE, DISPATCHED, EN_ROUTE_PATIENT, PATIENT_ON_BOARD, ARRIVED_HOSPITAL, MAINTENANCE
    equipment_level = Column(String(30), default="ALS") # ALS (Advanced Life Support), BLS (Basic)
    
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)
    speed_kmh = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    
    current_emergency_id = Column(Integer, nullable=True)
    assigned_hospital_id = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Emergency(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)
    emergency_code = Column(String(30), unique=True, index=True, nullable=False)
    patient_name = Column(String(100), default="Unknown Patient")
    patient_age = Column(Integer, default=45)
    patient_gender = Column(String(20), default="Male")
    chief_complaint = Column(String(250), nullable=False)
    priority = Column(String(30), default="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    
    # Clinical Vitals
    heart_rate = Column(Float, default=88.0)
    systolic_bp = Column(Float, default=125.0)
    oxygen_sat = Column(Float, default=95.0)
    gcs_score = Column(Integer, default=15)
    pain_scale = Column(Integer, default=5)
    
    # Location
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    pickup_address = Column(String(250), nullable=False)
    
    # Lifecycle
    status = Column(String(40), default="PENDING") # PENDING, DISPATCHED, TRANSPORTING, REROUTED, COMPLETED, CANCELLED
    assigned_ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    assigned_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    initial_hospital_id = Column(Integer, nullable=True)
    
    reroute_count = Column(Integer, default=0)
    reroute_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    assigned_hospital = relationship("Hospital", foreign_keys=[assigned_hospital_id], back_populates="emergencies")

class AIRatingLog(Base):
    __tablename__ = "ai_rating_logs"

    id = Column(Integer, primary_key=True, index=True)
    emergency_id = Column(Integer, ForeignKey("emergencies.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    predicted_eta_minutes = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    traffic_level = Column(Integer, default=2)
    suitability_score = Column(Float, nullable=False)
    rank = Column(Integer, nullable=False)
    explainability_reason = Column(Text, nullable=False)
    is_selected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TrafficSegment(Base):
    __tablename__ = "traffic_segments"

    id = Column(Integer, primary_key=True, index=True)
    road_name = Column(String(150), nullable=False)
    start_lat = Column(Float, nullable=False)
    start_lng = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lng = Column(Float, nullable=False)
    congestion_level = Column(Integer, default=1) # 1=Low, 2=Moderate, 3=Heavy, 4=Severe
    average_speed_kmh = Column(Float, default=40.0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
