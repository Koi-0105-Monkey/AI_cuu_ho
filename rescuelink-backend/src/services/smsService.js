const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromPhone  = process.env.TWILIO_PHONE_NUMBER;

// Số nhận alert khẩn cấp — admin/rescue team (set qua env RESCUE_ALERT_PHONE)
const rescueAlertPhone = process.env.RESCUE_ALERT_PHONE || '+84349113452';

const isTwilioConfigured = accountSid &&
  authToken &&
  fromPhone &&
  !accountSid.startsWith('ACXXXX');

/**
 * ⚠️  SMS_MOCK_MODE
 * Đặt SMS_MOCK_MODE=true trong .env để tắt gửi SMS thật khi test.
 * Tin nhắn sẽ chỉ được in ra console — KHÔNG mất tiền Twilio.
 *
 * Mặc định:
 *   - development / test → mock (an toàn, không tốn tiền)
 *   - production        → gửi thật (cần Twilio được cấu hình đúng)
 */
const isMockMode =
  process.env.SMS_MOCK_MODE === 'true' ||
  (process.env.NODE_ENV !== 'production' && process.env.SMS_MOCK_MODE !== 'false');

let twilioClient;

if (isTwilioConfigured && !isMockMode) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS Client initialized (PRODUCTION mode — SMS thật sẽ được gửi).');
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error.message);
  }
} else if (isMockMode) {
  console.log('📵 SMS MOCK MODE ON — Không gửi SMS thật. Tin nhắn sẽ hiển thị trong console.');
  console.log('   → Để bật SMS thật: set SMS_MOCK_MODE=false trong .env (chỉ dùng ở production!)');
} else {
  console.log('Twilio credentials not configured. Using Mock SMS Service.');
}


/**
 * Format phone number to E.164 (required by Twilio)
 * Hỗ trợ số Việt Nam bắt đầu bằng 0 → +84
 */
const formatPhoneE164 = (phone) => {
  if (!phone) return phone;
  if (phone.startsWith('+')) return phone;           // Đã đúng format
  if (phone.startsWith('0')) return '+84' + phone.slice(1); // VN: 0896... → +84896...
  return '+84' + phone;                              // Fallback
};

/**
 * Gửi SMS
 * @param {string} to - Số điện thoại nhận (tự động format E.164)
 * @param {string} body - Nội dung SMS (max 160 chars)
 * @returns {Promise<{success, messageId?, mock}>}
 */
const sendSMS = async (to, body) => {
  const formattedTo = formatPhoneE164(to);

  if (twilioClient && isTwilioConfigured) {
    try {
      const message = await twilioClient.messages.create({
        body,
        from: fromPhone,
        to: formattedTo,
      });
      console.log(`SMS sent to ${formattedTo}. SID: ${message.sid}`);
      return { success: true, messageId: message.sid, mock: false };
    } catch (error) {
      console.error(`Twilio SMS failed to ${formattedTo}:`, error.message);
      return { success: false, error: error.message, mock: false };
    }
  } else {
    // Mock send — in ra console để debug
    console.log(`\n================== [MOCK SMS] ==================`);
    console.log(`From: ${fromPhone || '+1234567890'}`);
    console.log(`To:   ${formattedTo}`);
    console.log(`Body: "${body}"`);
    console.log(`================================================\n`);
    await new Promise(resolve => setTimeout(resolve, 50));
    return { success: true, messageId: `mock_${Date.now()}`, mock: true };
  }
};

/**
 * Helper bỏ dấu tiếng Việt → GSM-7 standard (tránh double charge SMS)
 */
const removeVietnameseTones = (str) => {
  let result = str;
  result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  result = result.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  result = result.replace(/đ/g, 'd');
  result = result.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  result = result.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  result = result.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  result = result.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  result = result.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  result = result.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  result = result.replace(/Đ/g, 'D');
  result = result.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  result = result.replace(/\u02C6|\u0306|\u031B/g, '');
  return result;
};

/**
 * Gửi SMS khẩn cấp cho danh sách liên hệ của user
 * @param {object} user - User doc (có name, emergencyContacts)
 * @param {object} data - { type, lat, lng, battery, message }
 */
const sendEmergencySMS = async (user, data) => {
  const { type, lat, lng, battery, message } = data;

  if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
    console.log(`No emergency contacts for user ${user.name}`);
    return [];
  }

  const cleanName = removeVietnameseTones(user.name);
  let smsContent = '';

  let medStr = '';
  if (user.medicalProfile) {
    const { bloodType, allergies } = user.medicalProfile;
    if (bloodType && bloodType !== 'unknown') {
      medStr += `|Mau:${bloodType}`;
    }
    if (allergies && allergies.trim()) {
      const cleanAllergies = removeVietnameseTones(allergies.trim()).substring(0, 15);
      medStr += `|DiUng:${cleanAllergies}`;
    }
  }

  if (type === 'BATTERY') {
    smsContent = removeVietnameseTones(
      `[SOS RescueLink] CANH BAO PIN YEU ${battery}% tu ${cleanName}. Vi tri cuoi GPS:${lat},${lng}. Hay lien lac ngay!`
    );
  } else {
    const cleanMsg = message ? removeVietnameseTones(message) : '';
    smsContent = removeVietnameseTones(
      `[SOS RescueLink] KHAN CAP: ${type} tu ${cleanName}. GPS:${lat},${lng}. Pin:${battery || 'N/A'}%${medStr}. "${cleanMsg}"`
    );
  }

  // Giới hạn 160 ký tự
  if (smsContent.length > 160) {
    smsContent = smsContent.substring(0, 157) + '...';
  }

  const sendPromises = user.emergencyContacts.map(contact =>
    sendSMS(contact.phone, smsContent)
      .then(res => ({ contactName: contact.name, phone: contact.phone, ...res }))
  );

  return Promise.all(sendPromises);
};

/**
 * Gửi SMS alert đến rescue team (admin)
 * Dùng khi có incident mới severity >= 4
 */
const sendRescueTeamAlert = async (incident, user) => {
  const type = incident.type || 'UNKNOWN';
  const lat = incident.location?.coordinates?.[1] || 'N/A';
  const lng = incident.location?.coordinates?.[0] || 'N/A';
  const userName = user?.name || 'Unknown';
  const userPhone = user?.phone || 'N/A';

  const body = removeVietnameseTones(
    `[RescueLink ALERT] Su co ${type} cap ${incident.severity}/5 tu ${userName} (${userPhone}). GPS:${lat},${lng}. Kiem tra dashboard ngay!`
  );

  return sendSMS(rescueAlertPhone, body);
};

module.exports = {
  sendSMS,
  sendEmergencySMS,
  sendRescueTeamAlert,
  formatPhoneE164,
  isTwilioConfigured,
};
