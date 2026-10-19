import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  LocateFixed,
  Lock,
  MapPin,
  Search,
  ShieldAlert,
  Star,
  Zap,
} from 'lucide-react';
import {
  filterAndSortHosts,
  type AppNotification,
  type AvailabilityStatus,
  type BookingStatus,
  type ChargingBooking,
  type ChargingHost,
  type ConnectorType,
  type HostApplication,
  type HostCategory,
  type HostReview,
  type HostWithDistance,
  type SafetyReport,
  type UserProfile,
  type UserRole,
} from './utils/chargingLogic';
import {
  INDIA_CITY_PRESETS,
  INITIAL_APPLICATIONS,
  INITIAL_BOOKINGS,
  INITIAL_HOSTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
  INITIAL_REVIEWS,
  INITIAL_USERS,
} from './data/indiaEvData';
import { InteractiveMap } from './components/InteractiveMap';
import { BookingModal } from './components/BookingModal';
import { HostRegistrationView } from './components/HostRegistrationView';
import { HostDashboardView } from './components/HostDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { EmergencyAndDeployView } from './components/EmergencyAndDeployView';
import { AuthModal } from './components/AuthModal';
import { ReviewModal } from './components/ReviewModal';
import { AiTutorView } from './components/AiTutorView';

type ActiveTab = 'driver' | 'tutor' | 'bookings' | 'register' | 'host' | 'admin' | 'emergency';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('driver');
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[0]);
  const [hosts, setHosts] = useState<ChargingHost[]>(INITIAL_HOSTS);
  const [bookings, setBookings] = useState<ChargingBooking[]>(INITIAL_BOOKINGS);
  const [applications, setApplications] = useState<HostApplication[]>(INITIAL_APPLICATIONS);
  const [reviews, setReviews] = useState<HostReview[]>(INITIAL_REVIEWS);
  const [reports, setReports] = useState<SafetyReport[]>(INITIAL_REPORTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  // Location & Filters
  const [driverLat, setDriverLat] = useState<number>(12.9716);
  const [driverLng, setDriverLng] = useState<number>(77.5946);
  const [driverLocationLabel, setDriverLocationLabel] = useState<string>(
    'MG Road, Bengaluru (12.9716, 77.5946)'
  );
  const [manualLocationInput, setManualLocationInput] = useState<string>('');
  const [locatingGps, setLocatingGps] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<HostCategory | 'ALL'>('ALL');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [maxPricePerKwh, setMaxPricePerKwh] = useState<number>(40);
  const [includeDemo, setIncludeDemo] = useState<boolean>(true);

  // Modals & Drawers
  const [selectedHostId, setSelectedHostId] = useState<string | null>(INITIAL_HOSTS[0]?.id || null);
  const [bookingModalHost, setBookingModalHost] = useState<HostWithDistance | null>(null);
  const [reviewModalHost, setReviewModalHost] = useState<ChargingHost | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const fetchBackendState = useCallback(async (user: UserProfile) => {
    try {
      const res = await fetch('/api/state', {
        headers: {
          'x-user-id': user.id,
          'x-user-role': user.role,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.hosts)) setHosts(data.hosts);
      if (Array.isArray(data.bookings)) setBookings(data.bookings);
      if (Array.isArray(data.hostApplications)) setApplications(data.hostApplications);
      if (Array.isArray(data.reviews)) setReviews(data.reviews);
      if (Array.isArray(data.reports)) setReports(data.reports);
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
    } catch {
      // Fallback to local state if offline
    }
  }, []);

  useEffect(() => {
    fetchBackendState(currentUser);
    const interval = setInterval(() => {
      fetchBackendState(currentUser);
    }, 8000);
    return () => clearInterval(interval);
  }, [currentUser, fetchBackendState]);

  const filteredHosts = useMemo(
    () =>
      filterAndSortHosts(hosts, {
        searchQuery,
        city: selectedCity,
        connector: selectedConnector,
        category: selectedCategory,
        availableOnly,
        maxPricePerKwh,
        includeDemo,
        driverLat,
        driverLng,
      }),
    [
      hosts,
      searchQuery,
      selectedCity,
      selectedConnector,
      selectedCategory,
      availableOnly,
      maxPricePerKwh,
      includeDemo,
      driverLat,
      driverLng,
    ]
  );

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const availableHostsCount = useMemo(
    () => hosts.filter((h) => h.availabilityStatus === 'Available').length,
    [hosts]
  );

  // Share browser GPS location
  const handleShareGpsLocation = () => {
    if (!navigator.geolocation) {
      setBannerNotice('Browser geolocation is not supported. Use city presets or manual search.');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        setDriverLat(lat);
        setDriverLng(lng);
        setDriverLocationLabel(`Live GPS Coordinates (${lat}, ${lng})`);
        setLocatingGps(false);
        setBannerNotice(`Updated driver location to GPS coordinates (${lat}, ${lng}).`);
      },
      () => {
        setLocatingGps(false);
        setDriverLat(12.9716);
        setDriverLng(77.5946);
        setDriverLocationLabel('Bengaluru Central (GPS Fallback: 12.9716, 77.5946)');
        setBannerNotice(
          'Location permission unavailable in preview frame; centered on Bengaluru (12.9716, 77.5946).'
        );
      },
      { timeout: 5000 }
    );
  };

  // Manual location entry (city name or "lat, lng")
  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = manualLocationInput.trim();
    if (!raw) return;

    const coordMatch = raw.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = Number(coordMatch[1]);
      const lng = Number(coordMatch[3]);
      setDriverLat(lat);
      setDriverLng(lng);
      setDriverLocationLabel(`Custom Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setBannerNotice(`Location set to custom coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}).`);
      return;
    }

    const matchedCity = INDIA_CITY_PRESETS.find((c) =>
      raw.toLowerCase().includes(c.name.toLowerCase())
    );
    if (matchedCity) {
      setDriverLat(matchedCity.lat);
      setDriverLng(matchedCity.lng);
      setSelectedCity(matchedCity.name);
      setDriverLocationLabel(`${matchedCity.name}, ${matchedCity.state}`);
      setBannerNotice(`Centered map on ${matchedCity.name} (${matchedCity.lat}, ${matchedCity.lng}).`);
    } else {
      setSearchQuery(raw);
      setDriverLocationLabel(`${raw} (Locality Search)`);
      setBannerNotice(`Filtering nearby charging hosts matching "${raw}".`);
    }
  };

  const handleCityPresetSelect = (cityName: string) => {
    setSelectedCity(cityName);
    if (cityName === 'ALL') return;
    const preset = INDIA_CITY_PRESETS.find((c) => c.name === cityName);
    if (preset) {
      setDriverLat(preset.lat);
      setDriverLng(preset.lng);
      setDriverLocationLabel(`${preset.name}, ${preset.state}`);
    }
  };

  // API Handlers
  const handleCreateBooking = async (payload: {
    hostId: string;
    vehicleModel: string;
    batteryPercent: number;
    connectorType: ConnectorType;
    requestedKwh: number;
    isEmergency: boolean;
    compatibilityAcknowledged: boolean;
    emergencyNote: string;
  }) => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not create charging request.');
    }
    await fetchBackendState(currentUser);
    setBannerNotice(
      `Charging request sent to ${data.booking.stationName} (Status: Pending · Est. ₹${data.booking.estimatedCostInr}).`
    );
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: BookingStatus) => {
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not update booking status.');
    }
    await fetchBackendState(currentUser);
    setBannerNotice(`Booking status updated to "${status}".`);
  };

  const handleUpdateHost = async (
    hostId: string,
    updates: {
      availabilityStatus?: AvailabilityStatus;
      pricePerKwh?: number;
      emergencyCalloutFee?: number;
      operatingHours?: string;
      isVerified?: boolean;
    }
  ) => {
    const res = await fetch(`/api/hosts/${hostId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await fetchBackendState(currentUser);
      setBannerNotice('Charging station settings updated.');
    }
  };

  const handleRemoveHost = async (hostId: string) => {
    const res = await fetch(`/api/hosts/${hostId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
    });
    if (res.ok) {
      await fetchBackendState(currentUser);
      setBannerNotice('Listing removed from ChargeNear directory.');
    }
  };

  const handleSubmitApplication = async (payload: {
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
  }) => {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit application.');
    }
    await fetchBackendState(currentUser);
  };

  const handleReviewApplication = async (
    appId: string,
    status: 'Approved' | 'Rejected',
    adminNotes?: string
  ) => {
    const res = await fetch(`/api/applications/${appId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
      body: JSON.stringify({ status, adminNotes }),
    });
    if (res.ok) {
      await fetchBackendState(currentUser);
      setBannerNotice(
        status === 'Approved'
          ? 'Host application approved and published to the live charging map.'
          : 'Host application marked as Rejected.'
      );
    }
  };

  const handleSubmitReview = async (payload: {
    hostId: string;
    rating: number;
    comment: string;
    connectorUsed: ConnectorType;
    vehicleModel: string;
  }) => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit review.');
    }
    await fetchBackendState(currentUser);
    setBannerNotice('Thank you! Your charging & earthing review has been posted.');
  };

  const handleSubmitReport = async (payload: {
    targetHostId?: string;
    targetStationName: string;
    reason: SafetyReport['reason'];
    details: string;
  }) => {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit report.');
    }
    await fetchBackendState(currentUser);
  };

  const handleUpdateReportStatus = async (
    reportId: string,
    status: 'Resolved' | 'Dismissed'
  ) => {
    const res = await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await fetchBackendState(currentUser);
      setBannerNotice(`Safety report marked as ${status}.`);
    }
  };

  const handleMarkNotificationsRead = async () => {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: {
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
    });
    await fetchBackendState(currentUser);
  };

  const handleGoogleSignIn = async (payload: {
    name: string;
    email: string;
    role: UserRole;
    phone: string;
    city: string;
    vehicleModel: string;
  }) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      setCurrentUser(data.user);
      setBannerNotice(`Signed in as ${data.user.name} (${data.user.role.toUpperCase()}).`);
    }
  };

  const switchRoleQuickly = (role: UserRole) => {
    const preset = INITIAL_USERS.find((u) => u.role === role) || INITIAL_USERS[0];
    setCurrentUser(preset);
    if (role === 'host') setActiveTab('host');
    if (role === 'admin') setActiveTab('admin');
    if (role === 'driver') setActiveTab('driver');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('driver');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          ChargeNear
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#find-chargers"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('driver');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'driver' ? 'text-slate-900 font-semibold underline underline-offset-8' : ''
            }`}
          >
            Find Chargers
          </a>
          <a
            href="#ai-tutor"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('tutor');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'tutor' ? 'text-slate-900 font-semibold underline underline-offset-8' : ''
            }`}
          >
            AI Help Tutor
          </a>
          <a
            href="#my-bookings"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('bookings');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'bookings' ? 'text-slate-900 font-semibold underline underline-offset-8' : ''
            }`}
          >
            My Bookings
          </a>
          <a
            href="#become-host"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('register');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'register' ? 'text-slate-900 font-semibold underline underline-offset-8' : ''
            }`}
          >
            Become Host
          </a>
          <a
            href="#host-portal"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('host');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'host' ? 'text-slate-900 font-semibold underline underline-offset-8' : ''
            }`}
          >
            Host Portal
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {currentUser.name.split(' ')[0]} ({currentUser.role.toUpperCase()})
          </button>
        </div>
      </header>

      {/* Secondary Workspace Bar: Mobile Nav, Admin & Emergency Access, Role Switcher & Live Notifications */}
      <div className="bg-slate-100/80 border-b border-slate-200 px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Desktop Context Summary / Mobile Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-900">India Peer-to-Peer EV Grid</span>
              <span aria-hidden="true">·</span>
              <span>{availableHostsCount} of {hosts.length} Stations Available</span>
              <span aria-hidden="true">·</span>
              <span>{bookings.length} Active &amp; Past Bookings</span>
            </div>

            <div className="flex md:hidden flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'driver', label: 'Find Chargers' },
                  { id: 'tutor', label: 'AI Help Tutor' },
                  { id: 'bookings', label: `Bookings (${bookings.length})` },
                  { id: 'register', label: 'Become Host' },
                  { id: 'host', label: 'Host Portal' },
                ] as { id: ActiveTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-xs font-semibold border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Workspace Controls: Admin Console + Emergency Guide + Role Switcher + Notifications */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Admin Console
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('emergency')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'emergency'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Emergency &amp; Safety
            </button>

            <div className="hidden sm:flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg text-xs">
              {(['driver', 'host', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => switchRoleQuickly(r)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                    currentUser.role === r
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Role: {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Toggle notifications panel"
                className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Alerts ({unreadNotifCount})</span>
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900">
                      Real-Time Dispatch Notifications
                    </span>
                    <button
                      type="button"
                      onClick={handleMarkNotificationsRead}
                      className="text-xs text-slate-600 hover:text-slate-900 underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div key={n.id} className="py-2.5 first:pt-0 last:pb-0 space-y-0.5">
                          <div className="text-xs font-semibold text-slate-900">
                            {!n.read ? '• ' : ''}
                            {n.title}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation / Action Feedback Banner */}
      {bannerNotice && (
        <div className="bg-slate-900 text-white px-6 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{bannerNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerNotice(null)}
              className="text-slate-300 hover:text-white underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'driver' && (
          <div className="space-y-6">
            {/* Clear Arrival Hero & 3-Step Visual Guide */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left 7 Columns: Value Proposition & Primary Actions */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-emerald-700">
                      India Emergency EV Home-Charging &amp; Peer Assistance Network
                    </div>
                    <h1
                      className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
                      style={{ textWrap: 'balance' }}
                    >
                      Find Verified Home &amp; Garage EV Chargers Near You in Minutes
                    </h1>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                      Running low on battery between public stations? Connect with verified
                      homeowners, EV-compatible shops, and 24x7 garages across Bengaluru, Mumbai,
                      Delhi NCR, Hyderabad, Pune, and Chennai.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleShareGpsLocation}
                      disabled={locatingGps}
                      className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                    >
                      <LocateFixed className="w-4 h-4" />
                      {locatingGps ? 'Locating GPS...' : 'Share My GPS Location'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('tutor')}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-700" />
                      Open AI EV Help Tutor
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('register')}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Register as a Host
                    </button>
                  </div>
                </div>

                {/* Right 5 Columns: Crisp Interactive Grid & Safety Overview Panel */}
                <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-400">Live Network Snapshot</div>
                      <div className="text-base font-bold text-white mt-0.5">
                        6 Indian Metro Regions · Privacy-First Dispatch
                      </div>
                    </div>
                    <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="p-3 bg-slate-800/90 rounded-lg">
                      <div className="text-[11px] text-slate-400">Available Now</div>
                      <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                        {availableHostsCount} Hosts
                      </div>
                    </div>
                    <div className="p-3 bg-slate-800/90 rounded-lg">
                      <div className="text-[11px] text-slate-400">Energy Tariff</div>
                      <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                        ₹15–23
                      </div>
                    </div>
                    <div className="p-3 bg-slate-800/90 rounded-lg">
                      <div className="text-[11px] text-slate-400">Privacy Zone</div>
                      <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                        ~350m
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                    <span>
                      Unsure which connector or earthing check your EV needs?
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tutor')}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold underline whitespace-nowrap shrink-0"
                    >
                      Ask AI Tutor →
                    </button>
                  </div>
                </div>
              </div>

              {/* 3-Step How ChargeNear Works Strip */}
              <div className="pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">
                    01. Share Location &amp; Filter Connectors
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Use GPS or pick your city to view nearby Home Hosts, EV Shops, and Garages
                    compatible with Type 2 AC, CCS2 DC, or 15A sockets.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-slate-900">
                    02. Request Charge &amp; Unlock Private Address
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Exact home addresses are hidden on the public map (~350m privacy zone) and
                    unlock automatically once the host accepts your booking.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-slate-900">
                    03. Verify Earthing &amp; Charge Safely
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Confirm physical connector fit, 30mA RCCB protection, and green earthing LED
                    status on arrival—or consult our built-in AI Help Tutor anytime.
                  </p>
                </div>
              </div>
            </section>

            {/* Transparency & Safety Notice Strip */}
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <strong>Demo Data &amp; Safety Transparency:</strong> Pre-populated stations are
                  explicitly labelled <strong>[DEMO]</strong> and represent sample Indian
                  neighborhoods. Never energize a charger without verifying physical connector match
                  and earthing (&lt; 5V N-E).
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('emergency')}
                className="px-3.5 py-1.5 text-xs font-semibold text-amber-950 bg-amber-200/70 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                India EV Helplines (1033 / 112)
              </button>
            </div>

            {/* Driver Location & Filter Control Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">Current Driver Reference Location</div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-700 shrink-0" />
                    <span>{driverLocationLabel}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Quick City Buttons */}
                  <div className="hidden xl:flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {INDIA_CITY_PRESETS.slice(0, 4).map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleCityPresetSelect(c.name)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          selectedCity === c.name
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleManualLocationSubmit} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={manualLocationInput}
                      onChange={(e) => setManualLocationInput(e.target.value)}
                      placeholder="Enter city, area, or lat, lng..."
                      aria-label="Enter location manually"
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-48 sm:w-56"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0"
                    >
                      Set Location
                    </button>
                  </form>
                </div>
              </div>

              {/* Search & Multi-Facet Filter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label htmlFor="filter-search" className="block text-xs font-semibold text-slate-700 mb-1">
                    Search Locality, Station or Equipment
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="filter-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Indiranagar, Bandra, CCS2, 15A..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="filter-city" className="block text-xs font-semibold text-slate-700 mb-1">
                    Metro City
                  </label>
                  <select
                    id="filter-city"
                    value={selectedCity}
                    onChange={(e) => handleCityPresetSelect(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">All India Cities</option>
                    {INDIA_CITY_PRESETS.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="filter-connector" className="block text-xs font-semibold text-slate-700 mb-1">
                    Connector Type
                  </label>
                  <select
                    id="filter-connector"
                    value={selectedConnector}
                    onChange={(e) => setSelectedConnector(e.target.value as ConnectorType | 'ALL')}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">All Connectors</option>
                    <option value="Type 2 AC">Type 2 AC</option>
                    <option value="CCS2 DC">CCS2 DC</option>
                    <option value="15A 3-Pin Socket">15A 3-Pin Socket</option>
                    <option value="Bharat AC-001">Bharat AC-001</option>
                    <option value="Bharat DC-001">Bharat DC-001</option>
                    <option value="CHAdeMO">CHAdeMO</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="filter-category" className="block text-xs font-semibold text-slate-700 mb-1">
                    Provider Category
                  </label>
                  <select
                    id="filter-category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as HostCategory | 'ALL')}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Home Host">Home Host</option>
                    <option value="EV Shop">EV Shop</option>
                    <option value="Garage">Garage</option>
                    <option value="Verified Provider">Verified Provider</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="filter-price" className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Rate: <span className="font-mono tabular-nums">₹{maxPricePerKwh}/kWh</span>
                  </label>
                  <input
                    id="filter-price"
                    type="range"
                    min={12}
                    max={40}
                    value={maxPricePerKwh}
                    onChange={(e) => setMaxPricePerKwh(Number(e.target.value))}
                    className="w-full accent-slate-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availableOnly}
                      onChange={(e) => setAvailableOnly(e.target.checked)}
                      className="w-3.5 h-3.5 accent-slate-900 rounded"
                    />
                    <span className="font-medium text-slate-700">Show Available Now Only</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDemo}
                      onChange={(e) => setIncludeDemo(e.target.checked)}
                      className="w-3.5 h-3.5 accent-slate-900 rounded"
                    />
                    <span className="font-medium text-slate-700">
                      Include Labelled Demo Data ({hosts.filter((h) => h.isDemo).length} stations)
                    </span>
                  </label>
                </div>

                <div className="text-slate-500 font-mono tabular-nums">
                  Showing {filteredHosts.length} of {hosts.length} hosts sorted by proximity
                </div>
              </div>
            </div>

            {/* 2-Column Split: Interactive Nearby Map + Host Cards List */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-3">
                <InteractiveMap
                  hosts={filteredHosts}
                  driverLat={driverLat}
                  driverLng={driverLng}
                  driverLabel={driverLocationLabel}
                  selectedHostId={selectedHostId}
                  onSelectHost={(host) => setSelectedHostId(host.id)}
                  onRequestCharge={(host) => setBookingModalHost(host)}
                />
              </div>

              <div className="lg:col-span-5 space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {filteredHosts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                    <div className="text-sm font-bold text-slate-900">
                      No Charging Hosts Match Current Filters
                    </div>
                    <p className="text-xs text-slate-600">
                      Try enabling Labelled Demo Data, broadening your connector filter, or
                      selecting All India Cities.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCity('ALL');
                        setSelectedConnector('ALL');
                        setSelectedCategory('ALL');
                        setAvailableOnly(false);
                        setMaxPricePerKwh(40);
                        setIncludeDemo(true);
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  filteredHosts.map((host) => {
                    const isSelected = host.id === selectedHostId;
                    return (
                      <div
                        key={host.id}
                        onClick={() => setSelectedHostId(host.id)}
                        className={`bg-white rounded-xl p-4 border transition-colors cursor-pointer space-y-2.5 ${
                          isSelected
                            ? 'border-slate-900 ring-1 ring-slate-900'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <div>
                            <span className="font-semibold text-slate-800">
                              {host.isDemo ? 'Demo Data' : 'Community Host'}
                            </span>
                            <span aria-hidden="true"> · </span>
                            <span>{host.category}</span>
                            <span aria-hidden="true"> · </span>
                            <span
                              className={
                                host.availabilityStatus === 'Available'
                                  ? 'text-emerald-700 font-semibold'
                                  : host.availabilityStatus === 'Busy'
                                  ? 'text-amber-700 font-semibold'
                                  : 'text-slate-500 font-semibold'
                              }
                            >
                              {host.availabilityStatus}
                            </span>
                          </div>
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            {host.distanceKm} km
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900">{host.stationName}</h3>
                          <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{host.locality}</span>
                          </p>
                          {host.exactAddress && (
                            <p className="text-xs text-emerald-800 font-medium mt-1">
                              Unlocked Address: {host.exactAddress}
                            </p>
                          )}
                        </div>

                        <div className="text-xs font-mono tabular-nums text-slate-800">
                          ₹{host.pricePerKwh}/kWh · {host.powerOutputKw} kW · Callout ₹
                          {host.emergencyCalloutFee} · {host.operatingHours}
                        </div>

                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">Connectors:</span>{' '}
                          {host.connectors.join(' · ')}
                        </div>

                        <div className="text-xs text-slate-500">
                          Equipment: {host.equipmentType} · Earthing:{' '}
                          {host.earthingVerified ? 'Host Declared' : 'Unverified'} · Rating:{' '}
                          <span className="font-mono tabular-nums text-slate-800 font-semibold">
                            {host.rating}
                          </span>{' '}
                          ({host.reviewCount})
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewModalHost(host);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                          >
                            <Star className="w-3.5 h-3.5" />
                            Reviews ({host.reviewCount})
                          </button>

                          <button
                            type="button"
                            disabled={host.availabilityStatus === 'Offline'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setBookingModalHost(host);
                            }}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            Request Charging
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tutor' && (
          <AiTutorView
            hosts={hosts}
            userCity={currentUser.city}
            userVehicle={currentUser.vehicleModel}
            onNavigateToMap={() => setActiveTab('driver')}
            onNavigateToEmergency={() => setActiveTab('emergency')}
          />
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Driver Charging Requests &amp; Session History
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Track real-time confirmation status, view unlocked host street addresses once
                  accepted, or cancel pending requests.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('driver')}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
              >
                Find Nearby Chargers
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                <div className="text-sm font-bold text-slate-900">No Charging Requests Yet</div>
                <p className="text-xs text-slate-600">
                  Select a charging host on the map to request emergency or scheduled charging.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const hostObj = hosts.find((h) => h.id === b.hostId) || null;
                  return (
                    <div
                      key={b.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-900">{b.status}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{b.city}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{b.isEmergency ? 'Emergency Request' : 'Standard Booking'}</span>
                        </div>
                        <div className="text-base font-bold text-slate-900">{b.stationName}</div>
                        <div className="text-xs font-mono tabular-nums text-slate-700">
                          Vehicle: {b.vehicleModel} ({b.batteryPercent}% SoC) · Connector:{' '}
                          {b.connectorType} · {b.requestedKwh} kWh (~{b.estimatedDurationMinutes}{' '}
                          mins) · Est. Cost: ₹{b.estimatedCostInr}
                        </div>
                        {b.exactAddressRevealed ? (
                          <div className="text-xs text-emerald-800 font-semibold">
                            Confirmed Host Street Address: {b.exactAddressRevealed}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            Public Zone: {b.locality} (Exact street address unlocks when host
                            accepts)
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {(b.status === 'Pending' || b.status === 'Accepted') && (
                          <button
                            type="button"
                            onClick={() => handleUpdateBookingStatus(b.id, 'Cancelled')}
                            className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg whitespace-nowrap shrink-0"
                          >
                            Cancel Request
                          </button>
                        )}
                        {hostObj && (
                          <button
                            type="button"
                            onClick={() => setReviewModalHost(hostObj)}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0"
                          >
                            Leave Review
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'register' && (
          <HostRegistrationView
            currentUser={currentUser}
            applications={applications}
            onSubmitApplication={handleSubmitApplication}
          />
        )}

        {activeTab === 'host' && (
          <HostDashboardView
            hosts={hosts}
            bookings={bookings}
            onUpdateHost={handleUpdateHost}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onNavigateToRegister={() => setActiveTab('register')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardView
            applications={applications}
            hosts={hosts}
            reports={reports}
            onReviewApplication={handleReviewApplication}
            onToggleHostVerify={(hostId, isVerified) =>
              handleUpdateHost(hostId, { isVerified })
            }
            onRemoveHost={handleRemoveHost}
            onUpdateReportStatus={handleUpdateReportStatus}
          />
        )}

        {activeTab === 'emergency' && (
          <EmergencyAndDeployView hosts={hosts} onSubmitReport={handleSubmitReport} />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              ChargeNear India — Peer-to-peer emergency EV charging network. Always verify physical
              earthing and connector compatibility before charging.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('tutor')}
              className="hover:text-slate-900 underline"
            >
              AI EV Help Tutor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('emergency')}
              className="hover:text-slate-900 underline"
            >
              Emergency Helplines (1033 / 112)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('emergency')}
              className="hover:text-slate-900 underline"
            >
              Deployment &amp; Security Guide
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BookingModal
        host={bookingModalHost}
        defaultVehicle={currentUser.vehicleModel}
        onClose={() => setBookingModalHost(null)}
        onSubmitBooking={handleCreateBooking}
      />

      <ReviewModal
        host={reviewModalHost}
        reviews={reviews}
        defaultVehicle={currentUser.vehicleModel}
        onClose={() => setReviewModalHost(null)}
        onSubmitReview={handleSubmitReview}
      />

      <AuthModal
        isOpen={authModalOpen}
        currentUser={currentUser}
        onClose={() => setAuthModalOpen(false)}
        onSelectPresetUser={(u) => {
          setCurrentUser(u);
          setBannerNotice(`Switched active account to ${u.name} (${u.role.toUpperCase()}).`);
        }}
        onGoogleSignIn={handleGoogleSignIn}
      />
    </div>
  );
}
