const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  candidateEmail: {
    type: String,
    required: true,
    index: true
  },
  messageType: {
    type: String,
    enum: ['user', 'ai', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    analysisType: {
      type: String,
      enum: ['code_analysis', 'test_results', 'hint', 'general'],
      default: 'general'
    },
    problemId: {
      type: Number,
      default: null
    },
    testResults: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    codeMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatMessageSchema.index({ sessionId: 1, timestamp: 1 });
chatMessageSchema.index({ candidateEmail: 1, timestamp: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
