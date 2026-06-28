const axios = require('axios');

/**
 * Viettel AI Service
 * Supports Speech-to-Text (ASR), Diacritics Restorer (NLP), and Named Entity Recognition (NER)
 */

const VIETTEL_AI_TOKEN = process.env.VIETTEL_AI_TOKEN || '';
const VIETTEL_AI_MODE = process.env.VIETTEL_AI_MODE || 'mock'; // 'production' or 'mock'

/**
 * Speech-to-Text (ASR)
 * Converts audio file (or base64) to Vietnamese text
 * @param {Buffer|string} audioData - Buffer or Base64 string of the audio
 * @param {string} mimeType - e.g. 'audio/wav', 'audio/mp3', 'audio/m4a'
 * @returns {Promise<string>} Transcribed text
 */
const transcribeAudio = async (audioData, mimeType = 'audio/wav') => {
  if (VIETTEL_AI_MODE === 'mock' || !VIETTEL_AI_TOKEN) {
    console.log('[Viettel AI Speech-to-Text] Running in MOCK mode.');
    // Simulated network latency
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockTranscripts = [
      "Tôi là Nam, đang dẫn đoàn trekking ở gần đỉnh Tà Xùa thì bị trượt chân ngã gãy xương đùi, hiện tại không di chuyển được, máu chảy nhiều, cần đội cứu hộ hỗ trợ y tế khẩn cấp.",
      "Cảnh báo cháy rừng lớn! Tôi phát hiện khói đen dày đặc bốc lên tại khu vực rừng thông phía sau bản Cát Cát, gần trạm gác kiểm lâm số 3. Gió đang thổi mạnh, lửa lan nhanh.",
      "Đoàn chúng tôi gồm 4 người đang bị lạc đường gần đỉnh Fansipan. Sương mù rất dày, trời tối và lạnh, chúng tôi sắp hết nước uống và lương thực. Có một thành viên có dấu hiệu hạ thân nhiệt.",
      "Tôi là Hùng, hướng dẫn viên đoàn du lịch ở VQG Bạch Mã. Chúng tôi bị mắc kẹt do sạt lở đất đá chặn lối về tại khu vực suối Đỗ Quyên. Tất cả mọi người vẫn an toàn nhưng cần hỗ trợ di tản."
    ];
    
    // Choose transcript based on some random factor or keywords if passed
    return mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
  }

  try {
    // Let's assume audioData is Buffer or Base64. If Base64, convert to Buffer
    let buffer = audioData;
    if (typeof audioData === 'string' && audioData.includes('base64,')) {
      buffer = Buffer.from(audioData.split('base64,')[1], 'base64');
    } else if (typeof audioData === 'string') {
      buffer = Buffer.from(audioData, 'base64');
    }

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', buffer, {
      filename: `audio.${mimeType.split('/')[1] || 'wav'}`,
      contentType: mimeType,
    });

    const response = await axios.post('https://viettelai.vn/asr/v1/speech_to_text', form, {
      headers: {
        ...form.getHeaders(),
        'token': VIETTEL_AI_TOKEN
      }
    });

    if (response.data && response.data.transcript) {
      return response.data.transcript;
    } else if (response.data && response.data.text) {
      return response.data.text;
    }
    
    throw new Error('Unexpected Viettel STT API response format');
  } catch (error) {
    console.error('[Viettel STT Error]', error.message);
    throw error;
  }
};

/**
 * Diacritics Restorer (NLP)
 * Restores Vietnamese diacritics (accents) for tone-less text
 * @param {string} text - Accent-less text (e.g., 'toi la nam dang o dinh ta xua')
 * @returns {Promise<string>} Accent-restored text
 */
const restoreDiacritics = async (text) => {
  if (!text || text.trim() === '') return '';

  if (VIETTEL_AI_MODE === 'mock' || !VIETTEL_AI_TOKEN) {
    console.log('[Viettel AI Diacritics] Running in MOCK mode.');
    // Simulated latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Simple rule-based mock for common rescue scenarios
    let normalized = text.toLowerCase();
    const dictionary = {
      'toi la nam': 'Tôi là Nam',
      'toi ten hung': 'Tôi tên Hùng',
      'dang o dinh ta xua': 'đang ở đỉnh Tà Xùa',
      'bi nga gay chan': 'bị ngã gãy chân',
      'gap nan': 'gặp nạn',
      'chay rung': 'cháy rừng',
      'chay rung o sapa': 'cháy rừng ở Sapa',
      'can cuu ho': 'cần cứu hộ',
      'bi lac duong': 'bị lạc đường',
      'gan tram kiem lam': 'gần trạm kiểm lâm',
      'gan thac nuoc': 'gần thác nước',
      'bi ran can': 'bị rắn cắn',
      'kiet suc': 'kiệt sức',
      'het nuoc': 'hết nước'
    };

    let result = text;
    // Attempt simple replacements
    for (const [key, val] of Object.entries(dictionary)) {
      const regex = new RegExp(key, 'gi');
      result = result.replace(regex, val);
    }

    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1);
    return result;
  }

  try {
    const response = await axios.post('https://viettelai.vn/nlp/v1/diacritics', {
      text: text
    }, {
      headers: {
        'Content-Type': 'application/json',
        'token': VIETTEL_AI_TOKEN
      }
    });

    return response.data.text || response.data.result || text;
  } catch (error) {
    console.error('[Viettel Diacritics Error]', error.message);
    // Return original text if AI service fails
    return text;
  }
};

/**
 * Named Entity Recognition (NER)
 * Extracts key rescue entities from Vietnamese text
 * @param {string} text - Vietnamese text
 * @returns {Promise<{victimName: string, location: string, incidentType: string, severity: number}>}
 */
const extractEntities = async (text) => {
  if (!text) {
    return { victimName: '', location: '', incidentType: 'Khác', severity: 3 };
  }

  // To build a premium experience, even in mock/fallback, we use a smart regex & keyword extractor
  const textLower = text.toLowerCase();
  
  let victimName = '';
  let location = '';
  let incidentType = 'Khác';
  let severity = 3;

  // 1. Extract Victim Name
  const namePatterns = [
    /(?:tôi tên là|tôi là|tên tôi là|thành viên|tên là)\s+([A-ZÀ-Ỹa-zà-ỹ\s]+?)(?=\s+(?:đang|bị|ở|cần|$|,|\.))/i,
    /(?:tôi là|tên)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)*)/
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      victimName = match[1].trim();
      break;
    }
  }

  // 2. Extract Location
  const locationKeywords = [
    'đỉnh tà xùa', 'tà xùa', 'fansipan', 'phăng xi băng', 'hoàng liên sơn', 'bản cát cát',
    'bản tả van', 'thác tình yêu', 'thác bạc', 'suối đỗ quyên', 'bạch mã', 'cúc phương',
    'trạm kiểm lâm', 'trạm gác', 'vườn quốc gia', 'hòn vượn', 'lùng cúng'
  ];

  for (const kw of locationKeywords) {
    if (textLower.includes(kw)) {
      // Find the exact casing from original text
      const idx = textLower.indexOf(kw);
      location = text.substr(idx, kw.length);
      break;
    }
  }

  // Fallback location extraction (after "đang ở", "tại khu vực", "ở gần")
  if (!location) {
    const locPatterns = /(?:đang ở|tại khu vực|ở gần|tại|ở)\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s]+?)(?=\s+(?:thì|bị|cần|vào|$|,|\.))/i;
    const match = text.match(locPatterns);
    if (match && match[1]) {
      location = match[1].trim();
    }
  }

  // 3. Extract Incident Type & Severity
  if (textLower.includes('cháy') || textLower.includes('khói') || textLower.includes('lửa')) {
    incidentType = 'Cháy rừng';
    severity = 5;
  } else if (textLower.includes('gãy') || textLower.includes('chấn thương') || textLower.includes('chảy máu') || textLower.includes('tai nạn')) {
    incidentType = 'Chấn thương';
    severity = 5;
  } else if (textLower.includes('lạc') || textLower.includes('không thấy đường') || textLower.includes('mất phương hướng')) {
    incidentType = 'Lạc đường';
    severity = 4;
  } else if (textLower.includes('rắn cắn') || textLower.includes('độc')) {
    incidentType = 'Rắn cắn/Ngộ độc';
    severity = 5;
  } else if (textLower.includes('sạt lở') || textLower.includes('lũ quét') || textLower.includes('kẹt')) {
    incidentType = 'Thiên tai/Mắc kẹt';
    severity = 5;
  } else if (textLower.includes('hết nước') || textLower.includes('kiệt sức') || textLower.includes('hạ thân nhiệt')) {
    incidentType = 'Sức khỏe yếu';
    severity = 4;
  }

  // If running in production with Viettel AI, we can query their NER API to refine it
  if (VIETTEL_AI_MODE === 'production' && VIETTEL_AI_TOKEN) {
    try {
      const response = await axios.post('https://viettelai.vn/nlp/v1/ner', {
        text: text
      }, {
        headers: {
          'Content-Type': 'application/json',
          'token': VIETTEL_AI_TOKEN
        }
      });
      
      // Viettel NER typically returns an array of entities: [{word: "Tà Xùa", tag: "LOC"}, {word: "Nam", tag: "PER"}]
      if (response.data && Array.isArray(response.data.entities)) {
        const entities = response.data.entities;
        const locEntity = entities.find(e => e.tag === 'LOC' || e.tag === 'LOCATION');
        const perEntity = entities.find(e => e.tag === 'PER' || e.tag === 'PERSON');
        
        if (locEntity) location = locEntity.word;
        if (perEntity) victimName = perEntity.word;
      }
    } catch (error) {
      console.warn('[Viettel NER API Warning] Failed, using regex fallback:', error.message);
    }
  }

  return {
    victimName: victimName || 'Chưa rõ',
    location: location || 'Chưa rõ tọa độ cụ thể',
    incidentType,
    severity
  };
};

/**
 * Text-to-Speech (TTS)
 * Converts Vietnamese text to speech audio URL
 * @param {string} text - Warning message
 * @param {string} voice - Voice code (e.g., 'hn-quynhanh', 'hcm-diemmy', 'hue-maingoc')
 * @returns {Promise<string>} URL to the generated audio
 */
const textToSpeech = async (text, voice = 'hn-quynhanh') => {
  if (VIETTEL_AI_MODE === 'mock' || !VIETTEL_AI_TOKEN) {
    console.log('[Viettel AI Text-to-Speech] Running in MOCK mode.');
    // Simulated latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Return a default mock alert audio file
    return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
  }

  try {
    const response = await axios.post('https://viettelai.vn/tts/speech_synthesis', {
      text,
      voice,
      speed: 1,
      tts_return_option: 3
    }, {
      headers: {
        'Content-Type': 'application/json',
        'token': VIETTEL_AI_TOKEN
      }
    });

    if (response.data && response.data.url) {
      return response.data.url;
    }
    
    throw new Error('TTS API did not return audio URL');
  } catch (error) {
    console.error('[Viettel TTS Error]', error.message);
    return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
  }
};

module.exports = {
  transcribeAudio,
  restoreDiacritics,
  extractEntities,
  textToSpeech
};
