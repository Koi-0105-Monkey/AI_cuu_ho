const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../utils/validation');

const router = express.Router();

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
    const { name, phone, password, emergencyContacts } = req.body;

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
      emergencyContacts: emergencyContacts || []
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
          emergencyContacts: user.emergencyContacts
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
router.post('/login', validate(loginSchema), async (req, res, next) => {
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
          emergencyContacts: user.emergencyContacts
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
        emergencyContacts: req.user.emergencyContacts
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
    const { name, emergencyContacts } = req.body;

    if (name) req.user.name = name;
    if (emergencyContacts) req.user.emergencyContacts = emergencyContacts;

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
        emergencyContacts: req.user.emergencyContacts
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
