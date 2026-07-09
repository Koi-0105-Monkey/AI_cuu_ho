const express = require('express');
const Threat = require('../models/Threat');
const { protect, authorize } = require('../middleware/auth');
const socketService = require('../services/socketService');
const { searchAdministrativeUnits } = require('../utils/administrativeUnits');

const router = express.Router();

// @desc    Get real satellite fire hotspots from NASA FIRMS & USGS Earthquakes
// @route   GET /api/vqg/hotspots
// @access  Private (Admin/Operator/Rescuer)
router.get('/hotspots', protect, async (req, res, next) => {
  try {
    const nasaKey = process.env.NASA_FIRMS_KEY || 'f2f6d1fd3bf4dd2d3796ef510aac1322';
    let realHotspots = [];

    // 1. Fetch real NASA FIRMS active fire hotspots (7-day range)
    if (nasaKey) {
      try {
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${nasaKey}/VIIRS_SNPP_NRT/102,8,110,24/7`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const csvText = await response.text();

        const lines = csvText.trim().split('\n');
        if (lines.length > 1) {
          const header = lines[0].split(',');
          const latIdx = header.indexOf('latitude');
          const lngIdx = header.indexOf('longitude');
          const satIdx = header.indexOf('satellite');
          const confIdx = header.indexOf('confidence');
          const frpIdx = header.indexOf('frp');
          const dateIdx = header.indexOf('acq_date');
          const timeIdx = header.indexOf('acq_time');

          for (let i = 1; i < lines.length && realHotspots.length < 50; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 10 && cols[latIdx] && cols[lngIdx]) {
              const lat = parseFloat(cols[latIdx]);
              const lng = parseFloat(cols[lngIdx]);
              const frp = parseFloat(cols[frpIdx]) || 15.0;
              const conf = cols[confIdx] === 'h' ? 'High' : cols[confIdx] === 'l' ? 'Low' : 'Nominal';
              const sat = cols[satIdx] || 'VIIRS';
              const acqDate = cols[dateIdx] || new Date().toISOString().split('T')[0];
              const acqTime = cols[timeIdx] || '1200';

              realHotspots.push({
                id: `nasa_fire_${i}_${Date.now()}`,
                lat,
                lng,
                satellite: `NASA VIIRS (${sat})`,
                confidence: conf,
                frp: parseFloat(frp.toFixed(1)),
                acqTime: `${acqDate}T${acqTime.slice(0, 2)}:${acqTime.slice(2, 4)}:00Z`,
                status: 'Cháy rừng xác minh bởi Vệ tinh NASA'
              });
            }
          }
        }
      } catch (nasaErr) {
        console.warn('NASA FIRMS API error:', nasaErr.message);
      }
    }

    // 2. Fetch real USGS Earthquakes in SE Asia / Vietnam region
    try {
      const usgsUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=0&maxlatitude=25&minlongitude=95&maxlongitude=115&minmagnitude=2.5&limit=10';
      const eqResp = await fetch(usgsUrl, { signal: AbortSignal.timeout(6000) });
      const eqData = await eqResp.json();

      if (eqData.features && Array.isArray(eqData.features)) {
        eqData.features.forEach((eq, idx) => {
          const coords = eq.geometry?.coordinates || [];
          if (coords.length >= 2) {
            realHotspots.push({
              id: `usgs_eq_${eq.id || idx}`,
              lat: coords[1],
              lng: coords[0],
              satellite: 'USGS Động Đất Real-time',
              confidence: 'High',
              frp: eq.properties?.mag ? eq.properties.mag * 10 : 30.0,
              acqTime: new Date(eq.properties?.time || Date.now()).toISOString(),
              status: `Động đất M${eq.properties?.mag || '3.0'} - ${eq.properties?.place || 'Khu vực ĐNA'}`
            });
          }
        });
      }
    } catch (eqErr) {
      console.warn('USGS Earthquake API error:', eqErr.message);
    }

    res.json({
      success: true,
      source: 'REAL_SATELLITE_AND_USGS_DATA',
      count: realHotspots.length,
      data: realHotspots
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

// @desc    Search locations and POIs in Vietnam (Nominatim OpenStreetMap Engine + Photon + Local POIs)
// @route   GET /api/vqg/search or /api/search/locations
// @access  Private
router.get('/search', protect, async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Từ khóa tìm kiếm tối thiểu 2 ký tự' });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey || googleApiKey.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Google Maps API Key chưa được cấu hình ở file .env' });
    }

    const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleApiKey}&language=vi&region=vn`;
    const resp = await fetch(googleUrl);
    const data = await resp.json();
    
    let searchResults = [];
    if (data && data.results && Array.isArray(data.results)) {
      searchResults = data.results.map(item => ({
        display_name: item.formatted_address || item.name,
        lat: String(item.geometry?.location?.lat || 0),
        lon: String(item.geometry?.location?.lng || 0),
        type: (item.types && item.types[0]) || 'poi'
      }));
    }

    res.json({
      success: true,
      data: searchResults
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Reverse geocode coordinates to get address name
// @route   GET /api/vqg/reverse or /api/search/reverse
// @access  Public
router.get('/reverse', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số lat/lng' });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey || googleApiKey.trim().length === 0) {
      return res.json({
        success: false,
        display_name: `Tọa độ: ${lat}, ${lng} (Chưa cấu hình Google Maps Key)`,
        address: {}
      });
    }

    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}&language=vi`;
    const resp = await fetch(googleUrl);
    const data = await resp.json();
    
    if (data && data.results && data.results.length > 0) {
      res.json({
        success: true,
        display_name: data.results[0].formatted_address,
        address: {}
      });
    } else {
      res.json({
        success: false,
        display_name: `Tọa độ: ${lat}, ${lng}`,
        address: {}
      });
    }
  } catch (error) {
    console.error('[Reverse Geocode Error]:', error.message);
    res.json({
      success: false,
      display_name: `Tọa độ: ${req.query.lat}, ${req.query.lng}`,
      address: {}
    });
  }
});


// @desc    Debug & Test Google Gemini AI Services (Mock or Production)
// @route   GET /api/vqg/debug-gemini-ai
// @access  Public
router.get('/debug-gemini-ai', async (req, res, next) => {
  try {
    const { transcribeAudio, processSmsMessage } = require('../services/geminiService');
    const textQuery = req.query.text || 'toi dang bi lac o gan dinh ta xua tinh laocai';
    
    const geminiResult = await processSmsMessage(textQuery);
    const transcribedText = await transcribeAudio('dummy_base64_audio_data');

    res.json({
      success: true,
      mode: process.env.GEMINI_MODE || 'mock',
      config: {
        hasToken: !!process.env.GEMINI_API_KEY,
      },
      input: textQuery,
      tests: {
        geminiResult: {
          description: "Khôi phục dấu tiếng Việt & Trích xuất thực thể khẩn cấp cứu nạn bằng Gemini 1.5 Flash",
          output: geminiResult
        },
        speechToText: {
          description: "Dịch file ghi âm Voice SOS thành văn bản (mock)",
          output: transcribedText
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
