const express = require('express');
const path = require('path');
const fs = require('fs');
const Incident = require('../models/Incident');
const Trip = require('../models/Trip');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createIncidentSchema } = require('../utils/validation');
const { upload, isCloudinaryConfigured } = require('../config/cloudinary');
const { analyzeFireImage } = require('../services/aiService');
const socketService = require('../services/socketService');
const smsService = require('../services/smsService');
const geminiService = require('../services/geminiService');
const multer = require('multer');

const router = express.Router();

// Configure multer for voice SOS audio files
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voice-sos-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper to save base64 locally in development if Cloudinary is not available
const saveBase64Locally = (base64String) => {
  const matches = base64String.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const ext = matches[1];
  const data = matches[2];
  const buffer = Buffer.from(data, 'base64');
  
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `fire-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, buffer);
  
  return `/uploads/${filename}`;
};

// @desc    Create an incident
// @route   POST /api/incidents
// @access  Private
router.post('/', protect, validate(createIncidentSchema), async (req, res, next) => {
  try {
    const { type, severity, lat, lng, message, batteryAtTime } = req.body;

    // Find active trip if any
    const activeTrip = await Trip.findOne({ userId: req.user._id, status: 'active' });

    const incident = await Incident.create({
      userId: req.user._id,
      tripId: activeTrip ? activeTrip._id : undefined,
      type,
      severity,
      status: 'open',
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      message,
      batteryAtTime,
      source: 'app'
    });

    // Populate user info for socket payload
    const populatedIncident = await Incident.findById(incident._id).populate('userId', 'name phone medicalProfile');

    // Notify web dashboard via Socket.io
    socketService.emitIncidentNew(populatedIncident);

    // Send Emergency SMS & FCM Notifications to contacts
    try {
      await smsService.sendEmergencySMS(req.user, {
        type,
        lat,
        lng,
        battery: batteryAtTime,
        message
      });
      // Nếu severity >= 4 → gửi thêm alert về rescue team (admin)
      if (severity >= 4) {
        await smsService.sendRescueTeamAlert(incident, req.user);
      }
    } catch (smsError) {
      console.error(`Failed to send emergency SMS for incident: ${smsError.message}`);
    }

    // Gửi FCM Push Notification cho gia đình/người thân có FCM Token
    try {
      const User = require('../models/User');
      const fcmService = require('../services/fcmService');
      
      // Tìm các user liên hệ khẩn cấp có tài khoản trong hệ thống và có fcmToken
      const contactPhones = req.user.emergencyContacts.map(c => c.phone);
      if (contactPhones.length > 0) {
        const contactsWithFcm = await User.find({
          phone: { $in: contactPhones },
          fcmToken: { $ne: null }
        }).select('fcmToken');

        const tokens = contactsWithFcm.map(u => u.fcmToken);
        if (tokens.length > 0) {
          await fcmService.sendSOSNotification(req.user, incident, tokens);
        }
      }
    } catch (fcmError) {
      console.error(`Failed to send FCM notifications for incident: ${fcmError.message}`);
    }

    // If trip exists, update trip status to emergency
    if (activeTrip) {
      activeTrip.status = 'emergency';
      activeTrip.lastSeen = new Date();
      activeTrip.lastKnownLocation = {
        type: 'Point',
        coordinates: [lng, lat]
      };
      await activeTrip.save();
    }

    res.status(201).json({
      success: true,
      incident: populatedIncident
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a fire incident with image (supports multipart/form-data or JSON base64)
// @route   POST /api/incidents/fire
// @access  Private
router.post('/fire', protect, upload.single('image'), async (req, res, next) => {
  try {
    const { lat, lng, message, batteryAtTime, imageBase64 } = req.body;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required and must be numbers' });
    }

    let imageUrl = '';
    
    // 1. Handle image upload
    if (req.file) {
      // If Cloudinary was used, req.file.path is the URL. Otherwise, it is local file path, so map it to static route
      imageUrl = isCloudinaryConfigured ? req.file.path : `/uploads/${req.file.filename}`;
    } else if (imageBase64) {
      if (isCloudinaryConfigured) {
        // Upload base64 to Cloudinary
        const cloudinary = require('cloudinary').v2;
        const uploadResult = await cloudinary.uploader.upload(imageBase64, {
          folder: 'rescuelink_incidents'
        });
        imageUrl = uploadResult.secure_url;
      } else {
        // Save base64 locally
        imageUrl = saveBase64Locally(imageBase64);
      }
    } else {
      return res.status(400).json({ success: false, message: 'Fire image is required (either as file or base64)' });
    }

    // 2. AI Claude Vision Analysis
    const aiAnalysis = await analyzeFireImage(req.file ? (isCloudinaryConfigured ? req.file.path : req.file.path) : imageBase64);
    
    // Auto severity: 4 if AI detects fire, 5 if high confidence, default to 3 if not detected
    let severity = 3;
    let autoMessage = message || '';

    if (aiAnalysis.hasFire) {
      severity = aiAnalysis.confidence > 0.8 ? 5 : 4;
      autoMessage = `[AI XÁC NHẬN CHÁY - Tin cậy: ${(aiAnalysis.confidence * 100).toFixed(0)}%] ${aiAnalysis.description}. ${autoMessage}`;
    } else {
      autoMessage = `[AI Nghi vấn] ${aiAnalysis.description}. ${autoMessage}`;
    }

    // Find active trip if any
    const activeTrip = await Trip.findOne({ userId: req.user._id, status: 'active' });

    // 3. Create Incident
    const incident = await Incident.create({
      userId: req.user._id,
      tripId: activeTrip ? activeTrip._id : undefined,
      type: 'FIRE',
      severity,
      status: 'open',
      location: {
        type: 'Point',
        coordinates: [parsedLng, parsedLat]
      },
      message: autoMessage,
      imageUrl,
      batteryAtTime: batteryAtTime ? parseInt(batteryAtTime) : undefined,
      source: 'app'
    });

    const populatedIncident = await Incident.findById(incident._id).populate('userId', 'name phone medicalProfile');

    // Notify Dashboard
    socketService.emitIncidentNew(populatedIncident);

    // Send Emergency SMS to contacts
    try {
      await smsService.sendEmergencySMS(req.user, {
        type: 'FIRE',
        lat: parsedLat,
        lng: parsedLng,
        battery: batteryAtTime ? parseInt(batteryAtTime) : undefined,
        message: autoMessage
      });
    } catch (smsError) {
      console.error(`Failed to send emergency SMS for fire incident: ${smsError.message}`);
    }

    // If trip exists, update trip status to emergency
    if (activeTrip) {
      activeTrip.status = 'emergency';
      activeTrip.lastSeen = new Date();
      activeTrip.lastKnownLocation = {
        type: 'Point',
        coordinates: [parsedLng, parsedLat]
      };
      await activeTrip.save();
    }

    res.status(201).json({
      success: true,
      incident: populatedIncident,
      aiAnalysis
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all incidents (Admin & Rescuer filter/pagination)
// @route   GET /api/incidents
// @access  Private (Admin/Rescuer only)
router.get('/', protect, authorize('admin', 'rescuer'), async (req, res, next) => {
  try {
    const { type, status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const query = {};

    // Filters
    if (type) query.type = type;
    if (status) query.status = status;
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query)
      .populate('userId', 'name phone medicalProfile')
      .populate('tripId', 'routeName expectedReturn')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: incidents
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single incident details
// @route   GET /api/incidents/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('userId', 'name phone emergencyContacts medicalProfile')
      .populate('tripId', 'routeName startedAt expectedReturn status');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // User can only view their own incidents. Admin/Rescuer can view all.
    if (incident.userId._id.toString() !== req.user._id.toString() && req.user.role === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this incident' });
    }

    res.json({
      success: true,
      data: incident
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get GPS track for an incident's trip
// @route   GET /api/incidents/:id/track
// @access  Private (Admin/Rescuer only)
router.get('/:id/track', protect, authorize('admin', 'rescuer'), async (req, res, next) => {
  try {
    const GpsRaw = require('../models/GpsRaw');
    const incident = await Incident.findById(req.params.id).select('tripId location');
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // If incident has a linked trip, return raw GPS points for that trip
    if (incident.tripId) {
      const points = await GpsRaw.find({ tripId: incident.tripId })
        .sort({ recordedAt: 1 })
        .select('lat lng recordedAt battery -_id');

      const coords = points.map(p => ({ coordinates: [p.lng, p.lat], recordedAt: p.recordedAt }));
      return res.json({ success: true, data: coords });
    }

    // No trip: return single point from incident location
    const coords = incident.location?.coordinates
      ? [{ coordinates: incident.location.coordinates }]
      : [];
    res.json({ success: true, data: coords });
  } catch (error) {
    next(error);
  }
});

// @desc    Update incident status
// @route   PATCH /api/incidents/:id/status
// @access  Private (Admin/Rescuer only)
router.patch('/:id/status', protect, authorize('admin', 'rescuer'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['open', 'assigned', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'name phone medicalProfile');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Emit event
    socketService.emitIncidentUpdated(incident);

    res.json({
      success: true,
      data: incident
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Report incident via Voice SOS (audio recording)
// @route   POST /api/incidents/report-voice-sos
// @access  Private
router.post('/report-voice-sos', protect, uploadAudio.single('audio'), async (req, res, next) => {
  try {
    const { lat, lng, batteryAtTime } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required' });
    }

    const audioUrl = `/uploads/${req.file.filename}`;
    const audioPath = req.file.path;

    // 1. Google Gemini Speech-to-Text translation
    let transcript = '';
    try {
      const audioBuffer = fs.readFileSync(audioPath);
      transcript = await geminiService.transcribeAudio(audioBuffer, req.file.mimetype);
    } catch (sttErr) {
      console.error('[Gemini STT Failed, using fallback]', sttErr.message);
      transcript = "Phát hiện tin nhắn thoại cứu hộ khẩn cấp nhưng lỗi dịch giọng nói.";
    }

    // 2. Google Gemini Entity Extraction
    const geminiResult = await geminiService.processSmsMessage(transcript);
    const entities = {
      victimName: geminiResult.victimName,
      location: geminiResult.location,
      incidentType: geminiResult.incidentType,
      severity: geminiResult.severity
    };

    // Find active trip if any
    const activeTrip = await Trip.findOne({ userId: req.user._id, status: 'active' });

    // Determine type map from entity incidentType
    let type = 'MANUAL';
    const typeMapping = {
      'CHÁY': 'FIRE',
      'TAI_NẠN': 'MED',
      'LẠC': 'LOST',
      'KHÁC': 'MANUAL',
      'Cháy rừng': 'FIRE',
      'Chấn thương': 'MED',
      'Lạc đường': 'LOST',
      'Rắn cắn/Ngộ độc': 'MED',
      'Thiên tai/Mắc kẹt': 'LOST',
      'Sức khỏe yếu': 'MED'
    };
    if (typeMapping[entities.incidentType]) {
      type = typeMapping[entities.incidentType];
    }

    const incident = await Incident.create({
      userId: req.user._id,
      tripId: activeTrip ? activeTrip._id : undefined,
      type,
      severity: entities.severity || 4,
      status: 'open',
      location: {
        type: 'Point',
        coordinates: [
          lng ? parseFloat(lng) : (activeTrip?.startLocation?.coordinates[0] || 105.8542),
          lat ? parseFloat(lat) : (activeTrip?.startLocation?.coordinates[1] || 21.0285)
        ]
      },
      message: `[BÁO CÁO GIỌNG NÓI] ${transcript}`,
      audioUrl,
      voiceTranscript: transcript,
      extractedEntities: {
        victimName: entities.victimName || req.user.name,
        location: entities.location || 'Chưa xác định cụ thể',
        incidentType: entities.incidentType,
        severity: entities.severity
      },
      batteryAtTime: batteryAtTime ? parseInt(batteryAtTime) : undefined,
      source: 'app'
    });

    // Populate user info for socket
    const populatedIncident = await Incident.findById(incident._id).populate('userId', 'name phone medicalProfile');

    // Emit event to Dashboard
    socketService.emitIncidentNew(populatedIncident);

    res.status(201).json({
      success: true,
      data: populatedIncident
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Receive incoming SMS SOS (Trekker offline fallback)
// @route   POST /api/incidents/incoming-sms
// @access  Public (Webhook)
router.post('/incoming-sms', async (req, res, next) => {
  try {
    const { From, Body } = req.body;
    if (!From || !Body) {
      return res.status(400).json({ success: false, message: 'From and Body are required' });
    }

    // 1. Find User by Phone
    let cleanPhone = From.replace('+84', '0');
    let user = await require('../models/User').findOne({ phone: cleanPhone });
    
    // If not found, find by partial matching
    if (!user) {
      const searchPhone = cleanPhone.slice(-9); // last 9 digits
      user = await require('../models/User').findOne({ phone: new RegExp(searchPhone + '$') });
    }

    // Fallback if user not registered
    if (!user) {
      const User = require('../models/User');
      user = await User.findOne({ phone: '0000000000' });
      if (!user) {
        user = await User.create({
          name: `Khách vãng lai (${cleanPhone})`,
          phone: '0000000000',
          password: 'guestpassword123',
          role: 'trekker'
        });
      }
    }

    // 2. Parse GPS from message
    let lat = 21.0285;
    let lng = 105.8542;
    let locationExtracted = false;

    // Match maps.google.com/?q=lat,lng or coordinates lat,lng
    const gpsRegex = /(?:q=)?(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i;
    const gpsMatch = Body.match(gpsRegex);
    if (gpsMatch) {
      lat = parseFloat(gpsMatch[1]);
      lng = parseFloat(gpsMatch[2]);
      locationExtracted = true;
    }

    // 3. Process with Viettel AI NLP
    const cleanBody = Body.replace(/https?:\/\/\S+/g, '').replace(/SOS RescueLink!/g, '').trim();

    let restoredText = cleanBody;
    let entities = { victimName: user.name, location: 'Chưa rõ', incidentType: 'MANUAL', severity: 4 };

    if (cleanBody.length > 2) {
      const geminiResult = await geminiService.processSmsMessage(cleanBody);
      restoredText = geminiResult.textWithDiacritics;
      entities = {
        victimName: geminiResult.victimName,
        location: geminiResult.location,
        incidentType: geminiResult.incidentType,
        severity: geminiResult.severity
      };
    }

    // Find active trip for the user if any
    const activeTrip = await Trip.findOne({ userId: user._id, status: 'active' });
    if (activeTrip && !locationExtracted) {
      if (activeTrip.startLocation?.coordinates) {
        lng = activeTrip.startLocation.coordinates[0];
        lat = activeTrip.startLocation.coordinates[1];
      }
    }

    // Map incident type
    let type = 'MANUAL';
    const typeMapping = {
      'CHÁY': 'FIRE',
      'TAI_NẠN': 'MED',
      'LẠC': 'LOST',
      'KHÁC': 'MANUAL',
      'Cháy rừng': 'FIRE',
      'Chấn thương': 'MED',
      'Lạc đường': 'LOST',
      'Rắn cắn/Ngộ độc': 'MED',
      'Thiên tai/Mắc kẹt': 'LOST',
      'Sức khỏe yếu': 'MED'
    };
    if (typeMapping[entities.incidentType]) {
      type = typeMapping[entities.incidentType];
    }

    const incident = await Incident.create({
      userId: user._id,
      tripId: activeTrip ? activeTrip._id : undefined,
      type,
      severity: entities.severity || 4,
      status: 'open',
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      message: `[SMS SOS - ${cleanPhone}] ${Body}`,
      voiceTranscript: restoredText !== cleanBody ? restoredText : undefined,
      extractedEntities: {
        victimName: entities.victimName !== 'Chưa rõ' ? entities.victimName : user.name,
        location: entities.location !== 'Chưa rõ tọa độ cụ thể' ? entities.location : (locationExtracted ? 'Tọa độ GPS đính kèm' : 'Chưa rõ'),
        incidentType: entities.incidentType,
        severity: entities.severity
      },
      source: 'sms'
    });

    const populatedIncident = await Incident.findById(incident._id).populate('userId', 'name phone medicalProfile');
    socketService.emitIncidentNew(populatedIncident);

    res.json({
      success: true,
      message: 'Incoming SMS processed successfully',
      data: populatedIncident
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Generate Text-to-Speech warning audio (Viettel TTS)
// @route   POST /api/incidents/tts-warning
// @access  Private (Admin/Authority only)
router.post('/tts-warning', protect, authorize('admin', 'authority'), async (req, res, next) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required for TTS conversion' });
    }

    // Mock warning audio URL (since we removed Viettel TTS)
    const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    
    // Simulate scheduling broadcast calls
    console.log(`[TTS Warning Broadcast] Scheduled mock broadcast for warning: "${text}"`);
    
    res.json({
      success: true,
      message: 'Đã giả lập giọng đọc cảnh báo khẩn cấp & lên lịch cuộc gọi tự động thành công!',
      audioUrl
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
