import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import { Alert, ActivityIndicator } from 'react-native';
import { useGPS } from '@/hooks/useGPS';
import * as Location from 'expo-location';

const DURATIONS = [
  { label: '4 tiếng', value: 4 },
  { label: '8 tiếng', value: 8 },
  { label: '12 tiếng', value: 12 },
  { label: '24 tiếng (1 ngày)', value: 24 },
  { label: '48 tiếng (2 ngày)', value: 48 },
];

export default function TrekkingSetupScreen() {
  const router = useRouter();
  const { startTracking } = useGPS();
  const [routeName, setRouteName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [durationHours, setDurationHours] = useState(8); // Default 8 hours
  const [submitting, setSubmitting] = useState(false);

  // Calculate expected return date
  const now = new Date();
  const expectedReturnDate = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  const handleStartTrek = async () => {
    if (!routeName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên cung đường trekking.');
      return;
    }
    if (!emergencyContact.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại người thân nhận cảnh báo.');
      return;
    }
    
    // Simple phone format validation
    const cleanPhone = emergencyContact.trim();
    if (cleanPhone.length < 9) {
      Alert.alert('Lỗi', 'Số điện thoại liên hệ khẩn cấp không hợp lệ.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Call backend API to start trip
      const payload = {
        routeName: routeName.trim(),
        expectedReturn: expectedReturnDate.toISOString()
      };
      
      const res = await api.post('/trips/start', payload);

      if (res.data.success) {
        const tripData = res.data.trip;
        
        // Generate mock route points starting from user's current location
        // This simulates a "registered trail" path for route deviation checking.
        try {
          const userLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const startLat = userLoc.coords.latitude;
          const startLng = userLoc.coords.longitude;
          const mockRoutePoints = [];
          for (let i = 0; i <= 20; i++) {
            // Generate a line heading North-East (simulating a path)
            mockRoutePoints.push({
              lat: startLat + i * 0.001,
              lng: startLng + i * 0.0008
            });
          }
          await AsyncStorage.setItem('route_points', JSON.stringify(mockRoutePoints));
        } catch (e) {
          console.warn('Could not get initial position for route generation, using standard mock coordinates.');
          const mockRoutePoints = [
            { lat: 21.0285, lng: 105.8542 },
            { lat: 21.0385, lng: 105.8642 }
          ];
          await AsyncStorage.setItem('route_points', JSON.stringify(mockRoutePoints));
        }

        // 2. Start background GPS tracking
        await startTracking(tripData._id);
        
        // 3. Save active trip details locally including the emergency contact for offline SMS fallback
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
          'Định vị ngầm đã được kích hoạt. Chúc bạn có một chuyến đi an toàn!',
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
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-6 py-12 justify-center min-h-screen">
      {/* Title */}
      <View className="mb-8">
        <Text className="text-2xl font-bold text-white">Cài Đặt Hành Trình</Text>
        <Text className="text-xs text-muted-light mt-1">Đăng ký thông tin trekking để được hỗ trợ khẩn cấp</Text>
      </View>

      <View className="bg-surface-1 border border-surface-4 p-5 rounded-2xl gap-5">
        
        {/* Route Name Input */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-white">Tên cung đường trekking</Text>
          <TextInput
            className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
            placeholder="Ví dụ: Phượt đỉnh Tây Yên Tử, Trùng Khánh..."
            placeholderTextColor="#737373"
            value={routeName}
            onChangeText={setRouteName}
          />
        </View>

        {/* Emergency Contact Input */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-white">SĐT người thân nhận tin SOS (Khẩn cấp)</Text>
          <TextInput
            className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
            placeholder="Ví dụ: 0912345678"
            placeholderTextColor="#737373"
            keyboardType="phone-pad"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
          />
          <Text className="text-[10px] text-muted-light leading-normal">
            * Hệ thống sẽ tự động nhắn tin SMS trực tiếp từ điện thoại của bạn đến số này khi pin yếu hoặc gặp sự cố kể cả khi mất sóng internet.
          </Text>
        </View>

        {/* Duration Selection */}
        <View className="gap-2.5">
          <Text className="text-xs font-semibold text-white">Thời gian dự kiến hành trình</Text>
          <View className="flex-row flex-wrap gap-2">
            {DURATIONS.map((dur) => (
              <Pressable
                key={dur.value}
                className={`px-3 py-2 rounded-lg border transition-all ${
                  durationHours === dur.value
                    ? 'bg-emergency-600/20 border-emergency-500 text-white'
                    : 'bg-surface-3 border-surface-4 text-muted-light'
                }`}
                onPress={() => setDurationHours(dur.value)}
              >
                <Text
                  className={`text-xs ${
                    durationHours === dur.value ? 'text-emergency-400 font-semibold' : 'text-muted-light'
                  }`}
                >
                  {dur.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Calculated Time Preview */}
        <View className="bg-surface-3 border border-surface-4 p-3 rounded-lg flex-row justify-between items-center mt-1">
          <View>
            <Text className="text-[10px] text-muted">Thời điểm dự kiến về</Text>
            <Text className="text-sm font-bold text-white font-mono mt-0.5">
              {expectedReturnDate.toLocaleTimeString()} - {expectedReturnDate.toLocaleDateString()}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[10px] text-muted">Tổng thời gian</Text>
            <Text className="text-xs font-semibold text-emergency-400 mt-0.5">{durationHours} tiếng</Text>
          </View>
        </View>

        {/* Start Button */}
        <Pressable
          className="bg-emergency-600 active:bg-emergency-700 py-3.5 rounded-lg mt-3 items-center justify-center"
          onPress={handleStartTrek}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-sm uppercase">Kích hoạt hành trình & định vị ngầm</Text>
          )}
        </Pressable>

        {/* Back button */}
        <Pressable
          className="py-1 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-xs text-muted-light underline">Quay lại trang chủ</Text>
        </Pressable>

      </View>
    </ScrollView>
  );
}
