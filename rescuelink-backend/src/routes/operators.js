const express = require('express');
const QRCode = require('qrcode');
const Operator = require('../models/Operator');
const User = require('../models/User');
const Trip = require('../models/Trip');
const TripGroup = require('../models/TripGroup');
const bcrypt = require('bcryptjs');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema } = require('../utils/validation');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sinh mã PIN 6 chữ số duy nhất, không bắt đầu bằng 0
 * Thử tối đa 10 lần để đảm bảo không trùng với db
 */
const generateUniqueJoinCode = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const exists = await TripGroup.exists({ joinCode: pin });
    if (!exists) return pin;
  }
  throw new Error('Không thể sinh mã PIN duy nhất sau 10 lần thử.');
};

/**
 * Sinh QR Code dạng base64 data URL (PNG) từ nội dung text
 */
const generateQRDataUrl = async (content) => {
  return await QRCode.toDataURL(content, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
};

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @desc    Đăng ký tài khoản Tour Operator (Công ty tour) mới
 * @route   POST /api/operators/register
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  try {
    const { companyName, phone, email, address, password } = req.body;

    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Số điện thoại này đã được đăng ký.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: companyName,
      phone,
      passwordHash,
      role: 'operator'
    });

    const operator = await Operator.create({
      companyName,
      phone,
      email,
      address,
      adminUserId: user._id
    });

    user.operatorId = operator._id;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Đăng ký công ty tour thành công.',
      operator
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Tạo Trip Group (Đoàn trekking) mới + sinh PIN & QR Code tự động
 * @route   POST /api/operators/groups
 * @access  Private (Chỉ Operator)
 */
router.post('/groups', protect, authorize('operator'), async (req, res, next) => {
  try {
    const {
      groupName, routeName, description, leaderId,
      plannedStartDate, plannedEndDate,
      geofenceCoordinates, allowedBufferMeters
    } = req.body;

    const operator = await Operator.findOne({ adminUserId: req.user._id });
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin công ty.' });
    }

    // Sinh mã PIN 6 số duy nhất
    const joinCode = await generateUniqueJoinCode();

    // Sinh QR Code — embed joinCode + groupName để app có thể parse ra nhanh
    const qrPayload = JSON.stringify({ joinCode, groupName, routeName });
    const qrCodeDataUrl = await generateQRDataUrl(qrPayload);

    const group = await TripGroup.create({
      groupName,
      routeName,
      description,
      operatorId: operator._id,
      leaderId: leaderId || null,
      plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
      plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
      status: 'planned',
      joinCode,
      qrCodeDataUrl,
      geofenceCorridor: geofenceCoordinates && geofenceCoordinates.length >= 2
        ? { type: 'LineString', coordinates: geofenceCoordinates }
        : undefined,
      allowedBufferMeters: allowedBufferMeters || 200
    });

    res.status(201).json({
      success: true,
      message: `Đoàn "${groupName}" đã được tạo thành công.`,
      group: {
        ...group.toObject(),
        qrCodeDataUrl // trả về data URL để Web Dashboard render <img>
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Trekker gia nhập đoàn bằng mã PIN 6 số (hoặc quét QR)
 * @route   POST /api/operators/groups/join
 * @access  Private (Trekker đã đăng nhập)
 */
router.post('/groups/join', protect, async (req, res, next) => {
  try {
    const { joinCode, emergencyContactPhone } = req.body;

    if (!joinCode) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã PIN 6 số của đoàn.' });
    }

    // Tìm đoàn theo mã PIN
    const group = await TripGroup.findOne({ joinCode: String(joinCode).trim() })
      .populate('operatorId', 'companyName phone')
      .populate('leaderId', 'name phone');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Mã PIN không hợp lệ hoặc đoàn không tồn tại.' });
    }

    if (['completed', 'emergency'].includes(group.status)) {
      return res.status(400).json({ success: false, message: `Đoàn này đã ${group.status === 'completed' ? 'kết thúc' : 'trong tình huống khẩn cấp'}. Không thể gia nhập.` });
    }

    // Tìm chuyến đi đang active của trekker
    let activeTrip = await Trip.findOne({ userId: req.user._id, status: 'active' });

    // Nếu chưa có trip, tạo một trip mới gắn với nhóm
    if (!activeTrip) {
      activeTrip = await Trip.create({
        userId: req.user._id,
        groupId: group._id,
        routeName: group.routeName,
        status: 'active',
        expectedReturn: group.plannedEndDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        lastKnownLocation: { type: 'Point', coordinates: [0, 0] }
      });
    } else {
      // Gán trip vào nhóm nếu chưa có
      if (!activeTrip.groupId) {
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
        company: group.operatorId?.companyName,
        leaderName: group.leaderId?.name,
        leaderPhone: group.leaderId?.phone
      },
      trip: { id: activeTrip._id }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Thêm trekker (Trip) vào đoàn (thủ công từ Dashboard)
 * @route   POST /api/operators/groups/:id/members
 * @access  Private (Chỉ Operator)
 */
router.post('/groups/:id/members', protect, authorize('operator'), async (req, res, next) => {
  try {
    const { tripId } = req.body;
    const group = await TripGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đoàn.' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hành trình của thành viên.' });
    }

    if (!group.memberTripIds.includes(tripId)) {
      group.memberTripIds.push(tripId);
      await group.save();

      trip.groupId = group._id;
      await trip.save();
    }

    res.json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Lấy dữ liệu chuẩn hóa để xuất file PDF khai báo hành trình gửi BQL VQG
 * @route   GET /api/operators/groups/:id/manifest
 * @access  Private (Operator Admin hoặc Authority/Ranger)
 */
router.get('/groups/:id/manifest', protect, authorize('admin', 'rescuer'), async (req, res, next) => {
  try {
    const group = await TripGroup.findById(req.params.id)
      .populate('operatorId', 'companyName phone email address')
      .populate('leaderId', 'name phone');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đoàn.' });
    }

    // Lấy thông tin chi tiết các thành viên và thông tin y tế đã được giải mã của họ
    const trips = await Trip.find({ _id: { $in: group.memberTripIds } })
      .populate('userId', 'name phone isRanger medicalProfile');

    const MedicalAuditLog = require('../models/MedicalAuditLog');

    // Gộp thông tin y tế vào từng thành viên
    const members = [];
    for (const trip of trips) {
      const med = group.memberMedicalInfo.find(
        m => m.userId && m.userId.toString() === trip.userId?._id?.toString()
      );
      const user = trip.userId || {};
      const medProfile = user.medicalProfile || {};

      // Xây dựng medicalNotes từ profile đã giải mã của User
      const medicalNotesParts = [];
      if (medProfile.allergies) medicalNotesParts.push(`Dị ứng: ${medProfile.allergies}`);
      if (medProfile.medications) medicalNotesParts.push(`Thuốc: ${medProfile.medications}`);
      if (medProfile.chronicConditions) medicalNotesParts.push(`Bệnh nền: ${medProfile.chronicConditions}`);
      if (medProfile.notes) medicalNotesParts.push(`Ghi chú: ${medProfile.notes}`);

      // Ghi nhật ký truy cập thông tin y tế nếu người xem không phải chủ sở hữu
      if (user._id && user._id.toString() !== req.user._id.toString()) {
        try {
          await MedicalAuditLog.create({
            viewerId: req.user._id,
            targetUserId: user._id,
            action: 'view'
          });
        } catch (auditErr) {
          console.error('[AuditLog] Failed to create access log for manifest member:', auditErr.message);
        }
      }

      members.push({
        name: user.name || 'Chưa rõ',
        phone: user.phone || '',
        isLeader: group.leaderId?._id?.toString() === user._id?.toString(),
        bloodType: medProfile.bloodType || 'Chưa khai báo',
        medicalNotes: medicalNotesParts.join('. ') || 'Không có',
        emergencyContactPhone: med?.emergencyContactPhone || user.phone || '',
        joinedAt: med?.joinedAt || trip.startedAt
      });
    }

    res.json({
      success: true,
      data: {
        // Thông tin công ty tour
        companyName: group.operatorId?.companyName || '',
        companyPhone: group.operatorId?.phone || '',
        companyEmail: group.operatorId?.email || '',
        companyAddress: group.operatorId?.address || '',

        // Thông tin chuyến đi
        groupId: group._id,
        groupName: group.groupName,
        routeName: group.routeName,
        description: group.description,
        plannedStartDate: group.plannedStartDate,
        plannedEndDate: group.plannedEndDate,
        status: group.status,

        // Hướng dẫn viên trưởng đoàn
        leaderName: group.leaderId?.name || '',
        leaderPhone: group.leaderId?.phone || '',

        // Danh sách thành viên kèm thông tin y tế
        totalMembers: members.length,
        members,

        // Metadata xuất file
        exportedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Lấy danh sách các chuyến đi (Trips) thuộc quản lý của Operator
 * @route   GET /api/operators/trips
 * @access  Private (Chỉ Operator)
 */
router.get('/trips', protect, authorize('operator'), async (req, res, next) => {
  try {
    const operator = await Operator.findOne({ adminUserId: req.user._id });
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin công ty.' });
    }

    const groups = await TripGroup.find({ operatorId: operator._id }).populate({
      path: 'memberTripIds',
      populate: { path: 'userId', select: 'name phone lastBattery' }
    });

    res.json({ success: true, groups });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Lấy danh sách đoàn của Operator kèm thông tin QR và PIN
 * @route   GET /api/operators/groups
 * @access  Private (Chỉ Operator)
 */
router.get('/groups', protect, authorize('operator'), async (req, res, next) => {
  try {
    const operator = await Operator.findOne({ adminUserId: req.user._id });
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin công ty.' });
    }

    const groups = await TripGroup.find({ operatorId: operator._id })
      .populate('leaderId', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, groups });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Thống kê số liệu cho Tour Operator Dashboard
 * @route   GET /api/operators/analytics
 * @access  Private (Chỉ Operator)
 */
router.get('/analytics', protect, authorize('operator'), async (req, res, next) => {
  try {
    const operator = await Operator.findOne({ adminUserId: req.user._id });
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin công ty.' });
    }

    const groupCount = await TripGroup.countDocuments({ operatorId: operator._id });
    const activeGroupCount = await TripGroup.countDocuments({ operatorId: operator._id, status: 'active' });

    const groups = await TripGroup.find({ operatorId: operator._id });
    const memberTripIds = groups.flatMap(g => g.memberTripIds);
    const totalTrekkerCount = memberTripIds.length;

    res.json({
      success: true,
      stats: {
        totalGroups: groupCount,
        activeGroups: activeGroupCount,
        totalTrekkers: totalTrekkerCount
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
