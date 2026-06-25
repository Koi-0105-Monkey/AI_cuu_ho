import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '@/services/api';
import { Alert, ActivityIndicator, Image, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const INCIDENT_TYPES = [
  { type: 'MANUAL', label: 'Yêu Cầu Cứu Hộ', severity: 5, bg: 'bg-red-600', icon: '🚨' },
  { type: 'CRASH', label: 'Tai Nạn Xe', severity: 4, bg: 'bg-amber-600', icon: '🚗' },
  { type: 'MED', label: 'Sự Cố Y Tế', severity: 4, bg: 'bg-rose-600', icon: '🩺' },
  { type: 'VEH', label: 'Xe Bị Hỏng', severity: 3, bg: 'bg-blue-600', icon: '🔧' },
];

export default function IncidentsScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [reportingType, setReportingType] = useState<string | null>(null);

  const cameraRef = useRef<any>(null);

  // Authentication State
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      checkToken();
    }, [])
  );

  const checkToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('user_token');
      setToken(storedToken);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAuth(false);
    }
  };

  // ─── 1. General Incident Reporter ────────────────────────
  const handleQuickReport = async (type: string, severity: number) => {
    setReportingType(type);
    try {
      // Get current location coordinates
      let lat = 21.0285; // Fallback Hanoi lat
      let lng = 105.8542; // Fallback Hanoi lng
      
      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      } catch (err) {
        console.warn('Could not get coordinates for quick SOS, using last known');
      }

      // Check battery level
      let batteryLevel = 100;
      try {
        const batt = await AsyncStorage.getItem('last_battery_sos_trigger');
        if (batt) batteryLevel = parseInt(batt);
      } catch (e) {}

      const activeTripStr = await AsyncStorage.getItem('active_trip');
      const activeTrip = activeTripStr ? JSON.parse(activeTripStr) : null;

      const payload = {
        type,
        severity,
        location: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        message: `Báo cáo thủ công khẩn cấp loại ${type} từ thiết bị di động`,
        batteryAtTime: batteryLevel,
        source: 'app',
        tripId: activeTrip ? activeTrip.id : undefined
      };

      // Call API
      const res = await api.post('/incidents', payload);

      if (res.data.success) {
        Alert.alert(
          'Đã gửi cứu hộ',
          `Báo động ${type} đã được gửi thành công. Vị trí của bạn đang được giám sát chặt chẽ.`
        );
      }
    } catch (err: any) {
      console.error(err);
      
      // Offline fallback: Queue pending alert
      const activeTripStr = await AsyncStorage.getItem('active_trip');
      const activeTrip = activeTripStr ? JSON.parse(activeTripStr) : null;
      const phone = activeTrip ? activeTrip.emergencyContact : '0901234567';

      // Store fallback SMS alert in local storage queue
      const pendingSms = {
        phone,
        message: `[SOS KHAN CAP: ${type}] Cần cứu trợ gấp tại vị trí: https://maps.google.com/?q=${payload.location.coordinates[1]},${payload.location.coordinates[0]}`
      };
      await AsyncStorage.setItem('pending_sms_alert', JSON.stringify(pendingSms));

      Alert.alert(
        'Đã lưu khẩn cấp (Offline)',
        'Mất mạng. Một tin nhắn SOS khẩn cấp đã được soạn sẵn trong hàng đợi ngoài màn hình chính để bạn gửi cho người thân qua SMS.'
      );
    } finally {
      setReportingType(null);
    }
  };

  // ─── 2. Fire Camera Capture & AI Analysis ─────────────────
  const triggerCamera = async () => {
    if (!permission) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Không có quyền', 'Vui lòng cấp quyền truy cập Camera trong cài đặt để chụp ảnh báo cháy.');
        return;
      }
    } else if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    
    setAiResult(null);
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const options = { base64: true, quality: 0.5 };
        const photo = await cameraRef.current.takePictureAsync(options);
        setPhotoBase64(`data:image/jpeg;base64,${photo.base64}`);
        setShowCamera(false);
      } catch (err) {
        console.error('Failed to take picture:', err);
        Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
      }
    }
  };

  const handleSendFireReport = async () => {
    if (!photoBase64) return;
    
    setSubmitting(true);
    try {
      let lat = 21.0285;
      let lng = 105.8542;
      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      } catch (err) {}

      let batteryLevel = 100;
      try {
        const batt = await AsyncStorage.getItem('last_battery_sos_trigger');
        if (batt) batteryLevel = parseInt(batt);
      } catch (e) {}

      const payload = {
        lat,
        lng,
        message: message.trim() || 'Báo cháy rừng qua camera',
        batteryAtTime: batteryLevel,
        imageBase64: photoBase64
      };

      const res = await api.post('/incidents/fire', payload);
      
      if (res.data.success) {
        const result = res.data;
        setAiResult(result.aiAnalysis);
        setPhotoBase64(null); // Clear photo once uploaded
        setMessage('');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        'Lỗi gửi báo cháy',
        err.response?.data?.message || 'Không thể tải ảnh báo cháy. Vui lòng kiểm tra lại mạng.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Render Camera Screen
  if (showCamera) {
    return (
      <View className="flex-1 bg-black relative">
        <CameraView style={StyleSheet.absoluteFillObject} ref={cameraRef}>
          <View className="flex-1 justify-end p-8 gap-6">
            <View className="flex-row justify-between items-center bg-black/40 p-4 rounded-xl">
              <Pressable 
                className="bg-surface-3 border border-surface-4 px-4 py-2.5 rounded-lg"
                onPress={() => setShowCamera(false)}
              >
                <Text className="text-white text-xs font-semibold">HỦY</Text>
              </Pressable>
              
              <Pressable 
                className="w-16 h-16 bg-red-600 rounded-full border-4 border-white justify-center items-center active:scale-95 transition-all"
                onPress={capturePhoto}
              >
                <View className="w-12 h-12 bg-red-600 rounded-full" />
              </Pressable>
              
              <View className="w-12" /> {/* Spacer */}
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  if (checkingAuth) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  if (!token) {
    return (
      <View className="flex-1 bg-surface justify-center items-center p-6 gap-4">
        <Text className="text-xl font-bold text-red-500 text-center">🚨 BẠN CHƯA ĐĂNG NHẬP</Text>
        <Text className="text-xs text-muted-light text-center leading-normal max-w-xs">
          Vui lòng quay lại tab **Trekking** đăng ký/đăng nhập tài khoản để có thể sử dụng các chức năng khẩn cấp và cứu hộ.
        </Text>
        <Pressable
          className="bg-emergency-600 active:bg-emergency-700 px-6 py-2.5 rounded-xl shadow-lg mt-2"
          onPress={() => router.replace('/(tabs)')}
        >
          <Text className="text-xs font-bold text-white uppercase tracking-wider">Đi tới Đăng Nhập</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-6 py-12 gap-6">
      
      {/* 🚨 QUICK INCIDENT REPORT CENTER */}
      <View className="bg-surface-1 border border-surface-4 p-5 rounded-2xl gap-4">
        <View className="items-center">
          <Text className="text-xl font-bold text-white uppercase">Cảnh Báo Khẩn Cấp</Text>
          <Text className="text-xs text-muted mt-1">Chọn loại sự cố để lập tức gửi tín hiệu cứu trợ</Text>
        </View>

        <View className="grid grid-cols-2 gap-3 flex-row flex-wrap">
          {INCIDENT_TYPES.map((inc) => (
            <Pressable
              key={inc.type}
              className={`${inc.bg} active:opacity-90 w-[48%] py-5 rounded-xl justify-center items-center gap-2 relative`}
              onPress={() => handleQuickReport(inc.type, inc.severity)}
              disabled={reportingType !== null}
            >
              {reportingType === inc.type ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text className="text-2xl">{inc.icon}</Text>
                  <Text className="text-white font-bold text-xs">{inc.label}</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* 🔥 FIRE DETECTION CAMERA PANEL */}
      <View className="bg-surface-1 border border-surface-4 p-5 rounded-2xl gap-5">
        <View className="items-center">
          <Text className="text-lg font-bold text-white flex-row items-center">
            🔥 Báo Cháy Rừng (AI Claude Vision)
          </Text>
          <Text className="text-xs text-muted text-center mt-1">
            Chụp ảnh hiện trường đám cháy. AI sẽ tự động phân tích và xác định mức độ nguy hại ngay lập tức.
          </Text>
        </View>

        {/* AI Result Box */}
        {aiResult && (
          <View className={`border p-4 rounded-xl gap-2 ${
            aiResult.hasFire 
              ? 'bg-red-950/20 border-red-500/40' 
              : 'bg-surface-3 border-surface-4'
          }`}>
            <View className="flex-row justify-between items-center">
              <Text className={`text-xs font-bold ${aiResult.hasFire ? 'text-red-400' : 'text-muted-light'}`}>
                {aiResult.hasFire ? '🔥 PHÁT HIỆN LỬA/KHÓI' : '⚠️ KHÔNG PHÁT HIỆN CHÁY RÕ RỆT'}
              </Text>
              <Text className="text-xs font-mono text-white">
                Tin cậy: {(aiResult.confidence * 100).toFixed(0)}%
              </Text>
            </View>
            <Text className="text-xs text-white leading-normal italic">
              "{aiResult.description}"
            </Text>
            {aiResult.hasFire && (
              <Text className="text-[10px] text-red-300 font-semibold uppercase mt-1">
                * Đội cứu hỏa đã được kích hoạt và điều phối khẩn cấp!
              </Text>
            )}
          </View>
        )}

        {/* Photo Preview Mode */}
        {photoBase64 ? (
          <View className="gap-4">
            <Image 
              source={{ uri: photoBase64 }} 
              style={{ width: '100%', height: 200, borderRadius: 12 }} 
              resizeMode="cover"
            />
            
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-white">Lời nhắn bổ sung (Không bắt buộc)</Text>
              <TextInput
                className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
                placeholder="Ví dụ: Lửa đang lan nhanh theo hướng gió..."
                placeholderTextColor="#737373"
                value={message}
                onChangeText={setMessage}
              />
            </View>

            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 bg-emergency-600 active:bg-emergency-700 py-3 rounded-lg items-center justify-center"
                onPress={handleSendFireReport}
                disabled={submitting}
              >
                {submitting ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#fff" size="small" />
                    <Text className="text-white font-bold text-xs">AI ĐANG PHÂN TÍCH...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-bold text-xs uppercase">PHÂN TÍCH VÀ BÁO CÁO CHÁY</Text>
                )}
              </Pressable>
              
              <Pressable
                className="bg-surface-3 border border-surface-4 px-4 py-3 rounded-lg items-center justify-center"
                onPress={() => setPhotoBase64(null)}
                disabled={submitting}
              >
                <Text className="text-white font-bold text-xs">CHỤP LẠI</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            className="border-2 border-dashed border-surface-4 py-8 rounded-xl items-center justify-center gap-3 active:bg-surface-2"
            onPress={triggerCamera}
          >
            <Text className="text-3xl">📸</Text>
            <Text className="text-white font-semibold text-xs uppercase">BẤM VÀO ĐÂY ĐỂ MỞ CAMERA CHỤP ẢNH</Text>
            <Text className="text-[10px] text-muted-light">Quyền truy cập Camera và Định vị được yêu cầu</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
