import React, { useState } from 'react';
import { 
  Navigation, Heart, Activity, AlertTriangle, 
  MapPin, CheckCircle2, Hospital as HospIcon, ShieldAlert, Compass
} from 'lucide-react';
import { Ambulance, Emergency, Hospital } from '../types';
import { EmergencyAPI } from '../services/api';

interface AmbulanceHUDProps {
  ambulance: Ambulance;
  activeEmergency?: Emergency | null;
  assignedHospital?: Hospital | null;
  onRefresh: () => void;
}

export const AmbulanceHUD: React.FC<AmbulanceHUDProps> = ({
  ambulance,
  activeEmergency,
  assignedHospital,
  onRefresh,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await EmergencyAPI.updateAmbulanceStatus(ambulance.id, newStatus);
      if (activeEmergency) {
        if (newStatus === 'ARRIVED_HOSPITAL') {
          await EmergencyAPI.updateEmergencyStatus(activeEmergency.id, 'COMPLETED');
        } else if (newStatus === 'PATIENT_ON_BOARD') {
          await EmergencyAPI.updateEmergencyStatus(activeEmergency.id, 'TRANSPORTING');
        }
      }
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Driver Navigation HUD Card */}
      <div className="glass-panel p-5 rounded-2xl border-2 border-cyan-500/40 relative overflow-hidden shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-cyan-400">
                  {ambulance.vehicle_number}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                  {ambulance.equipment_level} ADVANCED LIFE SUPPORT
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Pilot: <b className="text-white">{ambulance.driver_name}</b> &bull; Speed:{' '}
                <span className="font-mono text-emerald-400 font-bold">{ambulance.speed_kmh} km/h</span>
              </div>
            </div>
          </div>

          {/* Quick Lifecycle Controls */}
          <div className="flex items-center gap-2">
            {ambulance.status === 'DISPATCHED' && (
              <button
                onClick={() => handleStatusChange('PATIENT_ON_BOARD')}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all active:scale-95"
              >
                Confirm Patient On Board
              </button>
            )}

            {(ambulance.status === 'PATIENT_ON_BOARD' || ambulance.status === 'TRANSPORTING') && (
              <button
                onClick={() => handleStatusChange('ARRIVED_HOSPITAL')}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                Mark Arrived at Emergency Dept
              </button>
            )}

            {ambulance.status === 'AVAILABLE' && (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/40">
                🟢 Ready on Standby
              </span>
            )}
          </div>
        </div>

        {/* Turn Guidance Bar */}
        {assignedHospital && activeEmergency && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Navigating Towards</span>
              <div className="text-sm font-bold text-white truncate mt-0.5">{assignedHospital.name}</div>
              <span className="text-[11px] text-slate-400">{assignedHospital.address}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">AI Estimated Arrival</span>
              <div className="text-xl font-black text-cyan-400 mt-0.5">
                8.4 <span className="text-xs text-slate-400 font-normal">mins (Optimal Corridor)</span>
              </div>
              <span className="text-[11px] text-emerald-400">Green Wave Priority Active</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Facility Capacity</span>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {assignedHospital.available_icu_beds} ICU &bull; {assignedHospital.available_er_beds} ER Beds Free
              </div>
              <span className="text-[11px] text-slate-400">Cath Lab & Trauma Team Alerted</span>
            </div>
          </div>
        )}
      </div>

      {/* Patient Clinical Profile & Vitals */}
      {activeEmergency ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Patient Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <h3 className="font-extrabold text-sm text-white">
                  {activeEmergency.patient_name}, {activeEmergency.patient_age}y ({activeEmergency.patient_gender})
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500 font-black text-xs">
                {activeEmergency.priority}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
              <span className="text-slate-400 block font-bold mb-1">Chief Symptoms:</span>
              <p className="leading-relaxed">{activeEmergency.chief_complaint}</p>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Heart Rate</span>
                <span className="text-base font-black text-rose-400">{activeEmergency.heart_rate}</span>
                <span className="text-[10px] text-slate-500 block">bpm</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Blood Press.</span>
                <span className="text-base font-black text-amber-400">{activeEmergency.systolic_bp}</span>
                <span className="text-[10px] text-slate-500 block">mmHg</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Oxygen SpO2</span>
                <span className="text-base font-black text-cyan-400">{activeEmergency.oxygen_sat}%</span>
                <span className="text-[10px] text-slate-500 block">Pulse Ox</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">GCS Score</span>
                <span className="text-base font-black text-indigo-400">{activeEmergency.gcs_score}</span>
                <span className="text-[10px] text-slate-500 block">/ 15</span>
              </div>
            </div>
          </div>

          {/* AI Decision Rationale Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4" /> AI Destination Reason
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hospital recommended via multi-criteria optimization weighting:
                <br />
                <span className="text-slate-400 font-mono text-[11px] block mt-1">
                  &bull; 35% Travel Time
                  <br />
                  &bull; 25% ICU Availability
                  <br />
                  &bull; 20% ER Capacity
                  <br />
                  &bull; 12% Speciality Match
                </span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300">
              Cath Lab & Intensive Care pre-notified for instant patient handoff.
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
          No active patient assigned to this unit. Standby for dispatch broadcast.
        </div>
      )}
    </div>
  );
};
