const express = require('express');
const GpsRaw = require('../models/GpsRaw');
const GpsSegment = require('../models/GpsSegment');
const Trip = require('../models/Trip');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { gpsBatchSchema } = require('../utils/validation');

const router = express.Router();

// @desc    Batch upload GPS points
// @route   POST /api/gps/batch
// @access  Private
router.post('/batch', protect, validate(gpsBatchSchema), async (req, res, next) => {
  try {
    const points = req.body;

    if (!points || points.length === 0) {
      return res.status(400).json({ success: false, message: 'No GPS points provided' });
    }

    // Find user's active trip
    const activeTrip = await Trip.findOne({ userId: req.user._id, status: 'active' });
    if (!activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'No active trip found. GPS points must be associated with an active trip.'
      });
    }

    // Map points to include userId and tripId
    const pointsToSave = points.map(pt => ({
      userId: req.user._id,
      tripId: activeTrip._id,
      lat: pt.lat,
      lng: pt.lng,
      altitude: pt.altitude,
      speed: pt.speed,
      heading: pt.heading,
      battery: pt.battery,
      recordedAt: pt.recordedAt ? new Date(pt.recordedAt) : new Date(),
      syncedAt: new Date()
    }));

    // Save batch to MongoDB GpsRaw
    const savedPoints = await GpsRaw.insertMany(pointsToSave);

    // Update trip's last known location and battery with the last point in the batch
    const lastPt = points[points.length - 1];
    activeTrip.lastBattery = lastPt.battery || activeTrip.lastBattery;
    activeTrip.lastKnownLocation = {
      type: 'Point',
      coordinates: [lastPt.lng, lastPt.lat]
    };
    activeTrip.lastSeen = lastPt.recordedAt ? new Date(lastPt.recordedAt) : new Date();
    await activeTrip.save();

    // Trigger instant compression
    const { compressTripGps } = require('../jobs/compressGps');
    try {
      await compressTripGps(req.user._id, activeTrip._id);
    } catch (compressErr) {
      console.error('[GPS Batch Compression Error]:', compressErr.message);
    }

    res.status(201).json({
      success: true,
      count: savedPoints.length
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get compressed segments of a trip
// @route   GET /api/gps/:tripId/segments
// @access  Private
router.get('/:tripId/segments', protect, async (req, res, next) => {
  try {
    const { tripId } = req.params;

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Authorization: User owns the trip, or user is admin/rescuer
    if (trip.userId.toString() !== req.user._id.toString() && req.user.role === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized to view segments' });
    }

    const segments = await GpsSegment.find({ tripId }).sort({ startTime: 1 });

    res.json({
      success: true,
      segments
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
