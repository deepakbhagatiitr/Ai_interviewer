const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { authenticateToken } = require('../middleware/auth');

// Get chat messages for a session
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await ChatMessage
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    res.json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await ChatMessage.countDocuments({ sessionId })
      }
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat messages' });
  }
});

// Get chat messages for a candidate
router.get('/candidate/:candidateEmail', authenticateToken, async (req, res) => {
  try {
    const { candidateEmail } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await ChatMessage
      .find({ candidateEmail })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    res.json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await ChatMessage.countDocuments({ candidateEmail })
      }
    });
  } catch (error) {
    console.error('Error fetching candidate chat messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch candidate chat messages' });
  }
});

// Create a new chat message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { sessionId, candidateEmail, messageType, content, metadata = {} } = req.body;
    
    const message = new ChatMessage({
      sessionId,
      candidateEmail,
      messageType,
      content,
      metadata
    });
    
    await message.save();
    
    res.json({
      success: true,
      message: 'Chat message created successfully',
      data: message
    });
  } catch (error) {
    console.error('Error creating chat message:', error);
    res.status(500).json({ success: false, message: 'Failed to create chat message' });
  }
});

// Delete chat messages for a session
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await ChatMessage.deleteMany({ sessionId });
    
    res.json({
      success: true,
      message: 'Chat messages deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting chat messages:', error);
    res.status(500).json({ success: false, message: 'Failed to delete chat messages' });
  }
});

module.exports = router;
