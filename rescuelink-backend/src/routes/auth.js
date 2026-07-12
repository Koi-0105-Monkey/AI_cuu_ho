const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../utils/validation');

const rateLimit = require('express-rate-limit');

const router = express.Router();

const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 5, // Giới hạn 5 lần đăng nhập / 5 phút / IP hoặc Số điện thoại
  skip: () => process.env.NODE_ENV === 'test',
  keyGenerator: (req) => req.body.phone || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 5 phút.' }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, phone, password, emergencyContacts, medicalProfile } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ phone });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this phone number'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      phone,
      passwordHash,
      emergencyContacts: emergencyContacts || [],
      medicalProfile: medicalProfile || {}
    });

    if (user) {
      res.status(201).json({
        success: true,
        token: generateToken(user._id),
        viettelMapsKey: process.env.VITE_VIETTEL_MAPS_KEY || '',
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isRanger: user.isRanger || false,
          emergencyContacts: user.emergencyContacts,
          medicalProfile: user.medicalProfile
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginRateLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // Find user
    const user = await User.findOne({ phone });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      res.json({
        success: true,
        token: generateToken(user._id),
        viettelMapsKey: process.env.VITE_VIETTEL_MAPS_KEY || '',
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isRanger: user.isRanger || false,
          emergencyContacts: user.emergencyContacts,
          medicalProfile: user.medicalProfile || {}
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    res.json({
      success: true,
      viettelMapsKey: process.env.VITE_VIETTEL_MAPS_KEY || '',
      user: {
        id: req.user._id,
        name: req.user.name,
        phone: req.user.phone,
        role: req.user.role,
        isRanger: req.user.isRanger || false,
        emergencyContacts: req.user.emergencyContacts,
        medicalProfile: req.user.medicalProfile || {}
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update current user profile
// @route   PATCH /api/auth/profile
// @access  Private
router.patch('/profile', protect, async (req, res, next) => {
  try {
    const { name, emergencyContacts, medicalProfile } = req.body;

    if (name) req.user.name = name;
    if (emergencyContacts) req.user.emergencyContacts = emergencyContacts;
    if (medicalProfile) {
      req.user.medicalProfile = {
        ...req.user.medicalProfile,
        ...medicalProfile
      };
    }

    await req.user.save();

    res.json({
      success: true,
      viettelMapsKey: process.env.VITE_VIETTEL_MAPS_KEY || '',
      user: {
        id: req.user._id,
        name: req.user.name,
        phone: req.user.phone,
        role: req.user.role,
        isRanger: req.user.isRanger || false,
        emergencyContacts: req.user.emergencyContacts,
        medicalProfile: req.user.medicalProfile
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get Google Maps API Key
// @route   GET /api/auth/google-maps-key
// @access  Private
router.get('/google-maps-key', protect, (req, res) => {
  res.json({
    success: true,
    googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

module.exports = router;
