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
  { type: 'MANUAL', label: 'Yêu Cầu Cứu Hộ', severity: 5, bg: 'bg-emergency-800/60', activeBg: 'active:bg-emergency-800/80', icon: '🚨' },
  { type: 'CRASH', label: 'Tai Nạn Xe', severity: 4, bg: 'bg-amber-900/50', activeBg: 'active:bg-amber-900/70', icon: '🚗' },
  { type: 'MED', label: 'Sự Cố Y Tế', severity: 4, bg: 'bg-rose-900/50', activeBg: 'active:bg-rose-900/70', icon: '🩺' },
  { type: 'VEH', label: 'Xe Bị Hỏng', severity: 3, bg: 'bg-blue-900/50', activeBg: 'active:bg-blue-900/70', icon: '🔧' },
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
    // Declare coordinates at function scope so catch block can access them
    let lat = 21.0285; // Fallback Hanoi lat
    let lng = 105.8542; // Fallback Hanoi lng
    try {
      
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
        lat,
        lng,
        message: `Báo cáo thủ công khẩn cấp loại ${type} từ thiết bị di động`,
        batteryAtTime: batteryLevel,
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
        message: `[SOS KHAN CAP: ${type}] Cần cứu trợ gấp tại vị trí: https://maps.google.com/?q=${lat},${lng}`
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
        <CameraView style={StyleSheet.absoluteFillObject} ref={cameraRef} />
        <View className="absolute inset-x-0 bottom-0 p-8 gap-6 justify-end">
          <View className="flex-row justify-between items-center bg-black/50 p-5 rounded-3xl">
            <Pressable 
              className="bg-surface-3 px-5 py-3 rounded-2xl"
              onPress={() => setShowCamera(false)}
            >
              <Text className="text-white text-xs font-bold tracking-wide">HỦY</Text>
            </Pressable>
            
            <Pressable 
              className="w-18 h-18 bg-emergency-500 rounded-full border-4 border-white justify-center items-center active:scale-95"
              onPress={capturePhoto}
            >
              <View className="w-14 h-14 bg-emergency-500 rounded-full" />
            </Pressable>
            
            <View className="w-14" />
          </View>
        </View>
      </View>
    );
  }

  if (checkingAuth) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#FF4D3D" />
      </View>
    );
  }

  if (!token) {
    return (
      <View className="flex-1 bg-surface justify-center items-center p-8 gap-5">
        <Text className="text-2xl">🚨</Text>
        <Text className="text-xl font-bold text-emergency-500 text-center">Bạn chưa đăng nhập</Text>
        <Text className="text-xs text-muted text-center leading-5 max-w-xs">
          Vui lòng quay lại tab Trekking đăng ký/đăng nhập tài khoản để sử dụng các chức năng khẩn cấp và cứu hộ.
        </Text>
        <Pressable
          className="bg-emergency-500 active:bg-emergency-600 px-8 py-3 rounded-2xl mt-2"
          onPress={() => router.replace('/(tabs)')}
        >
          <Text className="text-xs font-bold text-white uppercase tracking-wider">Đi tới Đăng Nhập</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-6 py-14 gap-8">
      
      {/* 🚨 QUICK INCIDENT REPORT CENTER */}
      <View className="gap-5">
        <View className="items-center gap-2">
          <Text className="text-2xl font-bold text-white">Cảnh Báo Khẩn Cấp</Text>
          <Text className="text-xs text-muted">Chọn loại sự cố để gửi tín hiệu cứu trợ</Text>
        </View>

        <View className="flex-row flex-wrap gap-3">
          {INCIDENT_TYPES.map((inc) => (
            <Pressable
              key={inc.type}
              className={`${inc.bg} ${inc.activeBg} w-[48%] py-6 rounded-3xl justify-center items-center gap-3 relative border border-white/5`}
              onPress={() => handleQuickReport(inc.type, inc.severity)}
              disabled={reportingType !== null}
            >
              {reportingType === inc.type ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text className="text-3xl">{inc.icon}</Text>
                  <Text className="text-white font-bold text-xs text-center tracking-wide">{inc.label}</Text>
                  <View className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/10 items-center justify-center">
                    <Text className="text-[9px] font-bold text-white/70">{inc.severity}</Text>
                  </View>
                </>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* 🔥 FIRE DETECTION CAMERA PANEL */}
      <View className="bg-surface-1 border border-surface-3 p-6 rounded-3xl gap-5">
        <View className="items-center gap-2">
          <Text className="text-lg font-bold text-white">
            🔥 Báo Cháy Rừng
          </Text>
          <Text className="text-xs text-muted text-center leading-5">
            Chụp ảnh hiện trường. AI Claude Vision sẽ phân tích và xác định mức độ nguy hại.
          </Text>
        </View>

        {/* AI Result Box */}
        {aiResult && (
          <View className={`border p-5 rounded-2xl gap-3 ${
            aiResult.hasFire 
              ? 'bg-emergency-950/30 border-emergency-500/30' 
              : 'bg-surface-2 border-surface-3'
          }`}>
            <View className="flex-row justify-between items-center">
              <Text className={`text-xs font-bold ${aiResult.hasFire ? 'text-emergency-400' : 'text-muted-light'}`}>
                {aiResult.hasFire ? '🔥 PHÁT HIỆN LỬA/KHÓI' : '⚠️ KHÔNG PHÁT HIỆN CHÁY'}
              </Text>
              <Text className="text-xs font-mono text-white">
                {(aiResult.confidence * 100).toFixed(0)}%
              </Text>
            </View>
            <Text className="text-xs text-white/80 leading-5 italic">
              "{aiResult.description}"
            </Text>
            {aiResult.hasFire && (
              <Text className="text-[10px] text-emergency-300 font-semibold uppercase tracking-wide mt-1">
                * Đội cứu hỏa đã được kích hoạt!
              </Text>
            )}
          </View>
        )}

        {/* Photo Preview Mode */}
        {photoBase64 ? (
          <View className="gap-4">
            <Image 
              source={{ uri: photoBase64 }} 
              style={{ width: '100%', height: 200, borderRadius: 20 }} 
              resizeMode="cover"
            />
            
            <View className="gap-2">
              <Text className="text-xs font-medium text-muted-light">Lời nhắn bổ sung (không bắt buộc)</Text>
              <TextInput
                className="bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm"
                placeholder="Ví dụ: Lửa đang lan nhanh theo hướng gió..."
                placeholderTextColor="#6b6b6b"
                value={message}
                onChangeText={setMessage}
              />
            </View>

            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 bg-emergency-500 active:bg-emergency-600 py-3.5 rounded-2xl items-center justify-center"
                onPress={handleSendFireReport}
                disabled={submitting}
              >
                {submitting ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#fff" size="small" />
                    <Text className="text-white font-bold text-xs">AI ĐANG PHÂN TÍCH...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-bold text-xs uppercase tracking-wide">Phân tích & Báo cáo</Text>
                )}
              </Pressable>
              
              <Pressable
                className="bg-surface-2 border border-surface-3 px-5 py-3.5 rounded-2xl items-center justify-center"
                onPress={() => setPhotoBase64(null)}
                disabled={submitting}
              >
                <Text className="text-white font-bold text-xs">CHỤP LẠI</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            className="border-2 border-dashed border-surface-4 py-10 rounded-3xl items-center justify-center gap-3 active:bg-surface-2"
            onPress={triggerCamera}
          >
            <Text className="text-4xl">📸</Text>
            <Text className="text-white font-semibold text-xs uppercase tracking-wide">Mở camera chụp ảnh</Text>
            <Text className="text-[10px] text-muted">Quyền Camera và Định vị được yêu cầu</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
