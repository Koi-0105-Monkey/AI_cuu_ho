process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.MEDICAL_SECRET_KEY = 'a_very_secure_default_secret_key_32_bytes!';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/app');
const User = require('../src/models/User');
const Trip = require('../src/models/Trip');
const TripGroup = require('../src/models/TripGroup');
const jwt = require('jsonwebtoken');

let mongoServer;
let user1Token;
let user1;
let user2Token;
let user2;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Tạo 2 users
  user1 = await User.create({
    name: 'Trekker One',
    phone: '0912345671',
    passwordHash: 'hashedpwd',
    role: 'user',
    medicalProfile: {
      bloodType: 'A+',
      allergies: 'Peanut',
      medications: 'None',
      chronicConditions: 'None',
      notes: 'No notes'
    }
  });
  user1Token = jwt.sign({ id: user1._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  user2 = await User.create({
    name: 'Trekker Two',
    phone: '0912345672',
    passwordHash: 'hashedpwd',
    role: 'user',
    medicalProfile: {
      bloodType: 'O-',
      allergies: 'None',
      medications: 'None',
      chronicConditions: 'Asthma',
      notes: 'Carry inhaler'
    }
  });
  user2Token = jwt.sign({ id: user2._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('TripGroup (Trekking Cá Nhân) Test Suite', () => {
  let createdGroup;

  test('should create a trip group successfully without operatorId', async () => {
    const res = await request(app)
      .post('/api/v1/trip-groups')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        groupName: 'Nhóm đi săn mây Tà Xùa',
        routeName: 'Đỉnh Tà Xùa',
        description: 'Đi leo núi cuối tuần cùng bạn bè'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.group.groupName).toBe('Nhóm đi săn mây Tà Xùa');
    expect(res.body.group.operatorId).toBeUndefined(); // Không có operatorId
    expect(res.body.group.leaderId).toBe(String(user1._id));
    expect(res.body.group.joinCode).toBeDefined();
    expect(res.body.group.qrCodeDataUrl).toBeDefined();
    
    // Check that active trip was created/linked automatically for user1
    const activeTrip = await Trip.findOne({ userId: user1._id, status: 'active' });
    expect(activeTrip).toBeDefined();
    expect(activeTrip.groupId.toString()).toBe(res.body.group._id);

    createdGroup = res.body.group;
  });

  test('should fail to create group if missing groupName or routeName', async () => {
    const res = await request(app)
      .post('/api/v1/trip-groups')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        description: 'Missing fields'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should allow another trekker to join the group by joinCode', async () => {
    const res = await request(app)
      .post('/api/v1/trip-groups/join')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        joinCode: createdGroup.joinCode,
        emergencyContactPhone: '0987654321'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.group.groupName).toBe('Nhóm đi săn mây Tà Xùa');
    
    // Check that active trip was created/linked for user2
    const activeTrip = await Trip.findOne({ userId: user2._id, status: 'active' });
    expect(activeTrip).toBeDefined();
    expect(activeTrip.groupId.toString()).toBe(createdGroup._id);

    // Verify medical info ref (without medical details) was saved in the group doc
    const groupInDb = await TripGroup.findById(createdGroup._id);
    const user2MedRecord = groupInDb.memberMedicalInfo.find(
      m => m.userId.toString() === user2._id.toString()
    );
    expect(user2MedRecord).toBeDefined();
    expect(user2MedRecord.emergencyContactPhone).toBe('0987654321');
  });

  test('should fail to join if joinCode is incorrect or not provided', async () => {
    const res = await request(app)
      .post('/api/v1/trip-groups/join')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        joinCode: '999999' // PIN không tồn tại
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('should verify TripGroup document does not contain plaintext medical details', async () => {
    const groupInDb = await TripGroup.findById(createdGroup._id);
    
    // Assert document levels
    expect(groupInDb.bloodType).toBeUndefined();
    expect(groupInDb.medicalNotes).toBeUndefined();
    expect(groupInDb.allergies).toBeUndefined();
    expect(groupInDb.medications).toBeUndefined();
    expect(groupInDb.chronicConditions).toBeUndefined();

    // Assert nested memberMedicalInfo array items
    for (const medRecord of groupInDb.memberMedicalInfo) {
      expect(medRecord.bloodType).toBeUndefined();
      expect(medRecord.medicalNotes).toBeUndefined();
      expect(medRecord.allergies).toBeUndefined();
      expect(medRecord.medications).toBeUndefined();
      expect(medRecord.chronicConditions).toBeUndefined();
    }
  });
});
