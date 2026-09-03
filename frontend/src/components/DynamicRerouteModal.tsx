import React from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck, Clock, Bed, X } from 'lucide-react';
import { DynamicRerouteEvent } from '../types';

interface DynamicRerouteModalProps {
  event: DynamicRerouteEvent | null;
  onClose: () => void;
  onAccept: () => void;
}

export const DynamicRerouteModal: React.FC<DynamicRerouteModalProps> = ({
  event,
  onClose,
  onAccept,
}) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl glass-panel-glow border-2 border-rose-500/80 p-6 overflow-hidden shadow-2xl">
        {/* Pulsing Top Siren Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-600 animate-pulse" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Alert */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-500 animate-bounce">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500 text-rose-400 font-bold text-xs uppercase tracking-wider">
                Dynamic Reroute Triggered
              </span>
              <span className="text-xs text-slate-400 font-mono">#{event.emergency_code}</span>
            </div>
            <h2 className="text-xl font-black text-white mt-0.5">
              AI Destination Divert Advisory
            </h2>
          </div>
        </div>

        {/* Rationale explanation */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-200 mb-5 leading-relaxed">
          <p className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> AI Root-Cause Analysis:
          </p>
          <p className="text-xs text-slate-300">{event.reason}</p>
        </div>

        {/* Before vs After Card Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {/* Old Hospital */}
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Previous Destination</div>
            <div className="text-base font-bold text-slate-200 truncate mt-0.5">
              {event.old_hospital_name || 'Original Hospital'}
            </div>
            <div className="mt-2 text-xs text-rose-300 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Severe Bottleneck / Capacity Shortage
            </div>
          </div>

          {/* New Recommended Hospital */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 relative overflow-hidden">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Optimal Target (AI Ranked #1)
            </div>
            <div className="text-base font-bold text-white truncate mt-0.5">
              {event.new_hospital_name}
            </div>
            {event.time_saved_minutes && (
              <div className="mt-2 text-xs text-emerald-300 font-bold flex items-center gap-1">
                <span>⏱️ Saves ~{event.time_saved_minutes} min critical transit</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Dismiss Alert
          </button>
          <button
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
          >
            <span>Accept New Route</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
