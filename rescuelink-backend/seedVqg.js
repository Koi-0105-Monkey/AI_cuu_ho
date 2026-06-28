require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const seedVqg = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is not set in .env file');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const vqgPhone = '0123456789';
    const vqgPassword = 'test123';
    const rangerName = 'BQL Vườn Quốc Gia Hoàng Liên';

    // Tìm hoặc tạo User mới có role='authority'
    let user = await User.findOne({ phone: vqgPhone });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(vqgPassword, salt);

    if (user) {
      console.log(`User with phone ${vqgPhone} already exists. Updating role to authority (VQG) and isRanger=true...`);
      user.role = 'authority';
      user.isRanger = true;
      user.passwordHash = passwordHash;
      user.name = rangerName;
      await user.save();
    } else {
      console.log(`Creating new VQG user with phone ${vqgPhone} and isRanger=true...`);
      user = await User.create({
        name: rangerName,
        phone: vqgPhone,
        passwordHash,
        role: 'authority',
        isRanger: true
      });
    }

    console.log('\n--- VQG Ranger Credentials ---');
    console.log(`Phone: ${vqgPhone}`);
    console.log(`Password: ${vqgPassword}`);
    console.log(`Name: ${rangerName}`);
    console.log('------------------------------\n');

  } catch (error) {
    console.error('Error seeding VQG account:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

seedVqg();
