import React, { useState } from 'react';
import { X, Siren, Stethoscope, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { EmergencyAPI } from '../services/api';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEmergency: any) => void;
}

const PRESET_LOCATIONS = [
  { name: '45 Usman Road, T. Nagar (Pondy Bazaar)', lat: 13.0415, lng: 80.2405 },
  { name: '2nd Avenue, Anna Nagar Roundtana', lat: 13.0850, lng: 80.2102 },
  { name: 'Kathipara Junction, Guindy', lat: 13.0067, lng: 80.2023 },
  { name: 'Kamarajar Salai, Marina Beach', lat: 13.0336, lng: 80.2707 },
  { name: '100 Feet Bypass Road, Velachery', lat: 12.9815, lng: 80.2180 },
];

export const DispatchModal: React.FC<DispatchModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [patientName, setPatientName] = useState('R. Raghavan');
  const [patientAge, setPatientAge] = useState(52);
  const [patientGender, setPatientGender] = useState('Male');
  const [chiefComplaint, setChiefComplaint] = useState('Crushing central chest pain, heavy perspiration, breathlessness');
  const [selectedLocation, setSelectedLocation] = useState(PRESET_LOCATIONS[0]);

  // Vitals
  const [heartRate, setHeartRate] = useState(112);
  const [systolicBp, setSystolicBp] = useState(165);
  const [oxygenSat, setOxygenSat] = useState(90);
  const [gcsScore, setGcsScore] = useState(14);
  const [painScale, setPainScale] = useState(9);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triagePreview, setTriagePreview] = useState<any>({
    priority: 'CRITICAL',
    suggested_equipment: 'ALS',
    clinical_flags: ['Severe Chest Pain / STEMI Risk', 'Moderate Hypoxemia (SpO2 90%)']
  });

  if (!isOpen) return null;

  const handleTriageAnalysis = async () => {
    try {
      const res = await EmergencyAPI.classifyTriage({
        chief_complaint: chiefComplaint,
        heart_rate: heartRate,
        systolic_bp: systolicBp,
        oxygen_sat: oxygenSat,
        gcs_score: gcsScore,
        pain_scale: painScale
      });
      setTriagePreview(res.data);
    } catch (err) {
      console.error('Triage preview failed:', err);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await EmergencyAPI.createEmergency({
        patient_name: patientName,
        patient_age: Number(patientAge),
        patient_gender: patientGender,
        chief_complaint: chiefComplaint,
        priority: triagePreview?.priority || 'HIGH',
        heart_rate: Number(heartRate),
        systolic_bp: Number(systolicBp),
        oxygen_sat: Number(oxygenSat),
        gcs_score: Number(gcsScore),
        pain_scale: Number(painScale),
        pickup_lat: selectedLocation.lat,
        pickup_lng: selectedLocation.lng,
        pickup_address: selectedLocation.name
      });
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      alert(`Dispatch error: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl glass-panel-glow border border-slate-700/80 p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500 flex items-center justify-center text-rose-500">
              <Siren className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Central 108 Emergency Incident Intake</h2>
              <p className="text-xs text-slate-400">Automated AI Triage & Multi-Criteria Hospital Allocation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleDispatch} className="mt-5 space-y-4 text-xs">
          {/* Patient Details */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Patient Name</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Age</label>
              <input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Gender</label>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Chief Medical Complaint</label>
            <textarea
              rows={2}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Location Preset */}
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Incident Location (Preset Chennai GPS Waypoints)
            </label>
            <select
              value={selectedLocation.name}
              onChange={(e) => {
                const loc = PRESET_LOCATIONS.find((l) => l.name === e.target.value);
                if (loc) setSelectedLocation(loc);
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
            >
              {PRESET_LOCATIONS.map((loc) => (
                <option key={loc.name} value={loc.name}>
                  {loc.name} ({loc.lat}, {loc.lng})
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Vitals */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-cyan-400" /> Paramedic Vitals & Neurological Assessment
              </span>
              <button
                type="button"
                onClick={handleTriageAnalysis}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold underline"
              >
                <Sparkles className="w-3 h-3" /> Refresh AI Triage
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block">HR (bpm)</label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">BP (mmHg)</label>
                <input
                  type="number"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">SpO2 (%)</label>
                <input
                  type="number"
                  value={oxygenSat}
                  onChange={(e) => setOxygenSat(Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">GCS (/15)</label>
                <input
                  type="number"
                  value={gcsScore}
                  min={3}
                  max={15}
                  onChange={(e) => setGcsScore(Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Pain (/10)</label>
                <input
                  type="number"
                  value={painScale}
                  min={0}
                  max={10}
                  onChange={(e) => setPainScale(Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-center font-bold"
                />
              </div>
            </div>

            {/* Live Triage Badge */}
            {triagePreview && (
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">AI Priority:</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded text-[11px] ${
                      triagePreview.priority === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500'
                        : triagePreview.priority === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500'
                    }`}
                  >
                    {triagePreview.priority}
                  </span>
                  <span className="text-slate-400">Tier: {triagePreview.suggested_equipment} Ambulance</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Evaluating AI Engine...' : 'Authorize AI Dispatch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
