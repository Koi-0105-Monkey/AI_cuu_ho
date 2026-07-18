const express = require('express');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const Trip = require('../models/Trip');
const TripGroup = require('../models/TripGroup');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTripGroupSchema, joinTripGroupSchema } = require('../utils/validation');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateUniqueJoinCode = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const exists = await TripGroup.exists({ joinCode: pin });
    if (!exists) return pin;
  }
  throw new Error('Không thể sinh mã PIN duy nhất sau 10 lần thử.');
};

const generateQRDataUrl = async (content) => {
  return await QRCode.toDataURL(content, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
};

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

const createGroupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each user to 5 requests per hour
  keyGenerator: (req) => req.user._id.toString(),
  message: {
    success: false,
    message: 'Bạn đã tạo nhóm quá nhiều lần. Vui lòng thử lại sau 1 giờ.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const joinRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each user to 10 attempts per hour
  keyGenerator: (req) => req.user._id.toString(),
  message: {
    success: false,
    message: 'Bạn đã thử gia nhập nhóm quá nhiều lần. Vui lòng thử lại sau 1 giờ.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @desc    Tạo Trip Group (đoàn đi lẻ tự phát) mới + sinh PIN & QR Code tự động
 * @route   POST /api/v1/trip-groups
 * @access  Private (Trekker đã đăng nhập)
 */
router.post('/', protect, createGroupRateLimiter, validate(createTripGroupSchema), async (req, res, next) => {
  try {
    const { groupName, routeName, description, plannedStartDate, plannedEndDate } = req.body;

    // Sinh mã PIN 6 số duy nhất
    const joinCode = await generateUniqueJoinCode();

    // Sinh QR Code
    const qrPayload = JSON.stringify({ joinCode, groupName, routeName });
    const qrCodeDataUrl = await generateQRDataUrl(qrPayload);

    const group = await TripGroup.create({
      groupName,
      routeName,
      description: description || '',
      leaderId: req.user._id,
      plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
      plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
      status: 'active', // nhóm đi lẻ kích hoạt hoạt động luôn
      joinCode,
      qrCodeDataUrl
    });

    // Tự động gán người tạo nhóm (leader) vào nhóm
    let activeTrip = await Trip.findOne({ userId: req.user._id, status: 'active' });
    if (!activeTrip) {
      activeTrip = await Trip.create({
        userId: req.user._id,
        groupId: group._id,
        routeName: routeName,
        status: 'active',
        expectedReturn: plannedEndDate ? new Date(plannedEndDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastKnownLocation: { type: 'Point', coordinates: [0, 0] }
      });
    } else {
      activeTrip.groupId = group._id;
      await activeTrip.save();
    }

    group.memberTripIds.push(activeTrip._id);

    // Lưu thông tin của người tạo nhóm vào memberMedicalInfo (không lưu plaintext y tế nhạy cảm)
    const user = await User.findById(req.user._id);

    group.memberMedicalInfo.push({
      userId: req.user._id,
      tripId: activeTrip._id,
      emergencyContactPhone: user?.emergencyContacts?.[0]?.phone || '',
      joinedAt: new Date()
    });

    await group.save();

    res.status(201).json({
      success: true,
      message: `Đoàn "${groupName}" đã được tạo thành công.`,
      group,
      trip: { id: activeTrip._id }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Trekker gia nhập đoàn bằng mã PIN 6 số (hoặc quét QR)
 * @route   POST /api/v1/trip-groups/join
 * @access  Private (Trekker đã đăng nhập)
 */
router.post('/join', protect, joinRateLimiter, validate(joinTripGroupSchema), async (req, res, next) => {
  try {
    const { joinCode, emergencyContactPhone } = req.body;

    // Tìm đoàn theo mã PIN
    const group = await TripGroup.findOne({ joinCode: String(joinCode).trim() })
      .populate('leaderId', 'name phone');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Mã PIN không hợp lệ hoặc đoàn không tồn tại.' });
    }

    if (['completed', 'emergency'].includes(group.status)) {
      return res.status(400).json({
        success: false,
        message: `Đoàn này đã ${group.status === 'completed' ? 'kết thúc' : 'trong tình huống khẩn cấp'}. Không thể gia nhập.`
      });
    }

    // Tìm chuyến đi đang hoạt động của trekker
    let activeTrip = await Trip.findOne({ userId: req.user._id, status: 'active' });

    // Nếu chưa có trip, tạo một trip mới gắn với nhóm
    if (!activeTrip) {
      activeTrip = await Trip.create({
        userId: req.user._id,
        groupId: group._id,
        routeName: group.routeName,
        status: 'active',
        expectedReturn: group.plannedEndDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastKnownLocation: { type: 'Point', coordinates: [0, 0] }
      });
    } else {
      // Gán trip vào nhóm nếu chưa có hoặc đổi nhóm
      if (activeTrip.groupId?.toString() !== group._id.toString()) {
        activeTrip.groupId = group._id;
        await activeTrip.save();
      }
    }

    // Thêm trip vào danh sách memberTripIds nếu chưa có
    const alreadyMember = group.memberTripIds.some(
      id => id.toString() === activeTrip._id.toString()
    );

    if (!alreadyMember) {
      group.memberTripIds.push(activeTrip._id);
    }

    // Lưu thông tin ghép đoàn (upsert theo userId, không lưu plaintext y tế nhạy cảm)
    const existingMedIdx = group.memberMedicalInfo.findIndex(
      m => m.userId && m.userId.toString() === req.user._id.toString()
    );
    const medRecord = {
      userId: req.user._id,
      tripId: activeTrip._id,
      emergencyContactPhone: emergencyContactPhone || '',
      joinedAt: new Date()
    };
    if (existingMedIdx >= 0) {
      group.memberMedicalInfo[existingMedIdx] = medRecord;
    } else {
      group.memberMedicalInfo.push(medRecord);
    }

    await group.save();

    res.json({
      success: true,
      message: `Bạn đã tham gia đoàn "${group.groupName}" thành công.`,
      group: {
        id: group._id,
        groupName: group.groupName,
        routeName: group.routeName,
        status: group.status,
        plannedStartDate: group.plannedStartDate,
        plannedEndDate: group.plannedEndDate,
        leaderName: group.leaderId?.name,
        leaderPhone: group.leaderId?.phone
      },
      trip: { id: activeTrip._id }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
