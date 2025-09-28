const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'candidate', profile = {} } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role,
      profile
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', { 
      body: req.body, 
      email: req.body.email, 
      emailType: typeof req.body.email,
      timestamp: new Date() 
    });
    
    // Extract email and password, handling both string and object cases
    let email, password;
    if (typeof req.body.email === 'string') {
      email = req.body.email;
      password = req.body.password;
    } else if (typeof req.body.email === 'object' && req.body.email.email) {
      // If email is an object, extract the actual email
      email = req.body.email.email;
      password = req.body.password;
    } else {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    console.log('Extracted credentials:', { email, passwordType: typeof password });

    // Hardcoded admin credentials
    if (email === 'admin@gmail.com' && password === 'admin123') {
      const token = jwt.sign(
        { userId: 'admin-user-id', role: 'admin' },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: 'admin-user-id',
          name: 'Admin User',
          email: 'admin@gmail.com',
          role: 'admin',
          profile: {
            experience: 'senior',
            preferredLanguages: ['JavaScript', 'Python', 'C++'],
            bio: 'System Administrator'
          }
        }
      });
    }

    // Hardcoded test users
    const hardcodedUsers = {
      'user1@gmail.com': { password: 'user1', name: 'User One', id: 'user1-id' },
      'user2@gmail.com': { password: 'user2', name: 'User Two', id: 'user2-id' },
      'user3@gmail.com': { password: 'user3', name: 'User Three', id: 'user3-id' }
    };

    if (hardcodedUsers[email] && hardcodedUsers[email].password === password) {
      const user = hardcodedUsers[email];
      const token = jwt.sign(
        { userId: user.id, role: 'candidate' },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: email,
          role: 'candidate',
          profile: {
            experience: 'mid',
            preferredLanguages: ['JavaScript', 'Python', 'C++'],
            bio: 'Test candidate user'
          }
        }
      });
    }

    // For other users, use database lookup
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Handle hardcoded admin user
    if (decoded.userId === 'admin-user-id') {
      return res.json({
        user: {
          id: 'admin-user-id',
          name: 'Admin User',
          email: 'admin@gmail.com',
          role: 'admin',
          profile: {
            experience: 'senior',
            preferredLanguages: ['JavaScript', 'Python', 'C++'],
            bio: 'System Administrator'
          }
        }
      });
    }

    // Handle hardcoded test users
    const hardcodedUsers = {
      'user1-id': { email: 'user1@gmail.com', name: 'User One' },
      'user2-id': { email: 'user2@gmail.com', name: 'User Two' },
      'user3-id': { email: 'user3@gmail.com', name: 'User Three' }
    };

    if (hardcodedUsers[decoded.userId]) {
      const user = hardcodedUsers[decoded.userId];
      return res.json({
        user: {
          id: decoded.userId,
          name: user.name,
          email: user.email,
          role: 'candidate',
          profile: {
            experience: 'mid',
            preferredLanguages: ['JavaScript', 'Python', 'C++'],
            bio: 'Test candidate user'
          }
        }
      });
    }
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const { profile } = req.body;

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { profile },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
