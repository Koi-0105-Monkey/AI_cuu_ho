/**
 * fcmService.js
 * Firebase Cloud Messaging — Gửi push notification đến thiết bị mobile.
 *
 * Cần biến môi trường:
 *   FIREBASE_SERVICE_ACCOUNT_KEY — JSON string của Firebase service account key
 *   (Lấy từ Firebase Console > Project Settings > Service Accounts > Generate new private key)
 *
 * Cài đặt:
 *   cd rescuelink-backend && npm install firebase-admin
 */

let admin = null;
let isInitialized = false;

/**
 * Khởi tạo Firebase Admin SDK (lazy init để không crash nếu chưa có key)
 */
const initFirebase = () => {
  if (isInitialized) return admin;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.warn('[FCMService] FIREBASE_SERVICE_ACCOUNT_KEY not set. Push notifications disabled.');
    return null;
  }

  try {
    admin = require('firebase-admin');
    const serviceAccount = JSON.parse(serviceAccountKey);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    isInitialized = true;
    console.log('[FCMService] Firebase Admin SDK initialized successfully.');
    return admin;
  } catch (err) {
    console.error('[FCMService] Failed to initialize Firebase:', err.message);
    return null;
  }
};

/**
 * Gửi push notification đến 1 thiết bị cụ thể qua FCM token
 * @param {string} fcmToken - FCM registration token của thiết bị
 * @param {string} title - Tiêu đề notification
 * @param {string} body - Nội dung notification
 * @param {Object} data - Data payload thêm (optional)
 * @returns {Promise<boolean>} true nếu thành công
 */
const sendToDevice = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return false;

  const firebase = initFirebase();
  if (!firebase) return false;

  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'rescuelink_alerts'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    await firebase.messaging().send(message);
    return true;
  } catch (err) {
    console.error(`[FCMService] sendToDevice failed for token ${fcmToken?.slice(0, 20)}...: ${err.message}`);
    return false;
  }
};

/**
 * Gửi push notification đến nhiều thiết bị cùng lúc
 * @param {string[]} fcmTokens - Danh sách FCM tokens
 */
const sendToMultipleDevices = async (fcmTokens, title, body, data = {}) => {
  if (!fcmTokens || fcmTokens.length === 0) return;

  const validTokens = fcmTokens.filter(Boolean);
  if (validTokens.length === 0) return;

  const firebase = initFirebase();
  if (!firebase) return;

  try {
    const message = {
      tokens: validTokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: { priority: 'high', notification: { sound: 'default', channelId: 'rescuelink_alerts' } },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } }
    };

    const response = await firebase.messaging().sendEachForMulticast(message);
    console.log(`[FCMService] Sent to ${response.successCount}/${validTokens.length} devices`);
    return response;
  } catch (err) {
    console.error(`[FCMService] sendToMultipleDevices failed: ${err.message}`);
  }
};

/**
 * Gửi SOS notification đến FCM tokens của danh sách liên hệ khẩn cấp
 * @param {Object} user - User đang gặp sự cố
 * @param {Object} incident - Incident vừa tạo
 * @param {string[]} fcmTokens - FCM tokens của người thân
 */
const sendSOSNotification = async (user, incident, fcmTokens) => {
  const title = `🚨 SOS từ ${user.name}!`;
  const body = `${user.name} cần cứu hộ khẩn cấp! Loại: ${incident.type}. Cấp độ: ${incident.severity}/5`;

  return sendToMultipleDevices(fcmTokens, title, body, {
    type: 'SOS',
    incidentId: incident._id?.toString(),
    userId: user._id?.toString(),
    lat: incident.location?.coordinates?.[1]?.toString(),
    lng: incident.location?.coordinates?.[0]?.toString()
  });
};

/**
 * Gửi cảnh báo thời tiết nguy hiểm
 */
const sendWeatherAlert = async (user, weather, fcmToken) => {
  const title = `⛈️ Cảnh báo thời tiết nguy hiểm`;
  const body = `${weather.description} tại vị trí của ${user.name}. Hãy tìm nơi trú ẩn an toàn!`;

  return sendToDevice(fcmToken, title, body, {
    type: 'WEATHER_ALERT',
    weatherCode: weather.weatherCode?.toString(),
    userId: user._id?.toString()
  });
};

module.exports = { sendToDevice, sendToMultipleDevices, sendSOSNotification, sendWeatherAlert };
