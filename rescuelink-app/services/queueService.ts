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

    // Sync any pending offline SOS alerts next
    await flushSOSQueue();

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

export interface SOSQueueItem {
  id: string;
  lat: number;
  lng: number;
  type: string;
  message: string;
  battery?: number;
  queuedAt: number;
}

// Lưu SOS xuống hàng đợi offline
export async function enqueueSOS(payload: { lat: number; lng: number; type: string; message: string; battery?: number }) {
  try {
    const queueStr = await AsyncStorage.getItem('sos_queue');
    const queue: SOSQueueItem[] = queueStr ? JSON.parse(queueStr) : [];
    
    const newItem: SOSQueueItem = {
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      ...payload,
      queuedAt: Date.now()
    };
    
    queue.push(newItem);
    await AsyncStorage.setItem('sos_queue', JSON.stringify(queue));
    console.log('[Queue Service] SOS queued offline:', newItem.id);
    return true;
  } catch (err: any) {
    console.error('[Queue Service] Failed to queue SOS offline:', err.message);
    return false;
  }
}

// Đồng bộ hàng đợi SOS lên server
export async function flushSOSQueue(): Promise<{ sent: number; remaining: number }> {
  try {
    const queueStr = await AsyncStorage.getItem('sos_queue');
    if (!queueStr) return { sent: 0, remaining: 0 };
    
    const queue: SOSQueueItem[] = JSON.parse(queueStr);
    if (queue.length === 0) return { sent: 0, remaining: 0 };
    
    console.log(`[Queue Service] Found ${queue.length} pending offline SOS. Flushing...`);
    
    const token = await AsyncStorage.getItem('user_token');
    if (!token) return { sent: 0, remaining: queue.length };
    
    const successfulIds: string[] = [];
    
    for (const item of queue) {
      try {
        const response = await api.post('/incidents', {
          type: item.type,
          severity: 5, // SOS mặc định là cấp 5 khẩn cấp
          lat: item.lat,
          lng: item.lng,
          message: `${item.message} (Gửi lại từ hàng đợi offline, tạo lúc ${new Date(item.queuedAt).toLocaleTimeString()})`,
          batteryAtTime: item.battery
        });
        
        if (response.data?.success) {
          successfulIds.push(item.id);
        }
      } catch (err: any) {
        console.warn(`[Queue Service] Failed to flush SOS ${item.id}:`, err.message);
        // Dừng lại không gửi tiếp các SOS sau nếu mạng vẫn lỗi
        break;
      }
    }
    
    if (successfulIds.length > 0) {
      const remainingQueue = queue.filter(item => !successfulIds.includes(item.id));
      await AsyncStorage.setItem('sos_queue', JSON.stringify(remainingQueue));
      console.log(`[Queue Service] Successfully flushed ${successfulIds.length} SOS reports.`);
      return { sent: successfulIds.length, remaining: remainingQueue.length };
    }
    
    return { sent: 0, remaining: queue.length };
  } catch (err: any) {
    console.error('[Queue Service] Error flushing SOS queue:', err.message);
    return { sent: 0, remaining: 0 };
  }
}
