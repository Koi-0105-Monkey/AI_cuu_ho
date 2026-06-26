import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF4D3D',
        tabBarInactiveTintColor: '#6b6b6b',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#1e1e1e',
          borderTopWidth: 0.5,
          paddingTop: 4,
          height: 88,
        },
        headerStyle: {
          backgroundColor: '#0f0f0f',
        },
        headerTitleStyle: {
          color: '#f5f5f5',
          fontWeight: '700',
          fontSize: 17,
        },
        headerShadowVisible: false,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trekking',
          tabBarIcon: ({ color }) => (
            Platform.OS === 'ios' ? (
              <SymbolView
                name="map.fill"
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons name="map" size={24} color={color} />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="incidents"
        options={{
          title: 'Khẩn cấp',
          tabBarIcon: ({ color }) => (
            Platform.OS === 'ios' ? (
              <SymbolView
                name="exclamationmark.triangle.fill"
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons name="warning" size={24} color={color} />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color }) => (
            Platform.OS === 'ios' ? (
              <SymbolView
                name="person.fill"
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons name="person" size={24} color={color} />
            )
          ),
        }}
      />
    </Tabs>
  );
}
