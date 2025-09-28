const mongoose = require('mongoose');

const aiInteractionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  candidateEmail: {
    type: String,
    required: true,
    index: true,
  },
  interactionType: {
    type: String,
    enum: ['code_analysis', 'test_feedback', 'hint', 'system_message', 'interview_completion', 'audio_analysis'],
    required: true,
  },
  problemId: {
    type: Number,
    required: true,
  },
  problemTitle: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  codeLength: {
    type: Number,
    required: true,
  },
  // AI Analysis Data
  analysis: {
    syntaxErrors: [String],
    logicIssues: [String],
    suggestions: [String],
    hints: [String],
    score: Number,
    feedback: String,
    bigO: String,
    maintainability: Number,
    executionTime: Number,
    memoryUsage: Number,
    cyclomaticComplexity: Number
  },
  // Test Results Data
  testResults: {
    testScore: Number,
    passedTests: Number,
    totalTests: Number,
    results: [{
      testCase: String,
      input: mongoose.Schema.Types.Mixed,
      expectedOutput: String,
      actualOutput: String,
      passed: Boolean,
      executionTime: Number,
      memoryUsage: Number,
      error: String
    }]
  },
  // Follow-up Questions
  followUpQuestions: [String],
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Index for efficient queries
aiInteractionSchema.index({ candidateEmail: 1, timestamp: -1 });
aiInteractionSchema.index({ sessionId: 1, timestamp: -1 });
aiInteractionSchema.index({ interactionType: 1, timestamp: -1 });

const AIInteraction = mongoose.model('AIInteraction', aiInteractionSchema);

module.exports = AIInteraction;
