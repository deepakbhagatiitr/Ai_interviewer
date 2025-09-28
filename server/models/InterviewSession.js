const mongoose = require('mongoose');

const CodeSubmissionSchema = new mongoose.Schema({
  problemId: {
    type: String,
    required: true
  },
  problemTitle: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['JavaScript', 'Python', 'C++']
  },
  code: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  testResults: [{
    testCase: String,
    input: mongoose.Schema.Types.Mixed,
    expectedOutput: String,
    actualOutput: String,
    passed: Boolean,
    executionTime: Number,
    memoryUsage: Number,
    error: String
  }],
  overallScore: {
    type: Number,
    default: 0
  },
  totalTests: {
    type: Number,
    default: 0
  },
  passedTests: {
    type: Number,
    default: 0
  },
  failedTests: {
    type: Number,
    default: 0
  },
  averageExecutionTime: {
    type: Number,
    default: 0
  },
  averageMemoryUsage: {
    type: Number,
    default: 0
  }
});

const HintSchema = new mongoose.Schema({
  problemId: {
    type: String,
    required: true
  },
  hintType: {
    type: String,
    required: true,
    enum: ['nudge', 'guide', 'direction']
  },
  hintContent: {
    type: String,
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  wasHelpful: {
    type: Boolean,
    default: null
  }
});

const PerformanceMetricsSchema = new mongoose.Schema({
  totalTimeSpent: {
    type: Number, // in seconds
    default: 0
  },
  idleTime: {
    type: Number, // in seconds
    default: 0
  },
  codeChanges: {
    type: Number,
    default: 0
  },
  syntaxErrors: {
    type: Number,
    default: 0
  },
  logicIssues: {
    type: Number,
    default: 0
  },
  hintsUsed: {
    type: Number,
    default: 0
  },
  hintsByType: {
    nudge: { type: Number, default: 0 },
    guide: { type: Number, default: 0 },
    direction: { type: Number, default: 0 }
  },
  averageCodeQuality: {
    type: Number,
    default: 0
  },
  averageBigO: {
    type: String,
    default: 'O(1)'
  },
  averageMaintainability: {
    type: Number,
    default: 0
  },
  problemSolvingApproach: {
    type: String,
    enum: ['systematic', 'trial-and-error', 'methodical', 'rushed'],
    default: 'methodical'
  },
  debuggingSkills: {
    type: Number, // 1-10 scale
    default: 5
  },
  codeEfficiency: {
    type: Number, // 1-10 scale
    default: 5
  },
  problemUnderstanding: {
    type: Number, // 1-10 scale
    default: 5
  }
});

const InterviewSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  candidateEmail: {
    type: String,
    required: true
  },
  candidateName: {
    type: String,
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },
  totalDuration: {
    type: Number, // in seconds
    default: 0
  },
  problems: [{
    problemId: String,
    problemTitle: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    timeSpent: Number, // in seconds
    completed: {
      type: Boolean,
      default: false
    },
    score: Number,
    attempts: Number,
    hintsUsed: Number
  }],
  codeSubmissions: [CodeSubmissionSchema],
  hints: [HintSchema],
  performanceMetrics: PerformanceMetricsSchema,
  overallScore: {
    type: Number,
    default: 0
  },
  finalAssessment: {
    technicalSkills: {
      type: Number, // 1-10 scale
      default: 5
    },
    problemSolving: {
      type: Number, // 1-10 scale
      default: 5
    },
    codeQuality: {
      type: Number, // 1-10 scale
      default: 5
    },
    communication: {
      type: Number, // 1-10 scale
      default: 5
    },
    overallRating: {
      type: String,
      enum: ['excellent', 'good', 'average', 'below-average', 'poor'],
      default: 'average'
    },
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    summary: String
  },
  aiAnalysis: {
    codeAnalysis: [{
      timestamp: Date,
      analysis: String,
      suggestions: [String],
      score: Number
    }],
    behavioralInsights: [{
      timestamp: Date,
      insight: String,
      category: String
    }]
  }
}, {
  timestamps: true
});

// Index for efficient querying
InterviewSessionSchema.index({ candidateEmail: 1, startedAt: -1 });
InterviewSessionSchema.index({ sessionId: 1 });
InterviewSessionSchema.index({ status: 1, completedAt: -1 });

// Method to calculate overall score
InterviewSessionSchema.methods.calculateOverallScore = function() {
  const submissions = this.codeSubmissions;
  if (submissions.length === 0) return 0;
  
  const totalScore = submissions.reduce((sum, submission) => sum + submission.overallScore, 0);
  return Math.round(totalScore / submissions.length);
};

// Method to generate performance summary
InterviewSessionSchema.methods.generatePerformanceSummary = function() {
  const metrics = this.performanceMetrics;
  const submissions = this.codeSubmissions;
  const hints = this.hints;
  
  const totalProblems = this.problems.length;
  const completedProblems = this.problems.filter(p => p.completed).length;
  const totalTests = submissions.reduce((sum, s) => sum + s.totalTests, 0);
  const passedTests = submissions.reduce((sum, s) => sum + s.passedTests, 0);
  const testSuccessRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  
  const avgExecutionTime = submissions.reduce((sum, s) => sum + s.averageExecutionTime, 0) / submissions.length || 0;
  const avgMemoryUsage = submissions.reduce((sum, s) => sum + s.averageMemoryUsage, 0) / submissions.length || 0;
  
  const hintsByType = hints.reduce((acc, hint) => {
    acc[hint.hintType] = (acc[hint.hintType] || 0) + 1;
    return acc;
  }, {});
  
  return {
    sessionOverview: {
      duration: this.totalDuration,
      problemsAttempted: totalProblems,
      problemsCompleted: completedProblems,
      completionRate: totalProblems > 0 ? (completedProblems / totalProblems) * 100 : 0
    },
    codePerformance: {
      overallScore: this.overallScore,
      testSuccessRate: Math.round(testSuccessRate),
      totalTests: totalTests,
      passedTests: passedTests,
      averageExecutionTime: Math.round(avgExecutionTime),
      averageMemoryUsage: Math.round(avgMemoryUsage)
    },
    problemSolving: {
      hintsUsed: metrics.hintsUsed,
      hintsBreakdown: hintsByType,
      codeChanges: metrics.codeChanges,
      debuggingSkills: metrics.debuggingSkills,
      problemUnderstanding: metrics.problemUnderstanding
    },
    codeQuality: {
      averageCodeQuality: metrics.averageCodeQuality,
      averageBigO: metrics.averageBigO,
      averageMaintainability: metrics.averageMaintainability,
      syntaxErrors: metrics.syntaxErrors,
      logicIssues: metrics.logicIssues
    },
    behavioralInsights: {
      approach: metrics.problemSolvingApproach,
      efficiency: metrics.codeEfficiency,
      timeManagement: this.totalDuration > 2700 ? 'excellent' : this.totalDuration > 1800 ? 'good' : 'needs-improvement'
    }
  };
};

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
