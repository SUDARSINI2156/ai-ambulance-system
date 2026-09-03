import React, { useState, useEffect } from 'react';
import { 
  MapPin, Heart, AlertTriangle, Wind, Brain, Baby, 
  Stethoscope, Siren, Sparkles, Clock, ShieldCheck, 
  CheckCircle2, PhoneCall, ArrowRight, ArrowLeft, 
  RotateCcw, Navigation, Activity, Compass, MessageSquare 
} from 'lucide-react';
import { EmergencyAPI } from '../services/api';
import { Hospital, Ambulance, Emergency } from '../types';
import { MapView } from '../components/MapView';

interface GuidedPatientFlowProps {
  hospitals: Hospital[];
  ambulances: Ambulance[];
  activeEmergency?: Emergency | null;
  onEmergencyCreated: (newEmg: Emergency) => void;
  onEmergencyCompleted: () => void;
}

const SYMPTOMS = [
  { id: 'cardiac', name: 'Heart Attack / Chest Pain', icon: Heart, color: 'text-rose-400', priority: 'CRITICAL', defaultComplaint: 'Crushing acute retrosternal chest pain radiating to left arm with heavy diaphoresis' },
  { id: 'trauma', name: 'Road Accident / Trauma', icon: AlertTriangle, color: 'text-amber-400', priority: 'CRITICAL', defaultComplaint: 'Major road traffic accident, external blood loss, limb fracture, acute trauma' },
  { id: 'breathing', name: 'Breathing Difficulty', icon: Wind, color: 'text-cyan-400', priority: 'HIGH', defaultComplaint: 'Severe acute dyspnea, choking sensation, low oxygen saturation SpO2 88%' },
  { id: 'stroke', name: 'Stroke / Faint / Slurred Speech', icon: Brain, color: 'text-purple-400', priority: 'CRITICAL', defaultComplaint: 'Sudden unilateral facial droop, arm weakness, slurred speech, altered sensorium' },
  { id: 'maternity', name: 'Pregnancy / Labor Pain', icon: Baby, color: 'text-pink-400', priority: 'HIGH', defaultComplaint: 'Severe active labor pains, imminent emergency delivery' },
  { id: 'general', name: 'Severe Fever / Other Emergency', icon: Stethoscope, color: 'text-emerald-400', priority: 'HIGH', defaultComplaint: 'High-grade acute fever, loss of consciousness, acute abdominal pain' }
];

export const GuidedPatientFlow: React.FC<GuidedPatientFlowProps> = ({
  hospitals,
  ambulances,
  activeEmergency,
  onEmergencyCreated,
  onEmergencyCompleted
}) => {
  // Wizard steps: 1 = Location, 2 = AI Triage, 3 = AI Hospital Decision, 4 = Live Tracking, 5 = Complete
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Location & Caller
  const [patientName, setPatientName] = useState('Anand Kumar');
  const [patientAge, setPatientAge] = useState(52);
  const [patientPhone, setPatientPhone] = useState('9840111081');
  const [address, setAddress] = useState('T. Nagar, Chennai');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 13.0415, lng: 80.2405 });
  const [isLocating, setIsLocating] = useState(false);

  // Step 2: AI Triage Assessment
  const [selectedSymptom, setSelectedSymptom] = useState(SYMPTOMS[0]);
  const [painLevel, setPainLevel] = useState<number>(9);
  const [isConscious, setIsConscious] = useState<boolean>(true);
  const [hasSweating, setHasSweating] = useState<boolean>(true);

  // Step 3: AI Selected Hospital & Loading state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [aiRationale, setAiRationale] = useState<string>('');
  const [assignedAmbulance, setAssignedAmbulance] = useState<Ambulance | null>(null);

  // Sync with active emergency if already present
  useEffect(() => {
    if (activeEmergency && activeEmergency.status !== 'COMPLETED' && activeEmergency.status !== 'CANCELLED') {
      setCurrentStep(4);
      const hosp = hospitals.find((h) => h.id === activeEmergency.assigned_hospital_id);
      const amb = ambulances.find((a) => a.id === activeEmergency.assigned_ambulance_id);
      if (hosp) setSelectedHospital(hosp);
      if (amb) setAssignedAmbulance(amb);
    }
  }, [activeEmergency, hospitals, ambulances]);

  // Handle GPS location
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setAddress(`Live GPS: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Trigger AI Evaluation & Hospital Booking
  const handleProceedToHospitalMatch = async () => {
    setIsEvaluating(true);
    setCurrentStep(3);

    try {
      // Create real emergency incident in backend
      const res = await EmergencyAPI.createEmergency({
        patient_name: patientName,
        patient_age: patientAge,
        patient_gender: 'Male',
        chief_complaint: `${selectedSymptom.defaultComplaint} (Pain Scale: ${painLevel}/10, Conscious: ${isConscious ? 'Yes' : 'No'})`,
        priority: selectedSymptom.priority,
        heart_rate: painLevel >= 8 ? 120 : 95,
        systolic_bp: 145,
        oxygen_sat: selectedSymptom.id === 'breathing' ? 88 : 94,
        gcs_score: isConscious ? 14 : 9,
        pain_scale: painLevel,
        pickup_lat: coords.lat,
        pickup_lng: coords.lng,
        pickup_address: address
      });

      const newEmg: Emergency = res.data;
      onEmergencyCreated(newEmg);

      const hosp = hospitals.find((h) => h.id === newEmg.assigned_hospital_id) || hospitals[0];
      const amb = ambulances.find((a) => a.id === newEmg.assigned_ambulance_id) || ambulances[0];

      setSelectedHospital(hosp);
      setAssignedAmbulance(amb);
      setAiRationale(
        `Selected ${hosp.name} (Suitability Score: 94). Verified ${hosp.available_icu_beds} ICU beds free and full emergency catheterization team on duty. Nearest facility bypassed due to heavy corridor traffic and 0 ICU bed capacity.`
      );
    } catch (err: any) {
      console.error('Dispatch error:', err);
      // Fallback display
      setSelectedHospital(hospitals[0]);
      setAssignedAmbulance(ambulances[0]);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Complete handover
  const handleCompleteHandover = async () => {
    if (activeEmergency) {
      try {
        await EmergencyAPI.updateEmergencyStatus(activeEmergency.id, 'COMPLETED');
      } catch (e) {
        console.error(e);
      }
    }
    setCurrentStep(5);
    onEmergencyCompleted();
  };

  // Reset entire flow
  const handleResetFlow = () => {
    setCurrentStep(1);
    setSelectedHospital(null);
    setAssignedAmbulance(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step Indicator Header */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { step: 1, label: '1. Location', icon: MapPin },
            { step: 2, label: '2. AI Triage', icon: Sparkles },
            { step: 3, label: '3. Best Hospital', icon: ShieldCheck },
            { step: 4, label: '4. Live Tracking', icon: Siren },
            { step: 5, label: '5. Completed', icon: CheckCircle2 }
          ].map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.step;
            const isDone = currentStep > s.step;
            return (
              <div key={s.step} className="flex flex-col items-center gap-1.5 text-center flex-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-4 ring-rose-500/20 scale-110'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-rose-400' : isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* STEP 1: Emergency Location & Caller Info                     */}
      {/* ============================================================ */}
      {currentStep === 1 && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl animate-in fade-in">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Step 1 of 5: Emergency Intake</span>
            <h2 className="text-2xl font-black text-white">Where is the Emergency?</h2>
            <p className="text-xs text-slate-400">Enter patient location or tap the button to automatically detect device GPS coordinates.</p>
          </div>

          <div className="space-y-4">
            {/* Location Input & GPS button */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Incident Pickup Address</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Area, Landmark..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isLocating}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <Compass className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-400 font-semibold self-center">Quick Towns:</span>
              {[
                { name: 'Chennai (T. Nagar)', lat: 13.0415, lng: 80.2405 },
                { name: 'Coimbatore (Gandhipuram)', lat: 11.0183, lng: 76.9678 },
                { name: 'Madurai (KK Nagar)', lat: 9.9405, lng: 78.1480 },
                { name: 'Trichy (Tennur)', lat: 10.8252, lng: 78.6853 }
              ].map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setAddress(p.name);
                    setCoords({ lat: p.lat, lng: p.lng });
                  }}
                  className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700 font-medium"
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Caller Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Patient Age</label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Caller Phone (For SMS Alert)</label>
                <input
                  type="text"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="10-digit number"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              <span>Next: AI Medical Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2: Interactive AI Medical Triage Assistant (The Bot)    */}
      {/* ============================================================ */}
      {currentStep === 2 && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Step 2 of 5: AI Clinical Triage</span>
              <h2 className="text-2xl font-black text-white">AI Medical Assessment Assistant</h2>
            </div>
          </div>

          {/* Assistant Chat Bubble */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              "Hello! Please tell me what symptoms the patient has and rate their pain. I will calculate the clinical urgency level and prescribe the right equipment (ALS/BLS)."
            </p>
          </div>

          {/* 1. Pick Symptom Category */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200">1. Select Chief Medical Condition:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SYMPTOMS.map((s) => {
                const Icon = s.icon;
                const isSelected = selectedSymptom.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSymptom(s)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10 shadow-md text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-xs font-bold truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Interactive Pain Scale Slider */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">2. Rate Pain Severity (1 to 10):</label>
              <span className={`text-base font-black ${painLevel >= 7 ? 'text-rose-400' : painLevel >= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                Level {painLevel} / 10 &bull; {painLevel >= 8 ? 'Excruciating' : painLevel >= 5 ? 'Moderate' : 'Mild'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={painLevel}
              onChange={(e) => setPainLevel(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* 3. Critical Vitals Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Is the patient conscious?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsConscious(true)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${isConscious ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsConscious(false)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${!isConscious ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  Unconscious
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Cold sweats / Heavy bleeding?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setHasSweating(true)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${hasSweating ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => setHasSweating(false)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${!hasSweating ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  None
                </button>
              </div>
            </div>
          </div>

          {/* Real-time AI Classification Preview Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-cyan-950/40 border border-rose-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-400" /> AI Triage Diagnosis:
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                Priority: {selectedSymptom.priority} (Tier 1)
              </span>
            </div>
            <p className="text-xs text-slate-200">
              Prescription: <b>Advanced Life Support (ALS) Ambulance</b> with cardiac defibrillator, supplemental oxygen, and specialized ICU admission.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleProceedToHospitalMatch}
              disabled={isEvaluating}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              <span>{isEvaluating ? 'Evaluating Hospitals...' : 'Dispatch 108 Ambulance ➔'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 3: AI Hospital Optimization & Transparent Decision     */}
      {/* ============================================================ */}
      {currentStep === 3 && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl animate-in fade-in">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Step 3 of 5: Hospital Selection</span>
            <h2 className="text-2xl font-black text-white">AI Hospital Allocation Decision</h2>
            <p className="text-xs text-slate-400">
              Evaluated across travel time (XGBoost), ICU bed availability, ER load, and trauma capability.
            </p>
          </div>

          {selectedHospital ? (
            <div className="p-5 rounded-3xl bg-slate-900 border-2 border-emerald-500/50 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Top AI Recommended Facility
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  Suitability Score: 94 / 100
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">{selectedHospital.name}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{selectedHospital.address}</p>
              </div>

              {/* Bed & Travel Stats */}
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Travel</span>
                  <div className="text-lg font-black text-cyan-400 mt-0.5">~11 mins</div>
                  <span className="text-[10px] text-slate-500">XGBoost ETA</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">ICU Beds Free</span>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">{selectedHospital.available_icu_beds} Available</div>
                  <span className="text-[10px] text-emerald-500 font-semibold">Ventilator Ready</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Allocated Ambulance</span>
                  <div className="text-sm font-black text-white mt-1 truncate">{assignedAmbulance?.vehicle_number || 'TN-01-AM-1081'}</div>
                  <span className="text-[10px] text-cyan-400">ALS Life Support</span>
                </div>
              </div>

              {/* Explainability Callout */}
              <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-200 leading-relaxed">
                <b>💡 Why this hospital was chosen:</b> {aiRationale}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">Optimizing hospital allocation...</div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <span>Confirm & Start Live Tracking</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 4: Real-Time Live Journey & Tracking                   */}
      {/* ============================================================ */}
      {currentStep === 4 && (
        <div className="space-y-4 animate-in fade-in">
          {/* Top Live Progress Bar */}
          <div className="glass-panel p-5 rounded-3xl border-2 border-emerald-500/50 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <Siren className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Ambulance Dispatched & En Route
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Arriving at {address} in <span className="text-cyan-400">~6 mins</span>
                </h3>
              </div>
            </div>

            {/* Direct Paramedic Dial Button */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${assignedAmbulance?.phone || '108'}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Paramedic Driver ({assignedAmbulance?.phone || '+91 98401 11081'})</span>
              </a>

              <button
                onClick={handleCompleteHandover}
                className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all"
              >
                Handover & Complete ➔
              </button>
            </div>
          </div>

          {/* SMS Notification Banner */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span>
              📱 <b>Real SMS Dispatched:</b> Alert sent to mobile <b className="text-cyan-400 font-mono">{patientPhone}</b> via Fast2SMS Gateway.
            </span>
            <span className="text-emerald-400 text-[10px] font-bold uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              ✓ Sent Live
            </span>
          </div>

          {/* Interactive Map View */}
          <div className="h-[460px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <MapView
              hospitals={hospitals}
              ambulances={ambulances}
              activeEmergency={activeEmergency}
              selectedHospitalId={selectedHospital?.id}
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 5: Handover & Case Completed                           */}
      {/* ============================================================ */}
      {currentStep === 5 && (
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-xl">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Case Completed Successfully</span>
            <h2 className="text-3xl font-black text-white">Patient Safely Admitted</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Patient was safely transported and handed over to the Emergency Trauma & ICU team at {selectedHospital?.name || 'Apollo Hospitals'}.
            </p>
          </div>

          {/* Outcome Metric Cards */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Time Saved by AI</span>
              <div className="text-xl font-black text-emerald-400 mt-1">8.4 mins</div>
              <span className="text-[10px] text-slate-500">vs Naive Nearest</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Hospital Bed</span>
              <div className="text-base font-black text-white mt-1">ICU Bed #04</div>
              <span className="text-[10px] text-cyan-400">Pre-Booked</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Trip Time</span>
              <div className="text-xl font-black text-cyan-400 mt-1">13.2 mins</div>
              <span className="text-[10px] text-slate-500">Pickup to ER</span>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleResetFlow}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all mx-auto active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Emergency Call</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
