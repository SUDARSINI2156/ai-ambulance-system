import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const EmergencyAPI = {
  // Hospitals
  getHospitals: (district?: string) => api.get(district && district !== 'all' ? `/hospitals?district=${district}` : '/hospitals'),
  getDistricts: () => api.get('/hospitals/districts'),
  searchOSMHospitals: (query?: string, lat?: number, lng?: number) => {
    let url = '/hospitals/osm-search?';
    if (query) url += `query=${encodeURIComponent(query)}&`;
    if (lat !== undefined && lng !== undefined) url += `lat=${lat}&lng=${lng}`;
    return api.get(url);
  },
  getHospital: (id: number) => api.get(`/hospitals/${id}`),
  updateHospitalCapacity: (id: number, data: any) => api.put(`/hospitals/${id}/capacity`, data),
  getIncomingAmbulances: (id: number) => api.get(`/hospitals/${id}/incoming`),
  getSurgeForecast: (id: number) => api.get(`/hospitals/${id}/surge-forecast`),

  // Ambulances
  getAmbulances: () => api.get('/ambulances'),
  getAmbulance: (id: number) => api.get(`/ambulances/${id}`),
  updateAmbulanceLocation: (id: number, data: any) => api.put(`/ambulances/${id}/location`, data),
  updateAmbulanceStatus: (id: number, status: string) => api.put(`/ambulances/${id}/status?status_str=${status}`),
  simulateTrip: (id: number, targetLat: number, targetLng: number) => 
    api.post(`/ambulances/${id}/simulate-trip?target_lat=${targetLat}&target_lng=${targetLng}`),

  // Emergencies
  createEmergency: (data: any) => api.post('/emergencies', data),
  getEmergencies: () => api.get('/emergencies'),
  getActiveEmergencies: () => api.get('/emergencies/active'),
  updateEmergencyStatus: (id: number, status: string) => api.put(`/emergencies/${id}/status`, { status }),
  rerouteEmergency: (id: number, newHospitalId: number, reason: string) =>
    api.post(`/emergencies/${id}/reroute`, { new_hospital_id: newHospitalId, reason }),

  // AI Inference & Simulations
  predictETA: (data: any) => api.post('/ai/predict-eta', data),
  recommendHospitals: (pickupLat: number, pickupLng: number, priority: string, complaint: string) =>
    api.post(`/ai/recommend-hospitals?pickup_lat=${pickupLat}&pickup_lng=${pickupLng}&patient_priority=${priority}&chief_complaint=${encodeURIComponent(complaint)}`),
  classifyTriage: (data: any) => api.post('/ai/triage', data),
  getAIMetrics: () => api.get('/ai/metrics'),
  simulateTrafficJam: (hospitalId: number, congestionLevel: number = 4) =>
    api.post(`/ai/simulate-traffic-jam?hospital_id=${hospitalId}&congestion_level=${congestionLevel}`),
};

export default api;
