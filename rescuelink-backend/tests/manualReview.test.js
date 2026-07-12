process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.MEDICAL_SECRET_KEY = 'a_very_secure_default_secret_key_32_bytes!';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/app');
const User = require('../src/models/User');
const Incident = require('../src/models/Incident');
const jwt = require('jsonwebtoken');

let mongoServer;
let adminToken;
let adminUser;
let rescuerUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create admin
  adminUser = await User.create({
    name: 'Admin User',
    phone: '0900000001',
    passwordHash: 'hashedpwd',
    role: 'admin'
  });
  adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Create rescuer
  rescuerUser = await User.create({
    name: 'Rescuer User',
    phone: '0900000002',
    passwordHash: 'hashedpwd',
    role: 'rescuer'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Incident.deleteMany({});
});

describe('Manual Review Enforcement Test Suite', () => {
  test('should block dispatch if needsManualReview is true and reviewedBy is not set', async () => {
    const incident = await Incident.create({
      userId: adminUser._id,
      type: 'LOST',
      severity: 4,
      severityBreakdown: {
        finalScore: 4,
        needsManualReview: true
      },
      status: 'open',
      location: { type: 'Point', coordinates: [105.8542, 21.0285] }
    });

    const res = await request(app)
      .patch(`/api/incidents/${incident._id}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assignedRescuerId: rescuerUser._id,
        etaMinutes: 30,
        dispatchNotes: 'Go quickly'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('AI không chắc chắn');
  });

  test('should allow review and then allow dispatch', async () => {
    const incident = await Incident.create({
      userId: adminUser._id,
      type: 'LOST',
      severity: 4,
      severityBreakdown: {
        finalScore: 4,
        needsManualReview: true
      },
      status: 'open',
      location: { type: 'Point', coordinates: [105.8542, 21.0285] }
    });

    // 1. Review incident
    const reviewRes = await request(app)
      .patch(`/api/incidents/${incident._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.success).toBe(true);
    expect(reviewRes.body.data.reviewedBy).toBeDefined();

    // 2. Dispatch incident should now succeed
    const dispatchRes = await request(app)
      .patch(`/api/incidents/${incident._id}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assignedRescuerId: rescuerUser._id,
        etaMinutes: 30,
        dispatchNotes: 'Go quickly'
      });

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.success).toBe(true);
    expect(dispatchRes.body.data.status).toBe('assigned');
  });
});
