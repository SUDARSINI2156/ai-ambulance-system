import requests
from typing import List, Dict, Any, Optional

USER_AGENT = "PulseAI-Emergency-Routing-System/2.0"

def geocode_location(query: str) -> Optional[Dict[str, Any]]:
    """
    Geocodes an address or district name using OpenStreetMap Nominatim.
    Example: 'Gandhipuram Coimbatore' -> lat: 11.0183, lng: 76.9678
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": f"{query}, Tamil Nadu, India",
        "format": "json",
        "limit": 1
    }
    headers = {"User-Agent": USER_AGENT}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        if response.status_code == 200:
            results = response.json()
            if results:
                top = results[0]
                return {
                    "display_name": top.get("display_name"),
                    "lat": float(top.get("lat")),
                    "lng": float(top.get("lon"))
                }
    except Exception as e:
        print(f"OSM Nominatim Geocode error: {e}")
    return None

def fetch_osm_hospitals_near(lat: float, lng: float, radius_km: float = 20.0) -> List[Dict[str, Any]]:
    """
    Queries real live hospitals from OpenStreetMap Overpass API around any GPS point.
    """
    radius_meters = int(radius_km * 1000)
    overpass_url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json][timeout:10];
    (
      node["amenity"="hospital"](around:{radius_meters},{lat},{lng});
      way["amenity"="hospital"](around:{radius_meters},{lat},{lng});
    );
    out center 15;
    """
    try:
        response = requests.post(overpass_url, data={"data": query}, headers={"User-Agent": USER_AGENT}, timeout=8)
        if response.status_code == 200:
            data = response.json()
            elements = data.get("elements", [])
            hospitals = []
            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name") or tags.get("name:en")
                if not name:
                    continue
                h_lat = el.get("lat") or el.get("center", {}).get("lat")
                h_lng = el.get("lon") or el.get("center", {}).get("lon")
                if h_lat and h_lng:
                    hospitals.append({
                        "name": name,
                        "latitude": float(h_lat),
                        "longitude": float(h_lng),
                        "address": tags.get("addr:street") or tags.get("addr:suburb") or "Tamil Nadu",
                        "phone": tags.get("phone") or tags.get("contact:phone") or "+91 108",
                        "emergency_ready": tags.get("emergency") == "yes" or True
                    })
            return hospitals
    except Exception as e:
        print(f"OSM Overpass API error: {e}")
    return []
