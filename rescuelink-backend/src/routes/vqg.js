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

    let searchResults = [];

    // 1. Primary Engine: Nominatim OpenStreetMap Official API (Tìm kiếu cực nhạy mọi quán xá, địa danh, ngõ hẻm VN)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=vn&format=json&addressdetails=1&limit=15`;
      const nomResp = await fetch(nomUrl, {
        headers: { 'User-Agent': 'RescueLinkSafetyTech/1.0 (Vietnam Search Engine)' },
        signal: AbortSignal.timeout(5000)
      });
      const nomData = await nomResp.json();

      if (Array.isArray(nomData) && nomData.length > 0) {
        searchResults = nomData.map(item => ({
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon,
          type: item.type || item.class || 'poi'
        }));
      }
    } catch (nomErr) {
      console.warn('Nominatim Search API fetch failed:', nomErr.message);
    }

    // 2. Secondary Engine: Local Docker Photon / Komoot Photon API
    if (searchResults.length < 5) {
      const localPhotonUrl = process.env.PHOTON_URL || 'http://localhost:2322';
      try {
        const url = `${localPhotonUrl.replace(/\/$/, '')}/api?q=${encodeURIComponent(query)}&limit=10&lang=vi`;
        const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
        const data = await response.json();
        
        if (data && data.features && data.features.length > 0) {
          const photonResults = data.features.map(feat => {
            const props = feat.properties;
            const name = props.name || '';
            const addressParts = [
              props.street,
              props.district,
              props.city || props.state || props.county,
              props.country
            ].filter(Boolean);
            const display_name = name + (addressParts.length > 0 ? `, ${addressParts.join(', ')}` : '');
            
            return {
              display_name,
              lat: String(feat.geometry.coordinates[1]),
              lon: String(feat.geometry.coordinates[0]),
              type: props.osm_value || 'address'
            };
          });
      }
    }

    // 4. Fallback cuối cùng OpenStreetMap Nominatim
    if (searchResults.length === 0) {
      try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=vn`,
          { headers: { 'User-Agent': 'RescueLinkApp/1.0' } }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          searchResults = data.map(item => ({
            display_name: item.display_name,
            lat: item.lat,
            lon: item.lon,
            type: item.type || 'address'
          }));
        }
      } catch (osmErr) {
        console.error('All geocoding search APIs failed:', osmErr.message);
      }
    }

    res.json({
      success: true,
      data: searchResults
    });

  } catch (error) {
    next(error);
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
