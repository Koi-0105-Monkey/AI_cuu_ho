const express = require('express');
const Operator = require('../models/Operator');
const User = require('../models/User');
const Trip = require('../models/Trip');
const TripGroup = require('../models/TripGroup');
const bcrypt = require('bcryptjs');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema } = require('../utils/validation');

const router = express.Router();

/**
 * @desc    Đăng ký tài khoản Tour Operator (Công ty tour) mới
 * @route   POST /api/operators/register
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  try {
    const { companyName, phone, email, address, password } = req.body;

    // 1. Kiểm tra xem User đã tồn tại với SĐT này chưa
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Số điện thoại này đã được đăng ký.' });
    }

    // 2. Tạo User tài khoản operator
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: companyName,
      phone,
      passwordHash,
      role: 'operator'
    });

    // 3. Tạo Operator profile
    const operator = await Operator.create({
      companyName,
      phone,
      email,
      address,
      adminUserId: user._id
    });

    // Cập nhật lại operatorId cho user
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
 * @desc    Tạo Trip Group (Đoàn trekking) mới
 * @route   POST /api/operators/groups
 * @access  Private (Chỉ Operator)
 */
router.post('/groups', protect, authorize('operator'), async (req, res, next) => {
  try {
    const { groupName, routeName, description, leaderId, plannedStartDate, plannedEndDate } = req.body;

    const operator = await Operator.findOne({ adminUserId: req.user._id });
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin công ty.' });
    }

    const group = await TripGroup.create({
      groupName,
      routeName,
      description,
      operatorId: operator._id,
      leaderId: leaderId || null,
      plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
      plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
      status: 'planned'
    });

    res.status(201).json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Thêm trekker (Trip) vào đoàn
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

    // Kiểm tra xem trip có tồn tại không
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hành trình của thành viên.' });
    }

    // Thêm trip vào đoàn nếu chưa có
    if (!group.memberTripIds.includes(tripId)) {
      group.memberTripIds.push(tripId);
      await group.save();

      // Cập nhật groupId vào Trip
      trip.groupId = group._id;
      await trip.save();
    }

    res.json({ success: true, group });
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

    // Tìm tất cả các Trip thuộc TripGroup của Operator này
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

    // Đếm tổng số trekker
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
