import { haversineDistance, distanceToRoute, LatLng } from '../utils/geo';
import {
  buildBatterySosMessage,
  buildCheckinFailedMessage,
  buildCircularAnomalyMessage,
  buildDeviationAnomalyMessage,
} from '../utils/smsHelper';

describe('RescueLink Geo Utilities', () => {
  test('haversineDistance calculates correct distance between Hanoi and Ho Chi Minh City', () => {
    // Coordinate constants
    const hanoi: LatLng = { lat: 21.0285, lng: 105.8542 };
    const hcmc: LatLng = { lat: 10.8231, lng: 106.6297 };
    
    // Distance should be approximately 1160km (1,160,000 meters)
    const distance = haversineDistance(hanoi, hcmc);
    expect(distance).toBeGreaterThan(1100 * 1000);
    expect(distance).toBeLessThan(1200 * 1000);
  });

  test('haversineDistance returns 0 for same point', () => {
    const pt: LatLng = { lat: 21.0285, lng: 105.8542 };
    expect(haversineDistance(pt, pt)).toBe(0);
  });

  test('distanceToRoute calculates minimum distance to route segments correctly', () => {
    const route: LatLng[] = [
      { lat: 21.0285, lng: 105.8542 }, // Point A
      { lat: 21.0295, lng: 105.8552 }, // Point B
      { lat: 21.0305, lng: 105.8562 }, // Point C
    ];

    const currentPt: LatLng = { lat: 21.0295, lng: 105.8552 }; // Directly on Point B
    expect(distanceToRoute(currentPt, route)).toBe(0);

    const slightlyDeviated: LatLng = { lat: 21.0295, lng: 105.8562 }; // Off to the east
    const dist = distanceToRoute(slightlyDeviated, route);
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(150);
  });

  test('distanceToRoute returns 0 for empty route', () => {
    const currentPt: LatLng = { lat: 21.0295, lng: 105.8552 };
    expect(distanceToRoute(currentPt, [])).toBe(0);
  });
});

describe('RescueLink SMS Helper Builders', () => {
  test('buildBatterySosMessage returns correct SMS template', () => {
    const message = buildBatterySosMessage(15, 21.0285, 105.8542, '12:34:56');
    expect(message).toContain('[SOS PIN YEU 15%]');
    expect(message).toContain('https://maps.google.com/?q=21.0285,105.8542');
    expect(message).toContain('luc 12:34:56');
  });

  test('buildCheckinFailedMessage returns correct SMS template', () => {
    const message = buildCheckinFailedMessage('Tay Yen Tu Hike', 21.0285, 105.8542);
    expect(message).toContain('[CANH BAO MAT LIEN LAC]');
    expect(message).toContain('Tay Yen Tu Hike');
    expect(message).toContain('https://maps.google.com/?q=21.0285,105.8542');
  });

  test('buildCircularAnomalyMessage returns correct SMS template', () => {
    const message = buildCircularAnomalyMessage(1800, 150, 21.0285, 105.8542);
    expect(message).toContain('[AI CANH BAO LAC DUONG]');
    expect(message).toContain('di vong tron');
    expect(message).toContain('di chuyen 1800m');
    expect(message).toContain('cach diem 30p truoc 150m');
    expect(message).toContain('https://maps.google.com/?q=21.0285,105.8542');
  });

  test('buildDeviationAnomalyMessage returns correct SMS template', () => {
    const message = buildDeviationAnomalyMessage(520, 21.0285, 105.8542);
    expect(message).toContain('[AI CANH BAO LAC DUONG]');
    expect(message).toContain('lech cung duong dang ky 520m');
    expect(message).toContain('https://maps.google.com/?q=21.0285,105.8542');
  });
});
