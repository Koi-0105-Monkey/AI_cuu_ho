/**
 * BLE Beacon Utility for Off-Grid Peer Discovery & Distance Estimation (5-10m Range)
 * Calculates relative distance based on Bluetooth RSSI (Received Signal Strength Indicator).
 */

export interface PeerBeacon {
  id: string;
  name: string;
  phone: string;
  rssi: number; // Received Signal Strength Indicator in dBm
  estimatedDistanceMeters: number; // Estimated distance in meters
  lastSeen: string;
}

/**
 * Estimate distance in meters from Bluetooth RSSI value.
 * Uses Log-distance Path Loss Model:
 * Distance = 10 ^ ((Measured Power - RSSI) / (10 * N))
 * Where Measured Power is RSSI at 1 meter (~ -59 dBm) and N is environmental factor (~ 2.0 to 3.0 in forest).
 */
export function estimateDistanceFromRSSI(rssi: number, measuredPower: number = -59, n: number = 2.5): number {
  if (rssi === 0) return -1;
  const ratio = (measuredPower - rssi) / (10 * n);
  const distance = Math.pow(10, ratio);
  return parseFloat(distance.toFixed(1));
}

/**
 * Format relative proximity status string.
 */
export function getProximityStatus(distanceMeters: number): { label: string; color: string } {
  if (distanceMeters < 0) return { label: 'Không có tín hiệu', color: '#6b7280' };
  if (distanceMeters <= 3) return { label: 'Rất gần (~ 1-3m)', color: '#10b981' };
  if (distanceMeters <= 7) return { label: 'Gần bạn (~ 4-7m)', color: '#3b82f6' };
  if (distanceMeters <= 12) return { label: 'Tín hiệu yếu (~ 8-12m)', color: '#f59e0b' };
  return { label: 'Ngoài cự ly kết nối (> 12m)', color: '#ef4444' };
}
