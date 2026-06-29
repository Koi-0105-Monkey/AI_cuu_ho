const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODE = process.env.GEMINI_MODE || 'mock';

let genAI;
if (GEMINI_API_KEY && GEMINI_MODE !== 'mock') {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * Khôi phục dấu tiếng Việt và Trích xuất thực thể khẩn cấp từ SMS không dấu bằng Gemini 1.5 Flash
 * @param {string} rawSmsText
 * @returns {Promise<Object>} JSON chứa textWithDiacritics, victimName, location, incidentType, severity
 */
const processSmsMessage = async (rawSmsText) => {
  if (GEMINI_MODE === 'mock' || !genAI) {
    console.log('[Gemini AI SMS Processor] Running in MOCK mode.');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Thuật toán regex/mapping mock đơn giản cho các keyword quen thuộc
    const textLower = rawSmsText.toLowerCase();
    let victimName = "Nguyễn Văn A";
    let location = "Vườn Quốc gia Ba Vì";
    let incidentType = "KHÁC";
    let severity = 3;
    let restoredText = rawSmsText;

    if (textLower.includes('lac') || textLower.includes('lost')) {
      incidentType = "LẠC";
      restoredText = "Bị lạc trong rừng, cần cứu hộ gấp";
    } else if (textLower.includes('chay') || textLower.includes('fire')) {
      incidentType = "CHÁY";
      restoredText = "Phát hiện đám cháy lớn bốc khói đen";
      severity = 5;
    } else if (textLower.includes('nga') || textLower.includes('fall') || textLower.includes('injury')) {
      incidentType = "TAI_NẠN";
      restoredText = "Bị ngã chấn thương chân không di chuyển được";
      severity = 4;
    }

    // Trích xuất tên nếu có từ "ten" hoặc "name"
    const nameMatch = rawSmsText.match(/(?:ten|name)\s+is\s+([A-Za-z\s]+)(?:\.|\s|$)/i) || 
                      rawSmsText.match(/(?:ten|name)\s+la\s+([A-Za-z\s]+)(?:\.|\s|$)/i);
    if (nameMatch) victimName = nameMatch[1].trim();

    return {
      textWithDiacritics: restoredText,
      victimName,
      location,
      incidentType,
      severity
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Bạn là một trợ lý AI cứu hộ khẩn cấp tại Việt Nam.
Nhiệm vụ của bạn là nhận tin nhắn SMS cứu nạn khẩn cấp (thường viết không dấu do sóng yếu) và:
1. Khôi phục hoàn toàn dấu tiếng Việt chuẩn xác cho tin nhắn đó.
2. Trích xuất các thực thể thông tin quan trọng.

Trả về kết quả dưới dạng JSON duy nhất, có cấu trúc sau đây (không kèm markdown \`\`\`json):
{
  "textWithDiacritics": "Nội dung tin nhắn sau khi khôi phục dấu hoàn chỉnh",
  "victimName": "Tên nạn nhân (nếu có, nếu không ghi 'Chưa rõ')",
  "location": "Mô tả địa điểm, toạ độ, hoặc khu vực xảy ra tai nạn (nếu có, nếu không ghi 'Chưa rõ')",
  "incidentType": "Loại sự cố. Chỉ chọn 1 trong các giá trị: 'LẠC', 'CHÁY', 'TAI_NẠN', 'KHÁC'",
  "severity": Mức độ nghiêm trọng từ 1 đến 5 (số nguyên, 5 là cực kỳ khẩn cấp đe dọa tính mạng)
}

Tin nhắn cần xử lý: "${rawSmsText}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse Gemini JSON response:', responseText, e);
      throw e;
    }
  } catch (error) {
    console.error('[Gemini processSmsMessage Error]', error.message);
    throw error;
  }
};

/**
 * Lắng nghe và giải mã file ghi âm Voice SOS bằng Gemini 1.5 Flash
 * @param {Buffer|string} audioData - Buffer hoặc chuỗi Base64
 * @param {string} mimeType - e.g. 'audio/wav', 'audio/mp3', 'audio/m4a'
 * @returns {Promise<string>} Nội dung dịch tiếng Việt
 */
const transcribeAudio = async (audioData, mimeType = 'audio/wav') => {
  if (GEMINI_MODE === 'mock' || !genAI) {
    console.log('[Gemini AI Speech-to-Text] Running in MOCK mode.');
    await new Promise(resolve => setTimeout(resolve, 1500));
    const mockTranscripts = [
      "Tôi là Nam, đang dẫn đoàn trekking ở gần đỉnh Tà Xùa thì bị trượt chân ngã gãy xương đùi, hiện tại không di chuyển được, máu chảy nhiều, cần đội cứu hộ hỗ trợ y tế khẩn cấp.",
      "Cảnh báo cháy rừng lớn! Tôi phát hiện khói đen dày đặc bốc lên tại khu vực rừng thông phía sau bản Cát Cát, gần trạm gác kiểm lâm số 3. Gió đang thổi mạnh, lửa lan nhanh.",
      "Đoàn chúng tôi gồm 4 người đang bị lạc đường gần đỉnh Fansipan. Sương mù rất dày, trời tối và lạnh, chúng tôi sắp hết nước uống và lương thực. Có một thành viên có dấu hiệu hạ thân nhiệt.",
      "Tôi là Hùng, hướng dẫn viên đoàn du lịch ở VQG Bạch Mã. Chúng tôi bị mắc kẹt do sạt lở đất đá chặn lối về tại khu vực suối Đỗ Quyên. Tất cả mọi người vẫn an toàn nhưng cần hỗ trợ di tản."
    ];
    return mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
  }

  try {
    let buffer = audioData;
    if (typeof audioData === 'string' && audioData.includes('base64,')) {
      buffer = Buffer.from(audioData.split('base64,')[1], 'base64');
    } else if (typeof audioData === 'string') {
      buffer = Buffer.from(audioData, 'base64');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: mimeType
        },
      },
      "Hãy lắng nghe file ghi âm cứu hộ khẩn cấp này và dịch chính xác thành văn bản tiếng Việt có dấu hoàn chỉnh. Không thêm bất kỳ lời bình luận hay giải thích nào khác."
    ]);

    return result.response.text().trim();
  } catch (error) {
    console.error('[Gemini transcribeAudio Error]', error.message);
    throw error;
  }
};

module.exports = {
  processSmsMessage,
  transcribeAudio
};
