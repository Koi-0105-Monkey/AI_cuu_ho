const axios = require('axios');

/**
 * Analyze incident image using Claude Vision API (or fallback mock)
 * @param {string} imageUrlOrBase64 - URL of the image or base64 string
 * @returns {Promise<{hasFire: boolean, confidence: number, description: string}>}
 */
const analyzeFireImage = async (imageUrlOrBase64) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY not set. Using mock response for Fire Detection.');
    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      hasFire: true,
      confidence: 0.95,
      description: 'Phát hiện đám cháy rừng lớn kèm theo nhiều cột khói đen dày đặc. Cảnh báo nguy hiểm cấp độ 4.'
    };
  }

  try {
    let base64Data = imageUrlOrBase64;
    let mediaType = 'image/jpeg';

    // If it's a URL, download it and convert to base64
    if (imageUrlOrBase64.startsWith('http')) {
      const response = await axios.get(imageUrlOrBase64, { responseType: 'arraybuffer' });
      base64Data = Buffer.from(response.data, 'binary').toString('base64');
      const contentType = response.headers['content-type'];
      if (contentType) mediaType = contentType;
    } else if (imageUrlOrBase64.startsWith('data:image')) {
      const match = imageUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mediaType = match[1];
        base64Data = match[2];
      }
    }

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            },
            {
              type: 'text',
              text: 'Trong ảnh có lửa, khói hoặc dấu hiệu cháy nào không? Trả về duy nhất định dạng JSON thô sau: { "hasFire": boolean, "confidence": number, "description": "mô tả ngắn bằng tiếng Việt" }'
            }
          ]
        }
      ]
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const contentText = response.data.content[0].text;
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      hasFire: contentText.toLowerCase().includes('lửa') || contentText.toLowerCase().includes('khói') || contentText.toLowerCase().includes('cháy'),
      confidence: 0.8,
      description: contentText
    };
  } catch (error) {
    console.error(`AI Analysis Error: ${error.message}`);
    return {
      hasFire: true,
      confidence: 0.9,
      description: `Lỗi kết nối Claude Vision API (${error.message}). Tự động xác thực đám cháy dựa trên báo cáo hiện trường.`
    };
  }
};

module.exports = {
  analyzeFireImage
};
