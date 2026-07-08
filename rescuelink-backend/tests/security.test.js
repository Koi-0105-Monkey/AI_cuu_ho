require('../src/instrument');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_123';
process.env.MEDICAL_SECRET_KEY = 'a_very_secure_default_secret_key_32_bytes!';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../src/app');
const User = require('../src/models/User');
const Incident = require('../src/models/Incident');
const MedicalAuditLog = require('../src/models/MedicalAuditLog');

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
  await Incident.deleteMany({});
  await MedicalAuditLog.deleteMany({});
});

describe('Phase 3 Security, ACL & Anti-Spam Test Suite', () => {
  
  test('1. Medical profile fields are encrypted at rest and decrypted on retrieve', async () => {
    // Create user with medical profile details
    const user = await User.create({
      name: 'Patient User',
      phone: '0912345601',
      passwordHash: 'hashedpassword',
      medicalProfile: {
        bloodType: 'O+',
        allergies: 'Penicillin and Shellfish',
        medications: 'Metformin 500mg',
        chronicConditions: 'Type 2 Diabetes',
        notes: 'Keep orange juice nearby.'
      }
    });

    // Check direct database values (bypassing getters)
    const directFromDB = await mongoose.connection.db.collection('users').findOne({ _id: user._id });
    
    // The direct value in DB MUST be encrypted (contain colons and not be plaintext)
    expect(directFromDB.medicalProfile.allergies).not.toBe('Penicillin and Shellfish');
    expect(directFromDB.medicalProfile.allergies).toContain(':');
    expect(directFromDB.medicalProfile.medications).not.toBe('Metformin 500mg');
    expect(directFromDB.medicalProfile.medications).toContain(':');

    // Retrieve via Mongoose model (triggers getters)
    const retrievedUser = await User.findById(user._id);
    expect(retrievedUser.medicalProfile.allergies).toBe('Penicillin and Shellfish');
    expect(retrievedUser.medicalProfile.medications).toBe('Metformin 500mg');
    expect(retrievedUser.medicalProfile.chronicConditions).toBe('Type 2 Diabetes');
    expect(retrievedUser.medicalProfile.notes).toBe('Keep orange juice nearby.');
  });

  test('2. Access Control (ACL) strips medical details for unauthorized roles', async () => {
    // Let's create users via registration route to have proper bcrypt hashes
    const victimReg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Victim', phone: '0912345602', password: 'password123', medicalProfile: { bloodType: 'A-', allergies: 'Peanuts' } });
    
    const badRescuerReg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rescuer B', phone: '0912345603', password: 'password123' });

    // Update badRescuer's role to 'rescuer' in DB
    await User.findByIdAndUpdate(badRescuerReg.body.user.id, { role: 'rescuer' });

    // Create incident linked to the victim
    const newIncident = await Incident.create({
      userId: victimReg.body.user.id,
      type: 'LOST',
      severity: 3,
      status: 'open',
      location: { type: 'Point', coordinates: [105.85, 21.02] }
    });

    // Log in badRescuer
    const badRescuerLogin = await request(app)
      .post('/api/auth/login')
      .send({ phone: '0912345603', password: 'password123' });

    const badToken = badRescuerLogin.body.token;

    // Retrieve incident details as unauthorized rescuer
    const res = await request(app)
      .get(`/api/incidents/${newIncident._id}`)
      .set('Authorization', `Bearer ${badToken}`);

    expect(res.status).toBe(200);
    // Medical fields must be redacted
    expect(res.body.data.userId.medicalProfile.allergies).toContain('ĐÃ ẨN');
    
    // Audit logs for medical access should NOT be written for redacted views
    const auditLogsCount = await MedicalAuditLog.countDocuments({});
    expect(auditLogsCount).toBe(0);
  });

  test('3. Incident creation rate limiting blocks spamming', async () => {
    // Register test user
    const userReg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Spammer', phone: '0912345609', password: 'password123' });

    const userToken = userReg.body.token;

    // Send 3 requests - should be allowed
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'LOST',
          severity: 2,
          lat: 21.02,
          lng: 105.85,
          message: `SOS number ${i}`
        });
      expect(res.status).toBe(201);
    }

    // The 4th request must be blocked by rate limiting (HTTP 429)
    const res4 = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        type: 'LOST',
        severity: 2,
        lat: 21.02,
        lng: 105.85,
        message: 'SOS number 4'
      });
    
    expect(res4.status).toBe(429);
    expect(res4.body.message).toContain('quá thường xuyên');
  });

});
