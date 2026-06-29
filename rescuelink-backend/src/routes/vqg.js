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

// @desc    Search locations and POIs in Vietnam (Viettel Maps API Proxy with Fallback)
// @route   GET /api/vqg/search
// @access  Private
router.get('/search', protect, async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Từ khóa tìm kiếm tối thiểu 2 ký tự' });
    }

    const VIETTEL_MAPS_KEY = process.env.VITE_VIETTEL_MAPS_KEY || '';

    // Mock POIs ở Đà Nẵng, Hà Nội, Lào Cai (Fansipan) phục vụ việc tìm kiếm các từ khoá của user
    const POI_DATABASE = [
      {
        display_name: "Siêu thị GO! Đà Nẵng, 255-257 Hùng Vương, Vĩnh Trung, Thanh Khê, Đà Nẵng",
        lat: "16.06782",
        lon: "108.21405",
        type: "supermarket"
      },
      {
        display_name: "Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng",
        lat: "16.12056",
        lon: "108.27833",
        type: "nature_reserve"
      },
      {
        display_name: "Hải đăng Tiên Sa, Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng",
        lat: "16.13890",
        lon: "108.28310",
        type: "lighthouse"
      },
      {
        display_name: "Đỉnh Fansipan, VQG Hoàng Liên, Sa Pa, Lào Cai",
        lat: "22.30333",
        lon: "103.77500",
        type: "mountain"
      },
      {
        display_name: "Vườn Quốc Gia Hoàng Liên, Sa Pa, Lào Cai",
        lat: "22.35678",
        lon: "103.78912",
        type: "national_park"
      },
      {
        display_name: "Trạm Kiểm lâm Núi Xẻ, VQG Hoàng Liên, Sa Pa, Lào Cai",
        lat: "22.34890",
        lon: "103.77820",
        type: "ranger_station"
      },
      {
        display_name: "Trạm Kiểm lâm Tôn San, VQG Hoàng Liên, Sa Pa, Lào Cai",
        lat: "22.31540",
        lon: "103.80120",
        type: "ranger_station"
      },
      {
        display_name: "Thác Bạc, Sa Pa, Lào Cai",
        lat: "22.36012",
        lon: "103.77945",
        type: "waterfall"
      },
      {
        display_name: "Đèo Ô Quy Hồ, Sa Pa, Lào Cai",
        lat: "22.35412",
        lon: "103.73812",
        type: "mountain_pass"
      },
      {
        display_name: "Vườn Quốc gia Ba Vì, Tản Lĩnh, Ba Vì, Hà Nội",
        lat: "21.08120",
        lon: "105.37050",
        type: "national_park"
      },
      {
        display_name: "Khu di tích Tây Yên Tử, Sơn Động, Bắc Giang",
        lat: "21.17850",
        lon: "106.72120",
        type: "historic_site"
      },
      {
        display_name: "Chùa Đồng, Tây Yên Tử, Uông Bí, Quảng Ninh",
        lat: "21.16140",
        lon: "106.72560",
        type: "temple"
      },
      {
        display_name: "Vườn quốc gia Cúc Phương, Nho Quan, Ninh Bình",
        lat: "20.31667",
        lon: "105.60833",
        type: "national_park"
      },
      {
        display_name: "Cầu Rồng, An Hải Tây, Sơn Trà, Đà Nẵng",
        lat: "16.06111",
        lon: "108.22639",
        type: "bridge"
      },
      {
        display_name: "Ngũ Hành Sơn, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng",
        lat: "16.00278",
        lon: "108.26389",
        type: "mountain"
      },
      {
        display_name: "Cầu Vàng, Bà Nà Hills, Hòa Vang, Đà Nẵng",
        lat: "15.99500",
        lon: "107.99611",
        type: "tourist_attraction"
      },
      {
        display_name: "Hồ Xuân Hương, Đà Lạt, Lâm Đồng",
        lat: "11.94167",
        lon: "108.44444",
        type: "lake"
      }
    ];

    let searchResults = [];

    if (VIETTEL_MAPS_KEY) {
      try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        // Viettel Maps search API hỗ trợ tìm kiếm POI toàn quốc
        const url = `https://maps.viettelmap.vn/api/v1/search?text=${encodeURIComponent(query)}&key=${VIETTEL_MAPS_KEY}&limit=10`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Hỗ trợ linh hoạt cấu trúc kết quả của Viettel Maps (results, data hoặc array trực tiếp)
        const rawResults = data.results || data.data || (Array.isArray(data) ? data : null);
        
        if (rawResults && rawResults.length > 0) {
          searchResults = rawResults.map(item => {
            let lat = '0';
            let lon = '0';
            
            if (item.location) {
              lat = String(item.location.lat || item.location.latitude || '0');
              lon = String(item.location.lng || item.location.longitude || '0');
            } else {
              lat = String(item.lat || item.latitude || '0');
              lon = String(item.lon || item.lng || item.longitude || '0');
            }
            
            return {
              display_name: item.name + (item.address ? `, ${item.address}` : ''),
              lat,
              lon,
              type: item.type || 'poi'
            };
          }).filter(item => item.lat !== '0' && item.lon !== '0');
        }
      } catch (err) {
        console.warn('Viettel Maps search API error, falling back to local search:', err.message);
      }
    }

    if (searchResults.length === 0) {
      const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      searchResults = POI_DATABASE.filter(poi => {
        const normalizedName = poi.display_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalizedName.includes(normalizedQuery);
      });

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
    }

    res.json({
      success: true,
      data: searchResults
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Debug & Test Viettel AI Services (Mock or Production)
// @route   GET /api/vqg/debug-viettel-ai
// @access  Public
router.get('/debug-viettel-ai', async (req, res, next) => {
  try {
    const { transcribeAudio, restoreDiacritics, extractEntities, textToSpeech } = require('../services/viettelAiService');
    const textQuery = req.query.text || 'toi dang bi lac o gan dinh ta xua tinh laocai';
    
    // Test 1: Khôi phục dấu tiếng Việt (Diacritics Restorer)
    const restoredText = await restoreDiacritics(textQuery);
    
    // Test 2: Trích xuất thực thể khẩn cấp (NER)
    const entities = await extractEntities(restoredText);
    
    // Test 3: Chuyển văn bản cảnh báo thành giọng nói (TTS)
    const ttsUrl = await textToSpeech(`Cảnh báo khẩn cấp: phát hiện sự cố ${entities.incidentType || 'cứu nạn'} liên quan đến ${entities.victimName || 'nạn nhân'} tại ${entities.location || 'khu vực lân cận'}`);
    
    // Test 4: Ghi âm (Speech-to-Text mock)
    const transcribedText = await transcribeAudio('dummy_base64_audio_data');

    res.json({
      success: true,
      mode: process.env.VIETTEL_AI_MODE || 'mock',
      config: {
        hasToken: !!process.env.VIETTEL_AI_TOKEN,
      },
      input: textQuery,
      tests: {
        diacriticsRestorer: {
          description: "Khôi phục dấu tiếng Việt cho SMS không dấu",
          output: restoredText
        },
        namedEntityRecognition: {
          description: "Trích xuất thông tin khẩn cấp từ văn bản có dấu",
          output: entities
        },
        textToSpeech: {
          description: "Tạo file âm thanh cảnh báo bằng giọng đọc Viettel",
          audioUrl: ttsUrl
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
