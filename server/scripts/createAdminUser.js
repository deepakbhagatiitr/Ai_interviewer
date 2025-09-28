const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-interviewer');
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user (password will be hashed by pre-save hook)
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@gmail.com',
      password: 'admin123', // Will be hashed by pre-save hook
      role: 'admin',
      profile: {
        experience: 'senior',
        preferredLanguages: ['JavaScript', 'Python', 'C++'],
        bio: 'System Administrator'
      }
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createAdminUser();
