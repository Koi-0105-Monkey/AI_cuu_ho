process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Trip = require('../src/models/Trip');
const GpsRaw = require('../src/models/GpsRaw');
const GpsSegment = require('../src/models/GpsSegment');
const { rdpCompress, haversineDistance } = require('../src/services/compressionService');
const { runGpsCompression } = require('../src/jobs/compressGps');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Trip.deleteMany({});
  await GpsRaw.deleteMany({});
  await GpsSegment.deleteMany({});
});

describe('RescueLink RDP & GPS Compression Job Tests', () => {
  
  describe('compressionService - rdpCompress & haversineDistance', () => {
    it('should calculate haversine distance correctly', () => {
      const p1 = { lat: 21.0285, lng: 105.8542 }; // Hanoi
      const p2 = { lat: 10.8231, lng: 106.6297 }; // HCMC
      
      const distance = haversineDistance(p1, p2);
      
      // Hanoi to HCMC is roughly 1160km (1,160,000 meters)
      expect(distance).toBeGreaterThan(1100000);
      expect(distance).toBeLessThan(1200000);
    });

    it('should compress a straight line of points down to 2 points (Start and End)', () => {
      // Create 100 straight points from lat 21.0 to 21.01 (small scale to avoid spherical earth curvature deviation)
      const points = [];
      for (let i = 0; i < 100; i++) {
        const ratio = i / 99;
        points.push({
          lat: 21.0 + ratio * 0.01,
          lng: 105.0 + ratio * 0.01,
          recordedAt: new Date(Date.now() + i * 1000),
          battery: 100 - i
        });
      }

      // With epsilon = 10m, a perfectly straight line should be compressed to just 2 points
      const compressed = rdpCompress(points, 10);
      
      expect(compressed.length).toBe(2);
      expect(compressed[0].lat).toBe(21.0);
      expect(compressed[1].lat).toBe(21.01);
    });

    it('should keep detour points if distance exceeds epsilon', () => {
      // 3 points forming a triangle
      // p1 to p2 is a straight line, but mid point is pushed far to the side (detour)
      const points = [
        { lat: 21.0000, lng: 105.0000 },
        { lat: 21.1000, lng: 105.2000 }, // Detour point (moved east/north significantly)
        { lat: 21.2000, lng: 105.0000 }
      ];

      // Epsilon of 10 meters should keep the detour point
      const compressed = rdpCompress(points, 10);
      expect(compressed.length).toBe(3);
    });

    it('should handle small arrays gracefully', () => {
      const singlePoint = [{ lat: 21.0, lng: 105.0 }];
      expect(rdpCompress(singlePoint)).toEqual(singlePoint);

      const twoPoints = [{ lat: 21.0, lng: 105.0 }, { lat: 21.1, lng: 105.1 }];
      expect(rdpCompress(twoPoints)).toEqual(twoPoints);
    });
  });

  describe('compressGps - Cron Job execution', () => {
    it('should compress and migrate raw points older than 2 hours to GpsSegment', async () => {
      // 1. Setup user and trip
      const user = await User.create({
        name: 'Nguyen Van A',
        phone: '0912345678',
        passwordHash: 'hashed_password',
        emergencyContacts: []
      });

      const trip = await Trip.create({
        userId: user._id,
        routeName: 'Test Route',
        status: 'active',
        expectedReturn: new Date(Date.now() + 3600000),
        startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // Started 5 hours ago
        lastKnownLocation: { type: 'Point', coordinates: [105.0, 21.0] }
      });

      // 2. Insert older raw points (older than 2 hours, e.g. 3 hours ago)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const rawPointsData = [];
      for (let i = 0; i < 10; i++) {
        rawPointsData.push({
          userId: user._id,
          tripId: trip._id,
          lat: 21.0 + (i * 0.0001), // Straight line
          lng: 105.0 + (i * 0.0001),
          battery: 95 - i,
          recordedAt: new Date(threeHoursAgo.getTime() + i * 10000)
        });
      }
      await GpsRaw.insertMany(rawPointsData);

      // 3. Insert recent raw points (younger than 2 hours, e.g. 30 mins ago) - these should NOT be compressed yet
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentPointsData = [
        {
          userId: user._id,
          tripId: trip._id,
          lat: 21.1,
          lng: 105.1,
          battery: 80,
          recordedAt: thirtyMinsAgo
        }
      ];
      await GpsRaw.insertMany(recentPointsData);

      // Verify DB initial state
      const initialRawCount = await GpsRaw.countDocuments({});
      expect(initialRawCount).toBe(11);

      // 4. Execute the compression job
      await runGpsCompression();

      // 5. Verify results
      // GpsSegment should be created
      const segments = await GpsSegment.find({ tripId: trip._id });
      expect(segments.length).toBe(1);
      expect(segments[0].originalPointCount).toBe(10);
      expect(segments[0].compressedPointCount).toBe(2); // Straight line nens con 2
      expect(segments[0].geometry.coordinates.length).toBe(2);
      expect(segments[0].minBattery).toBe(86); // 95 - 9

      // Raw points older than 2 hours should be deleted, recent one stays
      const remainingRawPoints = await GpsRaw.find({});
      expect(remainingRawPoints.length).toBe(1);
      expect(remainingRawPoints[0].lat).toBe(21.1); // Recent point remains
    });
  });
});
