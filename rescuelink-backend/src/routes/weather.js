const express = require('express');
const { getWeather } = require('../services/weatherService');

const router = express.Router();

/**
 * @desc    Lấy dự báo thời tiết tại tọa độ GPS
 * @route   GET /api/weather?lat=&lng=
 * @access  Public (không cần auth — app cần gọi kể cả chưa login)
 */
router.get('/', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số lat/lng hợp lệ. Ví dụ: /api/weather?lat=21.02&lng=105.85'
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Tọa độ không hợp lệ.' });
    }

    const weather = await getWeather(lat, lng);

    res.json({
      success: true,
      weather,
      location: { lat, lng }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
