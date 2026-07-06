const express = require('express');
const Threat = require('../models/Threat');
const { protect, authorize } = require('../middleware/auth');
const socketService = require('../services/socketService');
const { searchAdministrativeUnits } = require('../utils/administrativeUnits');

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

// @desc    Search locations and POIs in Vietnam (Photon Geocoder with Fallbacks)
// @route   GET /api/vqg/search or /api/search/locations
// @access  Private
router.get('/search', protect, async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Từ khóa tìm kiếm tối thiểu 2 ký tự' });
    }

    const POI_DATABASE = [
      { display_name: "Đỉnh Fansipan, VQG Hoàng Liên, Sa Pa, Lào Cai", lat: "22.30333", lon: "103.77500", type: "mountain" },
      { display_name: "Đỉnh Tà Xùa, Trạm Tấu, Yên Bái", lat: "21.43120", lon: "104.56890", type: "mountain" },
      { display_name: "Đỉnh Lảo Thần, Y Tý, Bát Xát, Lào Cai", lat: "22.61240", lon: "103.62150", type: "mountain" },
      { display_name: "Đỉnh Bạch Mộc Lương Tử (Kỳ Quan San), Bát Xát, Lào Cai", lat: "22.50890", lon: "103.60450", type: "mountain" },
      { display_name: "Đỉnh Pu Ta Leng, Tam Đường, Lai Châu", lat: "22.42150", lon: "103.60980", type: "mountain" },
      { display_name: "Đỉnh Ngũ Chỉ Sơn, Sa Pa, Lào Cai", lat: "22.40890", lon: "103.73120", type: "mountain" },
      { display_name: "Đỉnh Nhìu Cồ San, Bát Xát, Lào Cai", lat: "22.56450", lon: "103.58780", type: "mountain" },
      { display_name: "Siêu thị GO! Đà Nẵng, 255-257 Hùng Vương, Vĩnh Trung, Thanh Khê, Đà Nẵng", lat: "16.06782", lon: "108.21405", type: "supermarket" },
      { display_name: "Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng", lat: "16.12056", lon: "108.27833", type: "nature_reserve" },
      { display_name: "Thác Bạc, Sa Pa, Lào Cai", lat: "22.36012", lon: "103.77945", type: "waterfall" },
      { display_name: "Đèo Ô Quy Hồ, Sa Pa, Lào Cai", lat: "22.35412", lon: "103.73812", type: "mountain_pass" },
      { display_name: "Vườn Quốc gia Ba Vì, Tản Lĩnh, Ba Vì, Hà Nội", lat: "21.08120", lon: "105.37050", type: "national_park" },
      { display_name: "Vườn Quốc gia Cúc Phương, Nho Quan, Ninh Bình", lat: "20.31667", lon: "105.60833", type: "national_park" },
      { display_name: "Cầu Rồng, An Hải Tây, Sơn Trà, Đà Nẵng", lat: "16.06111", lon: "108.22639", type: "bridge" },
      { display_name: "Ngũ Hành Sơn, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng", lat: "16.00278", lon: "108.26389", type: "mountain" },
      { display_name: "Cầu Vàng, Bà Nà Hills, Hòa Vang, Đà Nẵng", lat: "15.99500", lon: "107.99611", type: "tourist_attraction" },
      { display_name: "Hồ Xuân Hương, Đà Lạt, Lâm Đồng", lat: "11.94167", lon: "108.44444", type: "lake" }
    ];

    let searchResults = [];

    // 1. Thử gọi Photon Server local (Docker PHOTON_URL hoặc default http://localhost:2322)
    const localPhotonUrl = process.env.PHOTON_URL || 'http://localhost:2322';
    try {
      const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
      const url = `${localPhotonUrl.replace(/\/$/, '')}/api?q=${encodeURIComponent(query)}&limit=10&lang=vi`;
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        searchResults = data.features.map(feat => {
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
    } catch (photonLocalErr) {
      // Local Photon container không phản hồi, thử Komoot Photon public API
    }

    // 2. Fallback Komoot Photon Public API (https://photon.komoot.io)
    if (searchResults.length === 0) {
      try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const url = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=10&lang=vi`;
        const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
        const data = await response.json();
        
        if (data && data.features && data.features.length > 0) {
          searchResults = data.features.map(feat => {
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
      } catch (komootErr) {
        console.warn('Komoot Photon public search error:', komootErr.message);
      }
    }

    // 3. Fallback danh mục POI leo núi địa phương & Đơn vị hành chính Việt Nam
    if (searchResults.length === 0) {
      const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      searchResults = POI_DATABASE.filter(poi => {
        const normalizedName = poi.display_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalizedName.includes(normalizedQuery);
      });

      const adminMatches = searchAdministrativeUnits(query, 5);
      if (adminMatches.length > 0) {
        searchResults = [...searchResults, ...adminMatches];
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
