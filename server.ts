import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  buildAiTutorResponseFallback,
  calculateChargingEstimate,
  obfuscateCoordinates,
  sanitizeHostForViewer,
  validateHostApplicationInput,
  type AppNotification,
  type AvailabilityStatus,
  type BookingStatus,
  type ChargingBooking,
  type ChargingHost,
  type ConnectorType,
  type HostApplication,
  type HostCategory,
  type HostReview,
  type SafetyReport,
  type UserProfile,
  type UserRole,
} from './src/utils/chargingLogic.ts';
import {
  INDIA_CITY_PRESETS,
  INITIAL_APPLICATIONS,
  INITIAL_BOOKINGS,
  INITIAL_HOSTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
  INITIAL_REVIEWS,
  INITIAL_USERS,
} from './src/data/indiaEvData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DatabaseSchema {
  users: UserProfile[];
  hosts: ChargingHost[];
  bookings: ChargingBooking[];
  hostApplications: HostApplication[];
  reviews: HostReview[];
  reports: SafetyReport[];
  notifications: AppNotification[];
}

const DATA_DIR = path.join(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'chargenear-db.json');

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.hosts)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading local database file, re-initializing:', err);
  }
  const initial: DatabaseSchema = {
    users: structuredClone(INITIAL_USERS),
    hosts: structuredClone(INITIAL_HOSTS),
    bookings: structuredClone(INITIAL_BOOKINGS),
    hostApplications: structuredClone(INITIAL_APPLICATIONS),
    reviews: structuredClone(INITIAL_REVIEWS),
    reports: structuredClone(INITIAL_REPORTS),
    notifications: structuredClone(INITIAL_NOTIFICATIONS),
  };
  saveDatabase(initial);
  return initial;
}

function saveDatabase(db: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting database:', err);
  }
}

let db = loadDatabase();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Helper to get caller identity from headers or query
  function getCaller(req: express.Request): { userId: string; role: UserRole; user?: UserProfile } {
    const userId = String(req.headers['x-user-id'] || req.query.userId || 'user-driver-1');
    const user = db.users.find((u) => u.id === userId);
    const role: UserRole = user?.role || (req.headers['x-user-role'] as UserRole) || 'driver';
    return { userId, role, user };
  }

  // GET /api/state - Full synchronized state with strict address privacy filtering
  app.get('/api/state', (req, res) => {
    const { userId, role } = getCaller(req);

    // Determine which hosts this driver has an Accepted or Completed booking with
    const confirmedHostIds = new Set(
      db.bookings
        .filter(
          (b) =>
            b.driverId === userId &&
            (b.status === 'Accepted' || b.status === 'Completed')
        )
        .map((b) => b.hostId)
    );

    const sanitizedHosts = db.hosts.map((h) =>
      sanitizeHostForViewer(h, userId, role, confirmedHostIds.has(h.id))
    );

    // Filter notifications relevant to current user
    const userNotifications = db.notifications.filter(
      (n) =>
        n.userId === userId ||
        (role === 'admin' && n.userId === 'user-admin-1') ||
        (role === 'host' && n.userId === 'user-host-1')
    );

    res.json({
      users: db.users,
      hosts: sanitizedHosts,
      bookings: db.bookings,
      hostApplications: db.hostApplications,
      reviews: db.reviews,
      reports: db.reports,
      notifications: userNotifications,
    });
  });

  // POST /api/auth/google - Sign in with Google account or switch role profile
  app.post('/api/auth/google', (req, res) => {
    const { email, name, role, phone, city, vehicleModel } = req.body || {};
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Valid email is required for authentication.' });
      return;
    }

    let user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      const assignedRole: UserRole =
        email.toLowerCase() === 'kadalisaimanikanta574@gmail.com'
          ? 'admin'
          : role === 'host' || role === 'admin'
          ? role
          : 'driver';

      user = {
        id: `user-${Date.now()}`,
        name: name || email.split('@')[0],
        email,
        role: assignedRole,
        phone: phone || '+91 98000 00000',
        city: city || 'Bengaluru',
        vehicleModel: vehicleModel || 'Tata Nexon EV',
        verifiedEmail: true,
      };
      db.users.push(user);
      saveDatabase(db);
    } else if (role && ['driver', 'host', 'admin'].includes(role)) {
      user.role = role as UserRole;
      if (city) user.city = city;
      if (vehicleModel) user.vehicleModel = vehicleModel;
      saveDatabase(db);
    }

    res.json({ user });
  });

  // POST /api/bookings - Driver requests emergency or scheduled charging
  app.post('/api/bookings', (req, res) => {
    const { userId, user } = getCaller(req);
    const {
      hostId,
      vehicleModel,
      batteryPercent,
      connectorType,
      requestedKwh,
      isEmergency,
      compatibilityAcknowledged,
      emergencyNote,
    } = req.body || {};

    if (!compatibilityAcknowledged) {
      res.status(400).json({
        error:
          'You must explicitly acknowledge connector and electrical earthing verification requirements before requesting a charge.',
      });
      return;
    }

    const host = db.hosts.find((h) => h.id === hostId);
    if (!host) {
      res.status(404).json({ error: 'Selected charging host not found.' });
      return;
    }

    if (host.availabilityStatus === 'Offline') {
      res.status(400).json({ error: 'This host is currently offline and cannot accept requests.' });
      return;
    }

    if (!host.connectors.includes(connectorType as ConnectorType)) {
      res.status(400).json({
        error: `Selected connector (${connectorType}) is not listed as compatible with this station.`,
      });
      return;
    }

    const estimate = calculateChargingEstimate({
      requestedKwh: Number(requestedKwh) || 10,
      pricePerKwh: host.pricePerKwh,
      powerOutputKw: host.powerOutputKw,
      isEmergency: Boolean(isEmergency),
      emergencyCalloutFee: host.emergencyCalloutFee,
    });

    const nowIso = new Date().toISOString();
    const newBooking: ChargingBooking = {
      id: `booking-${Date.now()}`,
      driverId: userId,
      driverName: user?.name || 'EV Driver',
      driverPhone: user?.phone || '+91 98450 11223',
      hostId: host.id,
      hostOwnerId: host.ownerId,
      stationName: host.stationName,
      locality: host.locality,
      city: host.city,
      vehicleModel: String(vehicleModel || user?.vehicleModel || 'EV Passenger Vehicle').slice(0, 80),
      batteryPercent: Math.max(1, Math.min(99, Number(batteryPercent) || 15)),
      connectorType: connectorType as ConnectorType,
      requestedKwh: Math.max(1, Math.min(100, Number(requestedKwh) || 10)),
      estimatedDurationMinutes: estimate.estimatedDurationMinutes,
      estimatedCostInr: estimate.totalCostInr,
      isEmergency: Boolean(isEmergency),
      compatibilityAcknowledged: true,
      status: 'Pending',
      emergencyNote: String(emergencyNote || '').slice(0, 300),
      createdAt: nowIso,
    };

    db.bookings.unshift(newBooking);

    // Notify host and driver
    db.notifications.unshift(
      {
        id: `notif-${Date.now()}-host`,
        userId: host.ownerId,
        title: isEmergency ? 'Urgent Emergency Charge Request' : 'New Charging Request',
        message: `${newBooking.driverName} (${newBooking.vehicleModel}, ${newBooking.batteryPercent}% SoC) requested ${newBooking.requestedKwh} kWh via ${newBooking.connectorType} at ${host.stationName}.`,
        type: 'booking_request',
        relatedId: newBooking.id,
        read: false,
        createdAt: nowIso,
      },
      {
        id: `notif-${Date.now()}-driver`,
        userId,
        title: 'Charging Request Sent',
        message: `Request for ${newBooking.requestedKwh} kWh (Est. ₹${newBooking.estimatedCostInr}) sent to ${host.stationName}. Exact address will unlock once accepted.`,
        type: 'booking_request',
        relatedId: newBooking.id,
        read: false,
        createdAt: nowIso,
      }
    );

    saveDatabase(db);
    res.status(201).json({ booking: newBooking, estimate });
  });

  // PATCH /api/bookings/:id/status - Host accepts/rejects/completes or Driver cancels
  app.patch('/api/bookings/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status: BookingStatus };
    const booking = db.bookings.find((b) => b.id === id);

    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    const allowedStatuses: BookingStatus[] = ['Accepted', 'Rejected', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid booking status transition.' });
      return;
    }

    const host = db.hosts.find((h) => h.id === booking.hostId);
    const nowIso = new Date().toISOString();
    booking.status = status;

    if (status === 'Accepted') {
      booking.acceptedAt = nowIso;
      if (host?.exactAddress) {
        booking.exactAddressRevealed = host.exactAddress;
      }
      if (host) {
        host.availabilityStatus = 'Busy';
      }
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: booking.driverId,
        title: 'Charging Request Accepted — Exact Address Unlocked',
        message: `${booking.stationName} accepted your request! Proceed to: ${booking.exactAddressRevealed || booking.locality}.`,
        type: 'booking_accepted',
        relatedId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    } else if (status === 'Rejected') {
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: booking.driverId,
        title: 'Charging Request Declined',
        message: `${booking.stationName} is unable to accommodate your request right now. Please select another nearby host.`,
        type: 'booking_rejected',
        relatedId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    } else if (status === 'Completed') {
      booking.completedAt = nowIso;
      if (host) {
        host.availabilityStatus = 'Available';
      }
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: booking.driverId,
        title: 'Charging Session Completed',
        message: `Session at ${booking.stationName} marked complete (${booking.requestedKwh} kWh · ₹${booking.estimatedCostInr}). Leave a safety & compatibility review!`,
        type: 'booking_completed',
        relatedId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    } else if (status === 'Cancelled') {
      booking.cancelledAt = nowIso;
      if (host && host.availabilityStatus === 'Busy') {
        host.availabilityStatus = 'Available';
      }
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: booking.hostOwnerId,
        title: 'Booking Cancelled',
        message: `Booking for ${booking.vehicleModel} at ${booking.stationName} was cancelled.`,
        type: 'booking_cancelled',
        relatedId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    }

    saveDatabase(db);
    res.json({ booking });
  });

  // PATCH /api/hosts/:id - Update host availability, pricing, hours, or verification
  app.patch('/api/hosts/:id', (req, res) => {
    const { id } = req.params;
    const host = db.hosts.find((h) => h.id === id);
    if (!host) {
      res.status(404).json({ error: 'Host not found.' });
      return;
    }

    const { availabilityStatus, pricePerKwh, emergencyCalloutFee, operatingHours, isVerified, notes } = req.body || {};

    if (availabilityStatus && ['Available', 'Busy', 'Offline'].includes(availabilityStatus)) {
      host.availabilityStatus = availabilityStatus as AvailabilityStatus;
    }
    if (typeof pricePerKwh === 'number' && pricePerKwh >= 0 && pricePerKwh <= 100) {
      host.pricePerKwh = pricePerKwh;
    }
    if (typeof emergencyCalloutFee === 'number' && emergencyCalloutFee >= 0 && emergencyCalloutFee <= 500) {
      host.emergencyCalloutFee = emergencyCalloutFee;
    }
    if (typeof operatingHours === 'string' && operatingHours.trim()) {
      host.operatingHours = operatingHours.trim().slice(0, 60);
    }
    if (typeof isVerified === 'boolean') {
      host.isVerified = isVerified;
    }
    if (typeof notes === 'string') {
      host.notes = notes.trim().slice(0, 400);
    }

    saveDatabase(db);
    res.json({ host });
  });

  // DELETE /api/hosts/:id - Admin removes fraudulent or unsafe host listing
  app.delete('/api/hosts/:id', (req, res) => {
    const { id } = req.params;
    const index = db.hosts.findIndex((h) => h.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Host listing not found.' });
      return;
    }
    const [removed] = db.hosts.splice(index, 1);
    saveDatabase(db);
    res.json({ removedId: removed.id });
  });

  // POST /api/applications - Homeowner or shop registers to become a charging host
  app.post('/api/applications', (req, res) => {
    const { userId, user } = getCaller(req);
    const body = req.body || {};

    const validation = validateHostApplicationInput({
      stationName: body.stationName,
      city: body.city,
      locality: body.locality,
      exactAddress: body.exactAddress,
      equipmentType: body.equipmentType,
      powerOutputKw: Number(body.powerOutputKw),
      connectors: body.connectors,
      pricePerKwh: Number(body.pricePerKwh),
      operatingHours: body.operatingHours,
      earthingConfirmed: Boolean(body.earthingConfirmed),
    });

    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' ') });
      return;
    }

    const cityPreset =
      INDIA_CITY_PRESETS.find((c) => c.name.toLowerCase() === String(body.city).toLowerCase()) ||
      INDIA_CITY_PRESETS[0];

    const baseLat = typeof body.lat === 'number' && !Number.isNaN(body.lat) ? body.lat : cityPreset.lat;
    const baseLng = typeof body.lng === 'number' && !Number.isNaN(body.lng) ? body.lng : cityPreset.lng;

    const { publicLat, publicLng } = obfuscateCoordinates(baseLat, baseLng, `${body.stationName}-${Date.now()}`);
    const nowIso = new Date().toISOString();

    const newApp: HostApplication = {
      id: `app-${Date.now()}`,
      applicantId: userId,
      applicantName: String(body.applicantName || user?.name || 'Homeowner Host').trim(),
      applicantEmail: String(body.applicantEmail || user?.email || 'host@example.in').trim(),
      phone: String(body.phone || user?.phone || '+91 98000 11111').trim(),
      stationName: String(body.stationName).trim(),
      category: (body.category as HostCategory) || 'Home Host',
      city: String(body.city).trim(),
      locality: `${String(body.locality).trim()} (~350m privacy zone)`,
      exactAddress: String(body.exactAddress).trim(),
      publicLat,
      publicLng,
      equipmentType: String(body.equipmentType).trim(),
      powerOutputKw: Number(body.powerOutputKw),
      connectors: body.connectors as ConnectorType[],
      pricePerKwh: Number(body.pricePerKwh),
      emergencyCalloutFee: Number(body.emergencyCalloutFee) || 0,
      availableDays: Array.isArray(body.availableDays) && body.availableDays.length > 0
        ? body.availableDays
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      operatingHours: String(body.operatingHours).trim(),
      earthingConfirmed: Boolean(body.earthingConfirmed),
      rccbConfirmed: Boolean(body.rccbConfirmed),
      status: 'Pending Review',
      submittedAt: nowIso,
    };

    db.hostApplications.unshift(newApp);

    db.notifications.unshift({
      id: `notif-${Date.now()}-admin`,
      userId: 'user-admin-1',
      title: 'New Host Registration Pending Review',
      message: `${newApp.applicantName} submitted "${newApp.stationName}" (${newApp.city}) for verification.`,
      type: 'application_update',
      relatedId: newApp.id,
      read: false,
      createdAt: nowIso,
    });

    saveDatabase(db);
    res.status(201).json({ application: newApp });
  });

  // PATCH /api/applications/:id/review - Admin approves or rejects host registration
  app.patch('/api/applications/:id/review', (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body as { status: 'Approved' | 'Rejected'; adminNotes?: string };

    const appDoc = db.hostApplications.find((a) => a.id === id);
    if (!appDoc) {
      res.status(404).json({ error: 'Host application not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    appDoc.status = status;
    appDoc.reviewedAt = nowIso;
    if (adminNotes) {
      appDoc.adminNotes = adminNotes;
    }

    let createdHost: ChargingHost | null = null;
    if (status === 'Approved') {
      createdHost = {
        id: `host-${Date.now()}`,
        ownerId: 'user-host-1',
        ownerName: appDoc.applicantName,
        stationName: appDoc.stationName,
        category: appDoc.category,
        city: appDoc.city,
        locality: appDoc.locality,
        exactAddress: appDoc.exactAddress,
        publicLat: appDoc.publicLat,
        publicLng: appDoc.publicLng,
        privacyRadiusMeters: 350,
        equipmentType: appDoc.equipmentType,
        powerOutputKw: appDoc.powerOutputKw,
        connectors: appDoc.connectors,
        pricePerKwh: appDoc.pricePerKwh,
        emergencyCalloutFee: appDoc.emergencyCalloutFee,
        availableDays: appDoc.availableDays,
        operatingHours: appDoc.operatingHours,
        availabilityStatus: 'Available',
        isVerified: true,
        isDemo: false, // Real user/admin verified submission!
        earthingVerified: appDoc.earthingConfirmed,
        rccbProtected: appDoc.rccbConfirmed,
        rating: 5.0,
        reviewCount: 1,
        notes: `Verified ${appDoc.category} in ${appDoc.city}. Equipment: ${appDoc.equipmentType}.`,
        createdAt: nowIso,
      };
      db.hosts.unshift(createdHost);
    }

    db.notifications.unshift({
      id: `notif-${Date.now()}-app`,
      userId: appDoc.applicantId,
      title: status === 'Approved' ? 'Host Application Approved & Live' : 'Host Application Update',
      message:
        status === 'Approved'
          ? `Your station "${appDoc.stationName}" has been verified and is now live on the ChargeNear map.`
          : `Your application for "${appDoc.stationName}" was marked as ${status}.`,
      type: 'application_update',
      relatedId: appDoc.id,
      read: false,
      createdAt: nowIso,
    });

    saveDatabase(db);
    res.json({ application: appDoc, createdHost });
  });

  // POST /api/reviews - Submit rating and review for a host
  app.post('/api/reviews', (req, res) => {
    const { userId, role, user } = getCaller(req);
    const { hostId, bookingId, rating, comment, connectorUsed, vehicleModel } = req.body || {};

    const host = db.hosts.find((h) => h.id === hostId);
    if (!host) {
      res.status(404).json({ error: 'Host not found.' });
      return;
    }

    const numericRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const cleanComment = String(comment || '').trim();
    if (cleanComment.length < 5) {
      res.status(400).json({ error: 'Please write a brief review comment (at least 5 characters).' });
      return;
    }

    const newReview: HostReview = {
      id: `rev-${Date.now()}`,
      hostId: host.id,
      bookingId,
      authorId: userId,
      authorName: user?.name || 'Verified EV User',
      authorRole: role === 'host' ? 'host' : 'driver',
      rating: numericRating,
      comment: cleanComment.slice(0, 400),
      connectorUsed: (connectorUsed as ConnectorType) || host.connectors[0],
      vehicleModel: String(vehicleModel || user?.vehicleModel || 'EV').slice(0, 60),
      createdAt: new Date().toISOString(),
    };

    db.reviews.unshift(newReview);

    // Update host rating average
    const hostReviews = db.reviews.filter((r) => r.hostId === host.id);
    const avg =
      hostReviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, hostReviews.length);
    host.rating = Math.round(avg * 10) / 10;
    host.reviewCount = hostReviews.length;

    if (bookingId) {
      const booking = db.bookings.find((b) => b.id === bookingId);
      if (booking) booking.reviewed = true;
    }

    saveDatabase(db);
    res.status(201).json({ review: newReview, host });
  });

  // POST /api/reports - Submit safety report, fraud flag, or support inquiry
  app.post('/api/reports', (req, res) => {
    const { userId, user } = getCaller(req);
    const { targetHostId, targetStationName, reason, details } = req.body || {};

    if (!details || String(details).trim().length < 5) {
      res.status(400).json({ error: 'Please provide details for the report or support request.' });
      return;
    }

    const newReport: SafetyReport = {
      id: `rep-${Date.now()}`,
      reporterId: userId,
      reporterName: user?.name || 'EV Community Member',
      targetHostId: targetHostId || undefined,
      targetStationName: String(targetStationName || 'General Platform Support').slice(0, 100),
      reason: reason || 'Support Inquiry',
      details: String(details).trim().slice(0, 500),
      status: 'Open',
      createdAt: new Date().toISOString(),
    };

    db.reports.unshift(newReport);

    db.notifications.unshift({
      id: `notif-${Date.now()}-rep`,
      userId: 'user-admin-1',
      title: `New ${newReport.reason} Logged`,
      message: `${newReport.reporterName} flagged "${newReport.targetStationName}".`,
      type: 'safety_alert',
      relatedId: newReport.id,
      read: false,
      createdAt: newReport.createdAt,
    });

    saveDatabase(db);
    res.status(201).json({ report: newReport });
  });

  // PATCH /api/reports/:id - Admin resolves or dismisses report
  app.patch('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status: 'Resolved' | 'Dismissed' };
    const report = db.reports.find((r) => r.id === id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    report.status = status;
    saveDatabase(db);
    res.json({ report });
  });

  // POST /api/notifications/read-all
  app.post('/api/notifications/read-all', (req, res) => {
    const { userId, role } = getCaller(req);
    db.notifications.forEach((n) => {
      if (
        n.userId === userId ||
        (role === 'admin' && n.userId === 'user-admin-1') ||
        (role === 'host' && n.userId === 'user-host-1')
      ) {
        n.read = true;
      }
    });
    saveDatabase(db);
    res.json({ ok: true });
  });

  // POST /api/ai-tutor - Server-side Gemini AI EV Help & Safety Tutor with domain fallback
  app.post('/api/ai-tutor', async (req, res) => {
    const { question, city, vehicleModel } = req.body || {};
    const cleanQuestion = String(question || '').trim();
    if (!cleanQuestion) {
      res.status(400).json({ error: 'Please provide a question for the AI EV Tutor.' });
      return;
    }

    const availableHostsCount = db.hosts.filter((h) => h.availabilityStatus === 'Available').length;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `User City: ${city || 'India'}\nUser EV Model: ${vehicleModel || 'Indian EV'}\nAvailable ChargeNear Hosts Online: ${availableHostsCount}\nUser Question: ${cleanQuestion}`,
          config: {
            systemInstruction:
              'You are the ChargeNear AI EV Help & Safety Tutor for India. Give concise, practical, safety-first guidance (under 140 words) tailored to Indian EV drivers and home hosts. Cover Indian connectors (Type 2 AC, CCS2 DC, 15A 3-Pin Socket, Bharat AC-001/DC-001), residential earthing (<5V Neutral-to-Earth) & 30mA Type-A RCCB verification, NHAI 1033 / 112 emergency recovery, and ChargeNear privacy rules (~350m obfuscation until host accepts booking). Never claim a charger is safe without physical on-site verification.',
          },
        });

        const text = response.text?.trim();
        if (text) {
          res.json({ answer: text, source: 'gemini' });
          return;
        }
      } catch (_err) {
        // Fall through to deterministic verified Indian EV safety knowledge base
      }
    }

    const fallbackAnswer = buildAiTutorResponseFallback(cleanQuestion, availableHostsCount);
    res.json({ answer: fallbackAnswer, source: 'knowledge-base' });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChargeNear server listening on http://localhost:${PORT}`);
  });
}

startServer();
