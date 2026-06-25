import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { haversineDistance, distanceToRoute } from '../utils/geo';
import {
  buildBatterySosMessage,
  buildCheckinFailedMessage,
  buildCircularAnomalyMessage,
  buildDeviationAnomalyMessage
} from '../utils/smsHelper';

export const LOCATION_TASK_NAME = 'background-location-task';

// Configure Notifications to show even if app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// NOTE: Hardcoded backend URL for background thread context (matching api.ts)
const API_URL = 'http://localhost:5000/api';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations }: any = data;
    if (!locations || locations.length === 0) return;

    try {
      // 1. Check if there is an active trekking trip
      const activeTripStr = await AsyncStorage.getItem('active_trip');
      if (!activeTripStr) {
        // No active trip, do not track GPS points
        return;
      }
      const activeTrip = JSON.parse(activeTripStr);

      // Get battery level (0.0 to 1.0)
      let batteryLevel = 1.0;
      try {
        const level = await Battery.getBatteryLevelAsync();
        batteryLevel = level >= 0 ? Math.round(level * 100) : 100;
      } catch (err) {
        console.warn('Failed to get battery level', err);
      }

      // 2. Load the current GPS queue & last recorded timestamp
      const queueStr = await AsyncStorage.getItem('gps_queue');
      const queue = queueStr ? JSON.parse(queueStr) : [];

      const lastTimestampStr = await AsyncStorage.getItem('last_gps_timestamp');
      const lastTimestamp = lastTimestampStr ? parseInt(lastTimestampStr) : 0;

      // 3. Process the newest location point
      const location = locations[0]; // Get the most recent location point
      const { latitude, longitude, altitude, speed, heading } = location.coords;
      const timestamp = location.timestamp;

      // Adaptive frequency interval calculation in seconds
      let requiredInterval = 60; // Default 60 seconds (speed 0.5 - 5 m/s)

      if (batteryLevel <= 10) {
        requiredInterval = 30; // High resolution at 10% battery or below to record final path
      } else if (batteryLevel <= 20) {
        requiredInterval = 600; // Power saving mode (10 minutes)
      } else if (speed > 5) {
        requiredInterval = 30; // High speed (30 seconds)
      } else if (speed < 0.5) {
        requiredInterval = 300; // Stationary / walking slowly (5 minutes)
      }

      const elapsedSeconds = (timestamp - lastTimestamp) / 1000;

      // Check if enough time has passed to save the point
      if (lastTimestamp === 0 || elapsedSeconds >= requiredInterval) {
        const newPoint = {
          lat: latitude,
          lng: longitude,
          altitude: altitude || 0,
          speed: speed >= 0 ? speed : 0,
          heading: heading >= 0 ? heading : 0,
          battery: batteryLevel,
          recordedAt: new Date(timestamp).toISOString()
        };

        // Append to local queue
        queue.push(newPoint);
        await AsyncStorage.setItem('gps_queue', JSON.stringify(queue));
        await AsyncStorage.setItem('last_gps_timestamp', timestamp.toString());

        // Append to full active trip path for drawing on map screen
        try {
          const tripPathStr = await AsyncStorage.getItem('active_trip_path');
          const tripPath = tripPathStr ? JSON.parse(tripPathStr) : [];
          tripPath.push(newPoint);
          await AsyncStorage.setItem('active_trip_path', JSON.stringify(tripPath));
        } catch (pathErr) {
          console.error('[Background] Failed to save active trip path point:', pathErr);
        }

        console.log(`[GPS Saved] Coords: ${latitude},${longitude} | Speed: ${speed}m/s | Batt: ${batteryLevel}%`);

        // Check if we should trigger Battery SOS in background (Module 4)
        await checkBatterySOS(batteryLevel, latitude, longitude);

        // Check passive auto check-in (Module 3)
        await checkPassiveCheckin(speed >= 0 ? speed : 0, latitude, longitude, activeTrip);

        // Check route anomaly (Module 5)
        await detectRouteAnomaly({ lat: latitude, lng: longitude, recordedAt: new Date(timestamp).toISOString() }, activeTrip);

        // 4. Batch upload logic (every 5 minutes or if queue grows larger than 10 points)
        const lastUploadStr = await AsyncStorage.getItem('last_upload_time');
        const lastUpload = lastUploadStr ? parseInt(lastUploadStr) : 0;
        const now = Date.now();
        const uploadElapsedMinutes = (now - lastUpload) / 1000 / 60;

        if (lastUpload === 0 || uploadElapsedMinutes >= 5 || queue.length >= 10) {
          await attemptBatchUpload(queue);
        }
      }
    } catch (e) {
      console.error('Failed to process background location update:', e);
    }
  }
});

// Helper: Attempt to upload the queue to the backend
const attemptBatchUpload = async (queue: any[]) => {
  if (queue.length === 0) return;

  try {
    const token = await AsyncStorage.getItem('user_token');
    if (!token) return;

    console.log(`[GPS Upload] Attempting upload of ${queue.length} points...`);
    
    const response = await axios.post(`${API_URL}/gps/batch`, queue, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      timeout: 8000
    });

    if (response.status === 201 || response.data?.success) {
      console.log(`[GPS Upload] Uploaded ${queue.length} points successfully!`);
      // Clear the successfully uploaded points from local storage
      await AsyncStorage.setItem('gps_queue', JSON.stringify([]));
      await AsyncStorage.setItem('last_upload_time', Date.now().toString());
    }
  } catch (err: any) {
    console.warn('[GPS Upload] Failed (offline fallback active). Error:', err.message);
    // Keep the queue in storage. We will retry on the next trigger.
  }
};

// Helper: Low Battery SOS Trigger in background (Module 4)
const checkBatterySOS = async (batteryLevel: number, lat: number, lng: number) => {
  try {
    const lastTriggeredStr = await AsyncStorage.getItem('last_battery_sos_trigger');
    const lastTriggered = lastTriggeredStr ? parseInt(lastTriggeredStr) : 100;

    // Trigger levels: 20%, 10%, 5%
    let currentTrigger = 100;
    if (batteryLevel <= 5) currentTrigger = 5;
    else if (batteryLevel <= 10) currentTrigger = 10;
    else if (batteryLevel <= 20) currentTrigger = 20;

    // Only trigger if we crossed a threshold downward
    if (currentTrigger < lastTriggered) {
      await AsyncStorage.setItem('last_battery_sos_trigger', currentTrigger.toString());
      console.log(`[Low Battery SOS] Battery reached ${batteryLevel}%. Triggering alert!`);
      
      const activeTripStr = await AsyncStorage.getItem('active_trip');
      if (!activeTripStr) return;
      const activeTrip = JSON.parse(activeTripStr);
      
      // Update trip battery status on server if online
      const token = await AsyncStorage.getItem('user_token');
      if (token) {
        try {
          await axios.patch(`${API_URL}/trips/${activeTrip.id}/battery`, {
            battery: batteryLevel,
            lat,
            lng
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('[Low Battery SOS] Server updated.');
        } catch (e) {
          console.log('[Low Battery SOS] Server update failed (offline).');
        }
      }

      // If battery is extremely low (5% or less), immediately flush the GPS queue to server
      if (batteryLevel <= 5) {
        const finalQueueStr = await AsyncStorage.getItem('gps_queue');
        const finalQueue = finalQueueStr ? JSON.parse(finalQueueStr) : [];
        if (finalQueue.length > 0) {
          console.log('[Low Battery SOS] 5% battery reached. Flushing final GPS queue points.');
          await attemptBatchUpload(finalQueue);
        }
      }

      // SMS fallback alert queued (to be prompted in foreground)
      const timeStr = new Date().toLocaleTimeString();
      const pendingSms = {
        phone: activeTrip.emergencyContact,
        message: buildBatterySosMessage(batteryLevel, lat, lng, timeStr)
      };
      await AsyncStorage.setItem('pending_sms_alert', JSON.stringify(pendingSms));
    }
  } catch (err) {
    console.error('Error in background checkBatterySOS:', err);
  }
};

// Helper: Passive Auto Check-in (Module 3)
const checkPassiveCheckin = async (speed: number, lat: number, lng: number, activeTrip: any) => {
  try {
    const nowTime = Date.now();
    const lastMoveTimeStr = await AsyncStorage.getItem('last_movement_time');
    let lastMoveTime = lastMoveTimeStr ? parseInt(lastMoveTimeStr) : nowTime;

    if (speed > 0.3) {
      // User is moving (> 0.3 m/s) -> Safe. Update last movement timestamp.
      await AsyncStorage.setItem('last_movement_time', nowTime.toString());
      await AsyncStorage.removeItem('checkin_warning_sent');
      await AsyncStorage.removeItem('checkin_failed_triggered');
      await AsyncStorage.removeItem('checkin_lost_incident_created');
      console.log('[Auto Check-in] User moving. Safety confirmed.');
    } else {
      // User is stationary
      if (!lastMoveTimeStr) {
        await AsyncStorage.setItem('last_movement_time', nowTime.toString());
        lastMoveTime = nowTime;
      }

      const stoppedDurationMinutes = (nowTime - lastMoveTime) / 1000 / 60;
      console.log(`[Auto Check-in] User stationary for ${Math.round(stoppedDurationMinutes)} minutes.`);

      // 1. Dừng > 20 phút bất thường: Bắn local notification cảnh báo
      if (stoppedDurationMinutes >= 20) {
        const warningSent = await AsyncStorage.getItem('checkin_warning_sent');
        if (!warningSent) {
          await AsyncStorage.setItem('checkin_warning_sent', 'true');
          await AsyncStorage.setItem('checkin_warning_time', nowTime.toString());

          // Trigger local push notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Bạn có ổn không?",
              body: "RescueLink phát hiện bạn đã dừng di chuyển 20 phút. Vui lòng mở app xác nhận hoặc hệ thống sẽ tự động phát báo động sau 5 phút.",
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null,
          });
          console.log('[Auto Check-in] 20 min warning notification sent.');
        }

        // 2. Không phản hồi trong 5 phút từ khi cảnh báo (tổng cộng 25 phút dừng)
        const warningTimeStr = await AsyncStorage.getItem('checkin_warning_time');
        const warningTime = warningTimeStr ? parseInt(warningTimeStr) : nowTime;
        const warningElapsedMinutes = (nowTime - warningTime) / 1000 / 60;

        const checkinFailedTriggered = await AsyncStorage.getItem('checkin_failed_triggered');
        if (warningElapsedMinutes >= 5 && !checkinFailedTriggered) {
          await AsyncStorage.setItem('checkin_failed_triggered', 'true');
          console.log('[Auto Check-in] No response in 5 mins. Queuing emergency SMS.');

          // SMS fallback warning queued
          const pendingSms = {
            phone: activeTrip.emergencyContact,
            message: buildCheckinFailedMessage(activeTrip.routeName, lat, lng)
          };
          await AsyncStorage.setItem('pending_sms_alert', JSON.stringify(pendingSms));

          // Notify server of battery status update with warning
          const token = await AsyncStorage.getItem('user_token');
          if (token) {
            try {
              await axios.patch(`${API_URL}/trips/${activeTrip.id}/battery`, {
                battery: 100, // placeholder
                lat,
                lng,
                status: 'no_checkin' // Notify admin dashboard of missing checkin status
              }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
            } catch (e) {
              console.warn('[Auto Check-in] Failed to update status on server (offline).');
            }
          }
        }
      }

      // 3. Dừng > 60 phút + không phản hồi -> Tạo incident LOST khẩn cấp
      if (stoppedDurationMinutes >= 60) {
        const incidentCreated = await AsyncStorage.getItem('checkin_lost_incident_created');
        if (!incidentCreated) {
          await AsyncStorage.setItem('checkin_lost_incident_created', 'true');
          console.log('[Auto Check-in] Stopped > 60 mins. Auto creating incident LOST on server.');

          const token = await AsyncStorage.getItem('user_token');
          if (token) {
            try {
              await axios.post(`${API_URL}/incidents`, {
                type: 'LOST',
                severity: 2,
                source: 'auto',
                location: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                message: `Auto check-in failed. Member stationary for ${Math.round(stoppedDurationMinutes)} mins without response.`
              }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              console.log('[Auto Check-in] Incident LOST created successfully.');
            } catch (e) {
              console.warn('[Auto Check-in] Failed to create incident on server (offline).');
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in checkPassiveCheckin:', err);
  }
};

// Helper: AI Route Anomaly Detection (Module 5)
const detectRouteAnomaly = async (currentPt: any, activeTrip: any) => {
  try {
    const now = Date.now();
    const token = await AsyncStorage.getItem('user_token');
    
    // --- 1. Pattern: Going in Circles ---
    const historyStr = await AsyncStorage.getItem('gps_history');
    let history = historyStr ? JSON.parse(historyStr) : [];
    
    // Keep only last 30 minutes of points
    const thirtyMinsAgo = now - 30 * 60 * 1000;
    history = history.filter((pt: any) => new Date(pt.recordedAt).getTime() > thirtyMinsAgo);
    
    // Add current point
    history.push(currentPt);
    await AsyncStorage.setItem('gps_history', JSON.stringify(history));
    
    if (history.length >= 5) {
      const oldestPt = history[0];
      const newestPt = history[history.length - 1];
      
      const oldestTime = new Date(oldestPt.recordedAt).getTime();
      const newestTime = new Date(newestPt.recordedAt).getTime();
      const timeSpanMinutes = (newestTime - oldestTime) / 1000 / 60;
      
      if (timeSpanMinutes >= 20) { // must have at least 20 mins of history to be confident
        // Calculate displacement
        const displacement = haversineDistance(
          { lat: newestPt.lat, lng: newestPt.lng },
          { lat: oldestPt.lat, lng: oldestPt.lng }
        );
        
        // Calculate total path distance
        let totalDistance = 0;
        for (let i = 1; i < history.length; i++) {
          totalDistance += haversineDistance(
            { lat: history[i].lat, lng: history[i].lng },
            { lat: history[i-1].lat, lng: history[i-1].lng }
          );
        }
        
        if (displacement < 200 && totalDistance > 1500) {
          const circleTriggered = await AsyncStorage.getItem('anomaly_circle_triggered');
          if (!circleTriggered) {
            await AsyncStorage.setItem('anomaly_circle_triggered', 'true');
            console.log('[AI Anomaly] User going in circles! Triggering alert.');
            
            // Queue emergency SMS
            const pendingSms = {
              phone: activeTrip.emergencyContact,
              message: buildCircularAnomalyMessage(totalDistance, displacement, newestPt.lat, newestPt.lng)
            };
            await AsyncStorage.setItem('pending_sms_alert', JSON.stringify(pendingSms));
            
            // Send incident to server
            if (token) {
              await axios.post(`${API_URL}/incidents`, {
                type: 'LOST',
                severity: 3,
                source: 'auto',
                location: { type: 'Point', coordinates: [newestPt.lng, newestPt.lat] },
                message: `AI Anomaly Detection: Member walking in circles. Displacement: ${Math.round(displacement)}m, Total distance: ${Math.round(totalDistance)}m in 30 mins.`
              }, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).catch(e => console.warn('Failed to send circle incident to server:', e.message));
            }
          }
        }
      }
    }
    
    // --- 2. Pattern: Route Deviation ---
    const routePointsStr = await AsyncStorage.getItem('route_points');
    if (routePointsStr) {
      const routePoints = JSON.parse(routePointsStr);
      const devDistance = distanceToRoute({ lat: currentPt.lat, lng: currentPt.lng }, routePoints);
      
      if (devDistance > 500) {
        const devTriggered = await AsyncStorage.getItem('anomaly_deviation_triggered');
        if (!devTriggered) {
          await AsyncStorage.setItem('anomaly_deviation_triggered', 'true');
          console.log(`[AI Anomaly] User deviated from route by ${Math.round(devDistance)}m!`);
          
          // Queue emergency SMS
          const pendingSms = {
            phone: activeTrip.emergencyContact,
            message: buildDeviationAnomalyMessage(devDistance, currentPt.lat, currentPt.lng)
          };
          await AsyncStorage.setItem('pending_sms_alert', JSON.stringify(pendingSms));
          
          // Send incident to server
          if (token) {
            await axios.post(`${API_URL}/incidents`, {
              type: 'LOST',
              severity: 3,
              source: 'auto',
              location: { type: 'Point', coordinates: [currentPt.lng, currentPt.lat] },
              message: `AI Anomaly Detection: Member deviated from route by ${Math.round(devDistance)}m.`
            }, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).catch(e => console.warn('Failed to send deviation incident to server:', e.message));
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in detectRouteAnomaly:', err);
  }
};
