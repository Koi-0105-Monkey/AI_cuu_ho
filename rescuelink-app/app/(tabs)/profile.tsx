import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/services/api';
import * as Location from 'expo-location';

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

  useEffect(() => {
    fetchProfile();
    checkDeviceStatus();
  }, []);

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

  if (loading) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#ef4444" />
        <Text className="text-sm text-muted-light mt-4 font-mono">Đang tải thông tin cá nhân...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-6 py-16 gap-6">
      
      {/* Title */}
      <View className="mb-2">
        <Text className="text-2xl font-bold text-white uppercase tracking-wide">CÁ NHÂN</Text>
        <Text className="text-xs text-muted-light mt-1">Thông tin cá nhân & Thiết lập liên hệ khẩn cấp</Text>
      </View>

      {/* User Info Section */}
      <View className="bg-surface-1 border border-surface-4 p-5 rounded-2xl gap-4">
        <View className="flex-row justify-between items-center pb-3 border-b border-surface-3">
          <Text className="text-xs font-semibold text-emergency-400">THÀNH VIÊN RESCUELINK</Text>
          <Pressable 
            className="px-2.5 py-1 bg-surface-3 border border-surface-4 rounded-lg active:bg-surface-4"
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
              <Text className="text-[10px] text-white font-medium">
                {isEditing ? 'LƯU' : 'CHỈNH SỬA'}
              </Text>
            )}
          </Pressable>
        </View>

        {isEditing ? (
          <View className="gap-2">
            <Text className="text-[10px] text-muted">Họ và Tên</Text>
            <TextInput
              className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-2 text-sm"
              value={editName}
              onChangeText={setEditName}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#737373"
            />
          </View>
        ) : (
          <View className="gap-1">
            <Text className="text-[10px] text-muted">Họ và Tên</Text>
            <Text className="text-lg font-bold text-white">{user?.name}</Text>
          </View>
        )}

        <View className="gap-1">
          <Text className="text-[10px] text-muted">Số điện thoại đăng ký</Text>
          <Text className="text-sm font-bold text-white font-mono">{user?.phone}</Text>
        </View>

        <View className="gap-1">
          <Text className="text-[10px] text-muted">Vai trò hệ thống</Text>
          <View className="flex-row">
            <View className="bg-emergency-600/20 border border-emergency-500/30 px-2.5 py-0.5 rounded-full">
              <Text className="text-[9px] font-bold text-emergency-400 uppercase tracking-wide">
                {user?.role === 'admin' ? 'QUẢN TRỊ VIÊN' : user?.role === 'rescuer' ? 'ĐỘI CỨU HỘ' : 'THÀNH VIÊN TREKKING'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Emergency Contacts List */}
      <View className="bg-surface-1 border border-surface-4 p-5 rounded-2xl gap-4">
        <View className="flex-row justify-between items-center pb-3 border-b border-surface-3">
          <Text className="text-xs font-semibold text-emergency-400">NGƯỜI THÂN LIÊN HỆ SOS (SMS)</Text>
          {!showAddForm && (
            <Pressable 
              className="px-2.5 py-1 bg-emergency-600 rounded-lg active:bg-emergency-700"
              onPress={() => setShowAddForm(true)}
            >
              <Text className="text-[10px] text-white font-bold">+ THÊM MỚI</Text>
            </Pressable>
          )}
        </View>

        {/* Add Contact Form Panel */}
        {showAddForm && (
          <View className="bg-surface-2 border border-surface-4 p-4 rounded-xl gap-3 mb-2">
            <Text className="text-xs font-bold text-white">Thêm Liên Hệ Mới</Text>
            
            <View className="gap-1.5">
              <TextInput
                className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-1.5 text-xs"
                placeholder="Tên người thân"
                placeholderTextColor="#737373"
                value={newContactName}
                onChangeText={setNewContactName}
              />
            </View>

            <View className="gap-1.5">
              <TextInput
                className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-1.5 text-xs"
                placeholder="Số điện thoại"
                placeholderTextColor="#737373"
                keyboardType="phone-pad"
                value={newContactPhone}
                onChangeText={setNewContactPhone}
              />
            </View>

            <View className="gap-1.5">
              <TextInput
                className="bg-surface-3 border border-surface-4 text-white rounded-lg px-3 py-1.5 text-xs"
                placeholder="Mối quan hệ (ví dụ: Bố, Mẹ, Vợ)"
                placeholderTextColor="#737373"
                value={newContactRelation}
                onChangeText={setNewContactRelation}
              />
            </View>

            <View className="flex-row gap-2 justify-end mt-1">
              <Pressable
                className="px-3 py-1.5 bg-surface-3 border border-surface-4 rounded-lg"
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
                className="px-4 py-1.5 bg-emergency-600 rounded-lg"
                onPress={handleAddContact}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-[10px] text-white font-bold">LƯU LẠI</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Contacts list */}
        {(!user?.emergencyContacts || user.emergencyContacts.length === 0) ? (
          <Text className="text-xs text-muted text-center py-4 leading-normal">
            Chưa cấu hình người thân khẩn cấp. Bạn vui lòng thêm tối thiểu 1 người thân để hệ thống có thể tự động gửi tin nhắn SMS khi gặp sự cố.
          </Text>
        ) : (
          <View className="gap-3">
            {user.emergencyContacts.map((contact: EmergencyContact, index: number) => (
              <View key={index} className="bg-surface-3 border border-surface-4 p-3.5 rounded-xl flex-row justify-between items-center">
                <View className="flex-1 mr-2 gap-1">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Text className="text-white text-sm font-bold">{contact.name}</Text>
                    <View className="bg-emergency-600/10 border border-emergency-500/25 px-1.5 py-0.5 rounded-md">
                      <Text className="text-[8px] font-bold text-emergency-400 uppercase tracking-wide">
                        {contact.relation}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted-light font-mono mt-0.5">{contact.phone}</Text>
                </View>

                <Pressable
                  className="w-7 h-7 rounded-lg bg-surface-1 border border-surface-4 items-center justify-center active:bg-surface-4"
                  onPress={() => handleDeleteContact(index)}
                  disabled={updating}
                >
                  <Text className="text-red-400 text-xs font-bold">✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Device Status & Permissions Panel */}
      <View className="bg-surface-1 border border-surface-4 p-5 rounded-2xl gap-4">
        <View className="pb-3 border-b border-surface-3">
          <Text className="text-xs font-semibold text-emergency-400">TRẠNG THÁI THIẾT BỊ HỆ THỐNG</Text>
        </View>

        <View className="gap-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-muted-light">Định vị nền (Always Location)</Text>
            <Text className={`text-xs font-bold ${locationPermission.includes('Always') || locationPermission.includes('Luôn') ? 'text-emerald-400' : 'text-amber-400'}`}>
              {locationPermission}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-muted-light">Đo biến cảm va chạm (Sensors)</Text>
            <Text className="text-xs font-bold text-emerald-400">Sẵn sàng (Accelerometer/Gyro)</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-muted-light">Bản cập nhật app</Text>
            <Text className="text-xs font-mono text-muted">v1.0.0 (Production SDK 56)</Text>
          </View>
        </View>

        <Pressable 
          className="bg-surface-3 border border-surface-4 py-2 rounded-lg items-center mt-1 active:bg-surface-4"
          onPress={() => {
            checkDeviceStatus();
            fetchProfile();
          }}
        >
          <Text className="text-white text-xs font-bold uppercase">LÀM MỚI TRẠNG THÁI</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}
