import React, { useState } from 'react';
import { Check, ShieldCheck, Trash2, X } from 'lucide-react';
import type {
  ChargingHost,
  HostApplication,
  SafetyReport,
} from '../utils/chargingLogic';

interface AdminDashboardViewProps {
  applications: HostApplication[];
  hosts: ChargingHost[];
  reports: SafetyReport[];
  onReviewApplication: (
    appId: string,
    status: 'Approved' | 'Rejected',
    adminNotes?: string
  ) => Promise<void>;
  onToggleHostVerify: (hostId: string, isVerified: boolean) => Promise<void>;
  onRemoveHost: (hostId: string) => Promise<void>;
  onUpdateReportStatus: (reportId: string, status: 'Resolved' | 'Dismissed') => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  applications,
  hosts,
  reports,
  onReviewApplication,
  onToggleHostVerify,
  onRemoveHost,
  onUpdateReportStatus,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingApps = applications.filter((a) => a.status === 'Pending Review');
  const openReports = reports.filter((r) => r.status === 'Open');

  const handleAppAction = async (appId: string, status: 'Approved' | 'Rejected') => {
    setBusyId(appId);
    try {
      await onReviewApplication(
        appId,
        status,
        status === 'Approved'
          ? 'Verified earthing declaration and published to ChargeNear network.'
          : 'Rejected due to incomplete safety verification.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (hostId: string) => {
    setBusyId(hostId);
    try {
      await onRemoveHost(hostId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Admin Verification, Trust & Fraud Control Console
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review pending homeowner charging applications, audit earthing declarations, resolve
          community safety reports, and remove fraudulent listings.
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Pending Host Applications</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {pendingApps.length}
          </div>
          <div className="text-xs text-slate-600 mt-1">Awaiting safety review</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Active Charging Hosts</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {hosts.length}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {hosts.filter((h) => h.isVerified).length} verified providers
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Open Safety & Fraud Reports</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {openReports.length}
          </div>
          <div className="text-xs text-slate-600 mt-1">Requires admin inspection</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Community-Submitted Hosts</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {hosts.filter((h) => !h.isDemo).length}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {hosts.filter((h) => h.isDemo).length} labelled demo stations
          </div>
        </div>
      </div>

      {/* Host Applications Review Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Host Registration Applications ({applications.length})
          </h2>
          <p className="text-xs text-slate-500">
            Approving an application immediately publishes the station to the live map with a ~350m
            privacy zone.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            No host applications in queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {applications.map((app) => (
              <div
                key={app.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-900">{app.status}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{app.category}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{app.city}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {app.stationName} — {app.applicantName} ({app.phone})
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Private Inspection Address:</strong> {app.exactAddress}
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-700">
                    Equipment: {app.equipmentType} ({app.powerOutputKw} kW) · ₹{app.pricePerKwh}/kWh
                    · Connectors: {app.connectors.join(', ')}
                  </div>
                  <div className="text-xs text-slate-600">
                    Earthing Confirmed: {app.earthingConfirmed ? 'Yes' : 'No'} · 30mA RCCB:{' '}
                    {app.rccbConfirmed ? 'Yes' : 'No'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {app.status === 'Pending Review' ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === app.id}
                        onClick={() => handleAppAction(app.id, 'Approved')}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve & Verify
                      </button>
                      <button
                        type="button"
                        disabled={busyId === app.id}
                        onClick={() => handleAppAction(app.id, 'Rejected')}
                        className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-slate-600">
                      Reviewed ({app.status})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Safety & Fraud Reports */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Safety, Earthing & Fraud Reports ({reports.length})
          </h2>
          <p className="text-xs text-slate-500">
            Investigate driver feedback regarding earthing faults, inaccurate listings, or support
            requests.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">{rep.status}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{rep.reason}</span>
                  <span aria-hidden="true"> · </span>
                  <span>Reported by {rep.reporterName}</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{rep.targetStationName}</div>
                <p className="text-xs text-slate-700">{rep.details}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {rep.status === 'Open' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateReportStatus(rep.id, 'Resolved')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Mark Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateReportStatus(rep.id, 'Dismissed')}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">{rep.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Listings Directory & Fraud Removal */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Active Charging Directory & Fraud Removal ({hosts.length})
          </h2>
          <p className="text-xs text-slate-500">
            Verify providers or permanently remove fraudulent or unsafe charging listings.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Station & Host</th>
                <th className="py-2.5 px-4">City & Category</th>
                <th className="py-2.5 px-4">Data Source</th>
                <th className="py-2.5 px-4">Verification</th>
                <th className="py-2.5 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {hosts.map((host) => (
                <tr key={host.id} className="hover:bg-slate-50/80">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900">{host.stationName}</div>
                    <div className="text-xs text-slate-500">
                      {host.ownerName} · {host.equipmentType}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">
                    {host.city} · {host.category}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {host.isDemo ? 'Demo Data' : 'Live Community'}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span className="font-semibold text-slate-900">
                      {host.isVerified ? 'Verified Provider' : 'Unverified'}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleHostVerify(host.id, !host.isVerified)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {host.isVerified ? 'Revoke Verify' : 'Verify Host'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === host.id}
                        onClick={() => handleRemove(host.id)}
                        aria-label={`Remove listing ${host.stationName}`}
                        className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Listing
                      </button>
                    </div>
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
