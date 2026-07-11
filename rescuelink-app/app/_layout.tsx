import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import 'react-native-reanimated';
import '../global.css';
import '../tasks/backgroundTasks';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://d3ee23846fb124134d471a1a01e62ff3@o4510417905123328.ingest.us.sentry.io/4511646556094464',
  debug: false,
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Request location permissions on app startup
  useEffect(() => {
    (async () => {
      try {
        // 1. Request Foreground Location
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
          Alert.alert(
            'Cần quyền Định vị',
            'RescueLink cần truy cập vị trí của bạn để hoạt động. Vui lòng cấp quyền trong Cài đặt.',
          );
          return;
        }
      } catch (err) {
        // Foreground permission request failed — likely Expo Go Info.plist issue
        console.warn('Foreground location permission error (may be Expo Go limitation):', (err as Error).message);
      }
    })();
  }, []);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#050505',
        },
        headerTintColor: '#f5f5f5',
        contentStyle: {
          backgroundColor: '#050505',
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trekking-setup" options={{ headerShown: false }} />
      <Stack.Screen name="tracking-active" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default Sentry.wrap(RootLayout);
