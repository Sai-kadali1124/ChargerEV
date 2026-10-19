import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Compass,
  HelpCircle,
  Send,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import {
  buildAiTutorResponseFallback,
  calculateEvTopUpPlan,
  type ChargingHost,
} from '../utils/chargingLogic';

interface EvModelPreset {
  name: string;
  capacityKwh: number;
  efficiencyKmPerKwh: number;
  supportedConnectors: string;
}

const INDIA_EV_MODELS: EvModelPreset[] = [
  {
    name: 'Tata Nexon EV Empowered+ LR (40.5 kWh)',
    capacityKwh: 40.5,
    efficiencyKmPerKwh: 7.4,
    supportedConnectors: 'CCS2 DC, Type 2 AC, 15A 3-Pin Socket',
  },
  {
    name: 'Tata Punch EV Long Range (35 kWh)',
    capacityKwh: 35,
    efficiencyKmPerKwh: 8.0,
    supportedConnectors: 'CCS2 DC, Type 2 AC, 15A 3-Pin Socket',
  },
  {
    name: 'Tata Tiago EV Long Range (24 kWh)',
    capacityKwh: 24,
    efficiencyKmPerKwh: 8.5,
    supportedConnectors: 'CCS2 DC, Type 2 AC, 15A 3-Pin Socket',
  },
  {
    name: 'MG ZS EV Excite Pro (50.3 kWh)',
    capacityKwh: 50.3,
    efficiencyKmPerKwh: 7.0,
    supportedConnectors: 'CCS2 DC, Type 2 AC, 15A 3-Pin Socket',
  },
  {
    name: 'MG Windsor EV (38 kWh)',
    capacityKwh: 38,
    efficiencyKmPerKwh: 7.5,
    supportedConnectors: 'CCS2 DC, Type 2 AC, 15A 3-Pin Socket',
  },
  {
    name: 'Mahindra XUV400 EL Pro (39.4 kWh)',
    capacityKwh: 39.4,
    efficiencyKmPerKwh: 7.2,
    supportedConnectors: 'CCS2 DC, Type 2 AC, 15A 3-Pin Socket',
  },
  {
    name: 'BYD Atto 3 Extended Range (60.5 kWh)',
    capacityKwh: 60.5,
    efficiencyKmPerKwh: 6.8,
    supportedConnectors: 'CCS2 DC, Type 2 AC, 15A 3-Pin Socket',
  },
  {
    name: 'Ather 450X / Ola S1 Pro (3.7 kWh 2-Wheeler)',
    capacityKwh: 3.7,
    efficiencyKmPerKwh: 28.0,
    supportedConnectors: '15A 3-Pin Socket (Portable Charger)',
  },
];

const QUICK_TUTOR_PROMPTS = [
  'Which connector fits my Tata Nexon EV / MG ZS EV?',
  'Why is my portable charger blinking a red Earth Fault light?',
  'My battery is at 8% SoC — what emergency steps should I take?',
  'How does ChargeNear protect home addresses and verify hosts?',
];

interface ChatTurn {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  timestamp: string;
}

interface AiTutorViewProps {
  hosts: ChargingHost[];
  userCity: string;
  userVehicle?: string;
  onNavigateToMap: () => void;
  onNavigateToEmergency: () => void;
}

export const AiTutorView: React.FC<AiTutorViewProps> = ({
  hosts,
  userCity,
  userVehicle,
  onNavigateToMap,
  onNavigateToEmergency,
}) => {
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'welcome-turn',
      role: 'tutor',
      text: [
        '### Welcome to the ChargeNear AI EV Help & Safety Tutor',
        'I can help you troubleshoot **home earthing & 30mA RCCB faults**, verify **Indian EV connector compatibility** (Type 2 AC, CCS2 DC, 15A 3-Pin Socket), plan **emergency low-battery top-ups**, or guide you through booking and hosting safely.',
        'Select any topic below or type your question to get started.',
      ].join('\n\n'),
      timestamp: 'Ready',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);

  // Interactive EV Calculator state
  const [selectedEvIdx, setSelectedEvIdx] = useState(0);
  const [currentSoc, setCurrentSoc] = useState(12);
  const [targetSoc, setTargetSoc] = useState(65);
  const [chargerKw, setChargerKw] = useState(7.4);
  const [ratePerKwh, setRatePerKwh] = useState(18);

  const selectedEv = INDIA_EV_MODELS[selectedEvIdx] || INDIA_EV_MODELS[0];
  const topUpPlan = calculateEvTopUpPlan({
    batteryCapacityKwh: selectedEv.capacityKwh,
    currentSocPercent: currentSoc,
    targetSocPercent: targetSoc,
    chargerPowerKw: chargerKw,
    pricePerKwh: ratePerKwh,
    efficiencyKmPerKwh: selectedEv.efficiencyKmPerKwh,
  });

  const sendQuestion = async (questionText: string) => {
    const clean = questionText.trim();
    if (!clean || loadingReply) return;

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: clean,
      timestamp: 'Just now',
    };
    setMessages((prev) => [...prev, userTurn]);
    setInputQuery('');
    setLoadingReply(true);

    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: clean,
          city: userCity,
          vehicleModel: userVehicle || selectedEv.name,
        }),
      });
      const data = await res.json();
      const replyText =
        res.ok && data.answer
          ? data.answer
          : buildAiTutorResponseFallback(clean, hosts.length);

      setMessages((prev) => [
        ...prev,
        {
          id: `tutor-${Date.now()}`,
          role: 'tutor',
          text: replyText,
          timestamp: 'AI Tutor',
        },
      ]);
    } catch {
      const fallback = buildAiTutorResponseFallback(clean, hosts.length);
      setMessages((prev) => [
        ...prev,
        {
          id: `tutor-${Date.now()}`,
          role: 'tutor',
          text: fallback,
          timestamp: 'AI Tutor',
        },
      ]);
    } finally {
      setLoadingReply(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(inputQuery);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-semibold text-emerald-700">
            Interactive Help Service · Connector & Safety Diagnostics
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            AI EV Charging Tutor & Interactive Range Planner
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Get instant step-by-step guidance on Indian EV connectors, residential earthing &amp;
            30mA RCCB verification, low-battery emergency recovery, and exact top-up time &amp; cost
            calculations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onNavigateToMap}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            Find Available Chargers ({hosts.filter((h) => h.availabilityStatus === 'Available').length})
          </button>
          <button
            type="button"
            onClick={onNavigateToEmergency}
            className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            1033 / 112 Helplines
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Conversational AI Help Tutor + Interactive Top-Up Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Interactive AI Tutor Conversation */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-900" />
              <h2 className="text-base font-bold text-slate-900">
                Ask the ChargeNear AI Help Tutor
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Grounded on Indian EV Standards &amp; Grid Safety
            </span>
          </div>

          {/* Quick Topic Buttons */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-600">
              Popular Help Topics (Click to ask):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_TUTOR_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendQuestion(prompt)}
                  className="p-2.5 text-xs font-medium text-left text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-start gap-2"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Feed */}
          <div
            className="space-y-3 max-h-[380px] overflow-y-auto pr-1 py-2"
            data-testid="ai-tutor-messages"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-xl text-xs leading-relaxed space-y-2 ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white ml-8'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 mr-4'
                }`}
              >
                <div
                  className={`text-[11px] font-bold ${
                    m.role === 'user' ? 'text-slate-300' : 'text-slate-900'
                  }`}
                >
                  {m.role === 'user' ? 'You' : 'ChargeNear AI Tutor'} · {m.timestamp}
                </div>
                <div className="space-y-1.5">
                  {m.text.split('\n').map((rawLine, lineIdx) => {
                    const line = rawLine.trim();
                    if (!line) return null;
                    const isHeading = line.startsWith('### ');
                    const cleanLine = isHeading ? line.replace(/^###\s+/, '') : line;
                    const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

                    return (
                      <div
                        key={lineIdx}
                        className={
                          isHeading
                            ? 'text-sm font-bold text-slate-900 pt-0.5'
                            : 'leading-relaxed'
                        }
                      >
                        {parts.map((part, partIdx) =>
                          part.startsWith('**') && part.endsWith('**') ? (
                            <strong
                              key={partIdx}
                              className={
                                m.role === 'user' ? 'font-bold text-white' : 'font-semibold text-slate-900'
                              }
                            >
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            <React.Fragment key={partIdx}>{part}</React.Fragment>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {loadingReply && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Analyzing EV compatibility and safety protocols...
              </div>
            )}
          </div>

          {/* Question Input Form */}
          <form onSubmit={handleFormSubmit} className="pt-2 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask about connectors, earthing faults, charging cost, or emergency towing..."
              aria-label="Ask AI EV Tutor a question"
              className="flex-1 px-3.5 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              disabled={loadingReply}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Ask Tutor
            </button>
          </form>
        </div>

        {/* Right 5 Columns: Interactive EV Top-Up Time, Cost & Range Planner */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calculator className="w-4 h-4 text-slate-900" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Interactive EV Top-Up &amp; Range Simulator
              </h2>
              <p className="text-xs text-slate-500">
                Calculate exact kWh, minutes, ₹ cost, and km added for your vehicle.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="calc-ev-model" className="block text-xs font-semibold text-slate-700 mb-1">
                Select Your Electric Vehicle
              </label>
              <select
                id="calc-ev-model"
                value={selectedEvIdx}
                onChange={(e) => setSelectedEvIdx(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {INDIA_EV_MODELS.map((m, idx) => (
                  <option key={m.name} value={idx}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-500 mt-1">
                Compatible Ports: {selectedEv.supportedConnectors}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="calc-current-soc" className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Battery: <span className="font-mono tabular-nums">{currentSoc}%</span>
                </label>
                <input
                  id="calc-current-soc"
                  type="range"
                  min={2}
                  max={80}
                  value={currentSoc}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCurrentSoc(val);
                    if (targetSoc <= val) setTargetSoc(Math.min(100, val + 15));
                  }}
                  className="w-full accent-slate-900"
                />
              </div>

              <div>
                <label htmlFor="calc-target-soc" className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Battery: <span className="font-mono tabular-nums">{targetSoc}%</span>
                </label>
                <input
                  id="calc-target-soc"
                  type="range"
                  min={15}
                  max={100}
                  value={targetSoc}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTargetSoc(Math.max(currentSoc + 5, val));
                  }}
                  className="w-full accent-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="calc-charger-kw" className="block text-xs font-semibold text-slate-700 mb-1">
                  Host Charger Power
                </label>
                <select
                  id="calc-charger-kw"
                  value={chargerKw}
                  onChange={(e) => setChargerKw(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value={3.3}>3.3 kW (15A Home Socket)</option>
                  <option value={7.4}>7.4 kW (Single-Phase Wallbox)</option>
                  <option value={11}>11 kW (Three-Phase AC)</option>
                  <option value={25}>25 kW (CCS2 DC Fast)</option>
                </select>
              </div>

              <div>
                <label htmlFor="calc-rate" className="block text-xs font-semibold text-slate-700 mb-1">
                  Host Rate (₹/kWh)
                </label>
                <input
                  id="calc-rate"
                  type="number"
                  min={5}
                  max={50}
                  value={ratePerKwh}
                  onChange={(e) => setRatePerKwh(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Calculated Output Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500">Energy Needed</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {topUpPlan.neededKwh} kWh
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500">Estimated Time</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  ~{topUpPlan.estimatedMinutes} mins
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500">Driving Range Added</div>
                <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                  +{topUpPlan.addedRangeKm} km
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500">Estimated Energy Cost</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  ₹{topUpPlan.estimatedCostInr}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Visual Connector Reference & Step-by-Step Field Inspection Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Visual Connector &amp; On-Site Safety Verification Guide
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Before plugging your EV into any residential or peer charger, inspect these three
            essentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: 15A 3-Pin Socket */}
          <div className="p-4 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                01. 15A 3-Pin Socket (3.3 kW AC)
              </span>
              <Zap className="w-4 h-4 text-slate-700" />
            </div>
            <div className="h-24 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
              <svg width="84" height="64" viewBox="0 0 84 64" fill="none" aria-hidden="true">
                <rect x="8" y="6" width="68" height="52" rx="10" stroke="#0F172A" strokeWidth="2" fill="#FFFFFF" />
                <circle cx="42" cy="20" r="5" fill="#16A34A" />
                <circle cx="28" cy="40" r="4" fill="#0F172A" />
                <circle cx="56" cy="40" r="4" fill="#0F172A" />
                <text x="42" y="53" textAnchor="middle" fontSize="8" fontWeight="700" fill="#475569">
                  EARTH TOP PIN
                </text>
              </svg>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Universal across Indian homes for portable EVSE bricks and 2-wheelers. Verify the top
              Earth pin is firmly grounded (&lt; 5V N-E) and never use a 6A adapter.
            </p>
          </div>

          {/* Card 2: Type 2 AC Wallbox */}
          <div className="p-4 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                02. Type 2 AC Wallbox (7.4 – 22 kW)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="h-24 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
              <svg width="84" height="64" viewBox="0 0 84 64" fill="none" aria-hidden="true">
                <path
                  d="M22 14 H62 A16 16 0 0 1 66 46 A24 24 0 0 1 18 46 A16 16 0 0 1 22 14 Z"
                  stroke="#0F172A"
                  strokeWidth="2"
                  fill="#FFFFFF"
                />
                <circle cx="35" cy="23" r="2.5" fill="#0F172A" />
                <circle cx="49" cy="23" r="2.5" fill="#0F172A" />
                <circle cx="30" cy="33" r="3.2" fill="#0F172A" />
                <circle cx="42" cy="33" r="3.2" fill="#16A34A" />
                <circle cx="54" cy="33" r="3.2" fill="#0F172A" />
                <circle cx="36" cy="43" r="3.2" fill="#0F172A" />
                <circle cx="48" cy="43" r="3.2" fill="#0F172A" />
              </svg>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              7-pin IEC 62196 standard for Tata, MG, Mahindra, Hyundai, and BYD home wallboxes.
              Includes Control Pilot (CP) and Proximity Pilot (PP) safety handshakes.
            </p>
          </div>

          {/* Card 3: CCS2 DC Fast Charger */}
          <div className="p-4 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                03. CCS2 DC Fast (25 – 60+ kW)
              </span>
              <ShieldAlert className="w-4 h-4 text-amber-700" />
            </div>
            <div className="h-24 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
              <svg width="84" height="64" viewBox="0 0 84 64" fill="none" aria-hidden="true">
                <rect x="22" y="8" width="40" height="24" rx="10" stroke="#0F172A" strokeWidth="2" fill="#FFFFFF" />
                <circle cx="35" cy="20" r="2.5" fill="#0F172A" />
                <circle cx="42" cy="20" r="2.5" fill="#16A34A" />
                <circle cx="49" cy="20" r="2.5" fill="#0F172A" />
                <rect x="20" y="35" width="44" height="21" rx="10" stroke="#0F172A" strokeWidth="2" fill="#FFFFFF" />
                <circle cx="33" cy="45.5" r="5" fill="#0F172A" />
                <circle cx="51" cy="45.5" r="5" fill="#0F172A" />
              </svg>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              High-voltage DC pins below the Type 2 header. Available at verified EV garages and
              commercial hubs for rapid 30-minute emergency recovery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
