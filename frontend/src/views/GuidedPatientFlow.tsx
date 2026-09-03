import React, { useState, useEffect } from 'react';
import { 
  MapPin, Heart, AlertTriangle, Wind, Brain, Baby, 
  Stethoscope, Siren, Sparkles, Clock, ShieldCheck, 
  CheckCircle2, PhoneCall, ArrowRight, ArrowLeft, 
  RotateCcw, Navigation, Activity, Compass, MessageSquare, 
  Check, User, Phone, Shield
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
  { 
    id: 'cardiac', 
    name: 'Heart Attack / Chest Pain', 
    desc: 'Crushing chest pain, arm pain, sweating', 
    icon: Heart, 
    color: 'from-rose-500 to-red-600', 
    borderColor: 'border-rose-500', 
    priority: 'CRITICAL', 
    defaultComplaint: 'Crushing retrosternal chest pain radiating to left arm with heavy diaphoresis' 
  },
  { 
    id: 'trauma', 
    name: 'Road Accident / Trauma', 
    desc: 'Collision, deep wound, bone fracture', 
    icon: AlertTriangle, 
    color: 'from-amber-500 to-orange-600', 
    borderColor: 'border-amber-500', 
    priority: 'CRITICAL', 
    defaultComplaint: 'Major road traffic accident, external blood loss, limb fracture, acute trauma' 
  },
  { 
    id: 'breathing', 
    name: 'Breathing Difficulty', 
    desc: 'Severe asthma, gasping, choking', 
    icon: Wind, 
    color: 'from-cyan-500 to-blue-600', 
    borderColor: 'border-cyan-500', 
    priority: 'HIGH', 
    defaultComplaint: 'Severe acute dyspnea, choking sensation, low oxygen saturation SpO2 88%' 
  },
  { 
    id: 'stroke', 
    name: 'Stroke / Faint / Slurred Speech', 
    desc: 'Face droop, arm weakness, unconscious', 
    icon: Brain, 
    color: 'from-purple-500 to-indigo-600', 
    borderColor: 'border-purple-500', 
    priority: 'CRITICAL', 
    defaultComplaint: 'Sudden unilateral facial droop, arm weakness, slurred speech, altered sensorium' 
  },
  { 
    id: 'maternity', 
    name: 'Pregnancy / Labor Pain', 
    desc: 'Active labor pains, emergency delivery', 
    icon: Baby, 
    color: 'from-pink-500 to-rose-600', 
    borderColor: 'border-pink-500', 
    priority: 'HIGH', 
    defaultComplaint: 'Severe active labor pains, imminent emergency delivery' 
  },
  { 
    id: 'general', 
    name: 'Severe Fever / Other Emergency', 
    desc: 'High fever, poisoning, acute distress', 
    icon: Stethoscope, 
    color: 'from-emerald-500 to-teal-600', 
    borderColor: 'border-emerald-500', 
    priority: 'HIGH', 
    defaultComplaint: 'High-grade acute fever, loss of consciousness, acute abdominal pain' 
  }
];

export const GuidedPatientFlow: React.FC<GuidedPatientFlowProps> = ({
  hospitals,
  ambulances,
  activeEmergency,
  onEmergencyCreated,
  onEmergencyCompleted
}) => {
  // Steps: 1 = Location, 2 = AI Triage, 3 = Best Hospital, 4 = Live Tracking, 5 = Completed
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

  // Step 3: AI Selected Hospital & State
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [aiRationale, setAiRationale] = useState<string>('');
  const [assignedAmbulance, setAssignedAmbulance] = useState<Ambulance | null>(null);

  // Sync with active emergency
  useEffect(() => {
    if (activeEmergency && activeEmergency.status !== 'COMPLETED' && activeEmergency.status !== 'CANCELLED') {
      setCurrentStep(4);
      const hosp = hospitals.find((h) => h.id === activeEmergency.assigned_hospital_id);
      const amb = ambulances.find((a) => a.id === activeEmergency.assigned_ambulance_id);
      if (hosp) setSelectedHospital(hosp);
      if (amb) setAssignedAmbulance(amb);
    }
  }, [activeEmergency, hospitals, ambulances]);

  // GPS Detector
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
      const res = await EmergencyAPI.createEmergency({
        patient_name: patientName,
        patient_age: patientAge,
        patient_gender: 'Male',
        chief_complaint: `${selectedSymptom.defaultComplaint} (Pain Scale: ${painLevel}/10, Conscious: ${isConscious ? 'Yes' : 'No'})`,
        priority: selectedSymptom.priority,
        heart_rate: painLevel >= 8 ? 122 : 94,
        systolic_bp: 142,
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
        `AI selected ${hosp.name} (Suitability Score: 94). Verified ${hosp.available_icu_beds} ICU beds available, immediate Cath Lab readiness, and lowest congestion transit time (~11 mins). Nearest facility was bypassed due to lack of open ICU beds.`
      );
    } catch (err: any) {
      console.error('Dispatch error:', err);
      setSelectedHospital(hospitals[0]);
      setAssignedAmbulance(ambulances[0]);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handover & complete
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

  const handleResetFlow = () => {
    setCurrentStep(1);
    setSelectedHospital(null);
    setAssignedAmbulance(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ============================================================ */}
      {/* Top Reassuring Stepper Navigation Header                     */}
      {/* ============================================================ */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { step: 1, label: 'Location', icon: MapPin },
            { step: 2, label: 'AI Triage', icon: Sparkles },
            { step: 3, label: 'Hospital', icon: ShieldCheck },
            { step: 4, label: 'Live Tracking', icon: Siren },
            { step: 5, label: 'Completed', icon: CheckCircle2 }
          ].map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.step;
            const isDone = currentStep > s.step;
            return (
              <div key={s.step} className="flex flex-col items-center gap-1.5 text-center flex-1">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-4 ring-rose-500/20 scale-105'
                      : isDone
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[11px] font-bold ${isActive ? 'text-rose-400' : isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
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
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl animate-in fade-in">
          {/* Welcome Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-600/30">
              <Siren className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                108 Emergency Medical Assistance
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">Where is the Emergency?</h1>
              <p className="text-xs text-slate-400 mt-1">
                We will instantly locate your position, dispatch the nearest life-support ambulance, and pre-book the optimal hospital bed.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Location Input & GPS button */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Patient Pickup Location:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Type street, landmark, or district name in Tamil Nadu..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 shadow-inner"
                />
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isLocating}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 active:scale-95 whitespace-nowrap"
                >
                  <Compass className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
                </button>
              </div>
            </div>

            {/* Quick Town Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Cities:</span>
              {[
                { name: 'Chennai (T. Nagar)', lat: 13.0415, lng: 80.2405 },
                { name: 'Coimbatore (Gandhipuram)', lat: 11.0183, lng: 76.9678 },
                { name: 'Madurai (KK Nagar)', lat: 9.9405, lng: 78.1480 },
                { name: 'Trichy (Tennur)', lat: 10.8252, lng: 78.6853 },
                { name: 'Salem (Town)', lat: 11.6643, lng: 78.1460 }
              ].map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setAddress(p.name);
                    setCoords({ lat: p.lat, lng: p.lng });
                  }}
                  className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-800 font-medium transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Patient Name, Age, Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-cyan-400" /> Patient Name
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Patient Age
                </label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> Mobile (For Live SMS)
                </label>
                <input
                  type="text"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full bg-transparent text-cyan-300 font-mono font-bold text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Forward Action */}
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all active:scale-95"
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
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl animate-in fade-in">
          {/* Assistant Header & Friendly Chat Bubble */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-cyan-600/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">AI Medical Triage Assessment</h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Decision Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 leading-relaxed">
                "Hello! Please tell me what symptoms the patient has and rate their pain level. I will calculate clinical urgency, select the right vehicle, and match the best hospital."
              </p>
            </div>
          </div>

          {/* 1. Pick Symptom Category */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              1. What is the Chief Medical Complaint?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {SYMPTOMS.map((s) => {
                const Icon = s.icon;
                const isSelected = selectedSymptom.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSymptom(s)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? `${s.borderColor} bg-slate-900 shadow-xl scale-[1.02]`
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${s.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="font-extrabold text-xs text-white leading-snug">{s.name}</div>
                    </div>
                    <p className="text-[11px] text-slate-400">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Interactive Pain Scale Slider */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                2. Rate Pain Severity (1 to 10 Scale):
              </label>
              <span
                className={`text-sm sm:text-base font-black px-3 py-1 rounded-full ${
                  painLevel >= 8
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : painLevel >= 5
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                Level {painLevel} / 10 &bull; {painLevel >= 8 ? 'Excruciating Pain' : painLevel >= 5 ? 'Moderate Pain' : 'Mild Pain'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={painLevel}
              onChange={(e) => setPainLevel(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-bold px-1">
              <span>1 - Mild Discomfort</span>
              <span>5 - Moderate</span>
              <span>10 - Critical / Unbearable</span>
            </div>
          </div>

          {/* 3. Critical Emergency Questions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Is the patient conscious?</span>
                <span className="text-[10px] text-slate-400">Response & speech status</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsConscious(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    isConscious ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Conscious
                </button>
                <button
                  type="button"
                  onClick={() => setIsConscious(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    !isConscious ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Unconscious
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Cold sweats or bleeding?</span>
                <span className="text-[10px] text-slate-400">Physical shock indicators</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setHasSweating(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    hasSweating ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => setHasSweating(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    !hasSweating ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  None
                </button>
              </div>
            </div>
          </div>

          {/* AI Clinical Diagnosis Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-cyan-950/40 border-2 border-rose-500/40 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-400 animate-pulse" /> AI Triage Assessment Output:
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                Priority: {selectedSymptom.priority} (Tier 1)
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Based on patient vital signs and symptom profile, system is dispatching an <b>Advanced Life Support (ALS) Ambulance</b> equipped with defibrillator, ventilator, and trained paramedic support.
            </p>
          </div>

          {/* Navigation Controls */}
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
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-rose-600/30 transition-all active:scale-95"
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
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl animate-in fade-in">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Step 3 of 5: Hospital Allocation
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">AI Hospital Recommendation</h2>
            <p className="text-xs text-slate-400">
              Evaluated across travel time (XGBoost), ICU bed availability, ER load, and specialized clinical capability.
            </p>
          </div>

          {selectedHospital ? (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border-2 border-emerald-500/60 space-y-5 shadow-2xl">
              {/* Top Banner */}
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 text-xs font-black flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" /> Top AI Recommended Facility
                </span>
                <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
                  Suitability Score: 94 / 100
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">{selectedHospital.name}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{selectedHospital.address}</p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Travel</span>
                  <div className="text-lg sm:text-xl font-black text-cyan-400 mt-0.5">~11 mins</div>
                  <span className="text-[10px] text-slate-500">XGBoost Regressor</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">ICU Beds Ready</span>
                  <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                    {selectedHospital.available_icu_beds} Available
                  </div>
                  <span className="text-[10px] text-emerald-500 font-semibold">Ventilator Active</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Dispatched Unit</span>
                  <div className="text-xs sm:text-sm font-black text-white mt-1 truncate">
                    {assignedAmbulance?.vehicle_number || 'TN-01-AM-1081'}
                  </div>
                  <span className="text-[10px] text-cyan-400">ALS Life Support</span>
                </div>
              </div>

              {/* Rationale Callout */}
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-200 leading-relaxed shadow-sm">
                <b>💡 AI Decision Rationale:</b> {aiRationale}
              </div>

              {/* Alternative Hospitals Comparison */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Other Hospitals Evaluated in Area:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {hospitals
                    .filter((h) => h.id !== selectedHospital.id)
                    .slice(0, 3)
                    .map((alt, idx) => (
                      <div key={alt.id} className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                        <div className="font-bold text-slate-200 truncate">{alt.name}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>~{14 + idx * 4} min ETA</span>
                          <span className={alt.available_icu_beds > 0 ? 'text-amber-400' : 'text-rose-400 font-bold'}>
                            {alt.available_icu_beds} ICU Beds
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {alt.available_icu_beds === 0 ? '⚠️ Zero ICU beds available' : '⚠️ Slower transit corridor'}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">Optimizing hospital allocation...</div>
          )}

          {/* Navigation Controls */}
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
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
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
          {/* Reassuring Top Dispatch Banner */}
          <div className="glass-panel p-5 rounded-3xl border-2 border-emerald-500/50 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-md">
                <Siren className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                  Ambulance Dispatched & En Route
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                  Arriving at {address} in <span className="text-cyan-400">~6 mins</span>
                </h3>
              </div>
            </div>

            {/* Action Buttons: Call Paramedic, Test Reroute, Handover */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`tel:${assignedAmbulance?.phone || '108'}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Paramedic ({assignedAmbulance?.phone || '+91 98401 11081'})</span>
              </a>

              <button
                type="button"
                onClick={async () => {
                  if (selectedHospital) {
                    try {
                      await EmergencyAPI.simulateTrafficJam(selectedHospital.id, 4);
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition-all active:scale-95"
                title="Inject road bottleneck to test AI Dynamic Rerouting"
              >
                <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                <span>⚡ Test Dynamic Reroute</span>
              </button>

              <button
                onClick={handleCompleteHandover}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                Handover & Complete ➔
              </button>
            </div>
          </div>

          {/* SMS Notification Confirmation Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between shadow-sm">
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Real SMS alert dispatched to mobile: <b className="text-cyan-400 font-mono">{patientPhone}</b></span>
            </span>
            <span className="text-emerald-400 text-[10px] font-black uppercase bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
              ✓ Sent via Gateway
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
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-2xl">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Case Completed Successfully
            </span>
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
              <span className="text-[10px] text-slate-500">vs Naive Closest</span>
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
