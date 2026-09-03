import asyncio
import time
import math
from typing import Dict, Optional, List, Tuple
from .road_network import interpolate_points

class SimulationState:
    def __init__(self):
        self.is_running = False
        self.active_simulations: Dict[int, dict] = {} # ambulance_id -> state
        self.traffic_conditions: Dict[int, int] = {} # hospital_id -> congestion_level (1-4)
        self.speed_multipliers: Dict[int, float] = {}

    def set_traffic_for_hospital(self, hospital_id: int, congestion_level: int):
        self.traffic_conditions[hospital_id] = max(1, min(4, congestion_level))

    def get_traffic_for_hospital(self, hospital_id: int) -> int:
        return self.traffic_conditions.get(hospital_id, 2)

sim_state = SimulationState()

def create_route_waypoints(start: Tuple[float, float], end: Tuple[float, float], waypoints_count: int = 30) -> List[Tuple[float, float]]:
    """Creates a smooth series of GPS coordinates simulating road driving."""
    # Simple straight-line interpolation with slight urban jitter
    points = interpolate_points(start, end, num_steps=waypoints_count)
    return points

async def run_ambulance_simulation_step(
    ambulance_id: int,
    waypoints: List[Tuple[float, float]],
    broadcast_callback,
    step_delay_sec: float = 1.0
):
    """
    Asynchronously steps an ambulance along waypoints, broadcasting
    GPS updates to all connected WebSockets.
    """
    total = len(waypoints)
    for idx, (lat, lng) in enumerate(waypoints):
        # Calculate heading to next point
        heading = 0.0
        if idx < total - 1:
            next_lat, next_lng = waypoints[idx + 1]
            d_lng = next_lng - lng
            d_lat = next_lat - lat
            heading = (math.degrees(math.atan2(d_lng, d_lat)) + 360) % 360

        speed = 42.0 + (math.sin(idx) * 8.0) # Realistic speed fluctuation
        
        # Broadcast live GPS
        payload = {
            "type": "AMBULANCE_GPS_UPDATE",
            "ambulance_id": ambulance_id,
            "latitude": round(lat, 5),
            "longitude": round(lng, 5),
            "speed_kmh": round(max(15.0, speed), 1),
            "heading": round(heading, 1),
            "progress_pct": round(((idx + 1) / total) * 100, 1),
            "step": idx + 1,
            "total_steps": total
        }

        if broadcast_callback:
            await broadcast_callback(payload)

        await asyncio.sleep(step_delay_sec)
