import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export async function flushOfflineQueue() {
  try {
    const queueStr = await AsyncStorage.getItem('gps_queue');
    if (!queueStr) return { success: true, count: 0 };

    const queue = JSON.parse(queueStr);
    if (!queue || queue.length === 0) return { success: true, count: 0 };

    console.log(`[Queue Service] Found ${queue.length} offline GPS points. Attempting sync...`);

    const token = await AsyncStorage.getItem('user_token');
    if (!token) {
      console.log('[Queue Service] Sync aborted: user is not logged in.');
      return { success: false, reason: 'No auth token' };
    }

    const response = await api.post('/gps/batch', queue);

    if (response.status === 201 || response.data?.success) {
      console.log(`[Queue Service] Synchronized ${queue.length} points to server successfully.`);
      // Clear the local queue
      await AsyncStorage.setItem('gps_queue', JSON.stringify([]));
      await AsyncStorage.setItem('last_upload_time', Date.now().toString());
      return { success: true, count: queue.length };
    }
  } catch (err: any) {
    console.warn('[Queue Service] Synchronization failed (device still offline). Error:', err.message);
    return { success: false, reason: err.message };
  }
}
