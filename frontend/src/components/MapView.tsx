import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Compass, MapPin } from 'lucide-react';
import { Hospital, Ambulance, Emergency } from '../types';

export const TAMIL_NADU_DISTRICTS = [
  { id: 'all', name: 'All Tamil Nadu', lat: 11.1271, lng: 78.6569, zoom: 7 },
  { id: 'chennai', name: 'Chennai', lat: 13.0475, lng: 80.2420, zoom: 13 },
  { id: 'coimbatore', name: 'Coimbatore', lat: 11.0168, lng: 76.9558, zoom: 13 },
  { id: 'madurai', name: 'Madurai', lat: 9.9252, lng: 78.1198, zoom: 13 },
  { id: 'trichy', name: 'Tiruchirappalli', lat: 10.7905, lng: 78.7047, zoom: 13 },
  { id: 'salem', name: 'Salem', lat: 11.6643, lng: 78.1460, zoom: 13 },
  { id: 'vellore', name: 'Vellore', lat: 12.9165, lng: 79.1325, zoom: 13 },
  { id: 'tirunelveli', name: 'Tirunelveli', lat: 8.7139, lng: 77.7567, zoom: 13 },
];

interface MapViewProps {
  hospitals: Hospital[];
  ambulances: Ambulance[];
  activeEmergency?: Emergency | null;
  selectedHospitalId?: number | null;
  selectedDistrict?: string;
  onDistrictChange?: (districtId: string) => void;
  onHospitalClick?: (hosp: Hospital) => void;
  onAmbulanceClick?: (amb: Ambulance) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  hospitals,
  ambulances,
  activeEmergency,
  selectedHospitalId,
  selectedDistrict = 'chennai',
  onDistrictChange,
  onHospitalClick,
  onAmbulanceClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialDistrict = TAMIL_NADU_DISTRICTS.find((d) => d.id === selectedDistrict) || TAMIL_NADU_DISTRICTS[1];

    const map = L.map(mapContainerRef.current, {
      center: [initialDistrict.lat, initialDistrict.lng],
      zoom: initialDistrict.zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dark Carto basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle District FlyTo
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const target = TAMIL_NADU_DISTRICTS.find((d) => d.id === selectedDistrict);
    if (target) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], target.zoom, {
        duration: 1.2,
      });
    }
  }, [selectedDistrict]);

  // Handle Live GPS Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1.5 });

          // Draw user circle marker
          const userCircle = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#06b6d4',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).bindPopup('<b style="color:#06b6d4">📍 You are here</b>');

          markersLayerRef.current?.addLayer(userCircle);
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Could not access current location. Please grant location permissions in your browser.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Update Markers & Routes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !routesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();

    // 1. Render Hospitals
    hospitals.forEach((hosp) => {
      const isSelected = hosp.id === selectedHospitalId;
      const isDiverting = hosp.emergency_status === 'DIVERTING' || hosp.available_er_beds <= 0;

      const badgeColor = isDiverting
        ? 'bg-rose-600 border-rose-400'
        : hosp.available_er_beds >= 5
        ? 'bg-emerald-600 border-emerald-400'
        : 'bg-amber-600 border-amber-400';

      const hospHtml = `
        <div class="relative group cursor-pointer">
          <div class="w-9 h-9 rounded-xl ${badgeColor} border-2 flex items-center justify-center shadow-lg transition-transform hover:scale-110">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 6v12m-6-6h12"/>
            </svg>
          </div>
          <div class="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-bold text-cyan-300">
            ${hosp.available_er_beds}
          </div>
          ${isSelected ? '<div class="absolute inset-0 rounded-xl ring-4 ring-cyan-400 animate-pulse"></div>' : ''}
        </div>
      `;

      const hospIcon = L.divIcon({
        html: hospHtml,
        className: 'custom-hosp-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([hosp.latitude, hosp.longitude], { icon: hospIcon });
      marker.on('click', () => onHospitalClick?.(hosp));

      marker.bindPopup(`
        <div class="p-2 space-y-1 text-xs">
          <div class="font-bold text-sm text-cyan-400">${hosp.name}</div>
          <div class="text-slate-300">${hosp.address}</div>
          <div class="grid grid-cols-2 gap-1 pt-1 border-t border-slate-700">
            <div><span class="text-slate-400">ER Beds:</span> <b class="${hosp.available_er_beds > 0 ? 'text-emerald-400' : 'text-rose-400'}">${hosp.available_er_beds}/${hosp.total_er_beds}</b></div>
            <div><span class="text-slate-400">ICU Beds:</span> <b class="text-cyan-400">${hosp.available_icu_beds}/${hosp.total_icu_beds}</b></div>
            <div><span class="text-slate-400">Ventilators:</span> <b class="text-indigo-400">${hosp.available_ventilators}/${hosp.total_ventilators}</b></div>
            <div><span class="text-slate-400">Wait Time:</span> <b class="text-amber-400">${hosp.current_wait_time_minutes}m</b></div>
          </div>
        </div>
      `);
      markersLayerRef.current?.addLayer(marker);
    });

    // 2. Render Ambulances
    ambulances.forEach((amb) => {
      const isDispatched = amb.status === 'DISPATCHED' || amb.status === 'PATIENT_ON_BOARD';

      const ambHtml = `
        <div class="relative group cursor-pointer" style="transform: rotate(${amb.heading || 0}deg);">
          ${isDispatched ? '<div class="absolute -inset-2 rounded-full bg-rose-500/40 siren-radar"></div>' : ''}
          <div class="w-9 h-9 rounded-full ${isDispatched ? 'bg-gradient-to-tr from-rose-600 to-amber-500' : 'bg-slate-800'} border-2 border-white flex items-center justify-center shadow-xl">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 10.5V8a2 2 0 0 0-2-2h-3V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H3a2 2 0 0 0-2 2v2.5a3.5 3.5 0 0 0 3 3.45V18a2 2 0 0 0 2 2h1v1a1 1 0 0 0 2 0v-1h6v1a1 1 0 0 0 2 0v-1h1a2 2 0 0 0 2-2v-4.05a3.5 3.5 0 0 0 3-3.45z"/>
            </svg>
          </div>
        </div>
      `;

      const ambIcon = L.divIcon({
        html: ambHtml,
        className: 'custom-amb-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([amb.current_lat, amb.current_lng], { icon: ambIcon });
      marker.on('click', () => onAmbulanceClick?.(amb));
      marker.bindPopup(`
        <div class="p-2 space-y-1 text-xs">
          <div class="font-bold text-sm text-cyan-400">${amb.vehicle_number} (${amb.equipment_level})</div>
          <div><span class="text-slate-400">Driver:</span> ${amb.driver_name}</div>
          <div><span class="text-slate-400">Status:</span> <b class="${isDispatched ? 'text-amber-400' : 'text-emerald-400'}">${amb.status}</b></div>
          <div><span class="text-slate-400">Speed:</span> ${amb.speed_kmh} km/h</div>
        </div>
      `);
      markersLayerRef.current?.addLayer(marker);
    });

    // 3. Render Emergency Pickup Point & Routes
    if (activeEmergency) {
      const emergencyHtml = `
        <div class="relative">
          <div class="absolute -inset-3 rounded-full bg-rose-600/50 animate-ping"></div>
          <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-2xl">
            <svg class="w-4 h-4 text-white animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
        </div>
      `;

      const emgIcon = L.divIcon({
        html: emergencyHtml,
        className: 'custom-emg-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const emgMarker = L.marker([activeEmergency.pickup_lat, activeEmergency.pickup_lng], { icon: emgIcon });
      emgMarker.bindPopup(`
        <div class="p-2 space-y-1 text-xs">
          <div class="font-bold text-sm text-rose-400">🚨 ${activeEmergency.emergency_code} [${activeEmergency.priority}]</div>
          <div><span class="text-slate-400">Patient:</span> ${activeEmergency.patient_name}, ${activeEmergency.patient_age}y</div>
          <div><span class="text-slate-400">Location:</span> ${activeEmergency.pickup_address}</div>
          <div class="text-amber-300 font-medium">${activeEmergency.chief_complaint}</div>
        </div>
      `);
      markersLayerRef.current?.addLayer(emgMarker);

      // Draw polyline routes
      const assignedAmb = ambulances.find((a) => a.id === activeEmergency.assigned_ambulance_id);
      const assignedHosp = hospitals.find((h) => h.id === activeEmergency.assigned_hospital_id);

      if (assignedAmb) {
        const ambToPickup = L.polyline(
          [
            [assignedAmb.current_lat, assignedAmb.current_lng],
            [activeEmergency.pickup_lat, activeEmergency.pickup_lng],
          ],
          { color: '#06b6d4', weight: 4, opacity: 0.8, dashArray: '6, 8' }
        );
        routesLayerRef.current?.addLayer(ambToPickup);
      }

      if (assignedHosp) {
        const pickupToHosp = L.polyline(
          [
            [activeEmergency.pickup_lat, activeEmergency.pickup_lng],
            [assignedHosp.latitude, assignedHosp.longitude],
          ],
          { color: '#10b981', weight: 5, opacity: 0.9 }
        );
        routesLayerRef.current?.addLayer(pickupToHosp);
      }
    }
  }, [hospitals, ambulances, activeEmergency, selectedHospitalId]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left: District Switcher & Live GPS Locator HUD */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2">
        {/* District Dropdown */}
        <div className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-2 border border-slate-700/80 shadow-xl">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={selectedDistrict}
            onChange={(e) => onDistrictChange?.(e.target.value)}
            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
          >
            {TAMIL_NADU_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Locate Me Button */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white border border-cyan-500/40 hover:bg-cyan-950/40 transition-all shadow-xl active:scale-95"
          title="Zoom to your live device GPS location"
        >
          <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
        </button>

        {/* Legend */}
        <div className="glass-panel px-3 py-1.5 rounded-2xl hidden sm:flex items-center gap-2.5 text-[11px] border border-slate-800">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300">Free Beds</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span className="text-slate-300">Overloaded</span>
          </div>
        </div>
      </div>
    </div>
  );
};
