import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from '@/tw';
import { Alert, StyleSheet, ActivityIndicator, Platform, Share, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as SMS from 'expo-sms';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { useGPS } from '@/hooks/useGPS';
import api from '@/services/api';
import { haversineDistance } from '@/utils/geo';
import { flushOfflineQueue } from '@/services/queueService';
import { downloadRouteTiles } from '@/utils/offlineMap';
import { buildCompressedSosMessage } from '@/utils/smsHelper';


// Custom dark mode theme style for Google Maps
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1a1a1a" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8c8c8c" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a1a1a" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#333333" }] },
  { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#b3b3b3" }] },
  { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative.neighborhood", "stylers": [{ "visibility": "off" }] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#1c1c1c" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#808080" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#262626" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8c8c8c" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#333333" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4d4d4d" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#262626" }] },
  { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#8c8c8c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0d1a26" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#4d4d4d" }] }
];

export default function TrackingActiveScreen() {
  const router = useRouter();
  const { stopTracking } = useGPS();
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [routePoints, setRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [walkedPath, setWalkedPath] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const rawBattery = Battery.useBatteryLevel();
  const batteryLevel = rawBattery !== null && rawBattery >= 0 ? Math.round(rawBattery * 100) : 100;
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  
  // Offline sync & warning states
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingSms, setPendingSms] = useState<any>(null);
  const [checkinWarning, setCheckinWarning] = useState<boolean>(false);
  const [ending, setEnding] = useState<boolean>(false);

  // Destination Search and Offline Caching states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDest, setSelectedDest] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  // Panic SOS countdown and tap states
  const [showSosCountdown, setShowSosCountdown] = useState(false);
  const [sosCountdownTime, setSosCountdownTime] = useState(10);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showSosTooltip, setShowSosTooltip] = useState(false);
  const [isFlashRed, setIsFlashRed] = useState(false);
  const countdownTimerRef = useRef<any>(null);
  const flashTimerRef = useRef<any>(null);

  // Background map tile download states
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [isDownloadingTiles, setIsDownloadingTiles] = useState(false);

  const processForegroundLocation = async (loc: Location.LocationObject) => {
    try {
      const tripStr = await AsyncStorage.getItem('active_trip');
      if (!tripStr) return; // No active trip

      // Get current battery level
      let battery = 100;
      try {
        const level = await Battery.getBatteryLevelAsync();
        battery = level >= 0 ? Math.round(level * 100) : 100;
      } catch (err) {
        console.warn('Failed to get battery level', err);
      }

      const { latitude, longitude, altitude, speed, heading } = loc.coords;
      const timestamp = loc.timestamp;

      // Check if enough time has passed since last saved point to avoid spamming the database
      const lastTimestampStr = await AsyncStorage.getItem('last_gps_timestamp_foreground');
      const lastTimestamp = lastTimestampStr ? parseInt(lastTimestampStr) : 0;
      const elapsedSeconds = (timestamp - lastTimestamp) / 1000;

      // Save every 30 seconds
      if (lastTimestamp === 0 || elapsedSeconds >= 30) {
        const newPoint = {
          lat: latitude,
          lng: longitude,
          altitude: altitude || 0,
          speed: (speed !== null && speed >= 0) ? speed : 0,
          heading: (heading !== null && heading >= 0) ? heading : 0,
          battery,
          recordedAt: new Date(timestamp).toISOString()
        };

        // 1. Save to walked path local state & active_trip_path
        const tripPathStr = await AsyncStorage.getItem('active_trip_path');
        const tripPath = tripPathStr ? JSON.parse(tripPathStr) : [];
        tripPath.push(newPoint);
        await AsyncStorage.setItem('active_trip_path', JSON.stringify(tripPath));

        setWalkedPath(tripPath.map((p: any) => ({
          latitude: p.lat,
          longitude: p.lng
        })));

        // 2. Append to gps_queue in AsyncStorage for syncing
        const queueStr = await AsyncStorage.getItem('gps_queue');
        const queue = queueStr ? JSON.parse(queueStr) : [];
        queue.push(newPoint);
        await AsyncStorage.setItem('gps_queue', JSON.stringify(queue));
        await AsyncStorage.setItem('last_gps_timestamp_foreground', timestamp.toString());

        console.log(`[Foreground GPS Saved] Coords: ${latitude},${longitude} | Queue size: ${queue.length}`);
      }
    } catch (e) {
      console.error('Error processing foreground location fallback:', e);
    }
  };

  // Subscribe to location updates in the foreground to keep the map UI smooth
  useEffect(() => {
    let locSubscription: Location.LocationSubscription | null = null;

    const startForegroundWatch = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 2,
        },
        async (loc) => {
          setCurrentLocation(loc);
          await processForegroundLocation(loc);
        }
      );
    };

    startForegroundWatch();

    return () => {
      if (locSubscription) {
        locSubscription.remove();
      }
    };
  }, []);

  // Request notifications permission and handle ongoing notifications
  useEffect(() => {
    const setupOngoingNotification = async () => {
      try {
        // Request notification permission if not granted
        const { status: currentStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = currentStatus;
        if (currentStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('Notifications permission not granted.');
          return;
        }

        // Get active trip details
        const tripStr = await AsyncStorage.getItem('active_trip');
        const titleText = tripStr ? 'RescueLink: Hành trình đang hoạt động' : 'RescueLink: Đang khám phá bản đồ';
        
        let routeLabel = 'Đang khám phá';
        if (tripStr) {
          try {
            const parsed = JSON.parse(tripStr);
            routeLabel = parsed.routeName || 'Chưa đặt tên';
          } catch (e) {}
        }
        const bodyText = tripStr 
          ? `Cung đường: ${routeLabel}. Định vị ngầm đang chạy.` 
          : 'Định hướng ngoại tuyến đang chạy. Nhấp để mở.';
          
        await Notifications.scheduleNotificationAsync({
          identifier: 'rescuelink-active-trip',
          content: {
            title: titleText,
            body: bodyText,
            sticky: true,
            autoDismiss: false,
            color: '#ef4444',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      } catch (err) {
        console.warn('Failed to start ongoing notification:', err);
      }
    };

    setupOngoingNotification();

    return () => {
      // Clear ongoing notification when screen unmounts
      Notifications.dismissNotificationAsync('rescuelink-active-trip').catch(err => {
        console.warn('Failed to dismiss ongoing notification:', err);
      });
    };
  }, []);


  // Debounced search auto-suggest
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayTimer = setTimeout(() => {
      handleSearchLocation(searchQuery, true);
    }, 600); // 600ms debounce

    return () => clearTimeout(delayTimer);
  }, [searchQuery]);

  // Sync data from AsyncStorage & check notifications periodically
  useEffect(() => {
    loadInitialData();

    const interval = setInterval(() => {
      refreshData();
      updateElapsedTime();
      syncOfflineQueue();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTrip?.startedAt]);

  const loadInitialData = async () => {
    try {
      // 1. Get active trip details
      const tripStr = await AsyncStorage.getItem('active_trip');
      if (tripStr) {
        const trip = JSON.parse(tripStr);
        setActiveTrip(trip);
      } else {
        setActiveTrip({
          routeName: 'Chế độ Khám phá Bản đồ',
          emergencyContact: 'Chưa cấu hình cứu hộ',
          isExploration: true
        });
      }

      // 2. Get registered route points
      const routeStr = await AsyncStorage.getItem('route_points');
      if (routeStr) {
        const points = JSON.parse(routeStr);
        setRoutePoints(points.map((p: any) => ({
          latitude: p.lat,
          longitude: p.lng
        })));
      }

      // 3. Get walked path coordinates
      const pathStr = await AsyncStorage.getItem('active_trip_path');
      if (pathStr) {
        const pathPoints = JSON.parse(pathStr);
        setWalkedPath(pathPoints.map((p: any) => ({
          latitude: p.lat,
          longitude: p.lng
        })));
      }

      // 4. Center map on current location initially (non-blocking IIFE)
      (async () => {
        try {
          // Try to get last known location first (faster)
          const lastLoc = await Location.getLastKnownPositionAsync();
          if (lastLoc) {
            setCurrentLocation(lastLoc);
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: lastLoc.coords.latitude,
                longitude: lastLoc.coords.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }, 500);
            }
          }

          // Then query fresh location
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCurrentLocation(loc);
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }, 800);
          }
        } catch (e) {
          console.warn('Failed to get initial coordinates:', e);
        }
      })();



    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      // 1. Refresh walked path coordinates
      const pathStr = await AsyncStorage.getItem('active_trip_path');
      if (pathStr) {
        const pathPoints = JSON.parse(pathStr);
        setWalkedPath(pathPoints.map((p: any) => ({
          latitude: p.lat,
          longitude: p.lng
        })));
      }

      // 2. Refresh queue count
      const queueStr = await AsyncStorage.getItem('gps_queue');
      const queue = queueStr ? JSON.parse(queueStr) : [];
      setQueueCount(queue.length);

      // 3. Refresh warning flags
      const activeWarnings: string[] = [];
      const deviationTriggered = await AsyncStorage.getItem('anomaly_deviation_triggered');
      const circleTriggered = await AsyncStorage.getItem('anomaly_circle_triggered');
      const lastBatterySos = await AsyncStorage.getItem('last_battery_sos_trigger');
      
      if (deviationTriggered === 'true') {
        activeWarnings.push('Lệch cung đường đăng ký (>500m)');
      }
      if (circleTriggered === 'true') {
        activeWarnings.push('Di chuyển vòng tròn (Nghi ngờ lạc đường)');
      }
      if (lastBatterySos && parseInt(lastBatterySos) <= 20) {
        activeWarnings.push(`Pin cực yếu (${lastBatterySos}%)`);
      }
      setWarnings(activeWarnings);

      // 4. Refresh check-in warning banner
      const checkinWarningStr = await AsyncStorage.getItem('checkin_warning_sent');
      setCheckinWarning(checkinWarningStr === 'true');

      // 5. Refresh pending offline SMS SOS alerts
      const pendingSmsStr = await AsyncStorage.getItem('pending_sms_alert');
      if (pendingSmsStr) {
        setPendingSms(JSON.parse(pendingSmsStr));
      } else {
        setPendingSms(null);
      }



    } catch (e) {
      console.error('Failed to refresh local tracking data:', e);
    }
  };

  const updateElapsedTime = () => {
    if (!activeTrip?.startedAt) return;
    const start = new Date(activeTrip.startedAt).getTime();
    const now = Date.now();
    const diff = now - start;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    setElapsedTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
  };

  const syncOfflineQueue = async () => {
    if (queueCount === 0) return;
    
    // Check if server is reachable
    try {
      const res = await flushOfflineQueue();
      if (res?.success) {
        setIsOnline(true);
        setQueueCount(0);
      } else {
        setIsOnline(false);
      }
    } catch (e) {
      setIsOnline(false);
    }
  };

  const handleCheckinOk = async () => {
    try {
      const now = Date.now().toString();
      await AsyncStorage.setItem('last_movement_time', now);
      await AsyncStorage.removeItem('checkin_warning_sent');
      await AsyncStorage.removeItem('checkin_warning_time');
      await AsyncStorage.removeItem('checkin_failed_triggered');
      await AsyncStorage.removeItem('checkin_lost_incident_created');
      
      setCheckinWarning(false);
      Alert.alert('Thành công', 'RescueLink đã ghi nhận trạng thái an toàn của bạn.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendPendingSms = async () => {
    if (!pendingSms) return;
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        Alert.alert(
          'Gửi SMS SOS',
          'Hộp thoại tin nhắn khẩn cấp sẽ được mở với tọa độ và tin nhắn SOS đã được RescueLink soạn sẵn. Vui lòng bấm Gửi trên màn hình tiếp theo.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Mở Nhắn Tin',
              onPress: async () => {
                await SMS.sendSMSAsync([pendingSms.phone], pendingSms.message);
                await AsyncStorage.removeItem('pending_sms_alert');
                setPendingSms(null);
              }
            }
          ]
        );
      } else {
        Alert.alert('Không khả dụng', 'Thiết bị này không hỗ trợ gửi tin nhắn SMS.');
      }
    } catch (e) {
      console.error('Failed to trigger SMS:', e);
    }
  };

  const playBeepSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/beep.mp3')
      );
      await sound.playAsync();
      // Unload sound when finished to avoid memory leaks
      setTimeout(() => {
        sound.unloadAsync().catch(() => {});
      }, 1200);
    } catch (err) {
      console.warn('Failed to play beep sound:', err);
    }
  };

  const cleanupSosTimers = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  };

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      cleanupSosTimers();
    };
  }, []);

  const triggerActualSOS = async () => {
    cleanupSosTimers();
    setShowSosCountdown(false);
    
    // Vibrate intensely to signify SOS activation (1s on, 0.5s off, etc)
    Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);

    let lat = 21.0285;
    let lng = 105.8542;

    if (currentLocation) {
      lat = currentLocation.coords.latitude;
      lng = currentLocation.coords.longitude;
    }

    // 1. Try to send incident to backend
    let onlineIncidentSuccess = false;
    try {
      const res = await api.post('/incidents', {
        type: 'MANUAL',
        severity: 5,
        lat,
        lng,
        message: 'PANIC SOS triggered manually by member.'
      });
      if (res.data.success) {
        onlineIncidentSuccess = true;
      }
    } catch (err) {
      console.log('Server is offline or unreachable for PANIC SOS.');
    }

    // 2. Queue SMS fallback to emergency contact (using the new compressed SMS helper)
    const messageStr = buildCompressedSosMessage(lat, lng);
    
    if (activeTrip?.emergencyContact) {
      // Store as pending to prompt user immediately
      const pending = {
        phone: activeTrip.emergencyContact,
        message: messageStr
      };
      await AsyncStorage.setItem('pending_sms_alert', JSON.stringify(pending));
      setPendingSms(pending);

      // Try opening SMS right away
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync([activeTrip.emergencyContact], messageStr);
        await AsyncStorage.removeItem('pending_sms_alert');
        setPendingSms(null);
      }
    }

    Alert.alert(
      'Đã gửi khẩn cấp',
      onlineIncidentSuccess 
        ? 'Đã gửi báo động khẩn cấp lên Server Cứu Hộ thành công!'
        : 'Báo động đã được ghi nhận. Hệ thống đang mở trình nhắn tin SMS để gửi tin khẩn cấp cho người thân.'
    );
  };

  const handleSosPress = () => {
    const now = Date.now();
    if (now - lastTapTime < 1000) {
      // User double-tapped!
      setLastTapTime(0);
      setShowSosTooltip(false);
      
      // Start SOS Countdown
      setShowSosCountdown(true);
      setSosCountdownTime(10);
      
      // Start the countdown timer interval
      cleanupSosTimers();
      
      // Play initial beep and vibrate immediately
      playBeepSound();
      Vibration.vibrate(200);

      let timeLeft = 10;
      countdownTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        setSosCountdownTime(timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          triggerActualSOS();
        } else {
          // Play warning audio and vibrate every second
          playBeepSound();
          Vibration.vibrate(200);
        }
      }, 1000);

      // Start background flashing effect interval
      let flash = false;
      flashTimerRef.current = setInterval(() => {
        flash = !flash;
        setIsFlashRed(flash);
      }, 500);

    } else {
      setLastTapTime(now);
      setShowSosTooltip(true);
      // Automatically hide tooltip after 2.5 seconds
      setTimeout(() => {
        setShowSosTooltip(false);
      }, 2500);
    }
  };

  const cancelSosCountdown = () => {
    cleanupSosTimers();
    setShowSosCountdown(false);
    Vibration.vibrate(100); // short feedback vibration for cancel
    Alert.alert('Đã hủy cấp cứu', 'Hành động khẩn cấp SOS đã được hủy.');
  };


  const handleEndTrip = async () => {
    if (activeTrip?.isExploration) {
      router.replace('/(tabs)');
      return;
    }
    Alert.alert(
      'Kết thúc hành trình',
      'Bạn có chắc chắn muốn kết thúc chuyến trekking này và dừng định vị ngầm không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'KẾT THÚC',
          style: 'destructive',
          onPress: async () => {
            setEnding(true);
            try {
              if (activeTrip?.id) {
                // Try sending end trip payload to backend
                await api.patch(`/trips/${activeTrip.id}/end`);
              }
            } catch (err) {
              console.warn('Backend connection failed when ending trip, executing local cleanup anyway.');
              if (activeTrip?.id) {
                await AsyncStorage.setItem('pending_end_trip_id', activeTrip.id);
              }
            } finally {
              // Local cleanups inside hook
              await stopTracking();
              setEnding(false);
              Alert.alert('Hoàn thành', 'Chúc mừng bạn đã kết thúc hành trình an toàn!');
              router.replace('/(tabs)');
            }
          }
        }
      ]
    );
  };

  const handleShareTrip = async () => {
    if (!currentLocation) return;
    try {
      const lat = currentLocation.coords.latitude;
      const lng = currentLocation.coords.longitude;
      await Share.share({
        message: `[RescueLink Share Location] Tôi đang đi trekking cung đường: ${activeTrip?.routeName}. Vị trí hiện tại: https://maps.google.com/?q=${lat},${lng}`,
      });
    } catch (e: any) {
      console.error('Failed to share:', e.message);
    }
  };

  const recalculateMapZoom = () => {
    if (!mapRef.current || !currentLocation) return;
    mapRef.current.animateToRegion({
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 800);
  };

  // Search location via Nominatim API (Online) or AsyncStorage cache (Offline)
  const handleSearchLocation = async (text: string, isAutoSuggest = false) => {
    if (!text.trim() || text.trim().length < 2) {
      if (!isAutoSuggest) {
        Alert.alert('Nhập tìm kiếm', 'Vui lòng nhập từ khóa tìm kiếm (tối thiểu 2 ký tự).');
      }
      return;
    }
    setSearching(true);

    if (isOnline) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&countrycodes=vn`,
          {
            headers: {
              'User-Agent': 'RescueLinkApp/1.0',
            },
          }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          setSearchResults(data);
        } else {
          setSearchResults([]);
          if (!isAutoSuggest) {
            Alert.alert('Không tìm thấy', 'Không tìm thấy địa điểm nào trực tuyến khớp với từ khóa.');
          }
        }
      } catch (error) {
        console.warn('Geocoding error:', error);
        if (!isAutoSuggest) {
          Alert.alert('Lỗi kết nối', 'Không thể tìm kiếm trực tuyến. Đang thử chế độ ngoại tuyến...');
        }
        await searchOfflineDestinations(text, isAutoSuggest);
      } finally {
        setSearching(false);
      }
    } else {
      await searchOfflineDestinations(text, isAutoSuggest);
      setSearching(false);
    }
  };

  // Offline search helper
  const searchOfflineDestinations = async (text: string, isAutoSuggest = false) => {
    try {
      const cachedStr = await AsyncStorage.getItem('offline_destinations');
      if (cachedStr) {
        const destinations: any[] = JSON.parse(cachedStr);
        const filtered = destinations.filter((dest: any) =>
          dest.name.toLowerCase().includes(text.toLowerCase())
        );
        if (filtered.length > 0) {
          const results = filtered.map((d: any) => ({
            display_name: d.name,
            lat: d.lat.toString(),
            lon: d.lng.toString(),
            isOfflineCached: true,
            cachedData: d
          }));
          setSearchResults(results);
        } else {
          setSearchResults([]);
          if (!isAutoSuggest) {
            Alert.alert('Ngoại tuyến', 'Không tìm thấy địa điểm đã lưu khớp với từ khóa.');
          }
        }
      } else {
        setSearchResults([]);
        if (!isAutoSuggest) {
          Alert.alert('Ngoại tuyến', 'Chưa có địa điểm nào được lưu ngoại tuyến trước đó.');
        }
      }
    } catch (e) {
      console.warn('Error reading offline destinations:', e);
    }
  };


  // Select destination and load/calculate route
  const handleSelectDestination = async (item: any) => {
    setSelectedDest(item);
    setSearchResults([]);
    setSearchQuery(item.display_name);

    if (item.isOfflineCached) {
      const cached = item.cachedData;
      const pts = cached.routePoints.map((p: any) => ({
        latitude: p.lat || p.latitude,
        longitude: p.lng || p.longitude
      }));
      setRoutePoints(pts);
      setRouteInfo({
        distanceKm: cached.distanceKm,
        durationMin: cached.durationMin,
        isOffline: true
      });

      if (pts.length > 0 && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: pts[0].latitude,
          longitude: pts[0].longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }, 800);
      }

      Alert.alert('Chỉ đường ngoại tuyến', `Đã tải lộ trình ngoại tuyến dài ${cached.distanceKm} km.`);
    } else {
      try {
        let startLat = 21.0285;
        let startLng = 105.8542;
        if (currentLocation) {
          startLat = currentLocation.coords.latitude;
          startLng = currentLocation.coords.longitude;
        } else {
          try {
            const userLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            startLat = userLoc.coords.latitude;
            startLng = userLoc.coords.longitude;
          } catch (e) {
            console.warn('Could not get current location for routing:', e);
          }
        }

        const destLat = parseFloat(item.lat);
        const destLng = parseFloat(item.lon);

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const ptsForState = route.geometry.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0]
          }));
          const ptsForDownload = route.geometry.coordinates.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }));

          setRoutePoints(ptsForState);
          await AsyncStorage.setItem('route_points', JSON.stringify(ptsForDownload));

          const newRouteInfo = {
            distanceKm: (route.distance / 1000).toFixed(2),
            durationMin: Math.round(route.duration / 60),
            isOffline: false
          };
          setRouteInfo(newRouteInfo);

          if (ptsForState.length > 0 && mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: ptsForState[0].latitude,
              longitude: ptsForState[0].longitude,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            }, 800);
          }

          await downloadTilesAndCacheDest(item.display_name, destLat, destLng, newRouteInfo.distanceKm, newRouteInfo.durationMin, ptsForDownload);
        } else {
          Alert.alert('Không tìm thấy đường', 'Không thể tính toán tuyến đường đến địa điểm này.');
        }
      } catch (err) {
        console.warn('Routing API error:', err);
        Alert.alert('Lỗi tính toán đường', 'Đã xảy ra sự cố khi tải tuyến đường từ OSRM API.');
      }
    }
  };

  // Download tiles in the background and cache destination
  const downloadTilesAndCacheDest = async (name: string, lat: number, lng: number, distanceKm: string, durationMin: number, points: any[]) => {
    setIsDownloadingTiles(true);
    setDownloadProgress(0);

    try {
      await downloadRouteTiles(points, (progress) => {
        setDownloadProgress(progress);
      });

      const cachedStr = await AsyncStorage.getItem('offline_destinations');
      const destinations = cachedStr ? JSON.parse(cachedStr) : [];
      
      const filtered = destinations.filter((d: any) => d.name !== name);
      filtered.push({
        id: Date.now().toString(),
        name,
        lat,
        lng,
        distanceKm,
        durationMin,
        routePoints: points
      });

      await AsyncStorage.setItem('offline_destinations', JSON.stringify(filtered));
    } catch (e) {
      console.warn('Background download tiles and cache destination failed:', e);
    } finally {
      setTimeout(() => {
        setIsDownloadingTiles(false);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#FF4D3D" />
        <Text className="text-sm text-muted mt-4">Đang tải thông tin bản đồ...</Text>
      </View>
    );
  }

  // Calculate distance walked (approximate)
  let distanceWalkedMeters = 0;
  if (walkedPath.length >= 2) {
    for (let i = 1; i < walkedPath.length; i++) {
      distanceWalkedMeters += haversineDistance(
        { lat: walkedPath[i-1].latitude, lng: walkedPath[i-1].longitude },
        { lat: walkedPath[i].latitude, lng: walkedPath[i].longitude }
      );
    }
  }
  const distanceWalkedKm = (distanceWalkedMeters / 1000).toFixed(2);

  return (
    <View className="flex-1 bg-surface relative">
      {/* 1. Map Canvas */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        customMapStyle={darkMapStyle}
        showsUserLocation={false}
        showsCompass={false}
        showsScale={false}
        initialRegion={{
          latitude: currentLocation?.coords?.latitude || 21.0285,
          longitude: currentLocation?.coords?.longitude || 105.8542,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
        {/* Render Offline Local Map Tiles */}
        <UrlTile
          urlTemplate={`${FileSystem.documentDirectory}tiles/{z}/{x}/{y}.png`}
          offlineMode={true}
          zIndex={1}
        />

        {/* Render Registered Route Points (Simulated registered line path) */}
        {routePoints.length >= 2 && (
          <Polyline
            coordinates={routePoints}
            strokeColor="#404040"
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* Render Walked Path Line */}
        {walkedPath.length >= 2 && (
          <Polyline
            coordinates={walkedPath}
            strokeColor="#FF4D3D"
            strokeWidth={4}
          />
        )}

        {/* Start Route Marker */}
        {routePoints.length > 0 && (
          <Marker
            coordinate={routePoints[0]}
            title="Điểm xuất phát cung đường"
            pinColor="#a3a3a3"
          />
        )}

        {/* End Route Marker */}
        {routePoints.length > 1 && (
          <Marker
            coordinate={routePoints[routePoints.length - 1]}
            title="Điểm đích dự kiến"
            pinColor="#262626"
          />
        )}

        {/* User Current Live Marker */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            }}
            title="Vị trí của bạn"
          >
            <View className="w-7 h-7 items-center justify-center bg-emergency-500/30 border border-emergency-400 rounded-full">
              <View className="w-4 h-4 bg-emergency-500 rounded-full border-2 border-white" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* 2. Top Bar Details */}
      <View className="absolute top-12 left-5 right-5 bg-surface-1/95 border border-surface-3 p-5 rounded-3xl flex-row justify-between items-center z-10">
        <View className="flex-1 mr-3">
          <Text className="text-white text-base font-bold" numberOfLines={1}>
            {activeTrip?.routeName}
          </Text>
          <View className="flex-row items-center mt-1.5">
            <View className={`w-2 h-2 rounded-full mr-1.5 ${activeTrip?.isExploration ? 'bg-amber-500' : 'bg-safe-500'}`} />
            <Text className={`text-[10px] font-semibold uppercase tracking-wide ${activeTrip?.isExploration ? 'text-amber-400' : 'text-safe-400'}`}>
              {activeTrip?.isExploration ? 'Chế độ Khám phá' : 'Định vị ngầm đang chạy'}
            </Text>
          </View>
        </View>

        {/* Network & Queue Indicator */}
        <View className="items-end gap-1.5">
          <View className={`px-2.5 py-1 rounded-full border ${isOnline ? 'bg-safe-500/10 border-safe-500/30' : 'bg-warn-500/10 border-warn-500/30'}`}>
            <Text className={`text-[9px] font-bold tracking-wide ${isOnline ? 'text-safe-400' : 'text-warn-400'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          {queueCount > 0 && (
            <Text className="text-[8px] text-muted font-mono">
              Hàng đợi: {queueCount} GPS
            </Text>
          )}
        </View>
      </View>

      {/* 2.1 Floating Search Bar for Offline Route Planning */}
      <View className="absolute top-[138px] left-5 right-5 z-20">
        <View className="flex-row gap-2 bg-surface-1/95 border border-surface-3 p-2.5 rounded-2xl shadow-lg items-center">
          <TextInput
            className="flex-1 text-white text-xs px-3 py-1.5 bg-surface-2 rounded-xl"
            placeholder="Tìm kiếm điểm đến (ví dụ: Tây Yên Tử, Ba Vì...)"
            placeholderTextColor="#6b6b6b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable
            className="bg-emergency-500 active:bg-emergency-600 px-3.5 py-1.5 rounded-xl justify-center items-center"
            onPress={() => handleSearchLocation(searchQuery)}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-xs font-bold">Tìm</Text>
            )}
          </Pressable>
        </View>

        {/* Suggestion list dropdown */}
        {searchResults.length > 0 && (
          <View className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden mt-1.5 max-h-48 shadow-2xl">
            <ScrollView nestedScrollEnabled={true}>
              {searchResults.map((item, idx) => (
                <Pressable
                  key={idx}
                  className="p-3 border-b border-surface-3 active:bg-surface-3 flex-row items-center justify-between"
                  onPress={() => handleSelectDestination(item)}
                >
                  <Text className="text-white text-xs flex-1 mr-2" numberOfLines={2}>
                    📍 {item.display_name}
                  </Text>
                  {item.isOfflineCached && (
                    <View className="bg-safe-500/10 border border-safe-500/30 px-1.5 py-0.5 rounded-md">
                      <Text className="text-[8px] font-bold text-safe-400">ĐÃ LƯU</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Selected Route Info banner */}
        {routeInfo && (
          <View className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl mt-1.5 flex-row justify-between items-center">
            <Text className="text-white text-[10px] font-semibold flex-1 mr-2" numberOfLines={1}>
              {routeInfo.isOffline ? '📁 Bản đồ ngoại tuyến: ' : '🌐 Lộ trình mới: '} {selectedDest?.display_name}
            </Text>
            <Text className="text-emerald-400 text-[10px] font-bold font-mono">
              {routeInfo.distanceKm} km (~{routeInfo.durationMin}p)
            </Text>
          </View>
        )}

        {/* Background download progress indicator */}
        {isDownloadingTiles && (
          <View className="bg-surface-2 border border-surface-3 px-3 py-2 rounded-xl mt-1.5 flex-row items-center justify-between gap-3">
            <ActivityIndicator size="small" color="#FF4D3D" />
            <Text className="text-white text-[10px] flex-1">Đang tải bản đồ offline...</Text>
            <View className="flex-1 bg-surface-3 h-1.5 rounded-full overflow-hidden">
              <View 
                className="bg-emergency-500 h-full"
                style={{ width: `${Math.round(downloadProgress * 100)}%` }}
              />
            </View>
            <Text className="text-emergency-400 font-bold font-mono text-[10px]">
              {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
        )}
      </View>

      {/* 3. Alerts overlay - Warnings notifications */}
      <View className="absolute top-[210px] left-5 right-5 z-10 gap-2.5">
        {warnings.map((warn, i) => (
          <View key={i} className="bg-emergency-900/90 border border-emergency-700/40 px-4 py-3 rounded-2xl flex-row items-center justify-between">
            <Text className="text-white text-xs font-bold flex-1 pr-2">⚠️ {warn}</Text>
          </View>
        ))}

        {checkinWarning && (
          <View className="bg-warn-500/90 border border-warn-400/40 p-4 rounded-2xl gap-2.5">
            <Text className="text-white text-xs font-bold uppercase tracking-wide">Cảnh báo dừng chuyển động</Text>
            <Text className="text-white/90 text-[10px] leading-4">
              Bạn đứng yên &gt; 20 phút. Xác nhận an toàn để hủy đếm ngược cứu hộ.
            </Text>
            <Pressable
              className="bg-safe-500 active:bg-safe-600 py-2 rounded-xl items-center"
              onPress={handleCheckinOk}
            >
              <Text className="text-white font-bold text-xs tracking-wide">TÔI VẪN ỔN ✓</Text>
            </Pressable>
          </View>
        )}

        {pendingSms && (
          <View className="bg-emergency-950/95 border border-emergency-700/40 p-4 rounded-2xl gap-2.5">
            <Text className="text-emergency-400 text-xs font-bold uppercase tracking-wide">Cần gửi tin SOS GSM</Text>
            <Text className="text-white/80 text-[10px] leading-4">
              Vị trí được ghi nhận ngoại tuyến. Bấm bên dưới để gửi tin nhắn SOS cho người thân.
            </Text>
            <Pressable
              className="bg-emergency-500 active:bg-emergency-600 py-2 rounded-xl items-center"
              onPress={handleSendPendingSms}
            >
              <Text className="text-white font-bold text-xs uppercase tracking-wide">Gửi SMS cấp cứu</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 4. Bottom HUD Dashboard controls */}
      <View className="absolute bottom-8 left-5 right-5 z-10 gap-3">
        
        {/* HUD Statistics */}
        <View className="bg-surface-1/95 border border-surface-3 p-5 rounded-3xl gap-3">
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-[10px] text-muted">Thời gian đi</Text>
              <Text className="text-lg font-bold text-white font-mono mt-1">{elapsedTime}</Text>
            </View>
            <View className="w-px h-8 bg-surface-3 self-center" />
            <View className="items-center">
              <Text className="text-[10px] text-muted">Quãng đường</Text>
              <Text className="text-lg font-bold text-white font-mono mt-1">{distanceWalkedKm} km</Text>
            </View>
            <View className="w-px h-8 bg-surface-3 self-center" />
            <View className="items-center">
              <Text className="text-[10px] text-muted">Pin</Text>
              <Text className={`text-lg font-bold font-mono mt-1 ${batteryLevel <= 20 ? 'text-emergency-400' : 'text-safe-400'}`}>
                {batteryLevel}%
              </Text>
            </View>
          </View>

          {/* Quick info row */}
          {activeTrip && (
            <View className="border-t border-surface-3 pt-3 flex-row justify-between items-center">
              <Text className="text-[10px] text-muted">
                SOS: {activeTrip.emergencyContact}
              </Text>
              <Text className="text-[10px] text-muted">
                Về: {new Date(activeTrip.expectedReturn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>

        {/* Tooltip for Double Tap SOS */}
        {showSosTooltip && (
          <View className="items-center bg-red-950/95 border border-red-500/30 px-3 py-2 rounded-2xl shadow-xl">
            <Text className="text-red-400 text-[10px] font-bold text-center tracking-wide uppercase">
              🚨 NHẤN ĐÚP 2 LẦN LIÊN TỤC ĐỂ BÁO CỨU HỘ
            </Text>
          </View>
        )}

        {/* Control Buttons Bar */}
        <View className="flex-row gap-3">
          {/* Recenter Button */}
          <Pressable
            className="w-12 h-12 rounded-2xl bg-surface-1/95 border border-surface-3 items-center justify-center active:bg-surface-2"
            onPress={recalculateMapZoom}
          >
            <Text className="text-white text-base">🧭</Text>
          </Pressable>

          {/* Share Button */}
          <Pressable
            className="w-12 h-12 rounded-2xl bg-surface-1/95 border border-surface-3 items-center justify-center active:bg-surface-2"
            onPress={handleShareTrip}
          >
            <Text className="text-white text-base">📤</Text>
          </Pressable>

          {/* End Trek Button */}
          <Pressable
            className="flex-1 h-12 rounded-2xl bg-surface-2 border border-surface-3 items-center justify-center active:bg-surface-3"
            onPress={handleEndTrip}
            disabled={ending}
          >
            {ending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-emergency-400 font-bold text-xs uppercase tracking-wide">
                {activeTrip?.isExploration ? 'Thoát' : 'Kết thúc'}
              </Text>
            )}
          </Pressable>

          {/* Big Panic SOS Button */}
          <Pressable
            className="flex-1 h-12 rounded-2xl bg-emergency-500 items-center justify-center active:bg-emergency-600"
            onPress={handleSosPress}
          >
            <Text className="text-white font-black text-xs uppercase tracking-wider">PANIC SOS</Text>
          </Pressable>
        </View>

      </View>

      {/* 5. Fullscreen SOS Countdown Overlay */}
      {showSosCountdown && (
        <View className="absolute inset-0 z-50 flex items-center justify-center bg-black/95">
          {/* Flashing Background overlay */}
          <View className={`absolute inset-0 ${isFlashRed ? 'bg-red-950/70' : 'bg-transparent'}`} />

          <View className="items-center px-8 gap-8">
            <View className="w-20 h-20 bg-red-600 rounded-full items-center justify-center shadow-lg shadow-red-900/50">
              <Text className="text-white text-3xl">🚨</Text>
            </View>

            <View className="gap-2 items-center">
              <Text className="text-white text-xl font-bold text-center uppercase tracking-wider">
                Yêu Cầu Cứu Hộ Khẩn Cấp
              </Text>
              <Text className="text-muted text-xs text-center px-4 leading-relaxed">
                Hệ thống sẽ tự động gửi vị trí GPS của bạn đến đội cứu hộ và tin nhắn SMS khẩn cấp cho người thân sau:
              </Text>
            </View>

            <View className="items-center justify-center w-40 h-40 rounded-full border-4 border-red-500 bg-red-950/40">
              <Text className="text-white text-7xl font-extrabold font-mono">{sosCountdownTime}</Text>
              <Text className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-1">Giây</Text>
            </View>

            <View className="w-full gap-4.5 mt-4">
              <Pressable
                className="bg-red-600 active:bg-red-700 py-4.5 rounded-2xl items-center justify-center border border-red-500 shadow-lg shadow-red-900/40"
                onPress={triggerActualSOS}
              >
                <Text className="text-white font-extrabold text-sm uppercase tracking-wider">
                  Gửi Cứu Hộ Ngay
                </Text>
              </Pressable>

              <Pressable
                className="bg-surface-2 active:bg-surface-3 py-4 rounded-2xl items-center justify-center border border-surface-3"
                onPress={cancelSosCountdown}
              >
                <Text className="text-white font-bold text-xs uppercase tracking-wide">
                  Hủy Cấp Cứu (Safe)
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>

  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
