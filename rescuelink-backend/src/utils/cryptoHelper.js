const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = (process.env.MEDICAL_SECRET_KEY || '').substring(0, 32);
const IV_LENGTH = 16;

/**
 * Mã hóa chuỗi văn bản thuần túy sang ciphertext dạng hex kèm IV
 * @param {string} text - Văn bản cần mã hóa
 * @returns {string} ciphertext dạng 'iv:encryptedText'
 */
function encrypt(text) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('[Crypto] Encryption failed:', err.message);
    return text;
  }
}

/**
 * Giải mã ciphertext dạng hex kèm IV về văn bản thuần túy
 * @param {string} text - ciphertext dạng 'iv:encryptedText'
 * @returns {string} văn bản đã giải mã
 */
function decrypt(text) {
  if (!text) return '';
  // Nếu dữ liệu cũ không theo định dạng mã hóa, trả về nguyên bản
  if (!text.includes(':')) return text;
  
  try {
    const textParts = text.split(':');
    const ivHex = textParts.shift();
    const encryptedTextHex = textParts.join(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedTextHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Trả về văn bản gốc nếu giải mã thất bại (phòng hờ dữ liệu cũ chưa mã hóa)
    console.warn('[Crypto] Decryption failed, returning ciphertext:', err.message);
    return text;
  }
}

module.exports = {
  encrypt,
  decrypt
};
