const express = require('express');
const authRoutes = require('./auth');
const tripsRoutes = require('./trips');
const gpsRoutes = require('./gps');
const incidentsRoutes = require('./incidents');
const smsRoutes = require('./sms');
const adminRoutes = require('./admin');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/trips', tripsRoutes);
router.use('/gps', gpsRoutes);
router.use('/incidents', incidentsRoutes);
router.use('/sms', smsRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
