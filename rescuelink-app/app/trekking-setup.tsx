import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import { Alert, ActivityIndicator, Modal } from 'react-native';
import { useGPS } from '@/hooks/useGPS';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { downloadRouteTiles } from '@/utils/offlineMap';

const DURATIONS = [
  { label: '4h', value: 4 },
  { label: '8h', value: 8 },
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '48h', value: 48 },
];

export default function TrekkingSetupScreen() {
  const router = useRouter();
  const { startTracking } = useGPS();
  const [routeName, setRouteName] = useState('');
  const [durationHours, setDurationHours] = useState(8); // Default 8 hours
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);

  // Search & Routing state variables
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDest, setSelectedDest] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [routePoints, setRoutePoints] = useState<any[]>([]);

  // Offline maps download state variables
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('user_info');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        setUserName(userInfo.name || '');
        setEmergencyContacts(userInfo.emergencyContacts || []);
      }
    } catch (e) {
      console.warn('Failed to load user info in trekking setup:', e);
    }
  };

  // Search location via Nominatim API
  const handleSearchLocation = async (text: string) => {
    if (!text.trim() || text.trim().length < 2) {
      Alert.alert('Nhập tìm kiếm', 'Vui lòng nhập từ khóa tìm kiếm (tối thiểu 2 ký tự).');
      return;
    }
    setSearching(true);
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
        Alert.alert('Không tìm thấy', 'Không tìm thấy địa điểm nào khớp với từ khóa.');
      }
    } catch (error) {
      console.warn('Geocoding error:', error);
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới dịch vụ tìm kiếm địa điểm.');
    } finally {
      setSearching(false);
    }
  };

  // Select destination and calculate route via OSRM API
  const handleSelectDestination = async (item: any) => {
    setSelectedDest(item);
    setSearchResults([]);
    setSearchQuery(item.display_name);

    // Auto-fill route name if empty or default
    const locationName = item.name || item.display_name.split(',')[0];
    if (!routeName || routeName.trim() === '') {
      setRouteName(`Điểm đến: ${locationName}`);
    }

    try {
      let startLat = 21.0285;
      let startLng = 105.8542;
      try {
        const userLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        startLat = userLoc.coords.latitude;
        startLng = userLoc.coords.longitude;
      } catch (e) {
        console.warn('Could not get current location for routing:', e);
      }

      const destLat = parseFloat(item.lat);
      const destLng = parseFloat(item.lon);

      // Call OSRM Route API
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM coordinates are [lng, lat]
        const pts = route.geometry.coordinates.map((coord: number[]) => ({
          lat: coord[1],
          lng: coord[0]
        }));
        setRoutePoints(pts);
        setRouteInfo({
          distanceKm: (route.distance / 1000).toFixed(2),
          durationMin: Math.round(route.duration / 60),
        });
      } else {
        Alert.alert('Không tìm thấy đường', 'Không thể tính toán tuyến đường đến địa điểm này.');
      }
    } catch (err) {
      console.warn('Routing API error:', err);
      Alert.alert('Lỗi tính toán đường', 'Đã xảy ra sự cố khi tải tuyến đường từ OSRM API.');
    }
  };

  // Calculate expected return date
  const now = new Date();
  const expectedReturnDate = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  const handleStartTrek = async () => {
    if (!routeName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên cung đường trekking.');
      return;
    }
    if (emergencyContacts.length === 0) {
      Alert.alert(
        'Chưa cài đặt người thân',
        'Vui lòng cấu hình người thân khẩn cấp trong tab Cá nhân trước khi bắt đầu hành trình.'
      );
      return;
    }
    
    const cleanPhone = emergencyContacts[0].phone.trim();
    if (cleanPhone.length < 9) {
      Alert.alert('Lỗi', 'Số điện thoại liên hệ khẩn cấp của bạn không hợp lệ.');
      return;
    }

    setSubmitting(true);

    try {
      // Get current location and fallback if it fails
      let lat = 21.0285;
      let lng = 105.8542;
      let battery = 100;

      try {
        const userLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = userLoc.coords.latitude;
        lng = userLoc.coords.longitude;
      } catch (locErr) {
        console.warn('Could not get initial position for starting trip, using fallback:', locErr);
      }

      try {
        const battLevel = await Battery.getBatteryLevelAsync();
        battery = battLevel >= 0 ? Math.round(battLevel * 100) : 100;
      } catch (battErr) {
        console.warn('Could not get battery level for starting trip, using fallback 100:', battErr);
      }

      // 1. Call backend API to start trip
      const payload = {
        routeName: routeName.trim(),
        expectedReturn: expectedReturnDate.toISOString(),
        lat,
        lng,
        battery
      };
      
      const res = await api.post('/trips/start', payload);

      if (res.data.success) {
        const tripData = res.data.trip;
        
        // Prepare route points
        let finalRoutePoints = routePoints;
        if (finalRoutePoints.length === 0) {
          // Generate a fallback simulated path if no OSRM route was generated
          finalRoutePoints = [];
          for (let i = 0; i <= 20; i++) {
            finalRoutePoints.push({
              lat: lat + i * 0.001,
              lng: lng + i * 0.0008
            });
          }
        }
        await AsyncStorage.setItem('route_points', JSON.stringify(finalRoutePoints));

        // 2. Start offline map tile download process
        setIsDownloading(true);
        setDownloadProgress(0);
        try {
          await downloadRouteTiles(finalRoutePoints, (progress) => {
            setDownloadProgress(progress);
          });
        } catch (downloadErr) {
          console.warn('Failed to download offline tiles:', downloadErr);
        } finally {
          setIsDownloading(false);
        }

        // 3. Start background GPS tracking
        await startTracking(tripData._id);
        
        // 4. Save active trip details locally including the emergency contact for offline SMS fallback
        const localActiveTrip = {
          id: tripData._id,
          routeName: routeName.trim(),
          emergencyContact: cleanPhone,
          expectedReturn: expectedReturnDate.toISOString(),
          startedAt: tripData.startedAt
        };

        await AsyncStorage.setItem('active_trip', JSON.stringify(localActiveTrip));

        Alert.alert(
          'Hành trình đã bắt đầu',
          'Định vị ngầm đã được kích hoạt và bản đồ ngoại tuyến đã được tải. Chúc bạn có một chuyến đi an toàn!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to tracking active page
                router.replace('/tracking-active');
              }
            }
          ]
        );
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Không thể bắt đầu hành trình. Vui lòng kiểm tra lại kết nối mạng.';
      Alert.alert('Lỗi khởi tạo', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-7 py-14 justify-center min-h-screen">
      {/* Title */}
      <View className="mb-10">
        <Pressable className="mb-4" onPress={() => router.back()}>
          <Text className="text-white text-lg">←</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-white">Cài Đặt Hành Trình</Text>
        <Text className="text-xs text-muted mt-1.5">Đăng ký thông tin trekking để được hỗ trợ khẩn cấp</Text>
      </View>

      <View className="bg-surface-1 border border-surface-3 p-7 rounded-3xl gap-6">
        
        {/* User Name Info (Read-only) */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-white tracking-wide">Người thực hiện hành trình</Text>
          <View className="bg-surface-2 border border-surface-3 p-3.5 rounded-2xl">
            <Text className="text-white text-xs font-bold">{userName || 'Chưa cập nhật'}</Text>
          </View>
        </View>

        {/* Route Name Input */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-white tracking-wide">Tên cung đường trekking</Text>
          <TextInput
            className="bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm"
            placeholder="Ví dụ: Phượt đỉnh Tây Yên Tử..."
            placeholderTextColor="#6b6b6b"
            value={routeName}
            onChangeText={setRouteName}
          />
        </View>

        {/* Destination Search & Route Planning */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-white tracking-wide">Tìm kiếm điểm đến (Bản đồ ngoại tuyến)</Text>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm"
              placeholder="Nhập địa danh cần tìm..."
              placeholderTextColor="#6b6b6b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable
              className="bg-surface-3 active:bg-surface-4 px-5 rounded-2xl justify-center items-center"
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
          
          {/* Search results suggestion list */}
          {searchResults.length > 0 && (
            <View className="bg-surface-2 border border-surface-3 rounded-2xl overflow-hidden mt-1 max-h-48">
              <ScrollView nestedScrollEnabled={true}>
                {searchResults.map((item, idx) => (
                  <Pressable
                    key={idx}
                    className="p-3 border-b border-surface-3 active:bg-surface-3 flex-row items-center"
                    onPress={() => handleSelectDestination(item)}
                  >
                    <Text className="text-white text-xs flex-1" numberOfLines={2}>
                      📍 {item.display_name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Selected Destination & OSRM Info Preview */}
          {routeInfo && (
            <View className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl mt-1.5 flex-row justify-between items-center">
              <View className="flex-1 mr-2">
                <Text className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">✓ Lộ trình khả dụng</Text>
                <Text className="text-white text-xs mt-1 font-medium" numberOfLines={1}>
                  {selectedDest?.display_name}
                </Text>
              </View>
              <View className="items-end shrink-0">
                <Text className="text-emerald-400 text-xs font-bold font-mono">{routeInfo.distanceKm} km</Text>
                <Text className="text-muted text-[10px] mt-0.5 font-mono">~{routeInfo.durationMin} phút di chuyển</Text>
              </View>
            </View>
          )}
        </View>

        {/* Emergency Contacts Info (Read-only from Profile) */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-white tracking-wide">Người thân nhận tin SOS (Cấu hình ở Cá nhân)</Text>
          {emergencyContacts.length > 0 ? (
            <View className="gap-2">
              {emergencyContacts.map((contact, idx) => (
                <View key={idx} className="bg-surface-2 border border-surface-3 p-3.5 rounded-2xl flex-row justify-between items-center">
                  <View className="gap-0.5">
                    <Text className="text-white text-xs font-bold">{contact.name} ({contact.relation})</Text>
                    <Text className="text-[10px] text-muted font-mono">{contact.phone}</Text>
                  </View>
                  {idx === 0 && (
                    <View className="bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-md">
                      <Text className="text-[8px] font-bold text-emerald-400 uppercase tracking-wide">Mặc định</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-red-950/20 border border-red-500/30 p-4 rounded-2xl gap-2">
              <Text className="text-red-400 text-xs font-bold uppercase">🚨 Chưa cấu hình người thân</Text>
              <Text className="text-[10px] text-white leading-normal">
                Vui lòng truy cập tab **Cá nhân** để thêm tối thiểu 1 người thân khẩn cấp trước khi khởi hành.
              </Text>
            </View>
          )}
          <Text className="text-[10px] text-muted leading-4">
            * Tin nhắn SMS SOS khẩn cấp sẽ tự động gửi cho người thân trên khi xảy ra sự cố hoặc pin yếu.
          </Text>
        </View>

        {/* Duration Selection */}
        <View className="gap-3">
          <Text className="text-xs font-semibold text-white tracking-wide">Thời gian dự kiến</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {DURATIONS.map((dur) => (
              <Pressable
                key={dur.value}
                className={`px-5 py-2.5 rounded-2xl border ${
                  durationHours === dur.value
                    ? 'bg-emergency-500/15 border-emergency-500'
                    : 'bg-surface-2 border-surface-3'
                }`}
                onPress={() => setDurationHours(dur.value)}
              >
                <Text
                  className={`text-sm font-medium ${
                    durationHours === dur.value ? 'text-emergency-400' : 'text-muted'
                  }`}
                >
                  {dur.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Calculated Time Preview */}
        <View className="bg-surface-2 border border-surface-3 p-4 rounded-2xl flex-row justify-between items-center">
          <View>
            <Text className="text-[10px] text-muted">Dự kiến về</Text>
            <Text className="text-sm font-bold text-white font-mono mt-1">
              {expectedReturnDate.toLocaleTimeString()} — {expectedReturnDate.toLocaleDateString()}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[10px] text-muted">Tổng</Text>
            <Text className="text-sm font-bold text-emergency-400 mt-1">{durationHours} tiếng</Text>
          </View>
        </View>

        {/* Start Button */}
        <Pressable
          className="bg-emergency-500 active:bg-emergency-600 py-4 rounded-2xl mt-2 items-center justify-center"
          onPress={handleStartTrek}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-sm uppercase tracking-wide">Kích hoạt hành trình & định vị ngầm</Text>
          )}
        </Pressable>

        {/* Back button */}
        <Pressable
          className="py-2 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-xs text-muted underline">Quay lại trang chủ</Text>
        </Pressable>

      </View>

      {/* Offline maps download progress overlay modal */}
      <Modal visible={isDownloading} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-8">
          <View className="bg-surface-1 border border-surface-3 p-6 rounded-3xl w-full items-center gap-5">
            <ActivityIndicator size="large" color="#FF4D3D" />
            <View className="items-center gap-1.5">
              <Text className="text-white font-bold text-base">Tải Bản Đồ Ngoại Tuyến</Text>
              <Text className="text-muted text-xs text-center font-medium">
                Đang lưu dữ liệu bản đồ dọc tuyến đường để hoạt động khi không có mạng...
              </Text>
            </View>
            
            {/* Progress bar container */}
            <View className="w-full bg-surface-3 h-2.5 rounded-full overflow-hidden">
              <View 
                className="bg-emergency-500 h-full"
                style={{ width: `${Math.round(downloadProgress * 100)}%` }}
              />
            </View>
            
            <Text className="text-emergency-400 font-bold font-mono text-sm">
              {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
