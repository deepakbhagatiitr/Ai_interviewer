const mongoose = require('mongoose');

const codeSubmissionSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  testResults: [{
    testCase: String,
    expected: String,
    actual: String,
    passed: Boolean,
    executionTime: Number
  }],
  aiAnalysis: {
    syntaxErrors: [String],
    logicIssues: [String],
    suggestions: [String],
    hints: [String],
    score: Number,
    feedback: String
  }
});

const hintSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['syntax', 'logic', 'approach', 'optimization', 'general'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  aiGenerated: {
    type: Boolean,
    default: true
  },
  helpful: {
    type: Boolean,
    default: null
  }
});

const interviewSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  problem: {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true
    },
    category: {
      type: String,
      required: true
    },
    testCases: [{
      input: String,
      expectedOutput: String,
      explanation: String
    }],
    constraints: [String],
    hints: [String],
    timeLimit: Number, // in minutes
    allowedLanguages: [String]
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  startTime: Date,
  endTime: Date,
  duration: Number, // in minutes
  codeSubmissions: [codeSubmissionSchema],
  hints: [hintSchema],
  audioInteractions: [{
    timestamp: Date,
    type: {
      type: String,
      enum: ['speech_to_text', 'text_to_speech']
    },
    content: String,
    duration: Number
  }],
  finalScore: {
    overall: Number,
    codeQuality: Number,
    problemSolving: Number,
    communication: Number,
    timeManagement: Number,
    hintsUsed: Number
  },
  aiFeedback: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    detailedAnalysis: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
interviewSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate duration when interview ends
interviewSessionSchema.methods.endInterview = function() {
  this.status = 'completed';
  this.endTime = new Date();
  if (this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60)); // in minutes
  }
  return this.save();
};

module.exports = mongoose.model('Interview', interviewSessionSchema);
