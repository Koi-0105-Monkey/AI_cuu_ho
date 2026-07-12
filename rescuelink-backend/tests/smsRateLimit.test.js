process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.MEDICAL_SECRET_KEY = 'a_very_secure_default_secret_key_32_bytes!';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/app');
const User = require('../src/models/User');

let mongoServer;
const testUser = {
  name: 'SMS Rate Limit User',
  phone: '0919999999',
  password: 'password123'
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Register the user
  await request(app).post('/api/auth/register').send(testUser);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('SMS Webhook Rate Limiter Test Suite', () => {
  test('should allow up to 3 SMS requests and block the 4th with 429', async () => {
    // Send 3 requests - all should succeed (200 OK)
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/sms/inbound')
        .type('form')
        .send({
          From: '+84919999999',
          Body: '[SOS:FIRE] GPS:21.0285,105.8542 T:2026-06-25 10:14:00 LVL:4'
        });
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('RescueLink: Tin nhan khan cap da duoc ghi nhan');
    }

    // Send 4th request - should be blocked with 429 Too Many Requests
    const resBlocked = await request(app)
      .post('/api/sms/inbound')
      .type('form')
      .send({
        From: '+84919999999',
        Body: '[SOS:FIRE] GPS:21.0285,105.8542 T:2026-06-25 10:14:00 LVL:4'
      });

    expect(resBlocked.statusCode).toBe(429);
    expect(resBlocked.headers['content-type']).toContain('text/xml');
    expect(resBlocked.text).toContain('RescueLink: Gui yeu cau SOS qua nhanh');
  });
});
