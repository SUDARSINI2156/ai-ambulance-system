export interface Hospital {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  emergency_status: 'OPEN' | 'OVERLOADED' | 'DIVERTING';
  total_er_beds: number;
  available_er_beds: number;
  total_icu_beds: number;
  available_icu_beds: number;
  total_ventilators: number;
  available_ventilators: number;
  doctors_on_duty: number;
  current_wait_time_minutes: number;
  cardiac_cath_lab: boolean;
  stroke_unit: boolean;
  trauma_center_level: number;
}

export interface Ambulance {
  id: number;
  vehicle_number: string;
  driver_name: string;
  phone: string;
  status: 'AVAILABLE' | 'DISPATCHED' | 'EN_ROUTE_PATIENT' | 'PATIENT_ON_BOARD' | 'TRANSPORTING' | 'ARRIVED_HOSPITAL' | 'MAINTENANCE';
  equipment_level: 'ALS' | 'BLS';
  current_lat: number;
  current_lng: number;
  speed_kmh: number;
  heading: number;
  current_emergency_id?: number | null;
  assigned_hospital_id?: number | null;
}

export interface Emergency {
  id: number;
  emergency_code: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  chief_complaint: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  heart_rate: number;
  systolic_bp: number;
  oxygen_sat: number;
  gcs_score: number;
  pain_scale: number;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  status: 'PENDING' | 'DISPATCHED' | 'TRANSPORTING' | 'REROUTED' | 'COMPLETED' | 'CANCELLED';
  assigned_ambulance_id?: number | null;
  assigned_hospital_id?: number | null;
  initial_hospital_id?: number | null;
  reroute_count: number;
  reroute_reason?: string | null;
  created_at: string;
}

export interface HospitalRecommendation {
  hospital_id: number;
  hospital_name: string;
  distance_km: number;
  traffic_level: number;
  predicted_eta_minutes: number;
  available_er_beds: number;
  available_icu_beds: number;
  available_ventilators: number;
  current_wait_time_minutes: number;
  suitability_score: number;
  rank: number;
  is_recommended: boolean;
  explainability: string;
  breakdown: {
    eta_score: number;
    bed_score: number;
    icu_score: number;
    capability_score: number;
    wait_score: number;
  };
}

export interface DynamicRerouteEvent {
  type: 'DYNAMIC_REROUTE_ALERT';
  emergency_id: number;
  emergency_code: string;
  patient_name: string;
  priority: string;
  old_hospital_id: number;
  old_hospital_name?: string;
  new_hospital_id: number;
  new_hospital_name: string;
  reason: string;
  time_saved_minutes?: number;
  score_difference?: number;
  reroute_count?: number;
}
