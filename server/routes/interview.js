const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Interview = require('../models/Interview');
const User = require('../models/User');
const { aiService } = require('../services/aiService');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all interviews for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    let query = {};

    if (role === 'candidate') {
      query.candidate = req.user.userId;
    } else if (role === 'interviewer') {
      query.interviewer = req.user.userId;
    }

    const interviews = await Interview.find(query)
      .populate('candidate', 'name email profile')
      .populate('interviewer', 'name email profile')
      .sort({ createdAt: -1 });

    res.json({ interviews });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Get specific interview
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const interview = await Interview.findOne({ sessionId })
      .populate('candidate', 'name email profile')
      .populate('interviewer', 'name email profile');

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check if user is authorized to view this interview
    if (interview.candidate._id.toString() !== req.user.userId && 
        interview.interviewer?._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to view this interview' });
    }

    res.json({ interview });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

// Create new interview
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { problem, candidateId, interviewerId } = req.body;
    const sessionId = uuidv4();

    // Validate required fields
    if (!problem || !candidateId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if candidate exists
    const candidate = await User.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Check if interviewer exists (if provided)
    let interviewer = null;
    if (interviewerId) {
      interviewer = await User.findById(interviewerId);
      if (!interviewer) {
        return res.status(404).json({ error: 'Interviewer not found' });
      }
    }

    // Create interview
    const interview = new Interview({
      sessionId,
      candidate: candidateId,
      interviewer: interviewerId,
      problem: {
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty || 'medium',
        category: problem.category || 'general',
        testCases: problem.testCases || [],
        constraints: problem.constraints || [],
        hints: problem.hints || [],
        timeLimit: problem.timeLimit || 60,
        allowedLanguages: problem.allowedLanguages || ['javascript', 'python', 'java', 'cpp']
      }
    });

    await interview.save();

    // Populate the response
    await interview.populate('candidate', 'name email profile');
    if (interviewer) {
      await interview.populate('interviewer', 'name email profile');
    }

    res.status(201).json({ interview });
  } catch (error) {
    console.error('Create interview error:', error);
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

// Update interview
router.put('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    const interview = await Interview.findOne({ sessionId });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check authorization
    if (interview.candidate.toString() !== req.user.userId && 
        interview.interviewer?.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to update this interview' });
    }

    // Update allowed fields
    const allowedUpdates = ['status', 'problem'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        interview[field] = updates[field];
      }
    });

    await interview.save();
    await interview.populate('candidate', 'name email profile');
    if (interview.interviewer) {
      await interview.populate('interviewer', 'name email profile');
    }

    res.json({ interview });
  } catch (error) {
    console.error('Update interview error:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

// Submit code
router.post('/:sessionId/submit', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code, language, testResults } = req.body;

    const interview = await Interview.findOne({ sessionId });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check authorization
    if (interview.candidate.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only candidates can submit code' });
    }

    // Add code submission
    const codeSubmission = {
      timestamp: new Date(),
      code,
      language,
      testResults: testResults || []
    };

    interview.codeSubmissions.push(codeSubmission);
    await interview.save();

    res.json({ message: 'Code submitted successfully', submission: codeSubmission });
  } catch (error) {
    console.error('Submit code error:', error);
    res.status(500).json({ error: 'Failed to submit code' });
  }
});

// Add hint
router.post('/:sessionId/hints', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content, type = 'general' } = req.body;

    const interview = await Interview.findOne({ sessionId });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check authorization
    if (interview.candidate.toString() !== req.user.userId && 
        interview.interviewer?.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to add hints' });
    }

    // Add hint
    const hint = {
      timestamp: new Date(),
      type,
      content,
      aiGenerated: false
    };

    interview.hints.push(hint);
    await interview.save();

    res.json({ message: 'Hint added successfully', hint });
  } catch (error) {
    console.error('Add hint error:', error);
    res.status(500).json({ error: 'Failed to add hint' });
  }
});

// Complete interview
router.post('/:sessionId/complete', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const interview = await Interview.findOne({ sessionId });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check authorization
    if (interview.candidate.toString() !== req.user.userId && 
        interview.interviewer?.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to complete this interview' });
    }

    // End the interview
    await interview.endInterview();

    // Calculate final scores
    const finalScore = calculateFinalScore(interview);
    interview.finalScore = finalScore;
    await interview.save();

    res.json({ 
      message: 'Interview completed successfully', 
      finalScore,
      duration: interview.duration 
    });
  } catch (error) {
    console.error('Complete interview error:', error);
    res.status(500).json({ error: 'Failed to complete interview' });
  }
});

// Helper function to calculate final score
function calculateFinalScore(interview) {
  const codeSubmissions = interview.codeSubmissions || [];
  const hints = interview.hints || [];
  const duration = interview.duration || 0;
  
  if (codeSubmissions.length === 0) {
    return {
      overall: 0,
      codeQuality: 0,
      problemSolving: 0,
      communication: 0,
      timeManagement: 0,
      hintsUsed: hints.length
    };
  }

  const lastSubmission = codeSubmissions[codeSubmissions.length - 1];
  const aiAnalysis = lastSubmission.aiAnalysis || {};
  
  const codeQuality = aiAnalysis.score || 0;
  const problemSolving = Math.max(0, codeQuality - (hints.length * 10));
  const communication = 80; // Mock score for audio interactions
  const timeManagement = Math.max(0, 100 - (duration * 2)); // Penalize long duration
  
  const overall = Math.round((codeQuality + problemSolving + communication + timeManagement) / 4);
  
  return {
    overall: Math.max(0, Math.min(100, overall)),
    codeQuality: Math.max(0, Math.min(100, codeQuality)),
    problemSolving: Math.max(0, Math.min(100, problemSolving)),
    communication: Math.max(0, Math.min(100, communication)),
    timeManagement: Math.max(0, Math.min(100, timeManagement)),
    hintsUsed: hints.length
  };
}

// Generate problem content (test cases and constraints)
router.post('/generate-problem-content', authenticateToken, async (req, res) => {
  try {
    const { title, description, difficulty, category, allowedLanguages } = req.body;
    
    const prompt = `Generate test cases and constraints for this coding problem:

Title: ${title}
Description: ${description}
Difficulty: ${difficulty}
Category: ${category}
Allowed Languages: ${allowedLanguages.join(', ')}

Please generate:
1. 3-5 test cases with input, expected output, and explanation
2. 3-5 constraints for the problem

Return the response in this JSON format:
{
  "testCases": [
    {
      "input": "example input",
      "expectedOutput": "expected output",
      "explanation": "explanation of the test case"
    }
  ],
  "constraints": [
    "constraint 1",
    "constraint 2"
  ]
}`;

    const response = await aiService.generateContent(prompt);
    res.json(response);
  } catch (error) {
    console.error('Error generating problem content:', error);
    res.status(500).json({ error: 'Failed to generate problem content' });
  }
});

module.exports = router;
