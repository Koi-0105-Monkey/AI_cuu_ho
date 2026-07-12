const { sendEmergencySMS } = require('./smsService');
const User = require('../models/User');
const Trip = require('../models/Trip');

async function notifyEmergencyContacts(incident) {
  const finalScore = incident.severityBreakdown?.finalScore || incident.severity;
  if (finalScore < 4) return;

  try {
    const user = await User.findById(incident.userId);
    if (!user) return;

    let shareToken = '';
    if (incident.tripId) {
      const trip = await Trip.findById(incident.tripId);
      shareToken = trip?.shareToken || '';
    } else {
      const activeTrip = await Trip.findOne({ userId: user._id, status: 'active' });
      shareToken = activeTrip?.shareToken || '';
    }

    const lat = incident.location?.coordinates?.[1];
    const lng = incident.location?.coordinates?.[0];

    await sendEmergencySMS(user, {
      type: incident.type,
      lat,
      lng,
      battery: incident.batteryAtTime,
      message: incident.message || '',
      shareToken
    });
  } catch (error) {
    console.error('[Emergency Notify Helper Error]', error.message);
  }
}

module.exports = notifyEmergencyContacts;
