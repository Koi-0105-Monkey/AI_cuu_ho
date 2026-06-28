import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { Alert, ActivityIndicator } from 'react-native';
import * as SMS from 'expo-sms';
import { flushOfflineQueue } from '@/services/queueService';

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);

  // Safety Warning States
  const [hasCheckinWarning, setHasCheckinWarning] = useState(false);
  const [pendingSms, setPendingSms] = useState<any>(null);

  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Emergency Contact State (for Register)
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');

  // Weather State
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Fetch current weather at location
  const fetchWeather = async (lat: number, lng: number) => {
    setWeatherLoading(true);
    try {
      const res = await api.get(`/weather?lat=${lat}&lng=${lng}`);
      if (res.data.success) {
        setWeather(res.data.weather);
      }
    } catch (err) {
      console.warn('Failed to fetch weather forecast');
    } finally {
      setWeatherLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
      // Lấy thời tiết tại Sapa làm tọa độ mặc định để test
      fetchWeather(22.33, 103.82);
    }, [])
  );

  // Monitor safety warnings when logged in
  useEffect(() => {
    let interval: any;
    if (token) {
      checkSafetyAlerts();
      interval = setInterval(checkSafetyAlerts, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token]);

  const syncActiveTripFromServer = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('user_token');
      if (!storedToken) return;

      const res = await api.get('/trips/active');
      if (res.data.success) {
        if (res.data.trip) {
          const tripData = res.data.trip;
          const storedUser = await AsyncStorage.getItem('user_info');
          const parsedUser = storedUser ? JSON.parse(storedUser) : null;
          const cleanPhone = parsedUser?.emergencyContacts?.[0]?.phone || '0901234567';
          
          const localActiveTrip = {
            id: tripData._id,
            routeName: tripData.routeName,
            emergencyContact: cleanPhone,
            expectedReturn: tripData.expectedReturn,
            startedAt: tripData.startedAt
          };
          await AsyncStorage.setItem('active_trip', JSON.stringify(localActiveTrip));
          setActiveTrip(localActiveTrip);
          
          // Lấy vị trí cuối cùng của trip để tải thời tiết
          if (tripData.lastKnownLocation?.coordinates) {
            const [lng, lat] = tripData.lastKnownLocation.coordinates;
            fetchWeather(lat, lng);
          }
        } else {
          // No active trip on server, so clean up locally
          const storedTrip = await AsyncStorage.getItem('active_trip');
          if (storedTrip) {
            console.log('[Home] Active trip completed/removed on server, cleaning up locally.');
            await AsyncStorage.removeItem('active_trip');
            setActiveTrip(null);
          }
        }
      }
    } catch (serverErr) {
      console.warn('[Home] Failed to sync active trip from server:', serverErr);
    }
  };

  const checkAuth = async () => {
    setLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem('user_token');
      const storedUser = await AsyncStorage.getItem('user_info');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Check active trip in local storage
        const storedTrip = await AsyncStorage.getItem('active_trip');
        if (storedTrip) {
          setActiveTrip(JSON.parse(storedTrip));
        } else {
          setActiveTrip(null);
        }

        // Sync from server to ensure local state aligns with DB
        await syncActiveTripFromServer();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Check safety warnings stored by background task
  const checkSafetyAlerts = async () => {
    try {
      // 1. Check check-in warning (stopped > 20 mins)
      const warning = await AsyncStorage.getItem('checkin_warning_sent');
      setHasCheckinWarning(warning === 'true');

      // 2. Check pending SMS alert (SOS triggered while offline)
      const pendingSmsStr = await AsyncStorage.getItem('pending_sms_alert');
      if (pendingSmsStr) {
        setPendingSms(JSON.parse(pendingSmsStr));
      } else {
        setPendingSms(null);
      }

      // 3. Re-sync active trip in case it changed or ended
      const storedTrip = await AsyncStorage.getItem('active_trip');
      if (storedTrip) {
        setActiveTrip(JSON.parse(storedTrip));
      } else {
        setActiveTrip(null);
      }

      // 4. Trigger offline queue sync
      await flushOfflineQueue();
    } catch (e) {
      console.error('Error checking safety alerts:', e);
    }
  };

  // Reset check-in state when user confirms they are OK
  const handleCheckinOk = async () => {
    try {
      const now = Date.now().toString();
      await AsyncStorage.setItem('last_movement_time', now);
      await AsyncStorage.removeItem('checkin_warning_sent');
      await AsyncStorage.removeItem('checkin_warning_time');
      await AsyncStorage.removeItem('checkin_failed_triggered');
      await AsyncStorage.removeItem('checkin_lost_incident_created');
      
      setHasCheckinWarning(false);
      Alert.alert('Xác nhận an toàn', 'Cảm ơn bạn! RescueLink đã ghi nhận trạng thái an toàn của bạn.');
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể xác nhận check-in.');
    }
  };

  // Launch native SMS composer for fallback transmission
  const handleSendSms = async () => {
    if (!pendingSms) return;
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        Alert.alert(
          'Gửi SMS Khẩn Cấp',
          'Thiết bị sẽ mở ứng dụng Nhắn tin để gửi tin tọa độ SOS cho người thân. Bạn vui lòng ấn nút Gửi trong hộp thoại tiếp theo.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Mở Tin Nhắn',
              onPress: async () => {
                const { result } = await SMS.sendSMSAsync(
                  [pendingSms.phone],
                  pendingSms.message
                );
                
                // Clear warning once user processed the SMS
                await AsyncStorage.removeItem('pending_sms_alert');
                setPendingSms(null);
                
                console.log('SMS result:', result);
              }
            }
          ]
        );
      } else {
        Alert.alert('Lỗi', 'Tính năng gửi SMS không khả dụng trên thiết bị này.');
      }
    } catch (e) {
      console.error('Failed to trigger SMS client:', e);
    }
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ số điện thoại và mật khẩu.');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await api.post('/auth/login', { phone, password });
      if (res.data.success) {
        const { token: userToken, user: userInfo } = res.data;
        await AsyncStorage.setItem('user_token', userToken);
        await AsyncStorage.setItem('user_info', JSON.stringify(userInfo));
        setToken(userToken);
        setUser(userInfo);
        
        // Reset form
        setPassword('');
        Alert.alert('Thành công', `Chào mừng ${userInfo.name} quay trở lại!`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
      Alert.alert('Lỗi đăng nhập', msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !phone || !password || !contactName || !contactPhone || !contactRelation) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin cá nhân và người thân khẩn cấp.');
      return;
    }
    setAuthLoading(true);
    try {
      const payload = {
        name,
        phone,
        password,
        emergencyContacts: [
          { name: contactName, phone: contactPhone, relation: contactRelation }
        ]
      };
      const res = await api.post('/auth/register', payload);
      if (res.data.success) {
        const { token: userToken, user: userInfo } = res.data;
        await AsyncStorage.setItem('user_token', userToken);
        await AsyncStorage.setItem('user_info', JSON.stringify(userInfo));
        setToken(userToken);
        setUser(userInfo);
        Alert.alert('Thành công', 'Đăng ký tài khoản cứu hộ thành công!');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại.';
      Alert.alert('Lỗi đăng ký', msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        onPress: async () => {
          await AsyncStorage.removeItem('user_token');
          await AsyncStorage.removeItem('user_info');
          await AsyncStorage.removeItem('active_trip');
          setToken(null);
          setUser(null);
          setActiveTrip(null);
        }
      }
    ]);
  };

  // Get user initials for avatar
  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#FF4D3D" />
        <Text className="text-sm text-muted-light mt-4">Đang tải...</Text>
      </View>
    );
  }

  // ─── AUTHENTICATION SCREEN (LOGIN / REGISTER) ────────────────
  if (!token) {
    return (
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-7 justify-center min-h-screen py-20">
        {/* Brand */}
        <View className="items-center mb-10">
          <Text className="text-4xl font-bold text-emergency-500 uppercase tracking-widest">RescueLink</Text>
          <Text className="text-xs text-muted mt-2 tracking-wide">Hệ Thống Cứu Hộ & Định Vị Khẩn Cấp</Text>
        </View>

        {/* Auth Form Card */}
        <View className="bg-surface-1 border border-surface-3 p-7 rounded-3xl gap-5">
          <Text className="text-lg font-bold text-white text-center tracking-wide">
            {isRegister ? 'ĐĂNG KÝ THÀNH VIÊN' : 'ĐĂNG NHẬP CỨU HỘ'}
          </Text>

          {isRegister && (
            <View className="gap-1.5">
              <Text className="text-xs text-muted-light font-medium">Họ và Tên</Text>
              <TextInput
                className="bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm"
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#6b6b6b"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View className="gap-1.5">
            <Text className="text-xs text-muted-light font-medium">Số điện thoại</Text>
            <TextInput
              className="bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm"
              placeholder="0901234567"
              placeholderTextColor="#6b6b6b"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs text-muted-light font-medium">Mật khẩu</Text>
            <TextInput
              className="bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm"
              placeholder="••••••••"
              placeholderTextColor="#6b6b6b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {isRegister && (
            <View className="mt-1 border-t border-surface-3 pt-5 gap-4">
              <Text className="text-xs font-semibold text-emergency-400 tracking-wider">NGƯỜI THÂN LIÊN HỆ KHẨN CẤP</Text>
              
              <View className="gap-1.5">
                <Text className="text-xs text-muted-light font-medium">Tên người thân</Text>
                <TextInput
                  className="bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm"
                  placeholder="Nguyễn Văn B"
                  placeholderTextColor="#6b6b6b"
                  value={contactName}
                  onChangeText={setContactName}
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-xs text-muted-light font-medium">SĐT người thân</Text>
                <TextInput
                  className="bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm"
                  placeholder="0987654321"
                  placeholderTextColor="#6b6b6b"
                  keyboardType="phone-pad"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-xs text-muted-light font-medium">Mối quan hệ</Text>
                <TextInput
                  className="bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm"
                  placeholder="Bố / Mẹ / Vợ / Bạn"
                  placeholderTextColor="#6b6b6b"
                  value={contactRelation}
                  onChangeText={setContactRelation}
                />
              </View>
            </View>
          )}

          <Pressable
            className="bg-emergency-500 active:bg-emergency-600 py-4 rounded-2xl mt-3 items-center justify-center"
            onPress={isRegister ? handleRegister : handleLogin}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-sm tracking-wider">
                {isRegister ? 'ĐĂNG KÝ NGAY' : 'ĐĂNG NHẬP'}
              </Text>
            )}
          </Pressable>

          <Pressable
            className="py-2 items-center"
            onPress={() => setIsRegister(!isRegister)}
          >
            <Text className="text-xs text-muted-light underline">
              {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ─── HOME SCREEN FOR LOGGED IN USERS ──────────────────
  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-6 py-14 gap-8">
      
      {/* ⚠️ SAFETY ALERT BANNERS ─── */}
      {hasCheckinWarning && (
        <View className="bg-warn-500/10 border border-warn-500/25 p-5 rounded-3xl gap-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">⚠️</Text>
            <Text className="text-xs font-bold text-warn-400 uppercase tracking-wider">Cảnh báo dừng di chuyển</Text>
          </View>
          <Text className="text-xs text-white/80 leading-5">
            Hệ thống phát hiện bạn đứng yên lâu bất thường. Hãy bấm xác nhận bên dưới để hủy cảnh báo khẩn cấp.
          </Text>
          <Pressable
            className="bg-safe-500 active:bg-safe-600 py-3 rounded-2xl items-center justify-center"
            onPress={handleCheckinOk}
          >
            <Text className="text-white font-bold text-xs tracking-wider">TÔI VẪN ỔN ✓</Text>
          </Pressable>
        </View>
      )}

      {pendingSms && (
        <View className="bg-emergency-950/30 border border-emergency-700/30 p-5 rounded-3xl gap-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">🚨</Text>
            <Text className="text-xs font-bold text-emergency-400 uppercase tracking-wider">Cần gửi tin SOS khẩn cấp</Text>
          </View>
          <Text className="text-xs text-white/80 leading-5">
            Hệ thống phát hiện trạng thái khẩn cấp trong khi bạn không có kết nối Internet. Vui lòng nhấn gửi SMS để báo động cho người thân.
          </Text>
          <Pressable
            className="bg-emergency-500 active:bg-emergency-600 py-3.5 rounded-2xl items-center justify-center"
            onPress={handleSendSms}
          >
            <Text className="text-white font-bold text-xs uppercase tracking-wider">GỬI TIN NHẮN SOS NGAY</Text>
          </Pressable>
        </View>
      )}

      {/* ─── Greeting Section ─── */}
      <View className="flex-row items-center gap-4">
        <View className="w-12 h-12 rounded-full bg-surface-3 items-center justify-center">
          <Text className="text-base font-bold text-white">{getInitials(user?.name)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-muted">Xin chào</Text>
          <Text className="text-xl font-bold text-white">{user?.name}</Text>
        </View>
        <Pressable
          className="bg-surface-2 border border-surface-3 px-4 py-2 rounded-2xl active:bg-surface-3"
          onPress={handleLogout}
        >
          <Text className="text-xs text-emergency-400 font-medium">Đăng xuất</Text>
        </Pressable>
      </View>

      {/* ─── Weather Forecast Widget ─── */}
      {weatherLoading ? (
        <View className="bg-surface-1 border border-surface-3 p-4 rounded-3xl items-center justify-center py-6">
          <ActivityIndicator size="small" color="#10b981" />
          <Text className="text-[10px] text-slate-500 mt-2 font-medium">Đang đo thời tiết...</Text>
        </View>
      ) : weather ? (
        <View className={`p-5 rounded-3xl border ${weather.isDangerous ? 'bg-red-950/20 border-red-900/35' : 'bg-surface-1 border-surface-3'} flex-row justify-between items-center`}>
          <View className="flex-1 mr-3 gap-1">
            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thời tiết hiện tại</Text>
            <Text className="text-sm font-bold text-white">{weather.description}</Text>
            <Text className="text-[10px] text-slate-400 leading-4">
              {weather.isDangerous 
                ? '⚠️ Nguy cơ mưa bão cực cao! Tránh tiếp tục di chuyển sâu vào rừng.' 
                : '✅ Thời tiết lý tưởng để tiếp tục chuyến đi.'}
            </Text>
          </View>
          <View className="items-end shrink-0">
            <Text className="text-2xl font-bold text-white font-mono">{weather.temperature}°C</Text>
            <Text className="text-[9px] text-slate-500 font-mono">Gió: {weather.windspeed} km/h</Text>
          </View>
        </View>
      ) : null}

      {/* Active Trip Info or Setup Call */}
      {activeTrip ? (
        /* ─── Active Trip Dashboard ─── */
        <View className="bg-surface-1 border-l-2 border-safe-500 p-6 rounded-3xl gap-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 bg-safe-500 rounded-full" />
              <Text className="text-xs font-bold text-safe-400 uppercase tracking-wider">Đang hoạt động</Text>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-white text-xl font-bold">{activeTrip.routeName}</Text>
            <View className="gap-1.5">
              <Text className="text-xs text-muted-light">
                📞  Liên hệ khẩn cấp: {activeTrip.emergencyContact}
              </Text>
              <Text className="text-xs text-muted-light">
                🕐  Dự kiến về: {new Date(activeTrip.expectedReturn).toLocaleString()}
              </Text>
            </View>
          </View>

          <Pressable
            className="bg-safe-500 active:bg-safe-600 py-4 rounded-2xl items-center justify-center"
            onPress={() => router.push('/tracking-active')}
          >
            <Text className="text-white font-bold text-sm tracking-wide">VÀO BẢN ĐỒ TRACKING →</Text>
          </Pressable>
        </View>
      ) : (
        /* ─── Start Trekking Hero Card ─── */
        <View className="bg-surface-1 border border-surface-3 p-7 rounded-3xl gap-6">
          <View className="items-center gap-3">
            <Text className="text-3xl">🏔️</Text>
            <Text className="text-2xl font-bold text-white">Bắt đầu hành trình</Text>
            <Text className="text-xs text-muted text-center leading-5 px-2">
              Đăng ký cung đường để hệ thống định vị ngầm bảo vệ và tự động phát SOS khi gặp sự cố.
            </Text>
          </View>

          <Link href="/trekking-setup" asChild>
            <Pressable className="bg-emergency-500 active:bg-emergency-600 py-4 rounded-2xl items-center justify-center">
              <Text className="text-white font-bold text-sm tracking-wide uppercase">Cài đặt hành trình →</Text>
            </Pressable>
          </Link>

          <Link href="/tracking-active" asChild>
            <Pressable className="bg-surface-2 border border-surface-3 py-4 rounded-2xl items-center justify-center active:bg-surface-3">
              <Text className="text-white font-bold text-sm tracking-wide uppercase">Xem bản đồ & Khám phá →</Text>
            </Pressable>
          </Link>
        </View>
      )}

      {/* ─── Quick Stats Row ─── */}
      {!activeTrip && (
        <View className="flex-row gap-4">
          <View className="flex-1 bg-surface-1 border border-surface-3 p-4 rounded-2xl items-center gap-2">
            <Text className="text-lg">🗺️</Text>
            <Text className="text-xs text-muted">Tổng hành trình</Text>
            <Text className="text-xl font-bold text-white">—</Text>
          </View>
          <View className="flex-1 bg-surface-1 border border-surface-3 p-4 rounded-2xl items-center gap-2">
            <Text className="text-lg">🛡️</Text>
            <Text className="text-xs text-muted">Ngày an toàn</Text>
            <Text className="text-xl font-bold text-white">—</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
