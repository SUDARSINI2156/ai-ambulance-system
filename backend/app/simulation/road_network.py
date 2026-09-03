"""
Chennai Metro Road Network & Hospital Coordinates
Provides realistic geographical locations and interpolated road waypoints.
"""

CHENNAI_HOSPITALS = [
    {
        "id": 1,
        "name": "Apollo Hospitals (Greams Road)",
        "latitude": 13.0612,
        "longitude": 80.2520,
        "address": "21 Greams Lane, Thousand Lights, Chennai",
        "phone": "+91 44 2829 0200",
        "total_er_beds": 25,
        "available_er_beds": 9,
        "total_icu_beds": 14,
        "available_icu_beds": 4,
        "total_ventilators": 10,
        "available_ventilators": 5,
        "doctors_on_duty": 8,
        "current_wait_time_minutes": 10.0,
        "cardiac_cath_lab": True,
        "stroke_unit": True,
        "trauma_center_level": 1
    },
    {
        "id": 2,
        "name": "Rajiv Gandhi Govt General Hospital",
        "latitude": 13.0827,
        "longitude": 80.2785,
        "address": "EVR Periyar Salai, Park Town, Chennai",
        "phone": "+91 44 2530 5000",
        "total_er_beds": 50,
        "available_er_beds": 4,  # Heavily loaded Govt GH
        "total_icu_beds": 25,
        "available_icu_beds": 1,
        "total_ventilators": 15,
        "available_ventilators": 1,
        "doctors_on_duty": 14,
        "current_wait_time_minutes": 35.0,
        "cardiac_cath_lab": True,
        "stroke_unit": True,
        "trauma_center_level": 1
    },
    {
        "id": 3,
        "name": "MIOT International Hospital",
        "latitude": 13.0189,
        "longitude": 80.1873,
        "address": "4/112 Mount Poonamallee Rd, Manapakkam, Chennai",
        "phone": "+91 44 4200 2288",
        "total_er_beds": 20,
        "available_er_beds": 12,
        "total_icu_beds": 12,
        "available_icu_beds": 5,
        "total_ventilators": 8,
        "available_ventilators": 4,
        "doctors_on_duty": 7,
        "current_wait_time_minutes": 8.0,
        "cardiac_cath_lab": True,
        "stroke_unit": True,
        "trauma_center_level": 1
    },
    {
        "id": 4,
        "name": "Fortis Malar Hospital",
        "latitude": 13.0067,
        "longitude": 80.2575,
        "address": "No. 52, 1st Main Rd, Gandhi Nagar, Adyar, Chennai",
        "phone": "+91 44 4289 2222",
        "total_er_beds": 18,
        "available_er_beds": 7,
        "total_icu_beds": 8,
        "available_icu_beds": 2,
        "total_ventilators": 6,
        "available_ventilators": 2,
        "doctors_on_duty": 5,
        "current_wait_time_minutes": 14.0,
        "cardiac_cath_lab": True,
        "stroke_unit": True,
        "trauma_center_level": 2
    },
    {
        "id": 5,
        "name": "Kauvery Hospital",
        "latitude": 13.0368,
        "longitude": 80.2543,
        "address": "199 Luz Church Rd, Mylapore / Alwarpet, Chennai",
        "phone": "+91 44 4000 6000",
        "total_er_beds": 22,
        "available_er_beds": 10,
        "total_icu_beds": 10,
        "available_icu_beds": 4,
        "total_ventilators": 8,
        "available_ventilators": 4,
        "doctors_on_duty": 6,
        "current_wait_time_minutes": 11.0,
        "cardiac_cath_lab": True,
        "stroke_unit": True,
        "trauma_center_level": 2
    },
    {
        "id": 6,
        "name": "SIMS Hospital (Vadapalani)",
        "latitude": 13.0515,
        "longitude": 80.2104,
        "address": "Jawaharlal Nehru Salai, Vadapalani, Chennai",
        "phone": "+91 44 2000 2001",
        "total_er_beds": 24,
        "available_er_beds": 11,
        "total_icu_beds": 12,
        "available_icu_beds": 6,
        "total_ventilators": 8,
        "available_ventilators": 5,
        "doctors_on_duty": 7,
        "current_wait_time_minutes": 9.0,
        "cardiac_cath_lab": True,
        "stroke_unit": True,
        "trauma_center_level": 1
    }
]

INITIAL_AMBULANCES = [
    {
        "id": 1,
        "vehicle_number": "TN-01-AM-1081",
        "driver_name": "R. Selvakumar",
        "phone": "+91 98401 11081",
        "status": "AVAILABLE",
        "equipment_level": "ALS",
        "current_lat": 13.0418,
        "current_lng": 80.2341, # T. Nagar Panagal Park
        "speed_kmh": 0.0,
        "heading": 45.0
    },
    {
        "id": 2,
        "vehicle_number": "TN-02-AM-1082",
        "driver_name": "K. Dinesh",
        "phone": "+91 98402 11082",
        "status": "AVAILABLE",
        "equipment_level": "ALS",
        "current_lat": 13.0850,
        "current_lng": 80.2102, # Anna Nagar Roundtana
        "speed_kmh": 0.0,
        "heading": 120.0
    },
    {
        "id": 3,
        "vehicle_number": "TN-09-AM-1083",
        "driver_name": "M. Vignesh",
        "phone": "+91 98403 11083",
        "status": "AVAILABLE",
        "equipment_level": "BLS",
        "current_lat": 13.0067,
        "current_lng": 80.2023, # Guindy Kathipara
        "speed_kmh": 0.0,
        "heading": 90.0
    },
    {
        "id": 4,
        "vehicle_number": "TN-07-AM-1084",
        "driver_name": "S. Prakash",
        "phone": "+91 98404 11084",
        "status": "AVAILABLE",
        "equipment_level": "ALS",
        "current_lat": 13.0336,
        "current_lng": 80.2707, # Santhome / Marina Beach
        "speed_kmh": 0.0,
        "heading": 270.0
    }
]

def interpolate_points(start: tuple, end: tuple, num_steps: int = 15) -> list:
    """Generates linearly spaced GPS waypoints between two coordinates."""
    lats = [start[0] + (end[0] - start[0]) * (i / num_steps) for i in range(num_steps + 1)]
    lngs = [start[1] + (end[1] - start[1]) * (i / num_steps) for i in range(num_steps + 1)]
    return list(zip(lats, lngs))
