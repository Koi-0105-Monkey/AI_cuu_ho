import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import { Alert, ActivityIndicator } from 'react-native';
import { useGPS } from '@/hooks/useGPS';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';

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
        
        // Remove old route points key to clear map initially in tracking active page
        await AsyncStorage.removeItem('route_points');

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
    </ScrollView>
  );
}
