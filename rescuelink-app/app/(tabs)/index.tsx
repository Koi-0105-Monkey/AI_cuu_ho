import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter } from 'expo-router';
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

  useEffect(() => {
    checkAuth();
  }, []);

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
        }
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

  if (loading) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#ef4444" />
        <Text className="text-sm text-muted-light mt-4">Đang tải...</Text>
      </View>
    );
  }

  // ─── AUTHENTICATION SCREEN (LOGIN / REGISTER) ────────────────
  if (!token) {
    return (
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-6 justify-center min-h-screen py-16">
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-emergency-500 uppercase tracking-wider">RescueLink</Text>
          <Text className="text-xs text-muted-light mt-1">Hệ Thống Cứu Hộ & Định Vị Khẩn Cấp</Text>
        </View>

        <View className="bg-surface-1 border border-surface-4 p-5 rounded-2xl gap-4">
          <Text className="text-lg font-bold text-white text-center">
            {isRegister ? 'ĐĂNG KÝ THÀNH VIÊN' : 'ĐĂNG NHẬP CỨU HỘ'}
          </Text>

          {isRegister && (
            <View className="gap-1">
              <Text className="text-xs text-muted-light">Họ và Tên</Text>
              <TextInput
                className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#737373"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View className="gap-1">
            <Text className="text-xs text-muted-light">Số điện thoại</Text>
            <TextInput
              className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
              placeholder="0901234567"
              placeholderTextColor="#737373"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs text-muted-light">Mật khẩu</Text>
            <TextInput
              className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
              placeholder="••••••••"
              placeholderTextColor="#737373"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {isRegister && (
            <View className="mt-2 border-t border-surface-4 pt-3 gap-3">
              <Text className="text-xs font-semibold text-emergency-400">NGƯỜI THÂN LIÊN HỆ KHẨN CẤP</Text>
              
              <View className="gap-1">
                <Text className="text-xs text-muted-light">Tên người thân</Text>
                <TextInput
                  className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Nguyễn Văn B"
                  placeholderTextColor="#737373"
                  value={contactName}
                  onChangeText={setContactName}
                />
              </View>

              <View className="gap-1">
                <Text className="text-xs text-muted-light">SĐT người thân</Text>
                <TextInput
                  className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="0987654321"
                  placeholderTextColor="#737373"
                  keyboardType="phone-pad"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                />
              </View>

              <View className="gap-1">
                <Text className="text-xs text-muted-light">Mối quan hệ</Text>
                <TextInput
                  className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Bố / Mẹ / Vợ / Bạn"
                  placeholderTextColor="#737373"
                  value={contactRelation}
                  onChangeText={setContactRelation}
                />
              </View>
            </View>
          )}

          <Pressable
            className="bg-emergency-600 active:bg-emergency-700 py-3 rounded-lg mt-4 items-center justify-center"
            onPress={isRegister ? handleRegister : handleLogin}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-sm">
                {isRegister ? 'ĐĂNG KÝ NGAY' : 'ĐĂNG NHẬP'}
              </Text>
            )}
          </Pressable>

          <Pressable
            className="py-1 items-center mt-2"
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
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-6 py-12 gap-6">
      
      {/* ⚠️ SAFETY ALERT BANNERS ─── */}
      {hasCheckinWarning && (
        <View className="bg-amber-600/20 border border-amber-500/40 p-4 rounded-xl gap-3">
          <Text className="text-xs font-bold text-amber-400 uppercase">CẢNH BÁO DỪNG DI CHUYỂN</Text>
          <Text className="text-xs text-white leading-normal">
            Hệ thống phát hiện bạn đứng yên lâu bất thường. Hãy bấm xác nhận bên dưới để hủy cảnh báo khẩn cấp.
          </Text>
          <Pressable
            className="bg-emerald-600 active:bg-emerald-700 py-2 rounded-lg items-center justify-center"
            onPress={handleCheckinOk}
          >
            <Text className="text-white font-bold text-xs">TÔI VẪN ỔN (CHECK-IN)</Text>
          </Pressable>
        </View>
      )}

      {pendingSms && (
        <View className="bg-emergency-950/20 border border-emergency-800/40 p-4 rounded-xl gap-3">
          <Text className="text-xs font-bold text-red-400 uppercase">CẦN GỬI TIN SOS KHẨN CẤP</Text>
          <Text className="text-xs text-white leading-normal">
            Hệ thống phát hiện trạng thái khẩn cấp trong khi bạn không có kết nối Internet (Offline). Vui lòng nhấn gửi SMS để báo động cho người thân.
          </Text>
          <Pressable
            className="bg-emergency-600 active:bg-emergency-700 py-2.5 rounded-lg items-center justify-center"
            onPress={handleSendSms}
          >
            <Text className="text-white font-bold text-xs uppercase">GỬI TIN NHẮN SOS NGAY</Text>
          </Pressable>
        </View>
      )}

      {/* Header Info */}
      <View className="flex-row justify-between items-center bg-surface-1 border border-surface-4 p-4 rounded-xl">
        <View>
          <Text className="text-xs text-muted-light">Thành viên cứu hộ</Text>
          <Text className="text-lg font-bold text-white">{user?.name}</Text>
          <Text className="text-xs text-muted-light font-mono mt-0.5">{user?.phone}</Text>
        </View>
        <Pressable
          className="bg-surface-3 border border-surface-4 px-3 py-1.5 rounded-lg active:bg-surface-4"
          onPress={handleLogout}
        >
          <Text className="text-xs text-red-400 font-medium">Đăng xuất</Text>
        </Pressable>
      </View>

      {/* Active Trip Info or Setup Call */}
      {activeTrip ? (
        <View className="bg-emerald-950/20 border border-emerald-800/40 p-5 rounded-2xl gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-emerald-400 uppercase">HÀNH TRÌNH ĐANG HOẠT ĐỘNG</Text>
            <View className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          </View>

          <View className="gap-2">
            <Text className="text-white text-lg font-bold">{activeTrip.routeName}</Text>
            <Text className="text-xs text-muted-light">
              Liên hệ khẩn cấp: {activeTrip.emergencyContact}
            </Text>
            <Text className="text-xs text-muted-light">
              Dự kiến về: {new Date(activeTrip.expectedReturn).toLocaleString()}
            </Text>
          </View>

          <Pressable
            className="bg-emerald-600 active:bg-emerald-700 py-3 rounded-lg items-center justify-center mt-2"
            onPress={() => router.push('/tracking-active')}
          >
            <Text className="text-white font-bold text-sm">VÀO MÀN HÌNH BẢN ĐỒ TRACKING</Text>
          </Pressable>
        </View>
      ) : (
        <View className="bg-surface-1 border border-surface-4 p-6 rounded-2xl gap-5">
          <View className="items-center">
            <Text className="text-xl font-bold text-white">BẮT ĐẦU TREKKING</Text>
            <Text className="text-xs text-muted text-center mt-1.5 px-4 leading-normal">
              Đăng ký hành trình của bạn để hệ thống định vị ngầm bảo vệ và tự động phát SOS khi gặp sự cố hoặc cạn pin.
            </Text>
          </View>

          <View className="border-t border-surface-4 pt-4 gap-4">
            <View className="flex-row gap-3 items-center">
              <View className="w-6 h-6 rounded-full bg-emergency-600/20 items-center justify-center">
                <Text className="text-xs font-bold text-emergency-500">1</Text>
              </View>
              <Text className="text-xs text-muted-light flex-1">
                Khai báo cung đường và thông tin liên hệ của người thân
              </Text>
            </View>
            <View className="flex-row gap-3 items-center">
              <View className="w-6 h-6 rounded-full bg-emergency-600/20 items-center justify-center">
                <Text className="text-xs font-bold text-emergency-500">2</Text>
              </View>
              <Text className="text-xs text-muted-light flex-1">
                Hệ thống tự động ghi nhật ký GPS kể cả khi mất mạng
              </Text>
            </View>
            <View className="flex-row gap-3 items-center">
              <View className="w-6 h-6 rounded-full bg-emergency-600/20 items-center justify-center">
                <Text className="text-xs font-bold text-emergency-500">3</Text>
              </View>
              <Text className="text-xs text-muted-light flex-1">
                Tự động gửi tin khẩn cấp SOS bằng SMS GSM khi mất sóng 4G
              </Text>
            </View>
          </View>

          <Link href="/trekking-setup" asChild>
            <Pressable className="bg-emergency-600 active:bg-emergency-700 py-3.5 rounded-lg items-center justify-center mt-2">
              <Text className="text-white font-bold text-sm uppercase">CÀI ĐẶT HÀNH TRÌNH</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </ScrollView>
  );
}
