// Quét mã QR ghép nhóm trekking cá nhân (không phải B2B)
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE = Constants.expoConfig?.extra?.apiUrl || 'https://rescuelink-backend-5wwo.onrender.com';

/** Trạng thái màn hình */
type ScreenMode = 'choice' | 'camera' | 'pin' | 'my_qr';

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScreenMode>('choice');
  const [scanned, setScanned] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [mySoloGroupPin, setMySoloGroupPin] = useState('789123');
  const [bloodType, setBloodType] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [showMedForm, setShowMedForm] = useState(false);
  const [parsedCode, setParsedCode] = useState<string | null>(null);
  const [groupPreview, setGroupPreview] = useState<{
    groupName: string;
    routeName: string;
    company?: string;
    leaderName?: string;
    leaderPhone?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [soloGroupInfo, setSoloGroupInfo] = useState<any>(null);

  const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  // Generate solo group PIN on load
  useEffect(() => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setMySoloGroupPin(randomPin);
  }, []);

  // ─── Xử lý QR Code được quét ─────────────────────────────────────────────
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    let code = data.trim();
    try {
      const parsed = JSON.parse(data);
      if (parsed.joinCode) {
        code = parsed.joinCode;
        setGroupPreview({
          groupName: parsed.groupName,
          routeName: parsed.routeName
        });
      }
    } catch {
      // Nếu không phải JSON → dùng raw text làm PIN
    }

    setParsedCode(code);
    setShowMedForm(true);
  };

  // ─── Xác nhận nhập PIN thủ công ──────────────────────────────────────────
  const handlePinConfirm = () => {
    const trimmed = pinValue.trim().replace(/\s/g, '');
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      Alert.alert('Mã PIN không hợp lệ', 'Mã PIN phải là 6 chữ số.');
      return;
    }
    setParsedCode(trimmed);
    setShowMedForm(true);
  };

  // ─── Gọi API gia nhập đoàn ───────────────────────────────────────────────
  const handleJoinGroup = async () => {
    if (!parsedCode) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_BASE}/api/v1/trip-groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          joinCode: parsedCode,
          bloodType: bloodType || '',
          medicalNotes: medicalNotes || '',
          emergencyContactPhone: emergencyPhone || ''
        })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        Alert.alert('Lỗi', json.message || 'Không thể gia nhập đoàn.');
        setScanned(false);
        return;
      }

      if (json.group?.id || json.group?._id) {
        const groupId = json.group.id || json.group._id;
        await AsyncStorage.setItem('currentGroupId', groupId);
        await AsyncStorage.setItem('currentGroupName', json.group.groupName || '');
      }

      Alert.alert(
        '🎉 Gia nhập thành công!',
        `Bạn đã tham gia đoàn:\n📍 ${json.group?.groupName}\n🗺 ${json.group?.routeName}\n\n👤 Trưởng nhóm: ${json.group?.leaderName || 'Chưa gán'}\n📞 ${json.group?.leaderPhone || ''}`,
        [{ text: 'Bắt đầu hành trình', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (err) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới máy chủ. Kiểm tra Internet.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Gọi API tạo nhóm đi lẻ cá nhân ──────────────────────────────────────────
  const handleCreateSoloGroup = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const userInfoStr = await AsyncStorage.getItem('user_info');
      let name = 'Trekker';
      if (userInfoStr) {
        try {
          name = JSON.parse(userInfoStr).name || 'Trekker';
        } catch {}
      }

      const res = await fetch(`${API_BASE}/api/v1/trip-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupName: `Nhóm đi lẻ của ${name}`,
          routeName: 'Cung đường tự do',
          description: 'Đoàn đi lẻ tự phát của trekker'
        })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        Alert.alert('Lỗi', json.message || 'Không thể tạo nhóm đi lẻ trên máy chủ.');
        return;
      }

      setSoloGroupInfo(json.group);
      setMySoloGroupPin(json.group.joinCode);
      setMode('my_qr');
    } catch (err) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới máy chủ để tạo nhóm. Kiểm tra Internet.');
    } finally {
      setLoading(false);
    }
  };

  // ─── UI: Màn hình chọn phương thức ───────────────────────────────────────
  if (mode === 'choice') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.choiceContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={36} color="#10b981" />
          </View>
          <Text style={styles.title}>Ghép Đoàn & Nhóm Đi Lẻ</Text>
          <Text style={styles.subtitle}>
            Quét QR, gõ PIN từ Trưởng đoàn hoặc tự tạo nhóm bạn đi cùng
          </Text>

          <TouchableOpacity
            style={[styles.choiceBtn, styles.choiceBtnPrimary]}
            onPress={async () => {
              if (!permission?.granted) {
                const { granted } = await requestPermission();
                if (!granted) {
                  Alert.alert('Cần quyền Camera', 'Vui lòng cấp quyền camera để quét mã QR.');
                  return;
                }
              }
              setMode('camera');
            }}
          >
            <Ionicons name="qr-code-outline" size={22} color="#10b981" />
            <View style={styles.choiceBtnText}>
              <Text style={styles.choiceBtnTitle}>Quét Mã QR Nhập Đoàn</Text>
              <Text style={styles.choiceBtnSubtitle}>Quét mã từ Hướng dẫn viên hoặc bạn đi cùng</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceBtn, styles.choiceBtnSecondary]}
            onPress={() => setMode('pin')}
          >
            <Ionicons name="keypad-outline" size={22} color="#60a5fa" />
            <View style={styles.choiceBtnText}>
              <Text style={[styles.choiceBtnTitle, { color: '#93c5fd' }]}>Nhập Mã PIN 6 Số</Text>
              <Text style={styles.choiceBtnSubtitle}>Gõ 6 số PIN do bạn bè / HDV cấp</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceBtn, { backgroundColor: '#312e81', borderColor: '#4338ca' }]}
            onPress={handleCreateSoloGroup}
          >
            <Ionicons name="share-social-outline" size={22} color="#a5b4fc" />
            <View style={styles.choiceBtnText}>
              <Text style={[styles.choiceBtnTitle, { color: '#c7d2fe' }]}>🤝 Tự Tạo Nhóm Trekker Đi Lẻ</Text>
              <Text style={styles.choiceBtnSubtitle}>Hiện Mã QR / PIN của bạn để người khác quét</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── UI: Màn hình Mã QR Của Tôi Cho Nhóm Đi Lẻ ────────────────────────────
  if (mode === 'my_qr') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setMode('choice')}>
          <Ionicons name="arrow-back" size={22} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.choiceContent}>
          <Ionicons name="qr-code" size={48} color="#818cf8" style={{ marginBottom: 8 }} />
          <Text style={styles.title}>Mã Nhóm Bạn Đi Lẻ</Text>
          <Text style={styles.subtitle}>
            Cho bạn đi cùng quét màn hình hoặc đọc 6 số PIN bên dưới để tự tạo nhóm cứu hộ chung!
          </Text>

          <View style={{ backgroundColor: '#1e1b4b', padding: 24, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#4338ca', marginVertical: 12 }}>
            <Text style={{ fontSize: 11, color: '#a5b4fc', fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 }}>MÃ PIN 6 SỐ NHÓM BẠN</Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#c7d2fe', letterSpacing: 8 }}>{mySoloGroupPin}</Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: '#4f46e5', width: '100%' }]}
            onPress={async () => {
              if (soloGroupInfo) {
                await AsyncStorage.setItem('currentGroupId', soloGroupInfo._id || soloGroupInfo.id);
                await AsyncStorage.setItem('currentGroupName', soloGroupInfo.groupName || '');
              }
              Alert.alert('Đã tạo nhóm', `Đã kích hoạt nhóm Trekker đi lẻ PIN ${mySoloGroupPin}! Đồng đội đã ghép nhóm sẽ nhận được vị trí & cảnh báo khẩn cấp của bạn.`);
              setMode('choice');
            }}
          >
            <Text style={styles.confirmBtnText}>Xác nhận Nhóm Đi Lẻ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── UI: Màn hình Camera Quét QR ─────────────────────────────────────────
  if (mode === 'camera' && !showMedForm) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarCodeScanned}
        />
        {/* Overlay khung quét */}
        <View style={styles.scanOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setMode('choice')}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
          </View>
          <Text style={styles.scanHint}>Dán mã QR của đoàn vào khung</Text>
        </View>
      </View>
    );
  }

  // ─── UI: Màn hình Nhập PIN thủ công ──────────────────────────────────────
  if (mode === 'pin' && !showMedForm) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setMode('choice')}>
          <Ionicons name="arrow-back" size={22} color="#94a3b8" />
        </TouchableOpacity>
        <View style={styles.choiceContent}>
          <Ionicons name="keypad" size={42} color="#60a5fa" style={{ marginBottom: 12 }} />
          <Text style={styles.title}>Nhập Mã PIN 6 Số</Text>
          <Text style={styles.subtitle}>Hướng dẫn viên sẽ cung cấp cho bạn qua Zalo hoặc tin nhắn</Text>

          <TextInput
            style={styles.pinInput}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="  ·  ·  ·  ·  ·  ·"
            placeholderTextColor="#374151"
            value={pinValue}
            onChangeText={setPinValue}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.confirmBtn, (!pinValue || pinValue.length < 6) && styles.confirmBtnDisabled]}
            onPress={handlePinConfirm}
            disabled={!pinValue || pinValue.length < 6}
          >
            <Text style={styles.confirmBtnText}>Xác nhận mã PIN</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── UI: Form khai báo thông tin y tế ────────────────────────────────────
  if (showMedForm) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.backBtn, { position: 'relative', top: 0, left: 0, marginBottom: 20 }]}
            onPress={() => { setShowMedForm(false); setScanned(false); setParsedCode(null); setGroupPreview(null); }}
          >
            <Ionicons name="arrow-back" size={22} color="#94a3b8" />
          </TouchableOpacity>

          {groupPreview && (
            <View style={styles.groupPreviewCard}>
              <Ionicons name="checkmark-circle" size={22} color="#10b981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.groupPreviewTitle}>{groupPreview.groupName}</Text>
                <Text style={styles.groupPreviewSub}>🗺 {groupPreview.routeName}</Text>
                {groupPreview.leaderName && (
                  <Text style={styles.groupPreviewSub}>👤 HDV: {groupPreview.leaderName}</Text>
                )}
              </View>
            </View>
          )}

          {!groupPreview && (
            <View style={styles.groupPreviewCard}>
              <Ionicons name="key" size={20} color="#60a5fa" />
              <Text style={{ color: '#93c5fd', fontWeight: '700', fontSize: 18, letterSpacing: 4 }}>{parsedCode}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>
            Khai báo thông tin y tế <Text style={{ color: '#64748b', fontSize: 11 }}>(tuỳ chọn)</Text>
          </Text>
          <Text style={styles.sectionHint}>
            Thông tin này chỉ được chia sẻ với hướng dẫn viên và đội cứu hộ khi xảy ra sự cố.
          </Text>

          {/* Nhóm máu */}
          <Text style={styles.fieldLabel}>Nhóm máu</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {BLOOD_TYPES.map(bt => (
                <TouchableOpacity
                  key={bt}
                  onPress={() => setBloodType(bt === bloodType ? '' : bt)}
                  style={[styles.bloodTypeChip, bloodType === bt && styles.bloodTypeChipActive]}
                >
                  <Text style={[styles.bloodTypeChipText, bloodType === bt && styles.bloodTypeChipTextActive]}>
                    {bt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Ghi chú sức khoẻ */}
          <Text style={styles.fieldLabel}>Tiền sử bệnh / Dị ứng</Text>
          <TextInput
            style={[styles.textArea]}
            multiline numberOfLines={3}
            placeholder="VD: Dị ứng phấn hoa, tiền sử hen suyễn, sợ độ cao..."
            placeholderTextColor="#374151"
            value={medicalNotes}
            onChangeText={setMedicalNotes}
          />

          {/* SĐT người thân */}
          <Text style={styles.fieldLabel}>SĐT Người Thân Khẩn Cấp</Text>
          <TextInput
            style={styles.inputField}
            keyboardType="phone-pad"
            placeholder="0988 123 456"
            placeholderTextColor="#374151"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
          />

          <TouchableOpacity
            style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
            onPress={handleJoinGroup}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="people" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmBtnText}>Xác nhận gia nhập đoàn</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleJoinGroup}
            disabled={loading}
          >
            <Text style={styles.skipBtnText}>Bỏ qua và gia nhập không khai báo</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505'
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(15,15,15,0.8)',
    borderRadius: 12,
    padding: 8
  },
  choiceContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16
  },
  iconCircle: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: '#052e16',
    borderWidth: 1.5, borderColor: '#166534',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 22, fontWeight: '800',
    color: '#f1f5f9', textAlign: 'center'
  },
  subtitle: {
    fontSize: 13, color: '#64748b',
    textAlign: 'center', lineHeight: 20
  },
  choiceBtn: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1
  },
  choiceBtnPrimary: {
    backgroundColor: '#052e16', borderColor: '#166534'
  },
  choiceBtnSecondary: {
    backgroundColor: '#0f172a', borderColor: '#1e3a5f'
  },
  choiceBtnText: { flex: 1 },
  choiceBtnTitle: { fontSize: 14, fontWeight: '700', color: '#a7f3d0' },
  choiceBtnSubtitle: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Camera overlay
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80
  },
  scanFrame: {
    width: 240, height: 240, position: 'relative'
  },
  scanCorner: {
    position: 'absolute', width: 32, height: 32,
    borderColor: '#10b981', borderWidth: 3
  },
  scanCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  scanCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  scanCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  scanCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanHint: {
    color: '#fff', fontSize: 13, fontWeight: '600',
    textAlign: 'center', paddingHorizontal: 32,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, borderRadius: 10
  },

  // PIN Input
  pinInput: {
    width: '80%',
    backgroundColor: '#0f172a',
    borderWidth: 2, borderColor: '#1e40af',
    borderRadius: 16, paddingVertical: 16,
    fontSize: 32, fontWeight: '800',
    color: '#60a5fa', textAlign: 'center',
    letterSpacing: 16, marginTop: 8
  },

  // Medical form
  groupPreviewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#052e16', borderWidth: 1, borderColor: '#166534',
    borderRadius: 14, padding: 14, marginBottom: 20
  },
  groupPreviewTitle: { fontSize: 15, fontWeight: '800', color: '#d1fae5' },
  groupPreviewSub: { fontSize: 12, color: '#6ee7b7', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#e2e8f0', marginBottom: 4 },
  sectionHint: { fontSize: 11, color: '#475569', lineHeight: 16, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  bloodTypeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b'
  },
  bloodTypeChipActive: { backgroundColor: '#7f1d1d', borderColor: '#dc2626' },
  bloodTypeChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  bloodTypeChipTextActive: { color: '#fca5a5' },
  textArea: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 12, padding: 12, color: '#f1f5f9', fontSize: 13,
    textAlignVertical: 'top', marginBottom: 16, minHeight: 80
  },
  inputField: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#f1f5f9', fontSize: 14, marginBottom: 24
  },

  // Buttons
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#059669', borderRadius: 14, paddingVertical: 15,
    marginBottom: 12
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 24 },
  skipBtnText: { fontSize: 12, color: '#475569', textDecorationLine: 'underline' }
});
