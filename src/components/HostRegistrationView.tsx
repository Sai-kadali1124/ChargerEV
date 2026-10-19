import React, { useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import {
  validateHostApplicationInput,
  type ConnectorType,
  type HostApplication,
  type HostCategory,
  type UserProfile,
} from '../utils/chargingLogic';
import { INDIA_CITY_PRESETS } from '../data/indiaEvData';

const ALL_CONNECTORS: ConnectorType[] = [
  'Type 2 AC',
  'CCS2 DC',
  'Bharat AC-001',
  'Bharat DC-001',
  '15A 3-Pin Socket',
  'CHAdeMO',
];

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface HostRegistrationViewProps {
  currentUser: UserProfile;
  applications: HostApplication[];
  onSubmitApplication: (payload: {
    applicantName: string;
    applicantEmail: string;
    phone: string;
    stationName: string;
    category: HostCategory;
    city: string;
    locality: string;
    exactAddress: string;
    equipmentType: string;
    powerOutputKw: number;
    connectors: ConnectorType[];
    pricePerKwh: number;
    emergencyCalloutFee: number;
    availableDays: string[];
    operatingHours: string;
    earthingConfirmed: boolean;
    rccbConfirmed: boolean;
  }) => Promise<void>;
}

export const HostRegistrationView: React.FC<HostRegistrationViewProps> = ({
  currentUser,
  applications,
  onSubmitApplication,
}) => {
  const [applicantName, setApplicantName] = useState(currentUser.name);
  const [applicantEmail, setApplicantEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '+91 98450 11223');
  const [stationName, setStationName] = useState('');
  const [category, setCategory] = useState<HostCategory>('Home Host');
  const [city, setCity] = useState(currentUser.city || 'Bengaluru');
  const [locality, setLocality] = useState('');
  const [exactAddress, setExactAddress] = useState('');
  const [equipmentType, setEquipmentType] = useState('7.4 kW Single-Phase AC Wallbox');
  const [powerOutputKw, setPowerOutputKw] = useState(7.4);
  const [connectors, setConnectors] = useState<ConnectorType[]>(['Type 2 AC', '15A 3-Pin Socket']);
  const [pricePerKwh, setPricePerKwh] = useState(18);
  const [emergencyCalloutFee, setEmergencyCalloutFee] = useState(40);
  const [availableDays, setAvailableDays] = useState<string[]>(ALL_DAYS);
  const [operatingHours, setOperatingHours] = useState('07:00 - 22:30');
  const [earthingConfirmed, setEarthingConfirmed] = useState(false);
  const [rccbConfirmed, setRccbConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleConnector = (conn: ConnectorType) => {
    setConnectors((prev) =>
      prev.includes(conn) ? prev.filter((c) => c !== conn) : [...prev, conn]
    );
  };

  const toggleDay = (day: string) => {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = validateHostApplicationInput({
      stationName,
      city,
      locality,
      exactAddress,
      equipmentType,
      powerOutputKw,
      connectors,
      pricePerKwh,
      operatingHours,
      earthingConfirmed,
    });

    if (!validation.valid) {
      setErrorMsg(validation.errors.join(' '));
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitApplication({
        applicantName,
        applicantEmail,
        phone,
        stationName,
        category,
        city,
        locality,
        exactAddress,
        equipmentType,
        powerOutputKw,
        connectors,
        pricePerKwh,
        emergencyCalloutFee,
        availableDays,
        operatingHours,
        earthingConfirmed,
        rccbConfirmed,
      });
      setSuccessMsg(
        `Application for "${stationName}" submitted with status "Pending Review". An administrator can now verify and approve your listing in the Admin Console.`
      );
      setStationName('');
      setLocality('');
      setExactAddress('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit host registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Register as an Emergency EV Charging Host
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            List your residential EV wallbox, 15A domestic socket, EV shop, or garage to assist
            drivers in India. Your exact home address is strictly hidden from public maps and only
            shared with drivers whose request you explicitly accept.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>{successMsg}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-6"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">
              01. Host Identity & Location Privacy
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Public visitors only see your general locality and a ~350m radius circle.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-station-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Station / Listing Title
              </label>
              <input
                id="reg-station-name"
                type="text"
                required
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="e.g. Indiranagar 2nd Stage Solar Home Box"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="reg-category" className="block text-xs font-semibold text-slate-700 mb-1">
                Host Category
              </label>
              <select
                id="reg-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as HostCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Home Host">Home Host (Residential Driveway / Apartment)</option>
                <option value="EV Shop">EV-Compatible Shop / Commercial</option>
                <option value="Garage">EV Mechanic / Service Garage</option>
                <option value="Verified Provider">Verified Charging Provider</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="reg-owner-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Host Contact Name
              </label>
              <input
                id="reg-owner-name"
                type="text"
                required
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number (India)
              </label>
              <input
                id="reg-phone"
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="reg-city" className="block text-xs font-semibold text-slate-700 mb-1">
                City / Metro Region
              </label>
              <select
                id="reg-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {INDIA_CITY_PRESETS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-locality" className="block text-xs font-semibold text-slate-700 mb-1">
                Public Locality / Neighborhood (Shown on Map)
              </label>
              <input
                id="reg-locality"
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Koramangala 4th Block / Bandra West"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="reg-exact-address" className="block text-xs font-semibold text-slate-700 mb-1">
                Exact Street / House Address (Hidden Publicly)
              </label>
              <input
                id="reg-exact-address"
                type="text"
                required
                value={exactAddress}
                onChange={(e) => setExactAddress(e.target.value)}
                placeholder="House No, Street, Landmark, PIN Code"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              02. Charging Equipment, Connectors & Tariff
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify accurate electrical specifications so drivers can verify compatibility.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-equipment" className="block text-xs font-semibold text-slate-700 mb-1">
                Charging Equipment Make & Type
              </label>
              <input
                id="reg-equipment"
                type="text"
                required
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                placeholder="e.g. 7.4 kW Exicom Spin AC Wallbox"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="reg-power-kw" className="block text-xs font-semibold text-slate-700 mb-1">
                Max Power Output (kW)
              </label>
              <input
                id="reg-power-kw"
                type="number"
                step="0.1"
                min={1.5}
                max={250}
                required
                value={powerOutputKw}
                onChange={(e) => setPowerOutputKw(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              Supported EV Connectors (Select all compatible)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_CONNECTORS.map((conn) => {
                const active = connectors.includes(conn);
                return (
                  <button
                    key={conn}
                    type="button"
                    onClick={() => toggleConnector(conn)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {conn}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="reg-price" className="block text-xs font-semibold text-slate-700 mb-1">
                Energy Rate (₹ / kWh)
              </label>
              <input
                id="reg-price"
                type="number"
                min={0}
                max={100}
                required
                value={pricePerKwh}
                onChange={(e) => setPricePerKwh(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="reg-callout" className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Callout Fee (₹)
              </label>
              <input
                id="reg-callout"
                type="number"
                min={0}
                max={300}
                required
                value={emergencyCalloutFee}
                onChange={(e) => setEmergencyCalloutFee(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="reg-hours" className="block text-xs font-semibold text-slate-700 mb-1">
                Operating Hours
              </label>
              <input
                id="reg-hours"
                type="text"
                required
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                placeholder="e.g. 07:00 - 22:30 or 24x7"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              Available Days of Week
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map((day) => {
                const selected = availableDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      selected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={earthingConfirmed}
                onChange={(e) => setEarthingConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-slate-900 rounded"
              />
              <span className="text-xs text-slate-800">
                <strong>Dedicated Earthing & Circuit Protection Declaration:</strong> I confirm this
                charging outlet has verified earthing (Neutral-to-Earth &lt; 5V) and a dedicated
                MCB/RCCB circuit breaker suitable for sustained EV load.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rccbConfirmed}
                onChange={(e) => setRccbConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-slate-900 rounded"
              />
              <span className="text-xs text-slate-700">
                30mA Residual Current Circuit Breaker (RCCB) / surge protection is installed on this
                line.
              </span>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Submitting Application...' : 'Submit Host Application for Review'}
            </button>
          </div>
        </form>

        {/* Right Sidebar: Privacy Assurance + Submitted Applications Queue */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Lock className="w-4 h-4 text-slate-700" />
              <span>Address Privacy Architecture</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ChargeNear automatically applies a deterministic ~350-meter coordinate offset to all
              home listings. Public map viewers only see your neighborhood zone.
            </p>
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm pt-2 border-t border-slate-100">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <span>Admin Safety Verification</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every new host registration enters the <strong>hostApplications</strong> queue with
              status <strong>Pending Review</strong> until approved by an administrator.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Recent Host Applications ({applications.length})
            </h3>
            {applications.length === 0 ? (
              <p className="text-xs text-slate-500">No host applications submitted yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <div key={app.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="text-xs text-slate-500">
                      {app.city} · {app.category} ·{' '}
                      <span className="font-semibold text-slate-900">{app.status}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                      {app.stationName}
                    </div>
                    <div className="text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                      {app.powerOutputKw} kW · ₹{app.pricePerKwh}/kWh · {app.connectors.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
