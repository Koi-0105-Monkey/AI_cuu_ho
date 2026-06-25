import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from '@/tw';
import { Alert, StyleSheet, ActivityIndicator, Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as SMS from 'expo-sms';
import { useGPS } from '@/hooks/useGPS';
import api from '@/services/api';
import { haversineDistance } from '@/utils/geo';
import { flushOfflineQueue } from '@/services/queueService';

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
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  
  // Offline sync & warning states
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingSms, setPendingSms] = useState<any>(null);
  const [checkinWarning, setCheckinWarning] = useState<boolean>(false);
  const [ending, setEnding] = useState<boolean>(false);

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
        (loc) => {
          setCurrentLocation(loc);
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
      if (!tripStr) {
        Alert.alert('Không có hành trình', 'Không tìm thấy hành trình đang hoạt động nào.');
        router.replace('/(tabs)');
        return;
      }
      const trip = JSON.parse(tripStr);
      setActiveTrip(trip);

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

      // 4. Center map on current location initially
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation(loc);
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }, 1000);
        }
      } catch (e) {
        console.warn('Failed to get initial coordinates');
      }

      // 5. Get battery level
      const level = await Battery.getBatteryLevelAsync();
      setBatteryLevel(level >= 0 ? Math.round(level * 100) : 100);

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

      // 6. Refresh battery level
      const level = await Battery.getBatteryLevelAsync();
      setBatteryLevel(level >= 0 ? Math.round(level * 100) : 100);

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

  const handlePanicSOS = async () => {
    Alert.alert(
      'KÍCH HOẠT PANIC SOS KHẨN CẤP',
      'Xác nhận gửi tín hiệu cấp cứu khẩn cấp cho Đội Cứu Hộ và Người Thân? Bạn chỉ nên nhấn nút này trong trường hợp gặp tai nạn nghiêm trọng.',
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'XÁC NHẬN GỬI CẤP CỨU',
          style: 'destructive',
          onPress: async () => {
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
                type: 'ACCIDENT',
                severity: 5,
                source: 'user',
                location: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                message: 'PANIC SOS triggered manually by member.'
              });
              if (res.data.success) {
                onlineIncidentSuccess = true;
              }
            } catch (err) {
              console.log('Server is offline or unreachable for PANIC SOS.');
            }

            // 2. Queue SMS fallback to emergency contact
            const messageStr = `[PANIC SOS KHAN CAP] Toi dang gap tai nan nghiem trong can cuu ho! Vi tri: https://maps.google.com/?q=${lat},${lng} luc ${new Date().toLocaleTimeString()}`;
            
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
              'Tín hiệu đã được gửi',
              onlineIncidentSuccess 
                ? 'Đã gửi báo động khẩn cấp lên Server Cứu Hộ thành công!'
                : 'Báo động đã được lưu và đang mở trình nhắn tin SMS để gửi tin khẩn cấp cho người thân.'
            );
          }
        }
      ]
    );
  };

  const handleEndTrip = async () => {
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
                await api.post(`/trips/end`, { tripId: activeTrip.id });
              }
            } catch (err) {
              console.warn('Backend connection failed when ending trip, executing local cleanup anyway.');
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

  if (loading) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#ef4444" />
        <Text className="text-sm text-muted-light mt-4">Đang tải thông tin bản đồ...</Text>
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
        className="flex-1 w-full"
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
            strokeColor="#ef4444"
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
            <View className="w-6 h-6 items-center justify-center bg-emergency-600/30 border border-emergency-500 rounded-full">
              <View className="w-3.5 h-3.5 bg-emergency-600 rounded-full border-2 border-white" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* 2. Top Bar Details */}
      <View className="absolute top-12 left-4 right-4 bg-surface-1/90 border border-surface-4 p-4 rounded-2xl flex-row justify-between items-center z-10">
        <View className="flex-1 mr-2">
          <Text className="text-white text-base font-bold" numberOfLines={1}>
            {activeTrip?.routeName}
          </Text>
          <View className="flex-row items-center mt-1">
            <View className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-1.5" />
            <Text className="text-[10px] text-emerald-400 font-semibold uppercase">Định vị ngầm đang chạy</Text>
          </View>
        </View>

        {/* Network & Queue Indicator */}
        <View className="items-end gap-1">
          <View className={`px-2 py-0.5 rounded-full border ${isOnline ? 'bg-emerald-950/20 border-emerald-800' : 'bg-amber-950/20 border-amber-800'}`}>
            <Text className={`text-[9px] font-bold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          {queueCount > 0 && (
            <Text className="text-[8px] text-muted-light font-mono">
              Xếp hàng: {queueCount} điểm GPS
            </Text>
          )}
        </View>
      </View>

      {/* 3. Alerts overlay - Warnings notifications */}
      <View className="absolute top-36 left-4 right-4 z-10 gap-2">
        {warnings.map((warn, i) => (
          <View key={i} className="bg-emergency-900/90 border border-emergency-700/60 px-3 py-2 rounded-xl flex-row items-center justify-between">
            <Text className="text-white text-xs font-bold flex-1 pr-2">⚠️ CẢNH BÁO: {warn}</Text>
          </View>
        ))}

        {checkinWarning && (
          <View className="bg-amber-600/90 border border-amber-500/40 p-3 rounded-xl gap-2">
            <Text className="text-white text-xs font-bold uppercase">CẢNH BÁO DỪNG CHUYỂN ĐỘNG</Text>
            <Text className="text-white text-[10px] leading-relaxed">
              Bạn đứng yên >20 phút. Vui lòng xác nhận an toàn để hủy đếm ngược cứu hộ.
            </Text>
            <Pressable
              className="bg-emerald-600 active:bg-emerald-700 py-1.5 rounded-lg items-center"
              onPress={handleCheckinOk}
            >
              <Text className="text-white font-bold text-xs">TÔI VẪN ỔN</Text>
            </Pressable>
          </View>
        )}

        {pendingSms && (
          <View className="bg-emergency-950/95 border border-emergency-800 p-3 rounded-xl gap-2">
            <Text className="text-red-400 text-xs font-bold uppercase">CẦN GỬI TIN SOS GSM</Text>
            <Text className="text-white text-[10px]">
              Vị trí được ghi nhận ngoại tuyến. Bấm bên dưới để gửi tin nhắn SOS cho người thân qua mạng di động.
            </Text>
            <Pressable
              className="bg-emergency-600 active:bg-emergency-700 py-1.5 rounded-lg items-center"
              onPress={handleSendPendingSms}
            >
              <Text className="text-white font-bold text-xs uppercase">GỬI SMS CẤP CỨU</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 4. Bottom HUD Dashboard controls */}
      <View className="absolute bottom-6 left-4 right-4 z-10 gap-3">
        
        {/* HUD Statistics */}
        <View className="bg-surface-1/90 border border-surface-4 p-4 rounded-2xl gap-3">
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-[10px] text-muted">Thời gian đi</Text>
              <Text className="text-lg font-bold text-white font-mono mt-0.5">{elapsedTime}</Text>
            </View>
            <View className="w-px h-8 bg-surface-3 self-center" />
            <View className="items-center">
              <Text className="text-[10px] text-muted">Quãng đường</Text>
              <Text className="text-lg font-bold text-white font-mono mt-0.5">{distanceWalkedKm} km</Text>
            </View>
            <View className="w-px h-8 bg-surface-3 self-center" />
            <View className="items-center">
              <Text className="text-[10px] text-muted">Dung lượng pin</Text>
              <Text className={`text-lg font-bold font-mono mt-0.5 ${batteryLevel <= 20 ? 'text-emergency-500' : 'text-emerald-400'}`}>
                {batteryLevel}%
              </Text>
            </View>
          </View>

          {/* Quick info row */}
          {activeTrip && (
            <View className="border-t border-surface-3 pt-2.5 flex-row justify-between items-center">
              <Text className="text-[10px] text-muted-light">
                SOS: {activeTrip.emergencyContact}
              </Text>
              <Text className="text-[10px] text-muted-light">
                Dự kiến về: {new Date(activeTrip.expectedReturn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>

        {/* Control Buttons Bar */}
        <View className="flex-row gap-3">
          {/* Recenter Button */}
          <Pressable
            className="w-12 h-12 rounded-xl bg-surface-1 border border-surface-4 items-center justify-center active:bg-surface-2"
            onPress={recalculateMapZoom}
          >
            <Text className="text-white text-base">🧭</Text>
          </Pressable>

          {/* Share Button */}
          <Pressable
            className="w-12 h-12 rounded-xl bg-surface-1 border border-surface-4 items-center justify-center active:bg-surface-2"
            onPress={handleShareTrip}
          >
            <Text className="text-white text-base">📤</Text>
          </Pressable>

          {/* End Trek Button */}
          <Pressable
            className="flex-1 h-12 rounded-xl bg-surface-3 border border-surface-4 items-center justify-center active:bg-surface-4"
            onPress={handleEndTrip}
            disabled={ending}
          >
            {ending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-red-400 font-bold text-xs uppercase">KẾT THÚC HÀNH TRÌNH</Text>
            )}
          </Pressable>

          {/* Big Panic SOS Button */}
          <Pressable
            className="flex-1 h-12 rounded-xl bg-emergency-600 items-center justify-center active:bg-emergency-700 shadow-lg shadow-emergency-600/40"
            onPress={handlePanicSOS}
          >
            <Text className="text-white font-black text-xs uppercase tracking-wider">PANIC SOS</Text>
          </Pressable>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
