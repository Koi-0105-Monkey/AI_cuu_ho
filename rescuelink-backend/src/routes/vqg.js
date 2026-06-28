const express = require('express');
const Threat = require('../models/Threat');
const { protect, authorize } = require('../middleware/auth');
const socketService = require('../services/socketService');

const router = express.Router();

// Mock VQG Hoang Lien Satellite Hotspots (MODIS/VIIRS)
const MOCK_HOTSPOTS = [
  {
    id: "hs_001",
    lat: 22.361,
    lng: 103.785,
    satellite: "VIIRS (NPP)",
    confidence: "High",
    frp: 28.5, // Fire Radiative Power (MW)
    acqTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    status: "Chưa xác minh"
  },
  {
    id: "hs_002",
    lat: 22.312,
    lng: 103.845,
    satellite: "MODIS (Aqua)",
    confidence: "Medium",
    frp: 12.3,
    acqTime: new Date(Date.now() - 120 * 60 * 1000).toISOString(), // 2 hours ago
    status: "Chưa xác minh"
  }
];

// @desc    Get satellite fire hotspots around VQG Hoang Lien
// @route   GET /api/vqg/hotspots
// @access  Private (Admin/Operator/Rescuer/Authority)
router.get('/hotspots', protect, authorize('admin', 'operator', 'rescuer', 'authority'), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: MOCK_HOTSPOTS
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get forest threat reports
// @route   GET /api/vqg/threats
// @access  Private (Admin/Operator/Rescuer/Authority)
router.get('/threats', protect, authorize('admin', 'operator', 'rescuer', 'authority'), async (req, res, next) => {
  try {
    const threats = await Threat.find()
      .populate('reporterId', 'name phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: threats
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a forest threat report (from mobile app)
// @route   POST /api/vqg/threats
// @access  Private (Rangers or Guides)
router.post('/threats', protect, async (req, res, next) => {
  try {
    const { type, lat, lng, severity, description, imageUrl } = req.body;

    if (!type || !lat || !lng) {
      return res.status(400).json({ success: false, message: 'Type, lat, and lng are required' });
    }

    const threat = await Threat.create({
      reporterId: req.user._id,
      type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      },
      severity: severity ? parseInt(severity) : 3,
      description,
      imageUrl,
      status: 'open'
    });

    const populatedThreat = await Threat.findById(threat._id).populate('reporterId', 'name phone');

    // Notify Dashboard
    socketService.emitThreatNew(populatedThreat);

    res.status(201).json({
      success: true,
      data: populatedThreat
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update forest threat status
// @route   PATCH /api/vqg/threats/:id/status
// @access  Private (Admin/Operator/Rescuer)
router.patch('/threats/:id/status', protect, authorize('admin', 'operator', 'rescuer'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['open', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const threat = await Threat.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('reporterId', 'name phone');

    if (!threat) {
      return res.status(404).json({ success: false, message: 'Threat report not found' });
    }

    socketService.emitThreatUpdated(threat);

    res.json({
      success: true,
      data: threat
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
