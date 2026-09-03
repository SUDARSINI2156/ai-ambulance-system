import React, { useState } from 'react';
import { 
  ShieldAlert, Ambulance as AmbIcon, Building2, 
  Clock, Navigation, CheckCircle2, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { Hospital, Ambulance, Emergency } from '../types';
import { MapView } from '../components/MapView';
import { SimulationControls } from '../components/SimulationControls';

interface AdminCommandCenterProps {
  hospitals: Hospital[];
  ambulances: Ambulance[];
  emergencies: Emergency[];
  onOpenDispatch: () => void;
  onRefresh: () => void;
  onSelectEmergency: (emg: Emergency) => void;
}

export const AdminCommandCenter: React.FC<AdminCommandCenterProps> = ({
  hospitals,
  ambulances,
  emergencies,
  onOpenDispatch,
  onRefresh,
  onSelectEmergency,
}) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);

  // Active emergencies
  const activeEmergencies = emergencies.filter(
    (e) => e.status !== 'COMPLETED' && e.status !== 'CANCELLED'
  );
  const currentSelectedEmergency = activeEmergencies[0] || null;

  // Calculate totals
  const totalErBeds = hospitals.reduce((acc, h) => acc + h.total_er_beds, 0);
  const availableErBeds = hospitals.reduce((acc, h) => acc + h.available_er_beds, 0);
  const totalIcuBeds = hospitals.reduce((acc, h) => acc + h.total_icu_beds, 0);
  const availableIcuBeds = hospitals.reduce((acc, h) => acc + h.available_icu_beds, 0);
  const availableAmbs = ambulances.filter((a) => a.status === 'AVAILABLE').length;

  return (
    <div className="space-y-4">
      {/* Top Simulation Toolbar */}
      <SimulationControls
        hospitals={hospitals}
        ambulances={ambulances}
        onOpenDispatch={onOpenDispatch}
        onRefresh={onRefresh}
      />

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Active Incidents</div>
            <div className="text-xl font-black text-white flex items-center gap-2">
              {activeEmergencies.length}
              {activeEmergencies.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-medium">
                  Dispatching
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <AmbIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Fleet Readiness</div>
            <div className="text-xl font-black text-white">
              {availableAmbs} <span className="text-xs text-slate-400 font-normal">/ {ambulances.length} Active</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">City ER Beds Free</div>
            <div className="text-xl font-black text-emerald-400">
              {availableErBeds} <span className="text-xs text-slate-400 font-normal">/ {totalErBeds} Total</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Critical ICU Headroom</div>
            <div className="text-xl font-black text-indigo-400">
              {availableIcuBeds} <span className="text-xs text-slate-400 font-normal">/ {totalIcuBeds} ICU</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Tactical Map (Left) + Live Operational Lists (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tactical Map Container */}
        <div className="lg:col-span-2 h-[560px]">
          <MapView
            hospitals={hospitals}
            ambulances={ambulances}
            activeEmergency={currentSelectedEmergency}
            selectedHospitalId={selectedHospitalId}
            onHospitalClick={(h) => setSelectedHospitalId(h.id)}
          />
        </div>

        {/* Right Operations Feed */}
        <div className="space-y-4 flex flex-col h-[560px]">
          {/* Active Emergencies Card */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Live Incidents ({activeEmergencies.length})
              </h2>
              <button
                onClick={onOpenDispatch}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                + Dispatch Call
              </button>
            </div>

            <div className="mt-3 space-y-2.5 overflow-y-auto pr-1 flex-1">
              {activeEmergencies.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No active emergencies. City network nominal.
                </div>
              ) : (
                activeEmergencies.map((emg) => {
                  const assignedAmb = ambulances.find((a) => a.id === emg.assigned_ambulance_id);
                  const assignedHosp = hospitals.find((h) => h.id === emg.assigned_hospital_id);

                  return (
                    <div
                      key={emg.id}
                      onClick={() => onSelectEmergency(emg)}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                          {emg.emergency_code}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            emg.priority === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {emg.priority}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 font-medium line-clamp-1">
                        {emg.patient_name} ({emg.patient_age}y) &bull; {emg.chief_complaint}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                        <Navigation className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{emg.pickup_address}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <div className="text-cyan-400 font-medium truncate max-w-[150px]">
                          🏥 {assignedHosp?.name || 'Allocating...'}
                        </div>
                        <div className="text-slate-400 font-mono">
                          🚑 {assignedAmb?.vehicle_number || 'En route'}
                        </div>
                      </div>

                      {emg.reroute_count > 0 && (
                        <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Dynamically Rerouted ({emg.reroute_count}x)</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Hospital Readiness Matrix */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 h-[240px] flex flex-col overflow-hidden">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Hospital Emergency Capacity
            </h2>

            <div className="mt-2 space-y-2 overflow-y-auto pr-1 flex-1 text-xs">
              {hospitals.map((h) => {
                const isOverloaded = h.emergency_status === 'OVERLOADED' || h.available_er_beds <= 0;
                return (
                  <div
                    key={h.id}
                    onClick={() => setSelectedHospitalId(h.id)}
                    className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <div className="truncate max-w-[160px]">
                      <div className="font-bold text-slate-200 truncate">{h.name}</div>
                      <div className="text-[10px] text-slate-400">{h.current_wait_time_minutes}m wait</div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          isOverloaded ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {h.available_er_beds} ER
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                        {h.available_icu_beds} ICU
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
