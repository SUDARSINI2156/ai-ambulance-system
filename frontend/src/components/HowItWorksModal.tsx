import React from 'react';
import { 
  X, HelpCircle, Siren, Navigation, Building2, 
  Brain, ShieldAlert, CheckCircle2, ArrowRight 
} from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const STEPS = [
    {
      role: '1. 🚨 Citizen / Patient (பொது மக்கள்)',
      title: 'One-Tap SOS Emergency Request',
      desc: 'நோயாளி அல்லது பார்வையாளர் "🚨 TAP TO CALL 108" பட்டனைத் தொட்டவுடன், GPS மூலம் அவர்களின் இடம் அறியப்பட்டு, அறிகுறிகள் (மாரடைப்பு, விபத்து போன்றவை) பதிவு செய்யப்படுகிறது.',
      action: 'Try it in "Citizen SOS" Tab',
      icon: Siren,
      color: 'from-rose-600 to-red-700'
    },
    {
      role: '2. 🧠 AI Decision Engine (செயற்கை நுண்ணறிவு)',
      title: 'Triage, XGBoost ETA & Hospital Match',
      desc: 'AI மாடல் நோயாளியின் தீவிரத்தை (Priority: CRITICAL) வகைப்படுத்தி, XGBoost மூலம் போக்குவரத்து நெரிசலைக் கணக்கிட்டு, காலியான ICU படுக்கைகள் உள்ள சிறந்த மருத்துவமனையைத் தேர்ந்தெடுக்கிறது.',
      action: 'Tested with 15,000 trips (R² = 0.9909)',
      icon: Brain,
      color: 'from-cyan-600 to-blue-700'
    },
    {
      role: '3. 👨‍💼 Central Dispatcher (கட்டுப்பாட்டு அறை)',
      title: 'City-Wide Live Tactical Fleet Map',
      desc: 'தமிழ்நாட்டின் அனைத்து மாவட்டங்களிலும் (சென்னை, கோவை, மதுரை, திருச்சி, சேலம்) உள்ள ஆம்புலன்ஸ்கள் மற்றும் மருத்துவமனைகளின் நிலையை ஒரே திரையில் கண்காணிக்கலாம்.',
      action: 'Try it in "Central Dispatch" Tab',
      icon: ShieldAlert,
      color: 'from-blue-600 to-indigo-700'
    },
    {
      role: '4. 🚑 Ambulance Pilot / Paramedic (ஆம்புலன்ஸ்)',
      title: 'Live Turn Navigation & Patient Vitals',
      desc: 'டிரைவர் மொபைலில் நோயாளி இருக்கும் இடம், மருத்துவமனைக்கான உகந்த பாதை மற்றும் நோயாளியின் நாடித் துடிப்பு (HR, BP, SpO2) திரையில் தெரியும்.',
      action: 'Try it in "Ambulance HUD" Tab',
      icon: Navigation,
      color: 'from-amber-600 to-orange-700'
    },
    {
      role: '5. 🏥 Hospital Emergency Dept (மருத்துவமனை)',
      title: 'Pre-Arrival Alert & Bed Management',
      desc: 'நோயாளி வருவதற்கு முன்பே மருத்துவமனைக்கு "இன்னும் 8 நிமிடத்தில் நோயாளி வருகிறார்" என்று அலர்ட் சென்று, ICU மற்றும் வென்டிலேட்டர்கள் தயார் செய்யப்படுகின்றன.',
      action: 'Try it in "Hospital Command" Tab',
      icon: Building2,
      color: 'from-emerald-600 to-teal-700'
    }
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl glass-panel-glow border border-slate-700 p-6 my-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">How This System Works (செயல்முறை வழிகாட்டி)</h2>
              <p className="text-xs text-slate-400">Complete End-to-End Workflow for Evaluators & Users</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="mt-4 space-y-3.5 text-xs max-h-[60vh] overflow-y-auto pr-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-4 hover:border-cyan-500/40 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${s.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">{s.role}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      {s.action}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-white">{s.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Reroute Highlight Box */}
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
          <span>
            ⚡ <b>The Real-World Difference:</b> ஆம்புலன்ஸ் செல்லும் வழியில் திடீரென டிராஃபிக் ஜாம் ஏற்பட்டால், AI உடனே மாற்று மருத்துவமனையைத் தேர்ந்தெடுத்து தானாகவே ரூட்டை மாற்றும் (Dynamic Rerouting)!
          </span>
        </div>

        {/* Close */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all"
          >
            Got It! Start Demo
          </button>
        </div>
      </div>
    </div>
  );
};
