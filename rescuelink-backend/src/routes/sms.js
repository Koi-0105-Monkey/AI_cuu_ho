const express = require('express');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Incident = require('../models/Incident');
const socketService = require('../services/socketService');

const router = express.Router();

// SMS Pattern: [SOS:TYPE] GPS:lat,lng T:timestamp LVL:severity MSG:message
// Example: [SOS:FIRE] GPS:21.0285,105.8542 T:2026-06-25 10:14:00 LVL:4
const SMS_PATTERN = /\[SOS:(\w+)\]\s*GPS:([\d.-]+),([\d.-]+)(?:\s*T:([\d: -]+))?\s*LVL:(\d)/;

// @desc    Twilio SMS Inbound Webhook
// @route   POST /api/sms/inbound
// @access  Public (called by Twilio)
router.post('/inbound', async (req, res, next) => {
  try {
    const fromPhone = req.body.From; // Sender phone number e.g. "+84912345678"
    const messageBody = req.body.Body; // SMS content

    console.log(`Received SMS from ${fromPhone}: ${messageBody}`);

    if (!messageBody) {
      return res.status(400).send('No message body found');
    }

    // Normalize phone number (Twilio sends with country code, e.g., +84912345678)
    // We try to find the user. In Vietnam, users might register as "0912345678", while Twilio sends "+84912345678".
    // Let's do a flexible phone query.
    let phoneQuery = fromPhone;
    if (fromPhone.startsWith('+84')) {
      phoneQuery = '0' + fromPhone.substring(3);
    }

    const user = await User.findOne({
      $or: [
        { phone: fromPhone },
        { phone: phoneQuery }
      ]
    });

    if (!user) {
      console.log(`User not found for phone ${fromPhone}. Incident cannot be auto-created.`);
      // Return simple TwiML indicating user registration is required
      res.type('text/xml');
      return res.send(`
        <Response>
          <Message>RescueLink: So dien thoai ${fromPhone} chua dang ky tren he thong. Vui long dang ky truoc khi su dung.</Message>
        </Response>
      `);
    }

    // Match SMS format
    const match = messageBody.match(SMS_PATTERN);
    if (!match) {
      console.log(`SMS format invalid. Received: ${messageBody}`);
      res.type('text/xml');
      return res.send(`
        <Response>
          <Message>RescueLink: Sai cu phap SOS. Cu phap dung: [SOS:LOAI] GPS:lat,lng LVL:muc_do (1-5)</Message>
        </Response>
      `);
    }

    const type = match[1]; // ACC, LOST, FIRE, MED, VEH, etc.
    const lat = parseFloat(match[2]);
    const lng = parseFloat(match[3]);
    const severity = parseInt(match[5]);

    // Map short SMS codes to Incident Types
    const typeMapping = {
      'ACC': 'CRASH',
      'LOST': 'LOST',
      'FIRE': 'FIRE',
      'MED': 'MED',
      'VEH': 'VEH',
      'CRASH': 'CRASH'
    };

    const incidentType = typeMapping[type.toUpperCase()] || 'MANUAL';

    // Find active trip if any
    const activeTrip = await Trip.findOne({ userId: user._id, status: 'active' });

    // Calculate severity dynamically using Multi-Signal Severity Engine
    const severityEngine = require('../services/severityScoringEngine');
    const scoreResult = await severityEngine.calculateSeverity(
      user,
      lat,
      lng,
      messageBody,
      undefined
    );

    // Create Incident
    const incident = await Incident.create({
      userId: user._id,
      tripId: activeTrip ? activeTrip._id : undefined,
      type: incidentType,
      severity: scoreResult.finalScore,
      severityBreakdown: scoreResult,
      status: 'open',
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      message: `[SMS SOS] Tin nhắn gốc: "${messageBody}"`,
      source: 'sms'
    });

    // Populate user info for socket
    const populatedIncident = await Incident.findById(incident._id).populate('userId', 'name phone');

    // Notify Dashboard
    socketService.emitIncidentNew(populatedIncident);

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

    // Return TwiML response
    res.type('text/xml');
    res.send(`
      <Response>
        <Message>RescueLink: Tin nhan khan cap da duoc ghi nhan. Toi cuu ho dang trien khai den vi tri cua ban.</Message>
      </Response>
    `);

  } catch (error) {
    console.error(`SMS webhook error: ${error.message}`);
    next(error);
  }
});

module.exports = router;
