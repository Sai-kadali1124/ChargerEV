import React, { useState } from 'react';
import { ShieldCheck, UserCheck, X } from 'lucide-react';
import type { UserProfile, UserRole } from '../utils/chargingLogic';
import { INDIA_CITY_PRESETS, INITIAL_USERS } from '../data/indiaEvData';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onSelectPresetUser: (user: UserProfile) => void;
  onGoogleSignIn: (payload: {
    name: string;
    email: string;
    role: UserRole;
    phone: string;
    city: string;
    vehicleModel: string;
  }) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSelectPresetUser,
  onGoogleSignIn,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [role, setRole] = useState<UserRole>(currentUser.role);
  const [phone, setPhone] = useState(currentUser.phone);
  const [city, setCity] = useState(currentUser.city);
  const [vehicleModel, setVehicleModel] = useState(
    currentUser.vehicleModel || 'Tata Nexon EV Empowered+ LR'
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onGoogleSignIn({
        name,
        email,
        role,
        phone,
        city,
        vehicleModel,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl my-8 space-y-5">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-slate-900">
              Google Account Authentication & Role Access
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Sign in with your Google profile or switch between verified Driver, Host, and Admin
              accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instant Verified Profile Switcher */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">
            Quick Switch Verified Accounts (Driver · Host · Admin)
          </div>
          <div className="grid grid-cols-1 gap-2">
            {INITIAL_USERS.map((u) => {
              const active = u.id === currentUser.id && u.role === currentUser.role;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onSelectPresetUser(u);
                    onClose();
                  }}
                  className={`p-3 rounded-lg border text-left transition-colors flex items-center justify-between gap-3 ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">
                      {u.name} · <span className="uppercase">{u.role}</span>
                    </div>
                    <div className={`text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                      {u.email} · {u.city}
                    </div>
                  </div>
                  <UserCheck className="w-4 h-4 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 border-t border-slate-200 space-y-3">
          <div className="text-xs font-semibold text-slate-700">
            Or Sign In / Customize Google Profile
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1">
                Google Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="auth-role" className="block text-xs font-medium text-slate-700 mb-1">
                Account Role
              </label>
              <select
                id="auth-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="driver">Driver</option>
                <option value="host">Charging Host</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label htmlFor="auth-city" className="block text-xs font-medium text-slate-700 mb-1">
                City
              </label>
              <select
                id="auth-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {INDIA_CITY_PRESETS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="auth-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Mobile
              </label>
              <input
                id="auth-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-vehicle" className="block text-xs font-medium text-slate-700 mb-1">
              Primary EV Model
            </label>
            <input
              id="auth-vehicle"
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {submitting ? 'Signing In...' : 'Continue with Google Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
