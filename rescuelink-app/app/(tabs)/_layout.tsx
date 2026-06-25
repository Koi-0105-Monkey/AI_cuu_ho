import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Platform, Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ef4444',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#262626',
        },
        headerStyle: {
          backgroundColor: '#121212',
          borderBottomColor: '#262626',
        },
        headerTitleStyle: {
          color: '#ffffff',
          fontWeight: 'bold',
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trekking',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'map.fill',
                android: 'map',
                web: 'map',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="incidents"
        options={{
          title: 'Khẩn cấp',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'exclamationmark.triangle.fill',
                android: 'warning',
                web: 'warning',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'person.fill',
                android: 'person',
                web: 'person',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
