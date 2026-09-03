from typing import List, Optional
from pydantic import BaseModel
import datetime

# --- Auth ---
class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "DISPATCHER"
    assigned_ambulance_id: Optional[int] = None
    assigned_hospital_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    assigned_ambulance_id: Optional[int] = None
    assigned_hospital_id: Optional[int] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Hospital ---
class HospitalCapacityUpdate(BaseModel):
    available_er_beds: int
    available_icu_beds: int
    available_ventilators: int
    doctors_on_duty: Optional[int] = None
    current_wait_time_minutes: Optional[float] = None
    emergency_status: Optional[str] = None # OPEN, OVERLOADED, DIVERTING

class HospitalOut(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    address: str
    phone: str
    emergency_status: str
    total_er_beds: int
    available_er_beds: int
    total_icu_beds: int
    available_icu_beds: int
    total_ventilators: int
    available_ventilators: int
    doctors_on_duty: int
    current_wait_time_minutes: float
    cardiac_cath_lab: bool
    stroke_unit: bool
    trauma_center_level: int
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

# --- Ambulance ---
class AmbulanceLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: float = 0.0
    heading: float = 0.0
    status: Optional[str] = None

class AmbulanceOut(BaseModel):
    id: int
    vehicle_number: str
    driver_name: str
    phone: str
    status: str
    equipment_level: str
    current_lat: float
    current_lng: float
    speed_kmh: float
    heading: float
    current_emergency_id: Optional[int] = None
    assigned_hospital_id: Optional[int] = None
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

# --- Emergency ---
class EmergencyCreate(BaseModel):
    patient_name: str = "Unknown Patient"
    patient_age: int = 45
    patient_gender: str = "Male"
    chief_complaint: str
    priority: Optional[str] = None # If None, AI Triage classifies automatically
    heart_rate: float = 88.0
    systolic_bp: float = 125.0
    oxygen_sat: float = 95.0
    gcs_score: int = 15
    pain_scale: int = 5
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    preferred_ambulance_id: Optional[int] = None

class EmergencyStatusUpdate(BaseModel):
    status: str # DISPATCHED, TRANSPORTING, ARRIVED_HOSPITAL, COMPLETED, CANCELLED

class RerouteRequest(BaseModel):
    new_hospital_id: int
    reason: str

class EmergencyOut(BaseModel):
    id: int
    emergency_code: str
    patient_name: str
    patient_age: int
    patient_gender: str
    chief_complaint: str
    priority: str
    heart_rate: float
    systolic_bp: float
    oxygen_sat: float
    gcs_score: int
    pain_scale: int
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    status: str
    assigned_ambulance_id: Optional[int] = None
    assigned_hospital_id: Optional[int] = None
    initial_hospital_id: Optional[int] = None
    reroute_count: int
    reroute_reason: Optional[str] = None
    created_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

# --- AI Prediction & Recommendations ---
class ETAPredictRequest(BaseModel):
    distance_km: float
    traffic_level: int = 2 # 1=Low, 2=Moderate, 3=Heavy, 4=Severe
    traffic_speed_kmh: Optional[float] = None
    hour_of_day: Optional[int] = None
    day_of_week: Optional[int] = None
    is_weekend: Optional[int] = None
    weather: int = 0 # 0=Clear, 1=Rain, 2=Heavy Rain, 3=Fog
    road_type: int = 1 # 0=Expressway, 1=Arterial, 2=Residential
    priority: int = 2 # 0=Low, 1=Medium, 2=High, 3=Critical

class ETAPredictResponse(BaseModel):
    predicted_eta_minutes: float
    confidence_interval_min: float
    confidence_interval_max: float
    model_version: str

class HospitalRecommendationItem(BaseModel):
    hospital_id: int
    hospital_name: str
    distance_km: float
    traffic_level: int
    predicted_eta_minutes: float
    available_er_beds: int
    available_icu_beds: int
    available_ventilators: int
    current_wait_time_minutes: float
    suitability_score: float
    rank: int
    is_recommended: bool
    explainability: str
    breakdown: dict

class HospitalRecommendationResponse(BaseModel):
    emergency_id: Optional[int] = None
    recommended_hospital: HospitalRecommendationItem
    all_evaluated_hospitals: List[HospitalRecommendationItem]
    optimization_weights: dict

class SurgeForecastResponse(BaseModel):
    hospital_id: int
    hospital_name: str
    current_occupancy_pct: float
    predicted_30m_load_pct: float
    surge_risk_tier: str # LOW, MEDIUM, HIGH, CRITICAL
    risk_color: str
    recommendation: str

class TriagePredictRequest(BaseModel):
    chief_complaint: str
    heart_rate: float
    systolic_bp: float
    oxygen_sat: float
    gcs_score: int
    pain_scale: int

class TriagePredictResponse(BaseModel):
    priority: str # CRITICAL, HIGH, MEDIUM, LOW
    severity_score: int # 1 to 4
    clinical_flags: List[str]
    suggested_equipment: str # ALS or BLS
