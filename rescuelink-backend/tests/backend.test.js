require('../src/instrument');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_123';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../src/app');
const User = require('../src/models/User');
const Trip = require('../src/models/Trip');
const Incident = require('../src/models/Incident');
const GpsRaw = require('../src/models/GpsRaw');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(async () => {
  await User.deleteMany({});
  await Trip.deleteMany({});
  await Incident.deleteMany({});
  await GpsRaw.deleteMany({});
});

describe('RescueLink Backend API Test Suite', () => {
  const testUser = {
    name: 'Nguyen Van A',
    phone: '0912345678',
    password: 'password123',
    emergencyContacts: [
      { name: 'Nguyen Van B', phone: '0987654321', relation: 'Father' }
    ]
  };

  let token;
  let userId;

  // 1. Tests for Registration
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.phone).toBe(testUser.phone);
    });

    it('should reject duplicate phone registration', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Register duplicate
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should fail registration with invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'A', // Too short
          phone: '123',
          password: '12' // Too short
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  // Helper to authenticate for private routes
  const loginAndGetToken = async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        phone: testUser.phone,
        password: testUser.password
      });
    token = loginRes.body.token;
    userId = loginRes.body.user.id;
  };

  // 2. Tests for Login
  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: testUser.phone,
          password: testUser.password
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
    });

    it('should reject login with wrong password', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: testUser.phone,
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid phone or password');
    });
  });

  // 3. Tests for Trips
  describe('Trips Endpoints', () => {
    beforeEach(async () => {
      await loginAndGetToken();
    });

    it('should start a trip successfully', async () => {
      const expectedReturn = new Date();
      expectedReturn.setHours(expectedReturn.getHours() + 5);

      const res = await request(app)
        .post('/api/trips/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          routeName: 'Ta Xua Peak',
          expectedReturn: expectedReturn.toISOString(),
          lat: 21.3582,
          lng: 104.4539,
          battery: 95
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.trip.routeName).toBe('Ta Xua Peak');
      expect(res.body.trip.status).toBe('active');
    });

    it('should get current active trip successfully', async () => {
      // First check if active trip is null
      let res = await request(app)
        .get('/api/trips/active')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.trip).toBeNull();

      // Start a trip
      const expectedReturn = new Date();
      expectedReturn.setHours(expectedReturn.getHours() + 5);

      await request(app)
        .post('/api/trips/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          routeName: 'Ta Xua Peak',
          expectedReturn: expectedReturn.toISOString(),
          lat: 21.3582,
          lng: 104.4539,
          battery: 95
        });

      // Check active trip again
      res = await request(app)
        .get('/api/trips/active')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.trip).not.toBeNull();
      expect(res.body.trip.routeName).toBe('Ta Xua Peak');
    });

    it('should update battery and last location of a trip', async () => {
      // Start a trip
      const tripRes = await request(app)
        .post('/api/trips/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          routeName: 'Ta Xua Peak',
          expectedReturn: new Date(Date.now() + 3600000).toISOString(),
          lat: 21.3582,
          lng: 104.4539,
          battery: 95
        });

      const tripId = tripRes.body.trip._id;

      // Update battery/location
      const updateRes = await request(app)
        .patch(`/api/trips/${tripId}/battery`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: 21.3601,
          lng: 104.4560,
          battery: 88
        });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.trip.lastBattery).toBe(88);
      expect(updateRes.body.trip.lastKnownLocation.coordinates).toEqual([104.4560, 21.3601]);
    });

    it('should end a trip successfully', async () => {
      // Start a trip
      const tripRes = await request(app)
        .post('/api/trips/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          routeName: 'Ta Xua Peak',
          expectedReturn: new Date(Date.now() + 3600000).toISOString(),
          lat: 21.3582,
          lng: 104.4539,
          battery: 95
        });

      const tripId = tripRes.body.trip._id;

      // End trip
      const endRes = await request(app)
        .patch(`/api/trips/${tripId}/end`)
        .set('Authorization', `Bearer ${token}`);

      expect(endRes.statusCode).toBe(200);
      expect(endRes.body.success).toBe(true);
      expect(endRes.body.trip.status).toBe('completed');
      expect(endRes.body.trip).toHaveProperty('endedAt');
    });
  });

  // 4. Tests for GPS Batch upload
  describe('POST /api/gps/batch', () => {
    beforeEach(async () => {
      await loginAndGetToken();
    });

    it('should fail if user has no active trip', async () => {
      const res = await request(app)
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send([
          { lat: 21.3582, lng: 104.4539, battery: 90, recordedAt: new Date().toISOString() }
        ]);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No active trip found');
    });

    it('should successfully store batch GPS points when user has active trip', async () => {
      // Start trip
      await request(app)
        .post('/api/trips/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          routeName: 'Ta Xua Peak',
          expectedReturn: new Date(Date.now() + 3600000).toISOString(),
          lat: 21.3582,
          lng: 104.4539,
          battery: 95
        });

      const res = await request(app)
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send([
          { lat: 21.3585, lng: 104.4542, speed: 2, battery: 94, recordedAt: new Date().toISOString() },
          { lat: 21.3590, lng: 104.4548, speed: 2.2, battery: 93, recordedAt: new Date().toISOString() }
        ]);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);

      // Verify DB storage
      const count = await GpsRaw.countDocuments({ userId });
      expect(count).toBe(0); // Processed instantly, so raw count is 0

      const GpsSegment = require('../src/models/GpsSegment');
      const segmentCount = await GpsSegment.countDocuments({ userId });
      expect(segmentCount).toBe(1); // 1 compressed segment created
    });
  });

  // 5. Tests for Incidents
  describe('POST /api/incidents', () => {
    beforeEach(async () => {
      await loginAndGetToken();
    });

    it('should create an incident successfully', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'LOST',
          severity: 3,
          lat: 21.3582,
          lng: 104.4539,
          message: 'Bi lac trong rung khong tim thay loi ra',
          batteryAtTime: 65
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.incident.type).toBe('LOST');
      expect(res.body.incident.severity).toBeGreaterThanOrEqual(4);
      expect(res.body.incident.location.coordinates).toEqual([104.4539, 21.3582]);
      expect(res.body.incident.userId.name).toBe(testUser.name);
    });
  });

  // 6. Tests for SMS Inbound Webhook
  describe('POST /api/sms/inbound', () => {
    it('should successfully parse SMS and create incident', async () => {
      // 1. Register a user with phone match
      await request(app).post('/api/auth/register').send(testUser);

      // 2. Send SMS to webhook (Twilio format uses Form URL Encoded body)
      const res = await request(app)
        .post('/api/sms/inbound')
        .type('form')
        .send({
          From: `+84${testUser.phone.substring(1)}`, // Twilio format "+84912345678"
          Body: '[SOS:FIRE] GPS:21.0285,105.8542 T:2026-06-25 10:14:00 LVL:4'
        });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/xml');
      expect(res.text).toContain('RescueLink: Tin nhan khan cap da duoc ghi nhan');

      // Verify incident created in DB
      const incident = await Incident.findOne({ type: 'FIRE' });
      expect(incident).toBeDefined();
      expect(incident.severity).toBeGreaterThanOrEqual(4);
      expect(incident.location.coordinates).toEqual([105.8542, 21.0285]);
    });

    it('should reject SMS from unregistered phone number', async () => {
      const res = await request(app)
        .post('/api/sms/inbound')
        .type('form')
        .send({
          From: '+84999999999',
          Body: '[SOS:LOST] GPS:21.0285,105.8542 LVL:3'
        });

      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('chua dang ky tren he thong');
    });

    it('should reject invalid SMS format', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/sms/inbound')
        .type('form')
        .send({
          From: `+84${testUser.phone.substring(1)}`,
          Body: 'Toi dang bi lac o toa do 21.0285, 105.8542, hay cuu toi!'
        });

      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Sai cu phap SOS');
    });
  });
});
