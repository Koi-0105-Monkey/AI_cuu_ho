import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/services/api';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';

interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Edit Profile Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  // Add Contact Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');

  // Device Status State
  const [locationPermission, setLocationPermission] = useState('Checking...');

  // Authentication States
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
      if (storedToken) {
        fetchProfile();
        checkDeviceStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // 1. Fetch latest profile from backend
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const userInfo = res.data.user;
        setUser(userInfo);
        setEditName(userInfo.name);
        // Sync locally
        await AsyncStorage.setItem('user_info', JSON.stringify(userInfo));
      }
    } catch (err: any) {
      console.warn('Backend profile fetch failed (offline fallback active). Loading local data.');
      // Offline fallback: load from AsyncStorage
      const localUserStr = await AsyncStorage.getItem('user_info');
      if (localUserStr) {
        const localUser = JSON.parse(localUserStr);
        setUser(localUser);
        setEditName(localUser.name);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkDeviceStatus = async () => {
    try {
      const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
      
      if (fgStatus === 'granted' && bgStatus === 'granted') {
        setLocationPermission('Luôn cho phép (Background)');
      } else if (fgStatus === 'granted') {
        setLocationPermission('Chỉ khi dùng ứng dụng (Foreground)');
      } else {
        setLocationPermission('Chưa cấp quyền');
      }
    } catch (e) {
      setLocationPermission('Lỗi kiểm tra');
    }
  };

  const handleUpdateName = async () => {
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống.');
      return;
    }

    setUpdating(true);
    try {
      const res = await api.patch('/auth/profile', { name: editName.trim() });
      if (res.data.success) {
        setUser(res.data.user);
        await AsyncStorage.setItem('user_info', JSON.stringify(res.data.user));
        setIsEditing(false);
        Alert.alert('Thành công', 'Đã cập nhật họ tên thành công.');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Lỗi cập nhật', 'Không thể kết nối đến máy chủ để cập nhật.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim() || !newContactRelation.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin người thân liên hệ.');
      return;
    }

    const cleanPhone = newContactPhone.trim();
    if (cleanPhone.length < 9) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ.');
      return;
    }

    setUpdating(true);
    try {
      const currentContacts = user.emergencyContacts || [];
      const updatedContacts = [
        ...currentContacts,
        {
          name: newContactName.trim(),
          phone: cleanPhone,
          relation: newContactRelation.trim(),
        },
      ];

      const res = await api.patch('/auth/profile', { emergencyContacts: updatedContacts });
      if (res.data.success) {
        setUser(res.data.user);
        await AsyncStorage.setItem('user_info', JSON.stringify(res.data.user));
        
        // Reset form
        setNewContactName('');
        setNewContactPhone('');
        setNewContactRelation('');
        setShowAddForm(false);
        
        Alert.alert('Thành công', 'Đã thêm người thân khẩn cấp mới.');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Lỗi thêm liên hệ', 'Không thể kết nối đến máy chủ để cập nhật.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteContact = (index: number) => {
    Alert.alert(
      'Xóa người thân khẩn cấp',
      `Bạn có chắc chắn muốn xóa liên hệ khẩn cấp này không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const currentContacts = [...(user.emergencyContacts || [])];
              currentContacts.splice(index, 1);

              const res = await api.patch('/auth/profile', { emergencyContacts: currentContacts });
              if (res.data.success) {
                setUser(res.data.user);
                await AsyncStorage.setItem('user_info', JSON.stringify(res.data.user));
                Alert.alert('Thành công', 'Đã xóa liên hệ khẩn cấp.');
              }
            } catch (err: any) {
              console.error(err);
              Alert.alert('Lỗi xóa liên hệ', 'Không thể cập nhật thông tin lên máy chủ.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Get user initials for avatar
  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
          Vui lòng quay lại tab Trekking đăng ký/đăng nhập tài khoản để xem thông tin cá nhân và quản lý liên hệ khẩn cấp.
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

  if (loading) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#FF4D3D" />
        <Text className="text-sm text-muted mt-4">Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-6 py-14 gap-8">
      
      {/* Title */}
      <View>
        <Text className="text-2xl font-bold text-white uppercase tracking-wider">Cá nhân</Text>
        <Text className="text-xs text-muted mt-1.5">Thông tin cá nhân & liên hệ khẩn cấp</Text>
      </View>

      {/* ─── Profile Card ─── */}
      <View className="bg-surface-1 border border-surface-3 p-6 rounded-3xl gap-5">
        <View className="flex-row justify-between items-center pb-4 border-b border-surface-3">
          <Text className="text-xs font-semibold text-emergency-400 tracking-wider">THÀNH VIÊN RESCUELINK</Text>
          <Pressable 
            className="px-3 py-1.5 bg-surface-2 border border-surface-3 rounded-xl active:bg-surface-3"
            onPress={() => {
              if (isEditing) {
                handleUpdateName();
              } else {
                setIsEditing(true);
              }
            }}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-[10px] text-white font-medium tracking-wide">
                {isEditing ? 'LƯU' : 'CHỈNH SỬA'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Avatar + Name */}
        <View className="items-center gap-3">
          <View className="w-16 h-16 rounded-full bg-surface-3 items-center justify-center">
            <Text className="text-xl font-bold text-white">{getInitials(user?.name)}</Text>
          </View>

          {isEditing ? (
            <View className="gap-2 w-full">
              <Text className="text-[10px] text-muted text-center">Họ và Tên</Text>
              <TextInput
                className="bg-surface-2 text-white rounded-2xl px-4 py-3 text-sm text-center"
                value={editName}
                onChangeText={setEditName}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#6b6b6b"
              />
            </View>
          ) : (
            <View className="items-center gap-1">
              <Text className="text-lg font-bold text-white">{user?.name}</Text>
              <Text className="text-xs text-muted font-mono">{user?.phone}</Text>
            </View>
          )}
        </View>

        {/* Role Badge */}
        <View className="items-center">
          <View className="bg-emergency-500/10 border border-emergency-500/20 px-3 py-1 rounded-full">
            <Text className="text-[9px] font-bold text-emergency-400 uppercase tracking-wider">
              {user?.role === 'admin' ? 'QUẢN TRỊ VIÊN' : user?.role === 'rescuer' ? 'ĐỘI CỨU HỘ' : 'THÀNH VIÊN TREKKING'}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── Emergency Contacts List ─── */}
      <View className="bg-surface-1 border border-surface-3 p-6 rounded-3xl gap-5">
        <View className="flex-row justify-between items-center pb-4 border-b border-surface-3">
          <Text className="text-xs font-semibold text-emergency-400 tracking-wider">NGƯỜI THÂN LIÊN HỆ SOS</Text>
          {!showAddForm && (
            <Pressable 
              className="px-3 py-1.5 bg-emergency-500 rounded-xl active:bg-emergency-600"
              onPress={() => setShowAddForm(true)}
            >
              <Text className="text-[10px] text-white font-bold tracking-wide">+ THÊM MỚI</Text>
            </Pressable>
          )}
        </View>

        {/* Add Contact Form Panel */}
        {showAddForm && (
          <View className="bg-surface-2 border border-surface-3 p-5 rounded-2xl gap-4">
            <Text className="text-xs font-bold text-white">Thêm Liên Hệ Mới</Text>
            
            <TextInput
              className="bg-surface-3 text-white rounded-xl px-4 py-2.5 text-xs"
              placeholder="Tên người thân"
              placeholderTextColor="#6b6b6b"
              value={newContactName}
              onChangeText={setNewContactName}
            />

            <TextInput
              className="bg-surface-3 text-white rounded-xl px-4 py-2.5 text-xs"
              placeholder="Số điện thoại"
              placeholderTextColor="#6b6b6b"
              keyboardType="phone-pad"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
            />

            <TextInput
              className="bg-surface-3 text-white rounded-xl px-4 py-2.5 text-xs"
              placeholder="Mối quan hệ (ví dụ: Bố, Mẹ, Vợ)"
              placeholderTextColor="#6b6b6b"
              value={newContactRelation}
              onChangeText={setNewContactRelation}
            />

            <View className="flex-row gap-3 justify-end mt-1">
              <Pressable
                className="px-4 py-2 bg-surface-3 rounded-xl"
                onPress={() => {
                  setShowAddForm(false);
                  setNewContactName('');
                  setNewContactPhone('');
                  setNewContactRelation('');
                }}
              >
                <Text className="text-[10px] text-muted-light font-medium">HỦY</Text>
              </Pressable>
              
              <Pressable
                className="px-5 py-2 bg-emergency-500 rounded-xl active:bg-emergency-600"
                onPress={handleAddContact}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-[10px] text-white font-bold tracking-wide">LƯU LẠI</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Contacts list */}
        {(!user?.emergencyContacts || user.emergencyContacts.length === 0) ? (
          <Text className="text-xs text-muted text-center py-6 leading-5">
            Chưa có người thân khẩn cấp. Thêm tối thiểu 1 người để hệ thống tự động gửi SMS khi gặp sự cố.
          </Text>
        ) : (
          <View className="gap-3">
            {user.emergencyContacts.map((contact: EmergencyContact, index: number) => (
              <View key={index} className="bg-surface-2 border border-surface-3 p-4 rounded-2xl flex-row justify-between items-center">
                <View className="flex-1 mr-3 gap-1.5">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-white text-sm font-bold">{contact.name}</Text>
                    <View className="bg-emergency-500/10 border border-emergency-500/20 px-2 py-0.5 rounded-full">
                      <Text className="text-[8px] font-bold text-emergency-400 uppercase tracking-wider">
                        {contact.relation}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted font-mono">{contact.phone}</Text>
                </View>

                <Pressable
                  className="w-8 h-8 rounded-xl bg-surface-3 items-center justify-center active:bg-surface-4"
                  onPress={() => handleDeleteContact(index)}
                  disabled={updating}
                >
                  <Text className="text-emergency-400 text-xs font-bold">✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ─── Device Status Panel ─── */}
      <View className="bg-surface-1 border border-surface-3 p-6 rounded-3xl gap-5">
        <View className="pb-4 border-b border-surface-3">
          <Text className="text-xs font-semibold text-emergency-400 tracking-wider">TRẠNG THÁI THIẾT BỊ</Text>
        </View>

        <View className="gap-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-muted">Định vị nền (Always Location)</Text>
            <Text className={`text-xs font-bold ${locationPermission.includes('Always') || locationPermission.includes('Luôn') ? 'text-safe-400' : 'text-warn-400'}`}>
              {locationPermission}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-muted">Cảm biến va chạm (Sensors)</Text>
            <Text className="text-xs font-bold text-safe-400">Sẵn sàng</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-muted">Phiên bản</Text>
            <Text className="text-xs font-mono text-muted-light">v1.0.0</Text>
          </View>
        </View>

        <Pressable 
          className="bg-surface-2 border border-surface-3 py-3 rounded-2xl items-center active:bg-surface-3"
          onPress={() => {
            checkDeviceStatus();
            fetchProfile();
          }}
        >
          <Text className="text-white text-xs font-bold uppercase tracking-wide">Làm mới trạng thái</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}
