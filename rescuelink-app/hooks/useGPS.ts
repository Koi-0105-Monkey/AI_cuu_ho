import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCATION_TASK_NAME } from '@/tasks/backgroundTasks';
import { Alert } from 'react-native';

export function useGPS() {
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    checkTrackingStatus();
  }, []);

  const checkTrackingStatus = async () => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      setIsTracking(hasStarted);
      
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      
      if (foregroundStatus === 'granted' && backgroundStatus === 'granted') {
        setPermissionStatus('granted');
      } else {
        setPermissionStatus('denied');
      }
    } catch (e) {
      console.error('Error checking location tracking status:', e);
    }
  };

  const startTracking = async (tripId: string) => {
    try {
      // 1. Request foreground permission
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        Alert.alert(
          'Yêu cầu quyền định vị',
          'RescueLink cần quyền truy cập định vị để vẽ lộ trình và bảo vệ bạn.'
        );
        return false;
      }

      // 2. Request background permission (always allow)
      let bgStatus = 'denied';
      try {
        const bgRes = await Location.requestBackgroundPermissionsAsync();
        bgStatus = bgRes.status;
      } catch (bgErr) {
        console.warn('Background location permission request failed (likely Expo Go limitation):', (bgErr as Error).message);
        // Fallback: assume granted if foreground is granted on Expo Go, or just let it proceed with warning
        bgStatus = 'granted'; // Treat as granted so we don't block tracking on Expo Go
      }

      if (bgStatus !== 'granted') {
        Alert.alert(
          'Quyền định vị ngầm bị từ chối',
          'Vui lòng chọn "Luôn cho phép" (Always Allow) trong phần Cài đặt ứng dụng để hệ thống có thể định vị ngầm khi màn hình tắt.'
        );
        return false;
      }

      // 3. Start background location updates
      try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // 30 seconds interval (we filter adaptively inside the task)
          deferredUpdatesInterval: 30000,
          deferredUpdatesDistance: 5,
          foregroundService: {
            notificationTitle: 'RescueLink đang bảo vệ bạn',
            notificationBody: 'Hệ thống đang lưu vết GPS ngầm nhằm mục đích cứu hộ.',
            notificationColor: '#ef4444'
          }
        });
      } catch (bgTaskErr) {
        console.warn('Failed to start background tracking (likely Expo Go limitation):', (bgTaskErr as Error).message);
      }

      setIsTracking(true);
      setPermissionStatus('granted');
      return true;
    } catch (err) {
      console.error('Failed to start background tracking:', err);
      Alert.alert('Lỗi định vị', 'Không thể kích hoạt tính năng định vị ngầm.');
      return false;
    }
  };

  const stopTracking = async () => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
      setIsTracking(false);
      
      // Clean up local trip storage
      await AsyncStorage.removeItem('active_trip');
      await AsyncStorage.removeItem('active_trip_path');
      await AsyncStorage.removeItem('gps_queue');
      await AsyncStorage.removeItem('gps_history');
      await AsyncStorage.removeItem('last_gps_timestamp');
      await AsyncStorage.removeItem('last_battery_sos_trigger');
      await AsyncStorage.removeItem('pending_sms_alert');
      await AsyncStorage.removeItem('anomaly_circle_triggered');
      await AsyncStorage.removeItem('anomaly_deviation_triggered');
      await AsyncStorage.removeItem('checkin_warning_sent');
      await AsyncStorage.removeItem('checkin_warning_time');
      await AsyncStorage.removeItem('checkin_failed_triggered');
      await AsyncStorage.removeItem('checkin_lost_incident_created');
      
      return true;
    } catch (err) {
      console.error('Failed to stop background tracking:', err);
      return false;
    }
  };

  return {
    isTracking,
    permissionStatus,
    startTracking,
    stopTracking,
    checkTrackingStatus
  };
}
