require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is not set in .env file');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const adminPhone = '0901234567';
    const adminPassword = 'password123';

    let user = await User.findOne({ phone: adminPhone });

    if (user) {
      console.log(`User with phone ${adminPhone} already exists. Updating role to admin...`);
      user.role = 'admin';
      await user.save();
      console.log('User role updated to admin successfully!');
    } else {
      console.log(`Creating new admin user with phone ${adminPhone}...`);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      user = await User.create({
        name: 'RescueLink Admin',
        phone: adminPhone,
        passwordHash,
        role: 'admin',
        emergencyContacts: [
          { name: 'Support Team', phone: '0987654321', relation: 'Emergency Office' }
        ]
      });
      console.log('Admin user created successfully!');
    }

    console.log('\n--- Admin Credentials ---');
    console.log(`Phone: ${adminPhone}`);
    console.log(`Password: ${adminPassword}`);
    console.log('-------------------------\n');

  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

seedAdmin();
