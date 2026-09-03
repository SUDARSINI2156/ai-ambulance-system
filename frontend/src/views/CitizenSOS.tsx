import React, { useState } from 'react';
import { 
  Siren, MapPin, Heart, AlertTriangle, Wind, 
  Brain, Baby, Stethoscope, PhoneCall, ShieldCheck, 
  Clock, CheckCircle2, Navigation, Compass, Sparkles, XCircle
} from 'lucide-react';
import { EmergencyAPI } from '../services/api';
import { Emergency, Hospital, Ambulance } from '../types';

interface CitizenSOSProps {
  activeEmergency?: Emergency | null;
  assignedAmbulance?: Ambulance | null;
  assignedHospital?: Hospital | null;
  onEmergencyCreated: (newEmergency: Emergency) => void;
  onEmergencyCancelled: (id: number) => void;
}

const SYMPTOM_PRESETS = [
  {
    id: 'cardiac',
    title: 'Heart Attack / Chest Pain',
    subtitle: 'Crushing pain, sweating, left arm ache',
    icon: Heart,
    color: 'from-rose-600 to-red-700',
    borderColor: 'border-rose-500',
    priority: 'CRITICAL',
    complaint: 'Acute crushing chest pain, diaphoresis, shortness of breath'
  },
  {
    id: 'trauma',
    title: 'Road Accident / Trauma',
    subtitle: 'Vehicle collision, heavy bleeding, fracture',
    icon: AlertTriangle,
    color: 'from-amber-600 to-orange-700',
    borderColor: 'border-amber-500',
    priority: 'CRITICAL',
    complaint: 'Severe road traffic accident, polytrauma, external hemorrhage'
  },
  {
    id: 'respiratory',
    title: 'Breathing Trouble',
    subtitle: 'Severe asthma, choking, gasping',
    icon: Wind,
    color: 'from-blue-600 to-cyan-700',
    borderColor: 'border-cyan-500',
    priority: 'HIGH',
    complaint: 'Severe acute dyspnea, choking sensation, low oxygen saturation'
  },
  {
    id: 'stroke',
    title: 'Stroke / Faint / Seizure',
    subtitle: 'Face droop, slurred speech, unconscious',
    icon: Brain,
    color: 'from-purple-600 to-indigo-700',
    borderColor: 'border-indigo-500',
    priority: 'CRITICAL',
    complaint: 'Suspected stroke, sudden facial asymmetry, hemiplegia, altered sensorium'
  },
  {
    id: 'maternity',
    title: 'Maternity / Labor Pain',
    subtitle: 'Active labor, pregnancy emergency',
    icon: Baby,
    color: 'from-pink-600 to-rose-700',
    borderColor: 'border-pink-500',
    priority: 'HIGH',
    complaint: 'Active emergency labor pains, imminent delivery'
  },
  {
    id: 'general',
    title: 'Other Critical Emergency',
    subtitle: 'High fever, poisoning, severe injury',
    icon: Stethoscope,
    color: 'from-emerald-600 to-teal-700',
    borderColor: 'border-emerald-500',
    priority: 'HIGH',
    complaint: 'Acute emergency requiring immediate paramedic stabilization'
  }
];

export const CitizenSOS: React.FC<CitizenSOSProps> = ({
  activeEmergency,
  assignedAmbulance,
  assignedHospital,
  onEmergencyCreated,
  onEmergencyCancelled
}) => {
  const [selectedSymptom, setSelectedSymptom] = useState(SYMPTOM_PRESETS[0]);
  const [patientName, setPatientName] = useState('Caller / Patient');
  const [patientAge, setPatientAge] = useState(48);
  const [address, setAddress] = useState('Anna Nagar, Chennai');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 13.0850, lng: 80.2102 });
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string>('Default Chennai Metro');

  // One-click HTML5 Live Geolocation detection
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGPS(true);
    setGpsStatus('Locating high-precision GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setAddress(`Live GPS: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
        setGpsStatus(`GPS Locked (+/- ${Math.round(pos.coords.accuracy)}m accuracy)`);
        setIsDetectingGPS(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGpsStatus('GPS permission denied. Using manual address.');
        setIsDetectingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // SOS Emergency Trigger
  const handleTriggerSOS = async () => {
    setIsSubmitting(true);
    try {
      const res = await EmergencyAPI.createEmergency({
        patient_name: patientName,
        patient_age: patientAge,
        patient_gender: 'Unknown',
        chief_complaint: selectedSymptom.complaint,
        priority: selectedSymptom.priority,
        heart_rate: 110,
        systolic_bp: 140,
        oxygen_sat: 92,
        gcs_score: 14,
        pain_scale: 8,
        pickup_lat: coords.lat,
        pickup_lng: coords.lng,
        pickup_address: address
      });
      onEmergencyCreated(res.data);
    } catch (err: any) {
      alert(`Emergency dispatch failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If there's an active emergency, show the Citizen Live Tracking Screen!
  if (activeEmergency && activeEmergency.status !== 'COMPLETED' && activeEmergency.status !== 'CANCELLED') {
    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
        {/* Active Dispatch Status Card */}
        <div className="glass-panel p-6 rounded-3xl border-2 border-emerald-500/50 shadow-2xl relative overflow-hidden text-center space-y-4">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 animate-pulse" />

          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <Siren className="w-8 h-8 animate-bounce" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
              Ambulance En Route to You
            </span>
            <h2 className="text-2xl font-black text-white mt-2">Help is on the Way!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Incident Code: <b className="font-mono text-cyan-300">{activeEmergency.emergency_code}</b> &bull; Priority:{' '}
              <b className="text-rose-400">{activeEmergency.priority}</b>
            </p>
          </div>

          {/* Countdown & Speed Strip */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-bold block">Estimated Arrival</span>
              <div className="text-3xl font-black text-cyan-400 mt-1">~5 - 7</div>
              <span className="text-xs text-slate-400">Minutes</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-bold block">Allocated Unit</span>
              <div className="text-lg font-black text-white mt-1 truncate">
                {assignedAmbulance?.vehicle_number || 'TN-01-AM-1081'}
              </div>
              <span className="text-xs text-emerald-400 font-semibold">{assignedAmbulance?.equipment_level || 'ALS'} Unit</span>
            </div>
          </div>

          {/* Assigned Hospital Preview */}
          {assignedHospital && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> AI-Selected Hospital Destination:
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Ready & Pre-Alerted
                </span>
              </div>
              <div className="text-base font-black text-white">{assignedHospital.name}</div>
              <p className="text-xs text-slate-300">{assignedHospital.address}</p>
              <div className="text-[11px] text-emerald-400 flex items-center gap-2 pt-1 font-medium">
                <span>✓ {assignedHospital.available_icu_beds} ICU Beds Free</span>
                <span>✓ Emergency Trauma Team On Duty</span>
              </div>
            </div>
          )}

          {/* Actions: Call Paramedic & Cancel */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <a
              href={`tel:${assignedAmbulance?.phone || '108'}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call Paramedic Driver ({assignedAmbulance?.phone || '108'})</span>
            </a>

            <button
              onClick={() => onEmergencyCancelled(activeEmergency.id)}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial SOS Caller Screen
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider">
          <Siren className="w-3.5 h-3.5 animate-pulse" /> Emergency 108 Rapid Citizen Response
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Request Emergency Ambulance
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          One-tap AI dispatch detects your location, notifies the nearest life-support ambulance, 
          and pre-books emergency room & ICU beds at the optimal hospital.
        </p>
      </div>

      {/* Step 1: Location Detector */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            Step 1: Your Emergency Location
          </label>
          <span className="text-[11px] text-cyan-400 font-medium">{gpsStatus}</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Type street, landmark, or district name in Tamil Nadu..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
          />

          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isDetectingGPS}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 whitespace-nowrap active:scale-95 disabled:opacity-50"
          >
            <Compass className={`w-4 h-4 ${isDetectingGPS ? 'animate-spin' : ''}`} />
            <span>{isDetectingGPS ? 'Locating...' : 'Use My Live GPS'}</span>
          </button>
        </div>
      </div>

      {/* Step 2: Symptom Selector */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
        <label className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-400" />
          Step 2: What is the Medical Emergency?
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SYMPTOM_PRESETS.map((s) => {
            const Icon = s.icon;
            const isSelected = selectedSymptom.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSymptom(s)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? `${s.borderColor} bg-slate-900 shadow-lg scale-[1.02]`
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${s.color} flex items-center justify-center text-white mb-2 shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-extrabold text-sm text-white">{s.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{s.subtitle}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 3: Big SOS Action Button */}
      <div className="text-center pt-2">
        <button
          onClick={handleTriggerSOS}
          disabled={isSubmitting}
          className="w-full sm:w-auto min-w-[340px] px-8 py-5 rounded-3xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-lg tracking-wider uppercase shadow-2xl shadow-rose-600/40 transform active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
        >
          <Siren className="w-6 h-6 animate-pulse" />
          <span>{isSubmitting ? 'Allocating Optimal Hospital...' : '🚨 TAP TO CALL 108 AMBULANCE NOW'}</span>
        </button>
        <p className="text-[11px] text-slate-500 mt-2">
          Emergency calls are toll-free and synchronized with State 108 Emergency Medical Services.
        </p>
      </div>
    </div>
  );
};
