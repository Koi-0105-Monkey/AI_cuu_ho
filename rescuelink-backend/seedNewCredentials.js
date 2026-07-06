require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Operator = require('./src/models/Operator');

const seedNewCredentials = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is not set in .env file');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // 1. Tạo tài khoản Admin mới
    const adminPhone = '012345678';
    const adminPassword = 'admin123';
    const adminSalt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash(adminPassword, adminSalt);

    let adminUser = await User.findOne({ phone: adminPhone });
    if (adminUser) {
      console.log(`Cập nhật Admin hiện tại có SĐT ${adminPhone}...`);
      adminUser.role = 'admin';
      adminUser.passwordHash = adminPasswordHash;
      await adminUser.save();
    } else {
      console.log(`Tạo mới Admin có SĐT ${adminPhone}...`);
      adminUser = await User.create({
        name: 'Hệ thống Admin',
        phone: adminPhone,
        passwordHash: adminPasswordHash,
        role: 'admin'
      });
    }

    // 2. Tạo tài khoản Operator mới (0123456789)
    const operPhone = '0123456789';
    const operPassword = 'test123';
    const operSalt = await bcrypt.genSalt(10);
    const operPasswordHash = await bcrypt.hash(operPassword, operSalt);
    const companyName = 'Công ty Sapa Trekking Explorer';

    let operUser = await User.findOne({ phone: operPhone });
    if (operUser) {
      console.log(`Cập nhật Operator hiện tại có SĐT ${operPhone}...`);
      operUser.role = 'operator';
      operUser.passwordHash = operPasswordHash;
      operUser.name = companyName;
      await operUser.save();
    } else {
      console.log(`Tạo mới Operator có SĐT ${operPhone}...`);
      operUser = await User.create({
        name: companyName,
        phone: operPhone,
        passwordHash: operPasswordHash,
        role: 'operator'
      });
    }

    // Tạo Operator profile tương ứng cho 0123456789
    let operatorProfile = await Operator.findOne({ adminUserId: operUser._id });
    if (!operatorProfile) {
      console.log('Tạo mới Operator Profile cho Công ty du lịch...');
      operatorProfile = await Operator.create({
        companyName,
        phone: operPhone,
        email: 'info@sapaxplorer.com',
        address: 'Trung tâm Sapa',
        adminUserId: operUser._id,
        plan: 'pro',
        maxActiveTrips: 100,
        maxMembers: 500
      });
    }
    operUser.operatorId = operatorProfile._id;
    await operUser.save();

    console.log('\n=============================================');
    console.log('🎉 ĐÃ KHỞI TẠO XONG THÔNG TIN TÀI KHOẢN TEST:');
    console.log('---------------------------------------------');
    console.log(`1. CỔNG ADMIN (HQ & CỨU HỘ):`);
    console.log(`   - SĐT: ${adminPhone}`);
    console.log(`   - Pass: ${adminPassword}`);
    console.log('---------------------------------------------');
    console.log(`2. CỔNG OPERATOR (CÔNG TY TOUR):`);
    console.log(`   - SĐT: ${operPhone}`);
    console.log(`   - Pass: ${operPassword}`);
    console.log('=============================================\n');

  } catch (error) {
    console.error('Error seeding credentials:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

seedNewCredentials();
