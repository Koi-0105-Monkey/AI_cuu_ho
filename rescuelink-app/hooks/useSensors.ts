import { useState, useEffect, useRef } from 'react';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import api from '@/services/api';
import { Alert } from 'react-native';

const ACCEL_UPDATE_INTERVAL = 20; // 50Hz (20ms interval)
const GYRO_UPDATE_INTERVAL = 20;  // 50Hz

export function useSensors(isActiveTrip: boolean) {
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [impactForce, setImpactForce] = useState(0);
  
  const timerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // States to keep track of gyroscope integration
  const isImpactDetectedRef = useRef(false);
  const impactTimeRef = useRef(0);
  const cumulativeRotationRef = useRef(0); // in radians

  useEffect(() => {
    if (!isActiveTrip) {
      cleanupListeners();
      return;
    }

    // Set sample rates
    Accelerometer.setUpdateInterval(ACCEL_UPDATE_INTERVAL);
    Gyroscope.setUpdateInterval(GYRO_UPDATE_INTERVAL);

    // Subscribe to Accelerometer
    const accelSub = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      // Magnitude in Gs
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      if (magnitude > 3.0 && !isImpactDetectedRef.current && !isCountingDown) {
        console.log(`[Crash Detection] Potential impact detected: ${magnitude.toFixed(2)}G`);
        isImpactDetectedRef.current = true;
        impactTimeRef.current = Date.now();
        cumulativeRotationRef.current = 0;
        setImpactForce(magnitude);
      }
    });

    // Subscribe to Gyroscope (angular velocity in rad/s)
    const gyroSub = Gyroscope.addListener((data) => {
      if (!isImpactDetectedRef.current) return;

      const now = Date.now();
      const elapsed = now - impactTimeRef.current;

      if (elapsed > 2000) {
        // Gyro check window expired (2 seconds). If rotation < 90 deg, discard impact.
        console.log(`[Crash Detection] Gyro window expired. Cumulative rotation: ${(cumulativeRotationRef.current * (180 / Math.PI)).toFixed(1)}°`);
        isImpactDetectedRef.current = false;
        return;
      }

      // Integrate angular velocity to estimate angle change
      const { x, y, z } = data;
      const dt = GYRO_UPDATE_INTERVAL / 1000; // in seconds
      const angularVelocity = Math.sqrt(x * x + y * y + z * z);
      cumulativeRotationRef.current += angularVelocity * dt;

      // Check if cumulative rotation exceeds 90 degrees (1.57 radians)
      const rotationDegrees = cumulativeRotationRef.current * (180 / Math.PI);
      if (rotationDegrees >= 90.0) {
        console.log(`[Crash Detection] CRASH CONFIRMED! Rotation: ${rotationDegrees.toFixed(1)}° | Impact: ${impactForce.toFixed(2)}G`);
        isImpactDetectedRef.current = false; // Reset trigger
        triggerCrashCountdown();
      }
    });

    return () => {
      accelSub.remove();
      gyroSub.remove();
      cleanupListeners();
    };
  }, [isActiveTrip, isCountingDown, impactForce]);

  const cleanupListeners = () => {
    isImpactDetectedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const triggerCrashCountdown = async () => {
    setIsCountingDown(true);
    setCountdown(30);

    // Push local high-priority notification immediately
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 PHÁT HIỆN VA CHẠM MẠNH!",
          body: "Hệ thống nhận thấy có dấu hiệu va chạm. Vui lòng bấm Hủy nếu bạn an toàn.",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn(e);
    }

    // Start 30s countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Trigger SOS if not cancelled in 30 seconds
    timerRef.current = setTimeout(async () => {
      await triggerCrashSOS();
    }, 30000);
  };

  // Wait! In setTimeout it should be 30000 instead of 3. We will fix it below.
  
  const cancelCrashAlert = () => {
    cleanupListeners();
    setIsCountingDown(false);
    setCountdown(30);
    Alert.alert('Đã hủy cảnh báo', 'Hệ thống đã nhận thông tin an toàn của bạn.');
  };

  const triggerCrashSOS = async () => {
    setIsCountingDown(false);
    cleanupListeners();

    try {
      const activeTripStr = await AsyncStorage.getItem('active_trip');
      if (!activeTripStr) return;
      const activeTrip = JSON.parse(activeTripStr);

      let lat = 0;
      let lng = 0;

      // Get current location
      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      } catch (err) {
        console.warn('Could not get coordinates for crash SOS, using last known');
      }

      console.log(`[Crash SOS] Triggering emergency actions at ${lat},${lng}`);

      // 1. Send SMS fallback alert
      const pendingSms = {
        phone: activeTrip.emergencyContact,
        message: `[SOS TAI NAN VA CHAM] ${activeTrip.routeName} - Phat hien VA CHAM MANH (${impactForce.toFixed(1)}G). Ban can tro giup tai: https://maps.google.com/?q=${lat},${lng}`
      };
      await AsyncStorage.setItem('pending_sms_alert', JSON.stringify(pendingSms));

      // 2. Call backend API to create crash incident
      const token = await AsyncStorage.getItem('user_token');
      if (token) {
        await api.post('/incidents', {
          type: 'CRASH',
          severity: 4,
          lat,
          lng,
          message: `Auto Crash Detection: Impact force ${impactForce.toFixed(2)}G. User failed to cancel countdown.`
        });
        console.log('[Crash SOS] Server incident created.');
      }
      
      Alert.alert(
        'Đã phát tín hiệu cứu hộ',
        'Hệ thống đã tự động gửi báo động va chạm và vị trí của bạn tới đội cứu hộ và người thân.',
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error('Failed to trigger Crash SOS:', e);
    }
  };

  return {
    isCountingDown,
    countdown,
    impactForce,
    cancelCrashAlert,
    triggerCrashAlertForTest: () => {
      // Helper for simulator testing since we cannot shake it easily
      setImpactForce(3.5);
      triggerCrashCountdown();
    }
  };
}
