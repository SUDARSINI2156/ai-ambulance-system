import React, { useState, useEffect } from 'react';
import { 
  Building2, Bed, AlertTriangle, ShieldCheck, 
  Plus, Minus, Clock, Siren, Users, Stethoscope 
} from 'lucide-react';
import { Hospital, Emergency } from '../types';
import { EmergencyAPI } from '../services/api';

interface HospitalDashboardProps {
  hospitals: Hospital[];
  emergencies: Emergency[];
  onRefresh: () => void;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = ({
  hospitals,
  emergencies,
  onRefresh,
}) => {
  const [selectedHospId, setSelectedHospId] = useState<number>(1);
  const [surgeForecast, setSurgeForecast] = useState<any>(null);

  const currentHospital = hospitals.find((h) => h.id === selectedHospId) || hospitals[0];

  // Inbound emergencies heading to this hospital
  const inboundEmergencies = emergencies.filter(
    (e) =>
      e.assigned_hospital_id === currentHospital?.id &&
      (e.status === 'DISPATCHED' || e.status === 'TRANSPORTING' || e.status === 'REROUTED')
  );

  // Fetch AI 30-min surge forecast
  useEffect(() => {
    if (!currentHospital) return;
    EmergencyAPI.getSurgeForecast(currentHospital.id)
      .then((res) => setSurgeForecast(res.data))
      .catch((err) => console.error('Surge forecast error:', err));
  }, [currentHospital]);

  const updateCapacity = async (field: string, delta: number) => {
    if (!currentHospital) return;
    const currentVal = (currentHospital as any)[field] || 0;
    const newVal = Math.max(0, currentVal + delta);

    try {
      await EmergencyAPI.updateHospitalCapacity(currentHospital.id, {
        available_er_beds: field === 'available_er_beds' ? newVal : currentHospital.available_er_beds,
        available_icu_beds: field === 'available_icu_beds' ? newVal : currentHospital.available_icu_beds,
        available_ventilators: field === 'available_ventilators' ? newVal : currentHospital.available_ventilators,
        emergency_status: currentHospital.emergency_status,
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to update capacity:', e);
    }
  };

  const handleStatusToggle = async (newStatus: 'OPEN' | 'OVERLOADED' | 'DIVERTING') => {
    if (!currentHospital) return;
    try {
      await EmergencyAPI.updateHospitalCapacity(currentHospital.id, {
        available_er_beds: currentHospital.available_er_beds,
        available_icu_beds: currentHospital.available_icu_beds,
        available_ventilators: currentHospital.available_ventilators,
        emergency_status: newStatus,
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }
  };

  if (!currentHospital) return null;

  return (
    <div className="space-y-4">
      {/* Hospital Switcher Topbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">{currentHospital.name}</h2>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  currentHospital.emergency_status === 'OPEN'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : currentHospital.emergency_status === 'OVERLOADED'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {currentHospital.emergency_status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{currentHospital.address} &bull; {currentHospital.phone}</p>
          </div>
        </div>

        {/* Switch Hospital Dropdown */}
        <div className="flex items-center gap-3">
          <select
            value={selectedHospId}
            onChange={(e) => setSelectedHospId(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none"
          >
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          {/* Divert Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => handleStatusToggle('OPEN')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                currentHospital.emergency_status === 'OPEN'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => handleStatusToggle('OVERLOADED')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                currentHospital.emergency_status === 'OVERLOADED'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Surge
            </button>
            <button
              onClick={() => handleStatusToggle('DIVERTING')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                currentHospital.emergency_status === 'DIVERTING'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Divert
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Capacity Counters + Inbound Vehicle HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Capacity Management */}
        <div className="space-y-4">
          {/* Real-time Beds and Equipment */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Bed className="w-4 h-4 text-cyan-400" />
              Live Emergency Department Capacity
            </h3>

            {/* ER Beds */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300">Available ER Beds</span>
                <div className="text-2xl font-black text-white mt-0.5">
                  {currentHospital.available_er_beds}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {currentHospital.total_er_beds}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateCapacity('available_er_beds', -1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateCapacity('available_er_beds', 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-emerald-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ICU Beds */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300">Available ICU Beds</span>
                <div className="text-2xl font-black text-cyan-400 mt-0.5">
                  {currentHospital.available_icu_beds}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {currentHospital.total_icu_beds}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateCapacity('available_icu_beds', -1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateCapacity('available_icu_beds', 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-cyan-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ventilators */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300">Active Ventilators</span>
                <div className="text-2xl font-black text-indigo-400 mt-0.5">
                  {currentHospital.available_ventilators}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {currentHospital.total_ventilators}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateCapacity('available_ventilators', -1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateCapacity('available_ventilators', 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-indigo-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* AI 30-Minute Surge Forecaster Gauge */}
          {surgeForecast && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  AI 30-Min Surge Forecast
                </span>
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider"
                  style={{
                    backgroundColor: `${surgeForecast.risk_color}20`,
                    color: surgeForecast.risk_color,
                    border: `1px solid ${surgeForecast.risk_color}50`,
                  }}
                >
                  {surgeForecast.surge_risk_tier} RISK
                </span>
              </div>

              {/* Occupancy bar */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Current: {surgeForecast.current_occupancy_pct}%</span>
                  <span className="font-bold text-white">Forecast: {surgeForecast.predicted_30m_load_pct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, surgeForecast.predicted_30m_load_pct)}%`,
                      backgroundColor: surgeForecast.risk_color,
                    }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                <b className="text-amber-300 block mb-0.5">Clinical Protocol:</b>
                {surgeForecast.recommendation}
              </div>
            </div>
          )}
        </div>

        {/* Right: Inbound Ambulances HUD Feed */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Siren className="w-4 h-4 animate-pulse" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Inbound Ambulances ({inboundEmergencies.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">Pre-Alert Triage Active</span>
          </div>

          <div className="space-y-3">
            {inboundEmergencies.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                No incoming ambulance units currently assigned. Emergency bay clear.
              </div>
            ) : (
              inboundEmergencies.map((emg) => (
                <div
                  key={emg.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                      <span className="font-mono text-sm font-black text-white">{emg.emergency_code}</span>
                      <span className="text-xs text-slate-400 font-medium">&bull; Inbound Transit</span>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        emg.priority === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      }`}
                    >
                      {emg.priority} CASE
                    </span>
                  </div>

                  <div className="text-xs text-slate-200">
                    <b className="text-white">
                      {emg.patient_name}, {emg.patient_age}y ({emg.patient_gender})
                    </b>
                    <p className="text-slate-300 mt-1 leading-relaxed">{emg.chief_complaint}</p>
                  </div>

                  {/* Vitals Snapshot */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                      <b className="text-rose-400">{emg.heart_rate} bpm</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Blood Press.</span>
                      <b className="text-amber-400">{emg.systolic_bp} mmHg</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Oxygen SpO2</span>
                      <b className="text-cyan-400">{emg.oxygen_sat}%</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">GCS Scale</span>
                      <b className="text-indigo-400">{emg.gcs_score} / 15</b>
                    </div>
                  </div>

                  {/* Preparation Callout */}
                  <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40 text-[11px] text-rose-300 flex items-center justify-between">
                    <span>⚠️ Immediate Resuscitation Bay & Trauma Team Required</span>
                    <button className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-colors">
                      Acknowledge Pre-Arrival
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
