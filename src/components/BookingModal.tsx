import React, { useState } from 'react';
import { ShieldAlert, X, Zap } from 'lucide-react';
import {
  calculateChargingEstimate,
  type ConnectorType,
  type HostWithDistance,
} from '../utils/chargingLogic';

interface BookingModalProps {
  host: HostWithDistance | null;
  defaultVehicle?: string;
  onClose: () => void;
  onSubmitBooking: (payload: {
    hostId: string;
    vehicleModel: string;
    batteryPercent: number;
    connectorType: ConnectorType;
    requestedKwh: number;
    isEmergency: boolean;
    compatibilityAcknowledged: boolean;
    emergencyNote: string;
  }) => Promise<void>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  host,
  defaultVehicle,
  onClose,
  onSubmitBooking,
}) => {
  if (!host) return null;

  const [vehicleModel, setVehicleModel] = useState(
    defaultVehicle || 'Tata Nexon EV Empowered+ LR'
  );
  const [batteryPercent, setBatteryPercent] = useState(11);
  const [connectorType, setConnectorType] = useState<ConnectorType>(
    host.connectors[0] || 'Type 2 AC'
  );
  const [requestedKwh, setRequestedKwh] = useState(12);
  const [isEmergency, setIsEmergency] = useState(true);
  const [compatibilityAcknowledged, setCompatibilityAcknowledged] = useState(false);
  const [emergencyNote, setEmergencyNote] = useState(
    'Low battery SoC; requesting emergency top-up to reach destination safely.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const estimate = calculateChargingEstimate({
    requestedKwh,
    pricePerKwh: host.pricePerKwh,
    powerOutputKw: host.powerOutputKw,
    isEmergency,
    emergencyCalloutFee: host.emergencyCalloutFee,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!compatibilityAcknowledged) {
      setErrorMsg(
        'Please confirm the electrical compatibility and on-site earthing verification checkbox before requesting a charge.'
      );
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitBooking({
        hostId: host.id,
        vehicleModel,
        batteryPercent,
        connectorType,
        requestedKwh,
        isEmergency,
        compatibilityAcknowledged,
        emergencyNote,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send charging request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl my-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500">
              {host.isDemo ? 'Demo Listing' : 'Verified Host'} · {host.category} · {host.distanceKm} km away
            </div>
            <h2 id="booking-modal-title" className="text-lg font-bold text-slate-900 mt-0.5">
              Request Charging at {host.stationName}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Public Zone: {host.locality} (Exact address unlocks upon host acceptance)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close charging request modal"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="booking-vehicle" className="block text-xs font-semibold text-slate-700 mb-1">
                EV Make & Model
              </label>
              <input
                id="booking-vehicle"
                type="text"
                required
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="e.g. Tata Nexon EV / MG ZS EV"
              />
            </div>

            <div>
              <label htmlFor="booking-soc" className="block text-xs font-semibold text-slate-700 mb-1">
                Current Battery SoC (%)
              </label>
              <input
                id="booking-soc"
                type="number"
                min={1}
                max={95}
                required
                value={batteryPercent}
                onChange={(e) => setBatteryPercent(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="booking-connector" className="block text-xs font-semibold text-slate-700 mb-1">
                Compatible Connector
              </label>
              <select
                id="booking-connector"
                value={connectorType}
                onChange={(e) => setConnectorType(e.target.value as ConnectorType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {host.connectors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="booking-kwh" className="block text-xs font-semibold text-slate-700 mb-1">
                Requested Energy (kWh)
              </label>
              <input
                id="booking-kwh"
                type="number"
                min={2}
                max={80}
                required
                value={requestedKwh}
                onChange={(e) => setRequestedKwh(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Priority Emergency Dispatch Request
              </div>
              <div className="text-xs text-slate-600">
                Alerts host immediately for low-battery roadside assistance (+₹{host.emergencyCalloutFee} callout fee)
              </div>
            </div>
            <input
              id="booking-emergency-toggle"
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              aria-label="Priority Emergency Dispatch Request"
              className="w-4 h-4 accent-slate-900 rounded"
            />
          </div>

          <div>
            <label htmlFor="booking-note" className="block text-xs font-semibold text-slate-700 mb-1">
              Note to Host (Arrival ETA & Portable Cable Details)
            </label>
            <textarea
              id="booking-note"
              rows={2}
              value={emergencyNote}
              onChange={(e) => setEmergencyNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Cost & Duration Breakdown */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Energy Charge ({requestedKwh} kWh × ₹{host.pricePerKwh}/kWh)</span>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                ₹{estimate.energyCostInr}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Emergency Priority Callout Fee</span>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                ₹{estimate.calloutFeeInr}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Estimated Charging Duration ({host.powerOutputKw} kW output)</span>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                ~{estimate.estimatedDurationMinutes} mins
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
              <span>Total Estimated Session Cost</span>
              <span className="font-mono tabular-nums text-base">₹{estimate.totalCostInr}</span>
            </div>
          </div>

          {/* Mandatory Safety & Compatibility Verification Notice */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 leading-relaxed">
                <strong>Unverified Compatibility & Electrical Safety Notice:</strong> ChargeNear
                does not guarantee that any residential or peer socket is safe or compatible with
                your vehicle without physical inspection. Before energizing, verify that the host
                point has a functional 30mA RCCB breaker, proper earthing (Neutral-to-Earth &lt; 5V),
                and matches your onboard charger&apos;s amperage rating.
              </div>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={compatibilityAcknowledged}
                onChange={(e) => setCompatibilityAcknowledged(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-slate-900 rounded"
              />
              <span className="text-xs font-semibold text-amber-950">
                I understand that compatibility is not pre-guaranteed and I will verify physical
                connector match, cable rating, and earthing status on arrival.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              {submitting ? 'Sending Request...' : `Confirm Request (₹${estimate.totalCostInr})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
