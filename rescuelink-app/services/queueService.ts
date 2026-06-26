import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export async function syncPendingEndTrip() {
  try {
    const pendingEndTripId = await AsyncStorage.getItem('pending_end_trip_id');
    if (!pendingEndTripId) return { success: true };

    const token = await AsyncStorage.getItem('user_token');
    if (!token) return { success: false, reason: 'No auth token' };

    console.log(`[Queue Service] Syncing pending end trip: ${pendingEndTripId}...`);
    const response = await api.patch(`/trips/${pendingEndTripId}/end`);
    
    if (response.status === 200 || response.data?.success) {
      console.log(`[Queue Service] Successfully ended trip ${pendingEndTripId} on server.`);
      await AsyncStorage.removeItem('pending_end_trip_id');
      return { success: true };
    }
  } catch (err: any) {
    console.warn('[Queue Service] Failed to sync pending end trip:', err.message);
    if (err.response?.status === 400 || err.response?.status === 404) {
      console.log('[Queue Service] Clearing pending end trip due to client/server error.');
      await AsyncStorage.removeItem('pending_end_trip_id');
    }
    return { success: false, reason: err.message };
  }
}

let isFlushing = false;

export async function flushOfflineQueue() {
  if (isFlushing) {
    console.log('[Queue Service] Sync already in progress, skipping this run.');
    return { success: false, reason: 'Sync already in progress' };
  }
  isFlushing = true;
  
  try {
    // Try to sync pending end trip first
    await syncPendingEndTrip();

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
    console.warn('[Queue Service] Synchronization failed. Error:', err.message);
    if (err.response?.status === 400) {
      console.log('[Queue Service] Clearing invalid queue to prevent infinite retries.');
      await AsyncStorage.setItem('gps_queue', JSON.stringify([]));
    }
    return { success: false, reason: err.message };
  } finally {
    isFlushing = false;
  }
}
