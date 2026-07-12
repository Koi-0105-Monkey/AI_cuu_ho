process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.MEDICAL_SECRET_KEY = 'a_very_secure_default_secret_key_32_bytes!';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/app');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

let mongoServer;
let adminToken;
let adminUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  adminUser = await User.create({
    name: 'Admin User',
    phone: '0900000001',
    passwordHash: 'hashedpwd',
    role: 'admin'
  });
  adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Forest Fire Feature Flag Test Suite', () => {
  test('should return empty list when FEATURE_FOREST_FIRE is not true', async () => {
    process.env.FEATURE_FOREST_FIRE = 'false';

    const res = await request(app)
      .get('/api/vqg/hotspots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  test('should attempt to run logic when FEATURE_FOREST_FIRE is true', async () => {
    process.env.FEATURE_FOREST_FIRE = 'true';
    
    const realFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('firms.modaps.eosdis.nasa.gov')) {
        return Promise.resolve({
          text: () => Promise.resolve(
            'latitude,longitude,satellite,confidence,frp,acq_date,acq_time,col8,col9,col10\n' +
            '21.0285,105.8542,VIIRS,h,15.0,2026-06-25,1200,8,9,10'
          )
        });
      }
      if (url.includes('earthquake.usgs.gov')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            features: [
              {
                id: 'eq1',
                geometry: { coordinates: [105.8542, 21.0285] },
                properties: { mag: 4.5, time: Date.now(), place: 'Vinh Bac Bo' }
              }
            ]
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const res = await request(app)
      .get('/api/vqg/hotspots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    global.fetch = realFetch;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].satellite).toContain('NASA VIIRS');
  });
});
