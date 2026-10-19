import React, { useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import type {
  AvailabilityStatus,
  BookingStatus,
  ChargingBooking,
  ChargingHost,
} from '../utils/chargingLogic';

interface HostDashboardViewProps {
  hosts: ChargingHost[];
  bookings: ChargingBooking[];
  onUpdateHost: (
    hostId: string,
    updates: {
      availabilityStatus?: AvailabilityStatus;
      pricePerKwh?: number;
      emergencyCalloutFee?: number;
      operatingHours?: string;
    }
  ) => Promise<void>;
  onUpdateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  onNavigateToRegister: () => void;
}

export const HostDashboardView: React.FC<HostDashboardViewProps> = ({
  hosts,
  bookings,
  onUpdateHost,
  onUpdateBookingStatus,
  onNavigateToRegister,
}) => {
  // Show stations managed by host (or first 2 stations so demo flow works seamlessly)
  const managedHosts = hosts.slice(0, 3);
  const [editingHostId, setEditingHostId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(18);
  const [editHours, setEditHours] = useState<string>('06:00 - 23:00');
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const pendingBookings = bookings.filter((b) => b.status === 'Pending');
  const activeBookings = bookings.filter((b) => b.status === 'Accepted');
  const completedBookings = bookings.filter((b) => b.status === 'Completed');
  const totalRevenueInr = completedBookings.reduce((sum, b) => sum + b.estimatedCostInr, 0);
  const totalEnergyDeliveredKwh = completedBookings.reduce((sum, b) => sum + b.requestedKwh, 0);

  const startEdit = (host: ChargingHost) => {
    setEditingHostId(host.id);
    setEditRate(host.pricePerKwh);
    setEditHours(host.operatingHours);
  };

  const saveEdit = async (hostId: string) => {
    setBusyActionId(hostId);
    try {
      await onUpdateHost(hostId, {
        pricePerKwh: editRate,
        operatingHours: editHours,
      });
      setEditingHostId(null);
    } finally {
      setBusyActionId(null);
    }
  };

  const handleBookingTransition = async (bookingId: string, status: BookingStatus) => {
    setBusyActionId(bookingId);
    try {
      await onUpdateBookingStatus(bookingId, status);
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Host Operations & Dispatch Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage live charger availability, update ₹/kWh tariffs, and accept or complete incoming
            driver charging requests.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToRegister}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Register New Charging Point
        </button>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Pending Charging Requests</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {pendingBookings.length}
          </div>
          <div className="text-xs text-slate-600 mt-1">Awaiting host confirmation</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Active Sessions in Progress</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {activeBookings.length}
          </div>
          <div className="text-xs text-slate-600 mt-1">Exact address shared with driver</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Completed Sessions</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {completedBookings.length}
          </div>
          <div className="text-xs text-slate-600 font-mono tabular-nums mt-1">
            {totalEnergyDeliveredKwh} kWh delivered
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Cumulative Host Earnings</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{totalRevenueInr.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-600 mt-1">Includes emergency callout fees</div>
        </div>
      </div>

      {/* Incoming & Active Requests */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Incoming & Active Charging Requests
            </h2>
            <p className="text-xs text-slate-500">
              Accepting a request automatically unlocks your private street address for that driver.
            </p>
          </div>
        </div>

        {pendingBookings.length === 0 && activeBookings.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
            No pending or active charging requests at the moment.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {[...pendingBookings, ...activeBookings].map((booking) => (
              <div
                key={booking.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-900">{booking.status}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{booking.isEmergency ? 'Emergency Dispatch' : 'Standard Request'}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{booking.stationName}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {booking.driverName} ({booking.vehicleModel} · {booking.batteryPercent}% SoC)
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-700">
                    Connector: {booking.connectorType} · Energy: {booking.requestedKwh} kWh · Est.
                    Duration: ~{booking.estimatedDurationMinutes} mins · Est. Payout: ₹
                    {booking.estimatedCostInr}
                  </div>
                  {booking.emergencyNote && (
                    <p className="text-xs text-slate-600 italic">
                      &ldquo;{booking.emergencyNote}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {booking.status === 'Pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busyActionId === booking.id}
                        onClick={() => handleBookingTransition(booking.id, 'Accepted')}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept Request
                      </button>
                      <button
                        type="button"
                        disabled={busyActionId === booking.id}
                        onClick={() => handleBookingTransition(booking.id, 'Rejected')}
                        className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </>
                  )}

                  {booking.status === 'Accepted' && (
                    <>
                      <button
                        type="button"
                        disabled={busyActionId === booking.id}
                        onClick={() => handleBookingTransition(booking.id, 'Completed')}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark Session Completed
                      </button>
                      <button
                        type="button"
                        disabled={busyActionId === booking.id}
                        onClick={() => handleBookingTransition(booking.id, 'Cancelled')}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Station Availability & Tariff Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Managed Charging Stations & Live Availability
          </h2>
          <p className="text-xs text-slate-500">
            Toggle real-time availability or adjust ₹/kWh pricing and operating hours.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {managedHosts.map((host) => {
            const isEditing = editingHostId === host.id;
            return (
              <div key={host.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">
                      {host.isDemo ? 'Demo Listing' : 'Verified Host'} · {host.category} ·{' '}
                      {host.city}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{host.stationName}</div>
                    <div className="text-xs font-mono tabular-nums text-slate-600 mt-0.5">
                      {host.equipmentType} · {host.powerOutputKw} kW · ₹{host.pricePerKwh}/kWh ·
                      Hours: {host.operatingHours}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Segmented Availability Switcher */}
                    <div
                      className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                      role="group"
                      aria-label={`Availability for ${host.stationName}`}
                    >
                      {(['Available', 'Busy', 'Offline'] as AvailabilityStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => onUpdateHost(host.id, { availabilityStatus: st })}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            host.availabilityStatus === st
                              ? 'bg-white text-slate-900 shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => (isEditing ? setEditingHostId(null) : startEdit(host))}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {isEditing ? 'Close Editor' : 'Edit Rate & Hours'}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-end gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rate (₹/kWh)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editRate}
                        onChange={(e) => setEditRate(Number(e.target.value))}
                        className="w-28 px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Operating Hours
                      </label>
                      <input
                        type="text"
                        value={editHours}
                        onChange={(e) => setEditHours(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busyActionId === host.id}
                      onClick={() => saveEdit(host.id)}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed & Historical Bookings Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-700" />
          <h2 className="text-base font-bold text-slate-900">Session History Log</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Driver & Vehicle</th>
                <th className="py-2.5 px-4">Station</th>
                <th className="py-2.5 px-4">Connector</th>
                <th className="py-2.5 px-4 text-right">Energy</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 pl-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">{b.driverName}</div>
                    <div className="text-xs text-slate-500">{b.vehicleModel}</div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">{b.stationName}</td>
                  <td className="py-3 px-4 text-xs text-slate-700">{b.connectorType}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800">
                    {b.requestedKwh} kWh
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900">
                    ₹{b.estimatedCostInr}
                  </td>
                  <td className="py-3 pl-4 text-right text-xs font-semibold text-slate-700">
                    {b.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
