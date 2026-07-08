const cron = require('node-cron');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Incident = require('../models/Incident');
const fcmService = require('../services/fcmService');
const smsService = require('../services/smsService');
const socketService = require('../services/socketService');

/**
 * Kiểm tra định kỳ các chuyến trekking để nhắc nhở check-in hoặc xử lý quá hạn (Dead Man's Switch)
 */
const runCheckinVerification = async () => {
  console.log('[Check-in Verification Job] Running check...');
  try {
    const now = new Date();
    
    // Tìm tất cả các chuyến trekking đang hoạt động
    const activeTrips = await Trip.find({ status: { $in: ['active', 'overdue'] } });
    console.log(`[Check-in Verification Job] Found ${activeTrips.length} active trips to inspect.`);

    for (const trip of activeTrips) {
      const user = await User.findById(trip.userId);
      if (!user) continue;

      // 1. Kiểm tra cảnh báo nhắc check-in trễ (> checkinIntervalMin)
      const lastCheckin = trip.lastCheckinAt || trip.startedAt;
      const diffMs = now.getTime() - new Date(lastCheckin).getTime();
      const diffMin = diffMs / (1000 * 60);

      if (diffMin > trip.checkinIntervalMin && !trip.checkinWarningSent) {
        console.log(`[Check-in Warning] User ${user.name} (Trip: ${trip._id}) is late to check in (${Math.round(diffMin)} mins elapsed).`);
        
        // Gửi push notification nhắc nhở check-in
        if (user.fcmToken) {
          try {
            await fcmService.sendToDevice(
              user.fcmToken,
              '🔔 Xác nhận an toàn',
              'Đã lâu bạn chưa check-in báo cáo an toàn. Vui lòng mở ứng dụng nhấn "Tôi vẫn ổn".',
              {
                type: 'CHECKIN_REQUIRED',
                tripId: trip._id.toString()
              }
            );
          } catch (pushErr) {
            console.warn(`[Check-in Warning] Failed to send push warning to ${user.name}:`, pushErr.message);
          }
        }
        
        // Đánh dấu đã gửi cảnh báo check-in trễ
        trip.checkinWarningSent = true;
        await trip.save();
      }

      // 2. Kiểm tra quá hạn thời gian dự kiến về quá 30 phút -> Kích hoạt SOS tự động
      const returnTime = new Date(trip.expectedReturn);
      const overdueLimit = new Date(returnTime.getTime() + 30 * 60 * 1000); // expectedReturn + 30 phút

      if (now > overdueLimit && trip.status !== 'overdue') {
        console.log(`[Overdue SOS Alert] User ${user.name} (Trip: ${trip._id}) is overdue since ${returnTime.toLocaleTimeString()}. Creating automatic incident.`);
        
        // Đổi trạng thái trip thành overdue
        trip.status = 'overdue';
        await trip.save();

        // Kiểm tra xem đã có incident quá hạn nào đang mở của trip này chưa
        const existingIncident = await Incident.findOne({
          tripId: trip._id,
          type: 'LOST',
          status: { $in: ['open', 'assigned'] }
        });

        if (!existingIncident) {
          const lat = trip.lastKnownLocation?.coordinates[1] || 21.0285;
          const lng = trip.lastKnownLocation?.coordinates[0] || 105.8542;

          // Tạo incident tự động
          const incident = await Incident.create({
            userId: trip.userId,
            tripId: trip._id,
            type: 'LOST',
            severity: 5, // Cấp nguy kịch
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            message: `HỆ THỐNG TỰ ĐỘNG CẢNH BÁO: Quá hạn hành trình dự kiến về (${returnTime.toLocaleTimeString('vi-VN')} ngày ${returnTime.toLocaleDateString('vi-VN')}). Không nhận được tín hiệu check-in.`,
            batteryAtTime: trip.lastBattery || null
          });

          // Gửi SMS khẩn cấp cho người thân của trekker
          try {
            await smsService.sendEmergencySMS(user, {
              type: 'LOST',
              lat,
              lng,
              battery: trip.lastBattery,
              message: `CANH BAO QUA HAN: Chuyen di [${trip.routeName}] tro ve luc ${returnTime.toLocaleTimeString('vi-VN')} nhung chua checkin!`
            });
            console.log(`[Overdue SOS Alert] Emergency SMS sent to contacts of ${user.name}.`);
          } catch (smsErr) {
            console.error(`[Overdue SOS Alert] Failed to send emergency SMS:`, smsErr.message);
          }

          // Emit socket sự kiện sang Web Dashboard chỉ huy
          socketService.emitNewIncident(incident);
        }
      }
    }
  } catch (error) {
    console.error('[Check-in Verification Job] Error:', error.message);
  }
};

/**
 * Khởi tạo cron job check-in (chạy mỗi 5 phút)
 */
const initCheckinCronJob = () => {
  cron.schedule('*/5 * * * *', () => {
    runCheckinVerification();
  });
  console.log('Check-in Verification Cron Job scheduled (Every 5 minutes).');
};

module.exports = {
  runCheckinVerification,
  initCheckinCronJob
};
