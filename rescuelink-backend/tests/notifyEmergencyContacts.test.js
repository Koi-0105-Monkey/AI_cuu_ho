process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.MEDICAL_SECRET_KEY = 'a_very_secure_default_secret_key_32_bytes!';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Trip = require('../src/models/Trip');
const Incident = require('../src/models/Incident');
const notifyEmergencyContacts = require('../src/services/notifyEmergencyContacts');
const smsService = require('../src/services/smsService');

// Mock smsService sendEmergencySMS
jest.mock('../src/services/smsService', () => {
  return {
    sendEmergencySMS: jest.fn().mockResolvedValue([]),
    sendSMS: jest.fn().mockResolvedValue({ sid: 'mock_sid' }),
  };
});

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
  await Incident.deleteMany({});
  jest.clearAllMocks();
});

describe('notifyEmergencyContacts Service Test Suite', () => {
  test('should notify emergency contacts when finalScore >= 4', async () => {
    const user = await User.create({
      name: 'Nguyen Van A',
      phone: '0912345678',
      passwordHash: 'hashedpwd',
      emergencyContacts: [
        { name: 'Contact 1', phone: '0987654321', relation: 'Spouse' }
      ]
    });

    const trip = await Trip.create({
      userId: user._id,
      routeName: 'Ta Xua Peak',
      expectedReturn: new Date(Date.now() + 3600000),
      shareToken: 'test-share-token',
      status: 'active',
      lastKnownLocation: {
        type: 'Point',
        coordinates: [104.4539, 21.3582]
      }
    });

    const incident = await Incident.create({
      userId: user._id,
      tripId: trip._id,
      type: 'LOST',
      severity: 4,
      severityBreakdown: { finalScore: 4 },
      status: 'open',
      location: { type: 'Point', coordinates: [104.4539, 21.3582] }
    });

    await notifyEmergencyContacts(incident);

    expect(smsService.sendEmergencySMS).toHaveBeenCalled();
    const calls = smsService.sendEmergencySMS.mock.calls;
    expect(calls[0][0].name).toBe('Nguyen Van A');
    expect(calls[0][1].type).toBe('LOST');
    expect(calls[0][1].shareToken).toBe('test-share-token');
  });

  test('should NOT notify emergency contacts when finalScore < 4', async () => {
    const user = await User.create({
      name: 'Nguyen Van B',
      phone: '0912345679',
      passwordHash: 'hashedpwd',
      emergencyContacts: [
        { name: 'Contact 1', phone: '0987654321', relation: 'Spouse' }
      ]
    });

    const incident = await Incident.create({
      userId: user._id,
      type: 'LOST',
      severity: 3,
      severityBreakdown: { finalScore: 3 },
      status: 'open',
      location: { type: 'Point', coordinates: [104.4539, 21.3582] }
    });

    await notifyEmergencyContacts(incident);

    expect(smsService.sendEmergencySMS).not.toHaveBeenCalled();
  });
});
