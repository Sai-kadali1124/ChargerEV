import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceKm,
  calculateChargingEstimate,
  calculateEvTopUpPlan,
  buildAiTutorResponseFallback,
  obfuscateCoordinates,
  sanitizeHostForViewer,
  filterAndSortHosts,
  validateHostApplicationInput,
  type ChargingHost,
} from './chargingLogic.ts';

const sampleHost: ChargingHost = {
  id: 'host-test-1',
  ownerId: 'user-host-1',
  ownerName: 'Rohan Sharma',
  stationName: 'Indiranagar Solar Home Charger',
  category: 'Home Host',
  city: 'Bengaluru',
  locality: 'Indiranagar 12th Main Zone',
  exactAddress: 'Plot 42, 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038',
  publicLat: 12.9719,
  publicLng: 77.6412,
  privacyRadiusMeters: 350,
  equipmentType: '7.4 kW Exicom Spin AC Wallbox',
  powerOutputKw: 7.4,
  connectors: ['Type 2 AC', '15A 3-Pin Socket'],
  pricePerKwh: 18,
  emergencyCalloutFee: 50,
  availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  operatingHours: '06:00 - 23:00',
  availabilityStatus: 'Available',
  isVerified: true,
  isDemo: true,
  earthingVerified: true,
  rccbProtected: true,
  rating: 4.8,
  reviewCount: 14,
  notes: 'Covered driveway parking with dedicated 32A Type-B RCCB protection.',
  createdAt: '2026-10-01T10:00:00.000Z',
};

test('calculateDistanceKm computes accurate Haversine distance', () => {
  const dist = calculateDistanceKm(12.9756, 77.6066, 12.9719, 77.6412);
  assert.ok(dist >= 3.5 && dist <= 4.1, `Expected distance around 3.8km, got ${dist}`);
});

test('calculateChargingEstimate computes INR energy cost, emergency fee, and minutes', () => {
  const estimate = calculateChargingEstimate({
    requestedKwh: 10,
    pricePerKwh: 18,
    powerOutputKw: 7.4,
    isEmergency: true,
    emergencyCalloutFee: 50,
  });
  assert.equal(estimate.energyCostInr, 180);
  assert.equal(estimate.calloutFeeInr, 50);
  assert.equal(estimate.totalCostInr, 230);
  assert.ok(estimate.estimatedDurationMinutes >= 85 && estimate.estimatedDurationMinutes <= 95);
});

test('calculateEvTopUpPlan computes needed kWh, minutes, INR cost, and range added', () => {
  const plan = calculateEvTopUpPlan({
    batteryCapacityKwh: 40,
    currentSocPercent: 10,
    targetSocPercent: 60,
    chargerPowerKw: 7.4,
    pricePerKwh: 18,
    efficiencyKmPerKwh: 7.5,
  });
  assert.equal(plan.neededKwh, 20);
  assert.equal(plan.estimatedCostInr, 360);
  assert.equal(plan.addedRangeKm, 150);
  assert.ok(plan.estimatedMinutes >= 175 && plan.estimatedMinutes <= 185);
});

test('buildAiTutorResponseFallback returns domain-accurate help for earthing, connectors, and emergency', () => {
  const earthingHelp = buildAiTutorResponseFallback('Why is the red earthing fault light blinking?', 8);
  assert.ok(earthingHelp.includes('RCCB'));
  assert.ok(earthingHelp.includes('5V'));

  const connectorHelp = buildAiTutorResponseFallback('Which connector fits Tata Nexon EV?', 8);
  assert.ok(connectorHelp.includes('Type 2 AC'));
  assert.ok(connectorHelp.includes('CCS2 DC'));

  const emergencyHelp = buildAiTutorResponseFallback('Stranded with low battery 8% on highway', 8);
  assert.ok(emergencyHelp.includes('1033'));
  assert.ok(emergencyHelp.includes('Flatbed'));
});

test('sanitizeHostForViewer hides exactAddress publicly and reveals only to owner, admin, or accepted booking', () => {
  const publicView = sanitizeHostForViewer(sampleHost, 'user-driver-99', 'driver', false);
  assert.equal(publicView.exactAddress, undefined);

  const acceptedBookingView = sanitizeHostForViewer(sampleHost, 'user-driver-99', 'driver', true);
  assert.equal(
    acceptedBookingView.exactAddress,
    'Plot 42, 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038'
  );

  const ownerView = sanitizeHostForViewer(sampleHost, 'user-host-1', 'host', false);
  assert.ok(ownerView.exactAddress);

  const adminView = sanitizeHostForViewer(sampleHost, 'user-admin-1', 'admin', false);
  assert.ok(adminView.exactAddress);
});

test('obfuscateCoordinates shifts exact home coordinates by a privacy offset', () => {
  const exactLat = 12.97189;
  const exactLng = 77.64115;
  const { publicLat, publicLng } = obfuscateCoordinates(exactLat, exactLng, 'host-seed-1');
  assert.notEqual(publicLat, exactLat);
  assert.notEqual(publicLng, exactLng);
  const shiftKm = calculateDistanceKm(exactLat, exactLng, publicLat, publicLng);
  assert.ok(shiftKm >= 0.1 && shiftKm <= 0.5, `Expected ~250m privacy offset, got ${shiftKm}km`);
});

test('filterAndSortHosts filters by connector, availability, and demo flag', () => {
  const secondHost: ChargingHost = {
    ...sampleHost,
    id: 'host-test-2',
    stationName: 'Koramangala DC Garage',
    category: 'Garage',
    connectors: ['CCS2 DC'],
    pricePerKwh: 24,
    availabilityStatus: 'Busy',
    isDemo: false,
  };

  const hosts = [sampleHost, secondHost];

  const ccsOnly = filterAndSortHosts(hosts, { connector: 'CCS2 DC' });
  assert.equal(ccsOnly.length, 1);
  assert.equal(ccsOnly[0].id, 'host-test-2');

  const availableOnly = filterAndSortHosts(hosts, { availableOnly: true });
  assert.equal(availableOnly.length, 1);
  assert.equal(availableOnly[0].id, 'host-test-1');

  const nonDemoOnly = filterAndSortHosts(hosts, { includeDemo: false });
  assert.equal(nonDemoOnly.length, 1);
  assert.equal(nonDemoOnly[0].id, 'host-test-2');
});

test('validateHostApplicationInput rejects incomplete applications and accepts valid ones', () => {
  const invalid = validateHostApplicationInput({
    stationName: 'A',
    city: '',
    locality: '',
    exactAddress: 'Short',
    equipmentType: '',
    powerOutputKw: 0,
    connectors: [],
    pricePerKwh: -5,
    operatingHours: '',
    earthingConfirmed: false,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 5);

  const valid = validateHostApplicationInput({
    stationName: 'Bandra West EV Garage',
    city: 'Mumbai',
    locality: 'Bandra West Pali Hill Zone',
    exactAddress: '14 Pali Hill Road, Bandra West, Mumbai 400050',
    equipmentType: '7.4 kW Tata Power EZ Home Box',
    powerOutputKw: 7.4,
    connectors: ['Type 2 AC'],
    pricePerKwh: 19,
    operatingHours: '07:00 - 22:00',
    earthingConfirmed: true,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});
