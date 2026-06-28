const cron = require('node-cron');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { checkTripWeatherAlert } = require('../services/weatherService');
const { sendWeatherAlert } = require('../services/fcmService');
const socketService = require('../services/socketService');

/**
 * Khởi chạy Cron Job kiểm tra thời tiết nguy hiểm cho tất cả các Trip đang active.
 * Chu kỳ: 30 phút một lần
 */
const initWeatherCronJob = () => {
  // '*/30 * * * *' = Mỗi 30 phút
  cron.schedule('*/30 * * * *', async () => {
    console.log('[WeatherJob] Bắt đầu quét thời tiết nguy hiểm cho các chuyến trekking...');

    try {
      const activeTrips = await Trip.find({ status: 'active' });
      console.log(`[WeatherJob] Tìm thấy ${activeTrips.length} chuyến đi đang hoạt động.`);

      for (const trip of activeTrips) {
        const { shouldAlert, weather } = await checkTripWeatherAlert(trip);

        if (shouldAlert && weather) {
          console.log(`[WeatherJob] ⛈️ Phát hiện thời tiết nguy hiểm (${weather.description}) tại trip của user ${trip.userId}`);

          // 1. Lưu cảnh báo thời tiết vào lịch sử trip (tránh lặp lại cảnh báo)
          trip.weatherAlerts.push({
            alertedAt: new Date(),
            weatherCode: weather.weatherCode,
            description: weather.description
          });
          await trip.save();

          // 2. Lấy thông tin user có fcmToken
          const user = await User.findById(trip.userId).select('fcmToken name');
          
          if (user && user.fcmToken) {
            // Gửi push notification đến thiết bị di động của trekker
            await sendWeatherAlert(user, weather, user.fcmToken);
            console.log(`[WeatherJob] Đã gửi push alert thời tiết nguy hiểm tới ${user.name}`);
          }

          // 3. Emit sự kiện socket để báo cho Web Dashboard / Rescue Center biết
          const io = socketService.getIO();
          if (io) {
            io.emit('weather:alert', {
              tripId: trip._id,
              userId: trip.userId,
              userName: user?.name || 'Ẩn danh',
              weather
            });
          }
        }
      }
    } catch (error) {
      console.error('[WeatherJob] Lỗi tiến trình quét thời tiết:', error.message);
    }
  });

  console.log('✅ Weather Warning Cron Job initialized (Quét mỗi 30 phút).');
};

module.exports = { initWeatherCronJob };
