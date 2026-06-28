const express = require('express');
const Trip = require('../models/Trip');
const User = require('../models/User');

const router = express.Router();

/**
 * @desc    Xem thông tin trip qua share token (PUBLIC — không cần đăng nhập)
 * @route   GET /api/family/trip/:shareToken
 * @access  Public
 */
router.get('/trip/:shareToken', async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const trip = await Trip.findOne({ shareToken })
      .populate('userId', 'name phone emergencyContacts')
      .populate('groupId', 'groupName routeName');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hành trình. Link có thể đã hết hạn hoặc không hợp lệ.'
      });
    }

    // Chỉ trả về thông tin cần thiết, không lộ dữ liệu nhạy cảm
    res.json({
      success: true,
      trip: {
        _id: trip._id,
        routeName: trip.routeName,
        status: trip.status,
        startedAt: trip.startedAt,
        expectedReturn: trip.expectedReturn,
        endedAt: trip.endedAt,
        lastKnownLocation: trip.lastKnownLocation,
        lastBattery: trip.lastBattery,
        lastSeen: trip.lastSeen,
        groupName: trip.groupId?.groupName || null,
        trekker: {
          name: trip.userId?.name,
          // Ẩn số điện thoại đầy đủ, chỉ hiển thị 4 số cuối
          phoneMasked: trip.userId?.phone
            ? `****${trip.userId.phone.slice(-4)}`
            : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Xem GPS track của trip qua share token (PUBLIC)
 * @route   GET /api/family/trip/:shareToken/track
 * @access  Public
 */
router.get('/trip/:shareToken/track', async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const trip = await Trip.findOne({ shareToken });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hành trình.' });
    }

    const GpsRaw = require('../models/GpsRaw');
    const GpsSegment = require('../models/GpsSegment');

    // Lấy track — chỉ trả về coordinates, không trả về toàn bộ metadata
    const segments = await GpsSegment.find({ tripId: trip._id })
      .sort({ startTime: 1 })
      .select('points startTime endTime');

    const rawPoints = await GpsRaw.find({ tripId: trip._id })
      .sort({ recordedAt: 1 })
      .select('lat lng recordedAt');

    res.json({
      success: true,
      segments,
      rawPoints,
      lastKnownLocation: trip.lastKnownLocation,
      lastSeen: trip.lastSeen
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Kiểm tra trạng thái sự cố của trip (PUBLIC) — để family biết có SOS không
 * @route   GET /api/family/trip/:shareToken/incidents
 * @access  Public
 */
router.get('/trip/:shareToken/incidents', async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const trip = await Trip.findOne({ shareToken });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hành trình.' });
    }

    const Incident = require('../models/Incident');
    const openIncidents = await Incident.find({
      tripId: trip._id,
      status: { $in: ['open', 'assigned'] }
    }).select('type severity status createdAt message location');

    res.json({
      success: true,
      hasOpenIncident: openIncidents.length > 0,
      incidents: openIncidents
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
