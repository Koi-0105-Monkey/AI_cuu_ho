const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * @desc    Lưu FCM Device Token — gọi sau khi user đăng nhập thành công
 * @route   POST /api/notifications/fcm-token
 * @access  Private
 */
router.post('/fcm-token', protect, async (req, res, next) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ success: false, message: 'fcmToken không hợp lệ.' });
    }

    // Xóa token cũ ở các tài khoản khác (tránh 1 device nhận notification của 2 user)
    await User.updateMany(
      { fcmToken, _id: { $ne: req.user._id } },
      { $set: { fcmToken: null } }
    );

    req.user.fcmToken = fcmToken;
    await req.user.save();

    res.json({ success: true, message: 'FCM token đã được lưu.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Xóa FCM token khi user đăng xuất
 * @route   DELETE /api/notifications/fcm-token
 * @access  Private
 */
router.delete('/fcm-token', protect, async (req, res, next) => {
  try {
    req.user.fcmToken = null;
    await req.user.save();
    res.json({ success: true, message: 'FCM token đã được xóa.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Lấy share link của user (để chia sẻ cho gia đình)
 * @route   GET /api/notifications/share-link
 * @access  Private
 */
router.get('/share-link', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('familyShareToken');

    // Tìm active trip của user để lấy shareToken của trip
    const Trip = require('../models/Trip');
    const activeTrip = await Trip.findOne({
      userId: req.user._id,
      status: 'active'
    }).select('shareToken routeName');

    const baseUrl = process.env.WEB_URL || 'https://ai-cuu-ho-web.vercel.app';

    res.json({
      success: true,
      activeTrip: activeTrip
        ? {
            shareToken: activeTrip.shareToken,
            shareUrl: `${baseUrl}/family/${activeTrip.shareToken}`,
            routeName: activeTrip.routeName
          }
        : null,
      message: activeTrip
        ? 'Copy link và gửi cho gia đình để họ theo dõi hành trình của bạn.'
        : 'Chưa có hành trình đang hoạt động. Hãy bắt đầu một chuyến đi trước.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
