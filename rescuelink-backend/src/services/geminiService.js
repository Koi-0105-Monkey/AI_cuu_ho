const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODE = process.env.GEMINI_MODE || 'mock';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

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
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
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

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
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

/**
 * Tạo phản hồi văn bản từ prompt bằng Gemini 1.5 Flash
 * @param {string} prompt
 * @returns {Promise<string>}
 */
const generateResponse = async (prompt) => {
  if (GEMINI_MODE === 'mock' || !genAI) {
    console.log('[Gemini AI Text Generator] Running in MOCK mode.');
    const promptLower = prompt.toLowerCase();
    if (promptLower.includes('chảy máu') || promptLower.includes('gãy') || promptLower.includes('chấn thương') || promptLower.includes('nguy kịch') || promptLower.includes('bất tỉnh') || promptLower.includes('mất nhiều máu')) {
      return '5';
    }
    if (promptLower.includes('lạc') || promptLower.includes('lạnh') || promptLower.includes('đói') || promptLower.includes('sương mù')) {
      return '4';
    }
    return '3';
  }

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('[Gemini generateResponse Error]', error.message);
    throw error;
  }
};

/**
 * Phân tích ảnh chụp để phát hiện cháy rừng bằng Gemini
 * @param {string} imageInput - Đường dẫn file cục bộ hoặc chuỗi Base64
 * @returns {Promise<Object>} JSON { hasFire: boolean, confidence: number, description: string }
 */
const analyzeFireImage = async (imageInput) => {
  if (GEMINI_MODE === 'mock' || !genAI) {
    console.log('[Gemini AI Fire Image Analyzer] Running in MOCK mode.');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      hasFire: true,
      confidence: 0.95,
      description: "Phát hiện cột khói lớn và đám cháy bốc lên từ tán rừng phòng hộ."
    };
  }

  try {
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (imageInput.startsWith('data:')) {
      const match = imageInput.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = imageInput;
      }
    } else {
      // imageInput is a file path
      const fs = require('fs');
      const path = require('path');
      const ext = path.extname(imageInput).toLowerCase();
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else mimeType = 'image/jpeg';
      
      const fileBuffer = fs.readFileSync(imageInput);
      base64Data = fileBuffer.toString('base64');
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `Bạn là chuyên gia phân tích ảnh cháy rừng của kiểm lâm.
Hãy phân tích hình ảnh này để xem có dấu hiệu cháy rừng (khói, lửa, than hồng) hay không.
Trả về định dạng JSON chính xác duy nhất (không kèm markdown \`\`\`json):
{
  "hasFire": true hoặc false (boolean),
  "confidence": độ tin cậy từ 0.0 đến 1.0 (float),
  "description": "mô tả ngắn gọn tiếng Việt về những gì thấy được trong ảnh liên quan tới cháy rừng"
}`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const responseText = result.response.text().trim();
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse Gemini Fire Image JSON:', responseText, e);
      return {
        hasFire: true,
        confidence: 0.5,
        description: "Có dấu hiệu nghi ngờ cháy rừng dựa trên hình ảnh."
      };
    }
  } catch (error) {
    console.error('[Gemini analyzeFireImage Error]', error.message);
    return {
      hasFire: true,
      confidence: 0.5,
      description: "Có dấu hiệu nghi ngờ cháy rừng dựa trên hình ảnh."
    };
  }
};

module.exports = {
  processSmsMessage,
  transcribeAudio,
  generateResponse,
  analyzeFireImage
};
