const weatherService = require('./weatherService');
const geminiService = require('./geminiService');

/**
 * Động cơ phân tích độ nghiêm trọng đa tín hiệu (Multi-Signal Severity Scoring Engine)
 * Xếp hạng độ ưu tiên từ 1-5 dựa trên AI, y tế, mức pin, thời tiết và thời gian.
 * @param {Object} user - Đối tượng User báo nạn
 * @param {number} lat - Tọa độ vĩ độ
 * @param {number} lng - Tọa độ kinh độ
 * @param {string} textContent - Nội dung tin nhắn text hoặc voice transcript
 * @param {number} batteryLevel - Phần trăm pin của thiết bị báo nạn (0-100)
 * @returns {Promise<Object>} Object chứa điểm số chi tiết và lý do phân loại
 */
async function calculateSeverity(user, lat, lng, textContent, batteryLevel) {
  let baseScore = 3;
  let reasons = [];
  
  // 1. Phân tích văn bản/giọng nói bằng Gemini AI
  if (textContent && textContent.trim().length > 0) {
    try {
      // Sử dụng geminiService hoặc phân tích từ khóa để lấy base score
      // Chúng ta sẽ nhờ Gemini phân tích mức độ nguy cấp
      const prompt = `Phân tích cuộc gọi/tin nhắn SOS sau của trekker đi lạc/bị nạn trên núi và đánh giá mức độ nghiêm trọng từ 1 đến 5 (1: Nhẹ/cần hỗ trợ thường, 5: Đe dọa tính mạng trực tiếp). Chỉ trả về một con số duy nhất từ 1 đến 5.
Nội dung SOS: "${textContent}"`;
      
      const response = await geminiService.generateResponse(prompt);
      const parsedNum = parseInt(response.replace(/[^1-5]/g, ''));
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 5) {
        baseScore = parsedNum;
        reasons.push(`AI (Gemini) phân tích ngôn ngữ: Mức nguy cấp cơ bản ${baseScore}/5`);
      } else {
        reasons.push('AI (Gemini) phản hồi không khớp định dạng, dùng mức cơ bản: 3/5');
      }
    } catch (err) {
      console.warn('[SeverityEngine] Gemini failed, using fallback baseScore=3:', err.message);
      reasons.push('Gemini AI offline/lỗi phân tích, sử dụng mức mặc định: 3/5');
    }
  } else {
    reasons.push('Không có nội dung văn bản/giọng nói, sử dụng mức mặc định: 3/5');
  }

  let medicalAdjustment = 0;
  let batteryAdjustment = 0;
  let weatherAdjustment = 0;
  let timeAdjustment = 0;

  // 2. Tín hiệu từ hồ sơ y tế (medicalProfile)
  if (user && user.medicalProfile) {
    const med = user.medicalProfile;
    const chronic = (med.chronicConditions || '').toLowerCase();
    
    // Check bệnh nền tim mạch
    if (chronic.includes('tim') || chronic.includes('mạch') || chronic.includes('heart') || chronic.includes('cardiac') || chronic.includes('huyết áp')) {
      medicalAdjustment += 1.0;
      reasons.push('Bệnh nhân có tiền sử bệnh lý nền Tim mạch / Huyết áp (+1.0)');
    }
    // Check hen suyễn/phổi
    if (chronic.includes('hen') || chronic.includes('suyễn') || chronic.includes('asthma') || chronic.includes('phổi') || chronic.includes('hô hấp')) {
      medicalAdjustment += 1.0;
      reasons.push('Bệnh nhân có bệnh lý nền Hô hấp / Hen suyễn (+1.0)');
    }
    // Check tiểu đường/động kinh
    if (chronic.includes('tiểu đường') || chronic.includes('diabetes') || chronic.includes('động kinh') || chronic.includes('seizure')) {
      medicalAdjustment += 0.5;
      reasons.push('Bệnh nhân có bệnh lý nền Tiểu đường / Động kinh (+0.5)');
    }
    // Check nhóm máu hiếm
    const blood = (med.bloodType || '').toLowerCase();
    if (blood.includes('-') || blood === 'ab-' || blood === 'o-') {
      medicalAdjustment += 0.5;
      reasons.push(`Bệnh nhân thuộc nhóm máu hiếm (${med.bloodType}) (+0.5)`);
    }
  }

  // 3. Tín hiệu dung lượng pin thiết bị
  if (batteryLevel !== undefined && batteryLevel !== null) {
    if (batteryLevel <= 10) {
      batteryAdjustment += 1.5;
      reasons.push(`Thiết bị báo nạn sắp sập nguồn (Pin ${batteryLevel}%) (+1.5)`);
    } else if (batteryLevel <= 20) {
      batteryAdjustment += 1.0;
      reasons.push(`Thiết bị báo nạn pin rất yếu (Pin ${batteryLevel}%) (+1.0)`);
    } else if (batteryLevel <= 50) {
      batteryAdjustment += 0.5;
      reasons.push(`Thiết bị báo nạn pin yếu (Pin ${batteryLevel}%) (+0.5)`);
    }
  }

  // 4. Tín hiệu thời tiết thực tế tại tọa độ GPS
  if (lat && lng) {
    try {
      const weather = await weatherService.getWeather(lat, lng);
      if (weather) {
        const wCode = weather.weatherCode;
        const description = (weather.description || '').toLowerCase();
        
        // Check bão dông lớn hoặc mưa lũ
        if (wCode >= 95 || description.includes('bão') || description.includes('dông') || description.includes('mưa lớn') || description.includes('sấm sét')) {
          weatherAdjustment += 1.0;
          reasons.push(`Thời tiết tại hiện trường có dông bão / sấm sét nguy hiểm (+1.0)`);
        } else if (wCode >= 51 || description.includes('mưa') || description.includes('tuyết') || description.includes('sương mù')) {
          weatherAdjustment += 0.5;
          reasons.push(`Thời tiết tại hiện trường xấu (Mưa / Sương mù hạn chế tầm nhìn) (+0.5)`);
        }
      }
    } catch (weatherErr) {
      console.warn('[SeverityEngine] Failed to fetch weather adjustments:', weatherErr.message);
    }
  }

  // 5. Tín hiệu thời gian trong ngày (ban đêm nguy hiểm hơn)
  const now = new Date();
  const currentHour = now.getHours();
  if (currentHour >= 18 || currentHour < 5) {
    timeAdjustment += 0.5;
    reasons.push(`Yêu cầu gửi vào ban đêm (${currentHour}:00), tầm nhìn hạn chế (+0.5)`);
  }

  // 6. Tính toán độ tin cậy AI (aiConfidence) và gắn cờ cần duyệt lại (needsManualReview)
  let aiConfidence = 'High';
  let needsManualReview = false;

  if (!textContent || textContent.trim().length === 0) {
    aiConfidence = 'Low';
    needsManualReview = true;
  } else if (reasons.some(r => r.includes('lỗi') || r.includes('offline'))) {
    aiConfidence = 'Low';
    needsManualReview = true;
  }

  const hasSevereMedical = medicalAdjustment >= 1.0;
  const hasSevereBattery = batteryAdjustment >= 1.0;
  if (baseScore <= 2 && (hasSevereMedical || hasSevereBattery)) {
    aiConfidence = 'Medium';
    needsManualReview = true;
    reasons.push('⚠️ AI phát hiện tín hiệu mâu thuẫn: Nội dung báo cáo bình tĩnh nhưng pin rất yếu hoặc có tiền sử bệnh lý nền nguy cơ cao (Cần trực ban xem xét kỹ)');
  }

  // Tổng hợp điểm số
  const calculatedScore = baseScore + medicalAdjustment + batteryAdjustment + weatherAdjustment + timeAdjustment;
  const finalScore = Math.min(5, Math.max(1, Math.round(calculatedScore)));

  return {
    finalScore,
    baseScore,
    medicalAdjustment,
    batteryAdjustment,
    weatherAdjustment,
    timeAdjustment,
    reasons,
    aiConfidence,
    needsManualReview
  };
}

module.exports = {
  calculateSeverity
};
