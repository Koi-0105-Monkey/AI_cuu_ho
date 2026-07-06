/**
 * weatherService.js
 * Gọi Open-Meteo API (miễn phí, không cần API key) để lấy dự báo thời tiết.
 * Cache kết quả 30 phút để tránh gọi quá nhiều.
 *
 * WMO Weather Code Reference:
 * https://open-meteo.com/en/docs#weathervariables
 */

// Cache đơn giản in-memory: key = "lat_lng", value = { data, fetchedAt }
const weatherCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút

// WMO codes được coi là nguy hiểm → cần cảnh báo
const DANGEROUS_WEATHER_CODES = new Set([
  // Thunderstorm
  95, 96, 99,
  // Heavy rain
  65, 67, 82,
  // Snow storm
  75, 77, 86,
  // Freezing rain
  66, 67
]);

/**
 * Map WMO code sang mô tả tiếng Việt
 */
const WMO_DESCRIPTIONS = {
  0: 'Trời quang', 1: 'Hầu như quang', 2: 'Có mây rải rác', 3: 'Nhiều mây',
  45: 'Sương mù', 48: 'Sương mù đóng băng',
  51: 'Mưa phùn nhẹ', 53: 'Mưa phùn vừa', 55: 'Mưa phùn dày',
  61: 'Mưa nhỏ', 63: 'Mưa vừa', 65: 'Mưa to',
  71: 'Tuyết nhẹ', 73: 'Tuyết vừa', 75: 'Tuyết dày',
  80: 'Mưa rào nhẹ', 81: 'Mưa rào vừa', 82: 'Mưa rào rất to',
  95: 'Dông', 96: 'Dông có mưa đá nhẹ', 99: 'Dông có mưa đá to'
};

/**
 * Lấy dự báo thời tiết tại tọa độ (lat, lng)
 * @returns {{ weatherCode, temperature, windspeed, description, isDangerous, raw }}
 */
const getWeather = async (lat, lng) => {
  const cacheKey = `${parseFloat(lat).toFixed(2)}_${parseFloat(lng).toFixed(2)}`;

  // Trả từ cache nếu còn hạn
  const cached = weatherCache.get(cacheKey);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,weathercode,wind_speed_10m,windspeed_10m,precipitation&timezone=Asia%2FHo_Chi_Minh&forecast_days=1`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000) // timeout 10s
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const json = await response.json();
    const current = json.current || {};

    const weatherCode = current.weather_code ?? current.weathercode ?? 0;
    const temperature = current.temperature_2m ?? 24;
    const windspeed   = current.wind_speed_10m ?? current.windspeed_10m ?? 5;
    const precipitation = current.precipitation ?? 0;

    const description  = WMO_DESCRIPTIONS[weatherCode] || `Thời tiết bình thường (${weatherCode})`;
    const isDangerous  = DANGEROUS_WEATHER_CODES.has(weatherCode) || precipitation > 10;

    const data = {
      weatherCode,
      temperature,
      windspeed,
      precipitation,
      description,
      isDangerous,
      raw: current
    };

    weatherCache.set(cacheKey, { data, fetchedAt: Date.now() });
    return data;

  } catch (err) {
    console.error(`[WeatherService] Failed to fetch weather for (${lat}, ${lng}): ${err.message}`);
    // Trả về dữ liệu mặc định an toàn, không throw để không block luồng chính
    return {
      weatherCode: null,
      temperature: null,
      windspeed: null,
      precipitation: null,
      description: 'Không thể lấy dữ liệu thời tiết',
      isDangerous: false,
      raw: null
    };
  }
};

/**
 * Kiểm tra xem trip có cần cảnh báo thời tiết không.
 * Trả về { shouldAlert, weather } — shouldAlert = true nếu nguy hiểm và chưa cảnh báo gần đây
 */
const checkTripWeatherAlert = async (trip) => {
  if (!trip.lastKnownLocation?.coordinates) return { shouldAlert: false };

  const [lng, lat] = trip.lastKnownLocation.coordinates;
  const weather = await getWeather(lat, lng);

  if (!weather.isDangerous) return { shouldAlert: false, weather };

  // Kiểm tra xem đã cảnh báo weather code này trong 2 giờ qua chưa
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const recentAlert = trip.weatherAlerts?.find(
    a => a.weatherCode === weather.weatherCode && a.alertedAt > twoHoursAgo
  );

  if (recentAlert) return { shouldAlert: false, weather }; // đã cảnh báo rồi

  return { shouldAlert: true, weather };
};

module.exports = { getWeather, checkTripWeatherAlert, WMO_DESCRIPTIONS };
