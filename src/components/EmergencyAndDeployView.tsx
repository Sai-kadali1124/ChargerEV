import React, { useState } from 'react';
import { CheckCircle2, PhoneCall, ShieldAlert, Terminal } from 'lucide-react';
import { INDIA_EMERGENCY_ASSISTANCE } from '../data/indiaEvData';
import type { ChargingHost, SafetyReport } from '../utils/chargingLogic';

interface EmergencyAndDeployViewProps {
  hosts: ChargingHost[];
  onSubmitReport: (payload: {
    targetHostId?: string;
    targetStationName: string;
    reason: SafetyReport['reason'];
    details: string;
  }) => Promise<void>;
}

export const EmergencyAndDeployView: React.FC<EmergencyAndDeployViewProps> = ({
  hosts,
  onSubmitReport,
}) => {
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [reason, setReason] = useState<SafetyReport['reason']>('Unsafe Wiring / No Earthing');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmittedMsg(null);

    if (details.trim().length < 5) {
      setErrorMsg('Please describe the safety issue or support inquiry (at least 5 characters).');
      return;
    }

    const matchedHost = hosts.find((h) => h.id === selectedHostId);
    try {
      setSubmitting(true);
      await onSubmitReport({
        targetHostId: matchedHost?.id,
        targetStationName: matchedHost?.stationName || 'General Customer Support / Safety Desk',
        reason,
        details,
      });
      setSubmittedMsg(
        'Your safety report / support ticket has been logged and routed to the Admin Console.'
      );
      setDetails('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          India EV Emergency Assistance, Safety & Deployment Guide
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          24x7 national highway recovery helplines, OEM high-voltage roadside assistance, electrical
          earthing verification rules, customer support, and full-stack deployment documentation.
        </p>
      </div>

      {/* National Helplines & OEM Roadside Assistance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-slate-900" />
            <h2 className="text-base font-bold text-slate-900">
              National Emergency & Highway Helplines (India)
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {INDIA_EMERGENCY_ASSISTANCE.nationalHelplines.map((item) => (
              <div key={item.number} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.coverage}</div>
                </div>
                <a
                  href={`tel:${item.number}`}
                  className="px-3 py-1.5 bg-slate-900 text-white font-mono tabular-nums text-xs font-bold rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  Dial {item.number}
                </a>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Mandatory EV Charging & Towing Safety Protocols</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
              {INDIA_EMERGENCY_ASSISTANCE.safetyProtocols.map((protocol, idx) => (
                <li key={idx} className="leading-relaxed">
                  {protocol}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            OEM High-Voltage Roadside Assistance (RSA)
          </h2>
          <div className="divide-y divide-slate-100">
            {INDIA_EMERGENCY_ASSISTANCE.oemRoadsideAssistance.map((oem) => (
              <div key={oem.brand} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{oem.brand}</span>
                  <a
                    href={`tel:${oem.number}`}
                    className="font-mono tabular-nums text-xs font-semibold text-slate-900 underline hover:text-slate-700 whitespace-nowrap shrink-0"
                  >
                    {oem.number}
                  </a>
                </div>
                <p className="text-xs text-slate-600">{oem.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Support & Safety/Fraud Reporting Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Report a Listing or Contact Customer Support
          </h2>
          <p className="text-xs text-slate-500">
            Flag earthing hazards, inaccurate listings, or reach our 24x7 EV support desk.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {errorMsg}
          </div>
        )}
        {submittedMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{submittedMsg}</span>
          </div>
        )}

        <form onSubmit={handleReportSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="report-host" className="block text-xs font-semibold text-slate-700 mb-1">
              Related Charging Host (Optional)
            </label>
            <select
              id="report-host"
              value={selectedHostId}
              onChange={(e) => setSelectedHostId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="">General Customer Support</option>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.stationName} ({h.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-reason" className="block text-xs font-semibold text-slate-700 mb-1">
              Category / Issue Type
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as SafetyReport['reason'])}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="Unsafe Wiring / No Earthing">Unsafe Wiring / No Earthing</option>
              <option value="Fraudulent Listing">Fraudulent Listing</option>
              <option value="Address Mismatch">Address Mismatch</option>
              <option value="Price Gouging">Price Gouging</option>
              <option value="Support Inquiry">Customer Support Inquiry</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="report-details" className="block text-xs font-semibold text-slate-700 mb-1">
              Details & Observations
            </label>
            <textarea
              id="report-details"
              rows={2}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the connector issue, earthing fault LED status, or support question..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Submitting...' : 'Submit Report / Support Ticket'}
            </button>
          </div>
        </form>
      </div>

      {/* Step-by-Step Deployment & Firebase Security Rules Reference */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-900" />
          <h2 className="text-base font-bold text-slate-900">
            Production Deployment & Security Architecture Guide
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-slate-700">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              1. Full-Stack Build & Cloud Run / Node.js Deployment
            </h3>
            <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
              <li>
                <strong>Install Dependencies:</strong> Run <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">npm install</code> to install React 19, Express, Leaflet, and TypeScript tooling.
              </li>
              <li>
                <strong>Environment Secrets:</strong> Configure server-side environment variables in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env</code> (based on <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env.example</code>). Never expose private admin credentials in client-side <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">VITE_*</code> variables.
              </li>
              <li>
                <strong>Run Unit Tests:</strong> Execute <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">npm test</code> (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">node --test src/utils/*.test.ts</code>) to verify Haversine distance, tariff math, and address privacy obfuscation.
              </li>
              <li>
                <strong>Production Bundle & Start:</strong> Run <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">npm run build</code> followed by <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">NODE_ENV=production npm start</code> (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">node server.ts</code> on port 3000).
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              2. Cloud Firestore Split-Collection Privacy Rules Blueprint
            </h3>
            <p className="leading-relaxed">
              To protect homeowner street addresses in Cloud Firestore, store obfuscated coordinates
              in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">/hosts/&#123;hostId&#125;</code> and isolate exact street addresses in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">/hosts/&#123;hostId&#125;/private/address</code>:
            </p>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
    function isSignedIn() { return request.auth != null && request.auth.token.email_verified == true; }
    function isAdmin() { return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid)); }

    match /hosts/{hostId} {
      allow get, list: if isSignedIn();
      allow create, update: if isSignedIn() && (request.resource.data.ownerId == request.auth.uid || isAdmin());
      allow delete: if isAdmin();

      match /private/location {
        allow get: if isSignedIn() && (
          get(/databases/$(database)/documents/hosts/$(hostId)).data.ownerId == request.auth.uid ||
          isAdmin()
        );
      }
    }
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
