import React from 'react';
import { Siren, Navigation, Building2, ShieldAlert, BarChart3 } from 'lucide-react';

interface RoleSelectorProps {
  currentRole: 'patient' | 'ambulance' | 'hospital' | 'admin' | 'analytics';
  onSelectRole: (role: 'patient' | 'ambulance' | 'hospital' | 'admin' | 'analytics') => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, onSelectRole }) => {
  const ROLES = [
    {
      id: 'patient' as const,
      label: 'Patient / Citizen SOS',
      desc: 'Step-by-Step Emergency Booking',
      icon: Siren,
      color: 'from-rose-600 to-red-600',
      activeColor: 'ring-rose-500 bg-rose-500/10 text-rose-400'
    },
    {
      id: 'ambulance' as const,
      label: 'Ambulance Driver HUD',
      desc: 'Turn Navigation & Vitals',
      icon: Navigation,
      color: 'from-amber-600 to-orange-600',
      activeColor: 'ring-amber-500 bg-amber-500/10 text-amber-400'
    },
    {
      id: 'hospital' as const,
      label: 'Hospital ER Desk',
      desc: 'Incoming Queue & Beds',
      icon: Building2,
      color: 'from-emerald-600 to-teal-600',
      activeColor: 'ring-emerald-500 bg-emerald-500/10 text-emerald-400'
    },
    {
      id: 'admin' as const,
      label: 'City Central Dispatch',
      desc: 'Multi-District Map',
      icon: ShieldAlert,
      color: 'from-blue-600 to-indigo-600',
      activeColor: 'ring-blue-500 bg-blue-500/10 text-blue-400'
    },
    {
      id: 'analytics' as const,
      label: 'AI Viva Analytics',
      desc: 'Model Accuracy & Proof',
      icon: BarChart3,
      color: 'from-cyan-600 to-blue-600',
      activeColor: 'ring-cyan-500 bg-cyan-500/10 text-cyan-400'
    }
  ];

  return (
    <div className="glass-panel p-2 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between gap-1 overflow-x-auto">
      {ROLES.map((r) => {
        const Icon = r.icon;
        const isActive = currentRole === r.id;
        return (
          <button
            key={r.id}
            onClick={() => onSelectRole(r.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              isActive
                ? `bg-slate-900 border border-slate-700 shadow-md ${r.activeColor}`
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${r.color} flex items-center justify-center text-white shrink-0`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden md:block">
              <div className="font-extrabold text-xs">{r.label}</div>
              <div className="text-[10px] text-slate-500 font-normal">{r.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
