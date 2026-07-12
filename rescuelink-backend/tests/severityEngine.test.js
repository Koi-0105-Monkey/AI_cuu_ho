const severityEngine = require('../src/services/severityScoringEngine');
const weatherService = require('../src/services/weatherService');
const geminiService = require('../src/services/geminiService');

jest.mock('../src/services/weatherService');
jest.mock('../src/services/geminiService');

describe('Severity Scoring Engine Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return base score based on Gemini response', async () => {
    geminiService.generateResponse.mockResolvedValue('4');
    weatherService.getWeather.mockResolvedValue(null);

    const user = { name: 'Test User' };
    const result = await severityEngine.calculateSeverity(user, 21.0285, 105.8542, 'Emergency', 100);

    expect(result.baseScore).toBe(4);
    expect(result.finalScore).toBe(4);
  });

  test('should adjust score based on medical conditions (chronic and blood type)', async () => {
    geminiService.generateResponse.mockResolvedValue('3');
    weatherService.getWeather.mockResolvedValue(null);

    const user = {
      name: 'Medical User',
      medicalProfile: {
        chronicConditions: 'Tim mạch và hen suyễn',
        bloodType: 'AB-'
      }
    };

    const result = await severityEngine.calculateSeverity(user, 21.0285, 105.8542, 'Help', 100);

    // tim mach (+1.0) + hen syen (+1.0) + AB- (+0.5) = 2.5
    expect(result.medicalAdjustment).toBe(2.5);
    // base score (3) + medical (2.5) = 5.5 -> round/min/max -> 5
    expect(result.finalScore).toBe(5);
  });

  test('should adjust score based on low battery level (<= 10% and <= 20%)', async () => {
    geminiService.generateResponse.mockResolvedValue('3');
    weatherService.getWeather.mockResolvedValue(null);

    const user = { name: 'User' };
    
    // Test <= 20%
    const res20 = await severityEngine.calculateSeverity(user, 21.0285, 105.8542, 'Help', 20);
    expect(res20.batteryAdjustment).toBe(1.0);

    // Test <= 10%
    const res10 = await severityEngine.calculateSeverity(user, 21.0285, 105.8542, 'Help', 8);
    expect(res10.batteryAdjustment).toBe(1.5);
  });

  test('should adjust score based on thunderstorm weather conditions', async () => {
    geminiService.generateResponse.mockResolvedValue('3');
    weatherService.getWeather.mockResolvedValue({
      weatherCode: 95,
      description: 'Có dông và sấm sét mạnh'
    });

    const user = { name: 'User' };
    const result = await severityEngine.calculateSeverity(user, 21.0285, 105.8542, 'Help', 100);

    expect(result.weatherAdjustment).toBe(1.0);
  });

  test('should adjust score for night time SOS requests', async () => {
    geminiService.generateResponse.mockResolvedValue('3');
    weatherService.getWeather.mockResolvedValue(null);

    // Mock Date.prototype.getHours to return 22 (10 PM)
    const realGetHours = Date.prototype.getHours;
    Date.prototype.getHours = jest.fn(() => 22);

    const user = { name: 'User' };
    const result = await severityEngine.calculateSeverity(user, 21.0285, 105.8542, 'Help', 100);

    // Restore real getHours
    Date.prototype.getHours = realGetHours;

    expect(result.timeAdjustment).toBe(0.5);
  });

  test('should bound final score between 1 and 5', async () => {
    geminiService.generateResponse.mockResolvedValue('5');
    // Extreme medical conditions
    const user = {
      medicalProfile: {
        chronicConditions: 'Tim mạch và hen suyễn',
        bloodType: 'O-'
      }
    };
    // storm + night + dead battery
    weatherService.getWeather.mockResolvedValue({ weatherCode: 96, description: 'Bão sấm sét' });
    const realGetHours = Date.prototype.getHours;
    Date.prototype.getHours = jest.fn(() => 23);

    const result = await severityEngine.calculateSeverity(user, 21.0285, 105.8542, 'Help', 5);
    Date.prototype.getHours = realGetHours;

    // base score (5) + medical (2.5) + battery (1.5) + weather (1.0) + time (0.5) = 10.5 -> capped at 5
    expect(result.finalScore).toBe(5);
  });

  test('should set needsManualReview correctly when conflict occurs', async () => {
    // Conflict case: low base score but severe medical profile
    geminiService.generateResponse.mockResolvedValue('1');
    weatherService.getWeather.mockResolvedValue(null);

    const user = {
      medicalProfile: {
        chronicConditions: 'Tiền sử suy tim nặng',
      }
    };

    const result = await severityEngine.calculateSeverity(user, 21.0285, 105.8542, 'Help', 100);

    expect(result.needsManualReview).toBe(true);
    expect(result.aiConfidence).toBe('Medium');
  });
});
