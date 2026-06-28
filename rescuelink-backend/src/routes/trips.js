const express = require('express');
const Trip = require('../models/Trip');
const GpsRaw = require('../models/GpsRaw');
const GpsSegment = require('../models/GpsSegment');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { startTripSchema, updateBatterySchema } = require('../utils/validation');
const socketService = require('../services/socketService');
const smsService = require('../services/smsService');

const router = express.Router();

// @desc    Start a new trip
// @route   POST /api/trips/start
// @access  Private
router.post('/start', protect, validate(startTripSchema), async (req, res, next) => {
  try {
    const { routeName, expectedReturn, lat, lng, battery, groupId } = req.body;

    // Check if user already has an active trip
    const activeTrip = await Trip.findOne({ userId: req.user._id, status: 'active' });
    if (activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active trip. Please end it first.'
      });
    }

    const trip = await Trip.create({
      userId: req.user._id,
      groupId: groupId || null,
      routeName,
      expectedReturn: new Date(expectedReturn),
      status: 'active',
      startedAt: new Date(),
      lastKnownLocation: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      lastBattery: battery || 100,
      lastSeen: new Date()
    });

    // Also write the first point to GpsRaw as starting point
    await GpsRaw.create({
      userId: req.user._id,
      tripId: trip._id,
      lat,
      lng,
      battery: battery || 100,
      recordedAt: new Date()
    });

    res.status(201).json({
      success: true,
      trip
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's current active trip
// @route   GET /api/trips/active
// @access  Private
router.get('/active', protect, async (req, res, next) => {
  try {
    const activeTrip = await Trip.findOne({ userId: req.user._id, status: 'active' });
    res.json({
      success: true,
      trip: activeTrip || null
    });
  } catch (error) {
    next(error);
  }
});

// @desc    End an active trip
// @route   PATCH /api/trips/:id/end
// @access  Private
router.patch('/:id/end', protect, async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (trip.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Trip already completed' });
    }

    trip.status = 'completed';
    trip.endedAt = new Date();
    await trip.save();

    res.json({
      success: true,
      trip
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update trip battery and last known location
// @route   PATCH /api/trips/:id/battery
// @access  Private
router.patch('/:id/battery', protect, validate(updateBatterySchema), async (req, res, next) => {
  try {
    const { lat, lng, battery } = req.body;
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    trip.lastBattery = battery;
    trip.lastKnownLocation = {
      type: 'Point',
      coordinates: [lng, lat]
    };
    trip.lastSeen = new Date();
    await trip.save();

    // Trigger Emergency SMS for low battery (20%, 10%, 5%)
    if (battery === 20 || battery === 10 || battery === 5) {
      try {
        await smsService.sendEmergencySMS(req.user, {
          type: 'BATTERY',
          lat,
          lng,
          battery
        });
      } catch (smsError) {
        console.error(`Failed to send battery SOS SMS: ${smsError.message}`);
      }
    }

    // Emit socket event to web dashboard
    socketService.emitGpsUpdate({
      userId: req.user._id,
      tripId: trip._id,
      lat,
      lng,
      battery
    });

    res.json({
      success: true,
      trip
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get trip track (gps segments and recent raw points)
// @route   GET /api/trips/:id/track
// @access  Private
router.get('/:id/track', protect, async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Authorization: User owns the trip, or user is admin/rescuer
    if (trip.userId.toString() !== req.user._id.toString() && req.user.role === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this trip' });
    }

    // Get long-term compressed segments
    const segments = await GpsSegment.find({ tripId: trip._id }).sort({ startTime: 1 });

    // Get recent raw points (TTL 6 hours)
    const rawPoints = await GpsRaw.find({ tripId: trip._id }).sort({ recordedAt: 1 });

    res.json({
      success: true,
      segments,
      rawPoints
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
