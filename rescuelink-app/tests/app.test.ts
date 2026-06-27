jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-dir/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn()
}));

import { haversineDistance, distanceToRoute, LatLng } from '../utils/geo';
import {
  buildBatterySosMessage,
  buildCheckinFailedMessage,
  buildCircularAnomalyMessage,
  buildDeviationAnomalyMessage,
  buildCompressedSosMessage,
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

  test('buildCompressedSosMessage returns short ASCII SMS template under 60 chars', () => {
    const message = buildCompressedSosMessage(21.0285432, 105.8542123);
    expect(message).toBe('SOS RescueLink! maps.google.com/?q=21.02854,105.85421');
    expect(message.length).toBeLessThan(60);
  });
});


describe('RescueLink Offline Map Utilities', () => {
  const { lon2tile, lat2tile, getLocalTileUri, getTilesForRoute } = require('../utils/offlineMap');

  test('lon2tile and lat2tile return correct tile coordinates', () => {
    // Zoom 0 should always return tile 0,0 for any lat/lon
    expect(lon2tile(0, 0)).toBe(0);
    expect(lat2tile(0, 0)).toBe(0);
    expect(lon2tile(105.8542, 0)).toBe(0);
    expect(lat2tile(21.0285, 0)).toBe(0);

    // Zoom 13 coordinates for Hanoi (21.0285, 105.8542)
    // x = floor(((105.8542 + 180) / 360) * 2^13) = floor(0.7940394 * 8192) = 6504
    expect(lon2tile(105.8542, 13)).toBe(6504);
    // y should be 3606
    expect(lat2tile(21.0285, 13)).toBe(3606);
  });

  test('getLocalTileUri returns correct local file path format', () => {
    const uri = getLocalTileUri(14, 13008, 7396);
    expect(uri).toContain('tiles/14/13008/7396.png');
  });

  test('getTilesForRoute returns unique tile coordinate sets for route points', () => {
    const route = [
      { lat: 21.0285, lng: 105.8542 },
      { lat: 21.0286, lng: 105.8543 }, // Very close, should map to same tiles at low zoom
    ];
    
    // Zoom 13 tiles
    const tiles = getTilesForRoute(route, [13]);
    // Should map to same tile and return only 1 unique tile coordinate
    expect(tiles.length).toBe(1);
    expect(tiles[0]).toEqual({ z: 13, x: 6504, y: 3606 });

    // Multi zoom levels [13, 14]
    const multiZoomTiles = getTilesForRoute(route, [13, 14]);
    expect(multiZoomTiles.length).toBe(2); // 1 for zoom 13, 1 for zoom 14
  });
});

