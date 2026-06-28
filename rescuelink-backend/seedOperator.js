require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Operator = require('./src/models/Operator');

const seedOperator = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is not set in .env file');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const operatorPhone = '0911223344';
    const operatorPassword = 'operator123';
    const companyName = 'Công ty du lịch Trekking Sapa';

    // 1. Tìm hoặc tạo User mới có role='operator'
    let user = await User.findOne({ phone: operatorPhone });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(operatorPassword, salt);

    if (user) {
      console.log(`User with phone ${operatorPhone} already exists. Updating role to operator...`);
      user.role = 'operator';
      user.passwordHash = passwordHash;
      await user.save();
    } else {
      console.log(`Creating new operator user with phone ${operatorPhone}...`);
      user = await User.create({
        name: companyName,
        phone: operatorPhone,
        passwordHash,
        role: 'operator'
      });
    }

    // 2. Tìm hoặc tạo Operator profile tương ứng
    let operator = await Operator.findOne({ adminUserId: user._id });
    if (operator) {
      console.log('Operator profile already exists.');
    } else {
      console.log('Creating Operator profile...');
      operator = await Operator.create({
        companyName,
        phone: operatorPhone,
        email: 'contact@trekkingsapa.com',
        address: 'Thị xã Sapa, Lào Cai',
        adminUserId: user._id,
        plan: 'pro',
        maxActiveTrips: 100,
        maxMembers: 500
      });
    }

    // 3. Liên kết operatorId ngược lại cho user
    user.operatorId = operator._id;
    await user.save();

    console.log('\n--- Operator Credentials ---');
    console.log(`Phone: ${operatorPhone}`);
    console.log(`Password: ${operatorPassword}`);
    console.log(`Company: ${companyName}`);
    console.log('----------------------------\n');

  } catch (error) {
    console.error('Error seeding operator:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

seedOperator();
