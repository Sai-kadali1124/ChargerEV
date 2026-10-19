export type UserRole = 'driver' | 'host' | 'admin';

export type HostCategory = 'Home Host' | 'EV Shop' | 'Garage' | 'Verified Provider';

export type ConnectorType =
  | 'Type 2 AC'
  | 'CCS2 DC'
  | 'Bharat AC-001'
  | 'Bharat DC-001'
  | '15A 3-Pin Socket'
  | 'CHAdeMO';

export type AvailabilityStatus = 'Available' | 'Busy' | 'Offline';

export type BookingStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Completed' | 'Cancelled';

export type ApplicationStatus = 'Pending Review' | 'Approved' | 'Rejected';

export interface ChargingHost {
  id: string;
  ownerId: string;
  ownerName: string;
  stationName: string;
  category: HostCategory;
  city: string;
  locality: string; // Public general location (e.g., "Indiranagar 100ft Rd Zone")
  exactAddress?: string; // Private! Stripped by backend unless booking is Accepted or viewed by owner/admin
  publicLat: number; // Obfuscated coordinate for public map (~350m offset)
  publicLng: number;
  privacyRadiusMeters: number;
  equipmentType: string;
  powerOutputKw: number;
  connectors: ConnectorType[];
  pricePerKwh: number; // in INR (₹)
  emergencyCalloutFee: number; // in INR (₹)
  availableDays: string[];
  operatingHours: string;
  availabilityStatus: AvailabilityStatus;
  isVerified: boolean;
  isDemo: boolean; // Explicit label so demo data is never presented as real unlabelled data
  earthingVerified: boolean;
  rccbProtected: boolean;
  rating: number;
  reviewCount: number;
  notes: string;
  createdAt: string;
}

export interface ChargingBooking {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  hostId: string;
  hostOwnerId: string;
  stationName: string;
  locality: string;
  city: string;
  exactAddressRevealed?: string; // Populated only when status === 'Accepted' or 'Completed'
  vehicleModel: string;
  batteryPercent: number;
  connectorType: ConnectorType;
  requestedKwh: number;
  estimatedDurationMinutes: number;
  estimatedCostInr: number;
  isEmergency: boolean;
  compatibilityAcknowledged: boolean;
  status: BookingStatus;
  emergencyNote: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  reviewed?: boolean;
}

export interface HostApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  phone: string;
  stationName: string;
  category: HostCategory;
  city: string;
  locality: string;
  exactAddress: string;
  publicLat: number;
  publicLng: number;
  equipmentType: string;
  powerOutputKw: number;
  connectors: ConnectorType[];
  pricePerKwh: number;
  emergencyCalloutFee: number;
  availableDays: string[];
  operatingHours: string;
  earthingConfirmed: boolean;
  rccbConfirmed: boolean;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export interface HostReview {
  id: string;
  hostId: string;
  bookingId?: string;
  authorId: string;
  authorName: string;
  authorRole: 'driver' | 'host';
  rating: number;
  comment: string;
  connectorUsed: ConnectorType;
  vehicleModel: string;
  createdAt: string;
}

export interface SafetyReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetHostId?: string;
  targetStationName: string;
  reason: 'Fraudulent Listing' | 'Unsafe Wiring / No Earthing' | 'Address Mismatch' | 'Price Gouging' | 'Support Inquiry';
  details: string;
  status: 'Open' | 'Resolved' | 'Dismissed';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // Or 'all-drivers' / 'all-admins'
  title: string;
  message: string;
  type: 'booking_request' | 'booking_accepted' | 'booking_rejected' | 'booking_completed' | 'booking_cancelled' | 'application_update' | 'safety_alert';
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  city: string;
  vehicleModel?: string;
  verifiedEmail: boolean;
}

/**
 * Calculates great-circle distance in kilometers between two coordinates using Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates estimated charging cost in INR and charging duration in minutes.
 */
export function calculateChargingEstimate(params: {
  requestedKwh: number;
  pricePerKwh: number;
  powerOutputKw: number;
  isEmergency: boolean;
  emergencyCalloutFee: number;
}): {
  energyCostInr: number;
  calloutFeeInr: number;
  totalCostInr: number;
  estimatedDurationMinutes: number;
} {
  const safeKwh = Math.max(1, Math.min(120, Number(params.requestedKwh) || 1));
  const safeRate = Math.max(0, Number(params.pricePerKwh) || 0);
  const safePower = Math.max(1.5, Number(params.powerOutputKw) || 3.3);
  const energyCostInr = Math.round(safeKwh * safeRate);
  const calloutFeeInr = params.isEmergency ? Math.max(0, Number(params.emergencyCalloutFee) || 0) : 0;
  const totalCostInr = energyCostInr + calloutFeeInr;
  // Assume 90% charging efficiency for realistic duration
  const hours = safeKwh / (safePower * 0.9);
  const estimatedDurationMinutes = Math.max(10, Math.round(hours * 60));

  return {
    energyCostInr,
    calloutFeeInr,
    totalCostInr,
    estimatedDurationMinutes,
  };
}

/**
 * Calculates EV top-up plan (needed kWh, duration in minutes, cost in INR, and range added in km) for the AI EV Tutor calculator.
 */
export function calculateEvTopUpPlan(params: {
  batteryCapacityKwh: number;
  currentSocPercent: number;
  targetSocPercent: number;
  chargerPowerKw: number;
  pricePerKwh: number;
  efficiencyKmPerKwh: number;
}): {
  neededKwh: number;
  estimatedMinutes: number;
  estimatedCostInr: number;
  addedRangeKm: number;
} {
  const cap = Math.max(2, Math.min(150, Number(params.batteryCapacityKwh) || 40));
  const startSoc = Math.max(0, Math.min(99, Number(params.currentSocPercent) || 10));
  const endSoc = Math.max(startSoc + 1, Math.min(100, Number(params.targetSocPercent) || 80));
  const power = Math.max(1.5, Math.min(350, Number(params.chargerPowerKw) || 7.4));
  const rate = Math.max(0, Number(params.pricePerKwh) || 18);
  const eff = Math.max(2, Math.min(15, Number(params.efficiencyKmPerKwh) || 7.2));

  const deltaFraction = (endSoc - startSoc) / 100;
  const neededKwh = Math.max(0.5, Math.round(cap * deltaFraction * 10) / 10);
  const estimatedMinutes = Math.max(5, Math.round((neededKwh / (power * 0.9)) * 60));
  const estimatedCostInr = Math.round(neededKwh * rate);
  const addedRangeKm = Math.round(neededKwh * eff);

  return {
    neededKwh,
    estimatedMinutes,
    estimatedCostInr,
    addedRangeKm,
  };
}

/**
 * Deterministic domain-grounded fallback tutor responder when Gemini API key is not configured or rate-limited.
 */
export function buildAiTutorResponseFallback(query: string, activeHostsCount = 8): string {
  const q = (query || '').toLowerCase();

  if (q.includes('earth') || q.includes('rccb') || q.includes('fault') || q.includes('red light') || q.includes('blink')) {
    return [
      '### Electrical Earthing & 30mA RCCB Safety Guide',
      '1. **Why EV Chargers Check Earthing:** Portable EVSE bricks (Tata, MG, Mahindra) measure Neutral-to-Earth (N-E) voltage before energizing. In India, if N-E voltage exceeds **5V** or the earth wire is floating, the charger will flash a red fault LED and refuse to start.',
      '2. **Mandatory 30mA RCCB Check:** Only plug into a host socket protected by a dedicated **30mA Residual Current Circuit Breaker (RCCB)** and proper MCB (16A for 3.3 kW, 32A for 7.4 kW).',
      '3. **Never Use Household Extension Cords:** Standard 6A multi-plug boards overheat rapidly under continuous 13A–15A EV draw. Always connect your OEM cable directly to the host wall outlet.',
    ].join('\n\n');
  }

  if (q.includes('connector') || q.includes('type 2') || q.includes('ccs') || q.includes('15a') || q.includes('compatible')) {
    return [
      '### Indian EV Connector Compatibility Guide',
      '1. **Type 2 AC (7.4 kW – 22 kW):** Standard AC wallbox connector for 4-wheeler passenger EVs in India (Tata Nexon EV, Punch EV, Tiago EV, MG ZS EV, Windsor EV, Mahindra XUV400, BYD Atto 3, Hyundai Ioniq 5).',
      '2. **CCS2 DC (25 kW – 60+ kW):** Combined Charging System for rapid emergency DC top-ups (adds ~30–50% SoC in 30 minutes on compatible cars).',
      '3. **15A 3-Pin Domestic Socket (3.3 kW):** Works with portable charging cables supplied with almost all Indian EVs and 2-wheelers (Ather 450X, Ola S1, TVS iQube, MG Comet EV). Adds ~12–18 km of range per hour.',
      '4. **Verification Rule:** ChargeNear listings display host-reported connectors. Always physically inspect the pin latch and cable amperage rating on arrival.',
    ].join('\n\n');
  }

  if (q.includes('low battery') || q.includes('emergency') || q.includes('stranded') || q.includes('tow') || q.includes('10%')) {
    return [
      '### Low-Battery (<10% SoC) Emergency Action Plan',
      `1. **Immediate Energy Conservation:** Switch your EV to **Eco+ / Limp Mode**, turn off A/C, and keep speed steady between 35–45 km/h to maximize regenerative braking.`,
      `2. **Request a Nearby Host:** There are currently **${activeHostsCount} active hosts** on ChargeNear. Filter by **Available Now Only**, pick the closest compatible host, and request a 8–12 kWh top-up (enough for 55–85 km of safe range).`,
      '3. **Flatbed Towing Rule:** If battery hits 0% and the vehicle enters turtle/park lock, **never tow an EV with its drive wheels on the road**—this damages the permanent-magnet traction motor. Dial **1033** (NHAI Highway Helpline) or your OEM RSA and specify a **Flatbed Recovery Truck**.',
    ].join('\n\n');
  }

  return [
    '### ChargeNear AI Help Tutor — Quick Guide',
    `1. **Finding & Booking a Charger:** Share your GPS location or choose your city in the **Find Chargers** tab. Review the host's connector type, kW rating, and ₹/kWh price, then click **Request Charging**.`,
    '2. **How Privacy Protection Works:** To protect homeowners, public map markers show a **~350m neighborhood zone**. Once the host accepts your request in the **Host Portal**, the exact street address unlocks automatically in **My Bookings**.',
    '3. **Safety First:** Before starting any session, confirm physical connector fit, check that the portable EVSE shows a green Ground/Earth status LED, and verify the host breaker is rated for your vehicle draw.',
  ].join('\n\n');
}

/**
 * Obfuscates exact coordinates by applying a deterministic ~250-350m offset so exact home addresses are never exposed on the public map.
 */
export function obfuscateCoordinates(lat: number, lng: number, seedKey: string): { publicLat: number; publicLng: number } {
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash << 5) - hash + seedKey.charCodeAt(i);
    hash |= 0;
  }
  const angle = ((Math.abs(hash) % 360) * Math.PI) / 180;
  // ~0.0024 degrees is roughly 265 meters
  const offsetDegrees = 0.0022;
  const publicLat = Number((lat + Math.sin(angle) * offsetDegrees).toFixed(5));
  const publicLng = Number((lng + Math.cos(angle) * offsetDegrees).toFixed(5));
  return { publicLat, publicLng };
}

/**
 * Strips private exactAddress unless the viewer is the host owner, an admin, or a driver with an Accepted/Completed booking for that host.
 */
export function sanitizeHostForViewer(
  host: ChargingHost,
  viewerId?: string,
  viewerRole?: UserRole,
  hasConfirmedBooking?: boolean
): ChargingHost {
  if (viewerRole === 'admin' || (viewerId && host.ownerId === viewerId) || hasConfirmedBooking) {
    return { ...host };
  }
  const sanitized = { ...host };
  delete sanitized.exactAddress;
  return sanitized;
}

export interface HostFilterCriteria {
  searchQuery?: string;
  city?: string;
  connector?: ConnectorType | 'ALL';
  category?: HostCategory | 'ALL';
  availableOnly?: boolean;
  maxPricePerKwh?: number;
  includeDemo?: boolean;
  driverLat?: number;
  driverLng?: number;
}

export interface HostWithDistance extends ChargingHost {
  distanceKm: number;
}

/**
 * Filters and sorts charging hosts by search criteria and proximity to the driver.
 */
export function filterAndSortHosts(
  hosts: ChargingHost[],
  criteria: HostFilterCriteria
): HostWithDistance[] {
  const refLat = criteria.driverLat ?? 12.9716;
  const refLng = criteria.driverLng ?? 77.5946;
  const q = (criteria.searchQuery || '').trim().toLowerCase();

  return hosts
    .filter((host) => {
      if (criteria.includeDemo === false && host.isDemo) {
        return false;
      }
      if (criteria.city && criteria.city !== 'ALL' && host.city.toLowerCase() !== criteria.city.toLowerCase()) {
        return false;
      }
      if (criteria.connector && criteria.connector !== 'ALL' && !host.connectors.includes(criteria.connector)) {
        return false;
      }
      if (criteria.category && criteria.category !== 'ALL' && host.category !== criteria.category) {
        return false;
      }
      if (criteria.availableOnly && host.availabilityStatus !== 'Available') {
        return false;
      }
      if (typeof criteria.maxPricePerKwh === 'number' && host.pricePerKwh > criteria.maxPricePerKwh) {
        return false;
      }
      if (q) {
        const hay = `${host.stationName} ${host.locality} ${host.city} ${host.equipmentType} ${host.connectors.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      return true;
    })
    .map((host) => ({
      ...host,
      distanceKm: calculateDistanceKm(refLat, refLng, host.publicLat, host.publicLng),
    }))
    .sort((a, b) => {
      if (a.availabilityStatus === 'Available' && b.availabilityStatus !== 'Available') return -1;
      if (a.availabilityStatus !== 'Available' && b.availabilityStatus === 'Available') return 1;
      return a.distanceKm - b.distanceKm;
    });
}

/**
 * Validates host registration inputs before submission.
 */
export function validateHostApplicationInput(input: {
  stationName: string;
  city: string;
  locality: string;
  exactAddress: string;
  equipmentType: string;
  powerOutputKw: number;
  connectors: ConnectorType[];
  pricePerKwh: number;
  operatingHours: string;
  earthingConfirmed: boolean;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.stationName || input.stationName.trim().length < 3) {
    errors.push('Station name must be at least 3 characters.');
  }
  if (!input.city || input.city.trim().length < 2) {
    errors.push('City is required.');
  }
  if (!input.locality || input.locality.trim().length < 3) {
    errors.push('Public locality / neighborhood is required.');
  }
  if (!input.exactAddress || input.exactAddress.trim().length < 8) {
    errors.push('Complete private street address is required for emergency dispatch.');
  }
  if (!input.equipmentType || input.equipmentType.trim().length < 3) {
    errors.push('Charging equipment model/type is required.');
  }
  if (!input.powerOutputKw || input.powerOutputKw <= 0 || input.powerOutputKw > 350) {
    errors.push('Power output (kW) must be between 1 kW and 350 kW.');
  }
  if (!Array.isArray(input.connectors) || input.connectors.length === 0) {
    errors.push('Select at least one compatible EV connector.');
  }
  if (typeof input.pricePerKwh !== 'number' || input.pricePerKwh < 0 || input.pricePerKwh > 100) {
    errors.push('Price per kWh must be between ₹0 and ₹100.');
  }
  if (!input.operatingHours || input.operatingHours.trim().length < 3) {
    errors.push('Operating hours are required.');
  }
  if (!input.earthingConfirmed) {
    errors.push('You must confirm dedicated earthing and circuit protection before registering.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
