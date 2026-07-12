require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

const OLD_KEY = 'a_very_secure_default_secret_key_32_bytes!';
const NEW_KEY = process.env.MEDICAL_SECRET_KEY;

if (!NEW_KEY || NEW_KEY.length < 32) {
  console.error('❌ ERROR: MEDICAL_SECRET_KEY in .env must be at least 32 characters long to run migration.');
  process.exit(1);
}

function decryptWithKey(text, key) {
  if (!text) return '';
  if (!text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const ivHex = textParts.shift();
    const encryptedTextHex = textParts.join(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedTextHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.substring(0, 32)), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

function encryptWithKey(text, key) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.substring(0, 32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('Encryption failed:', err.message);
    return text;
  }
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`Scanning ${users.length} users for medical profile re-encryption...`);
    let processedCount = 0;
    
    for (const user of users) {
      if (!user.medicalProfile) continue;
      
      let updated = false;
      const newMedicalProfile = { ...user.medicalProfile };
      const fields = ['allergies', 'medications', 'chronicConditions', 'notes'];
      
      for (const field of fields) {
        const val = user.medicalProfile[field];
        if (val && val.includes(':')) {
          const decrypted = decryptWithKey(val, OLD_KEY);
          if (decrypted !== null) {
            newMedicalProfile[field] = encryptWithKey(decrypted, NEW_KEY);
            updated = true;
          }
        }
      }
      
      if (updated) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { medicalProfile: newMedicalProfile } }
        );
        processedCount++;
        console.log(`[Re-encrypted] User ID: ${user._id} (${user.name})`);
      }
    }
    
    console.log(`\n🎉 Migration completed. Total records re-encrypted: ${processedCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

run();
