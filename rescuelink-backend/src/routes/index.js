const express = require('express');
const authRoutes = require('./auth');
const tripsRoutes = require('./trips');
const gpsRoutes = require('./gps');
const incidentsRoutes = require('./incidents');
const smsRoutes = require('./sms');
const adminRoutes = require('./admin');
const operatorsRoutes = require('./operators');
const familyRoutes = require('./family');
const weatherRoutes = require('./weather');
const notificationsRoutes = require('./notifications');
const vqgRoutes = require('./vqg');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/trips', tripsRoutes);
router.use('/gps', gpsRoutes);
router.use('/incidents', incidentsRoutes);
router.use('/sms', smsRoutes);
router.use('/admin', adminRoutes);
router.use('/operators', operatorsRoutes);
router.use('/family', familyRoutes);
router.use('/weather', weatherRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/vqg', vqgRoutes);

module.exports = router;
