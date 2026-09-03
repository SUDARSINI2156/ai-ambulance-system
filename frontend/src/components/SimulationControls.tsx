import React, { useState } from 'react';
import { Play, Flame, AlertCircle, PlusCircle, RotateCcw } from 'lucide-react';
import { EmergencyAPI } from '../services/api';
import { Hospital, Ambulance } from '../types';

interface SimulationControlsProps {
  hospitals: Hospital[];
  ambulances: Ambulance[];
  onOpenDispatch: () => void;
  onRefresh: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  hospitals,
  ambulances,
  onOpenDispatch,
  onRefresh,
}) => {
  const [isRunningSim, setIsRunningSim] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number>(1); // Default Apollo
  const [isInjectingTraffic, setIsInjectingTraffic] = useState(false);

  // Run Ambulance Trip Simulation
  const handleStartAmbulanceSim = async () => {
    // Pick first busy or first available ambulance
    const amb = ambulances.find((a) => a.id === 1) || ambulances[0];
    const hosp = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];
    if (!amb || !hosp) return;

    setIsRunningSim(true);
    try {
      await EmergencyAPI.simulateTrip(amb.id, hosp.latitude, hosp.longitude);
    } catch (e: any) {
      console.error('Trip sim error:', e);
    } finally {
      setIsRunningSim(false);
    }
  };

  // Inject Traffic Jam (Simulate Congestion = 4)
  const handleInjectTrafficJam = async () => {
    setIsInjectingTraffic(true);
    try {
      const res = await EmergencyAPI.simulateTrafficJam(selectedHospitalId, 4);
      if (res.data.dynamic_reroutes_triggered > 0) {
        console.log('Dynamic Reroute triggered via traffic spike!');
      }
      onRefresh();
    } catch (e) {
      console.error('Traffic injection error:', e);
    } finally {
      setIsInjectingTraffic(false);
    }
  };

  // Set Hospital to Zero ER Beds to trigger capacity reroute
  const handleToggleZeroBeds = async () => {
    const hosp = hospitals.find((h) => h.id === selectedHospitalId);
    if (!hosp) return;
    const newBeds = hosp.available_er_beds > 0 ? 0 : 8;
    try {
      await EmergencyAPI.updateHospitalCapacity(hosp.id, {
        available_er_beds: newBeds,
        available_icu_beds: hosp.available_icu_beds,
        available_ventilators: hosp.available_ventilators,
        emergency_status: newBeds === 0 ? 'OVERLOADED' : 'OPEN'
      });
      onRefresh();
    } catch (e) {
      console.error('Bed toggle error:', e);
    }
  };

  return (
    <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
        </span>
        <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
          Demo Control Deck
        </span>
        <span className="hidden sm:inline text-slate-500 font-medium">|</span>
        <div className="flex items-center gap-1.5">
          <label className="text-slate-400">Target Hospital:</label>
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none"
          >
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.available_er_beds} ER Beds)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Run Ambulance Trip Sim */}
        <button
          onClick={handleStartAmbulanceSim}
          disabled={isRunningSim}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isRunningSim ? 'Simulating...' : 'Simulate GPS Drive'}</span>
        </button>

        {/* Inject Traffic Spike */}
        <button
          onClick={handleInjectTrafficJam}
          disabled={isInjectingTraffic}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold transition-all disabled:opacity-50 shadow-md shadow-amber-600/20"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Inject Traffic Jam (Reroute)</span>
        </button>

        {/* Toggle Bed Saturation */}
        <button
          onClick={handleToggleZeroBeds}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-all"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Toggle 0 ER Beds</span>
        </button>

        {/* New 108 Dispatch */}
        <button
          onClick={onOpenDispatch}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md shadow-emerald-600/20"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New 108 Call</span>
        </button>
      </div>
    </div>
  );
};
