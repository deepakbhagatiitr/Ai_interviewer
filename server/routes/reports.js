const express = require('express');
const jwt = require('jsonwebtoken');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const User = require('../models/User');
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

// Get interview report
router.get('/interview/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const interview = await Interview.findOne({ sessionId })
      .populate('candidate', 'name email profile')
      .populate('interviewer', 'name email profile');

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check authorization
    if (interview.candidate._id.toString() !== req.user.userId && 
        interview.interviewer?._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to view this report' });
    }

    // Generate comprehensive report
    const report = generateInterviewReport(interview);
    res.json({ report });
  } catch (error) {
    console.error('Get interview report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get candidate performance summary
router.get('/candidate/:candidateId', authenticateToken, async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // Check if user is authorized to view this candidate's data
    if (req.user.role !== 'admin' && req.user.userId !== candidateId) {
      return res.status(403).json({ error: 'Unauthorized to view this data' });
    }

    const interviews = await Interview.find({ candidate: candidateId })
      .populate('candidate', 'name email profile')
      .sort({ createdAt: -1 });

    const summary = generateCandidateSummary(interviews);
    res.json({ summary, interviews });
  } catch (error) {
    console.error('Get candidate summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get current user's candidate summary
router.get('/candidate/current', authenticateToken, async (req, res) => {
  try {
    const interviews = await Interview.find({ candidate: req.user.userId })
      .populate('candidate', 'name email profile')
      .sort({ createdAt: -1 });

    const summary = generateCandidateSummary(interviews);
    res.json({ summary, interviews });
  } catch (error) {
    console.error('Get current candidate summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get analytics dashboard data
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const analytics = await generateAnalytics(timeRange);
    res.json({ analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Get comprehensive analytics including interview sessions
router.get('/comprehensive-analytics', authenticateToken, async (req, res) => {
  try {
    const analytics = await generateComprehensiveAnalytics();
    res.json({ analytics });
  } catch (error) {
    console.error('Get comprehensive analytics error:', error);
    res.status(500).json({ error: 'Failed to generate comprehensive analytics' });
  }
});

// Get interview statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '30d', difficulty, category } = req.query;
    
    let query = {};
    
    // Add filters based on query parameters
    if (difficulty) {
      query['problem.difficulty'] = difficulty;
    }
    if (category) {
      query['problem.category'] = category;
    }
    
    // Add time range filter
    const timeRanges = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    if (timeRanges[timeRange]) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - timeRanges[timeRange]);
      query.createdAt = { $gte: daysAgo };
    }

    const stats = await generateInterviewStats(query);
    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
});

// Helper function to generate interview report
function generateInterviewReport(interview) {
  const codeSubmissions = interview.codeSubmissions || [];
  const hints = interview.hints || [];
  const audioInteractions = interview.audioInteractions || [];
  
  // Calculate metrics
  const totalSubmissions = codeSubmissions.length;
  const totalHints = hints.length;
  const totalAudioTime = audioInteractions.reduce((sum, interaction) => 
    sum + (interaction.duration || 0), 0);
  
  // Get latest code analysis
  const latestAnalysis = codeSubmissions.length > 0 ? 
    codeSubmissions[codeSubmissions.length - 1].aiAnalysis : null;
  
  // Calculate time spent on different activities
  const timeSpent = {
    coding: calculateCodingTime(codeSubmissions),
    thinking: calculateThinkingTime(codeSubmissions),
    audio: totalAudioTime
  };
  
  // Generate insights
  const insights = generateInsights(interview, latestAnalysis);
  
  return {
    sessionId: interview.sessionId,
    candidate: interview.candidate,
    interviewer: interview.interviewer,
    problem: interview.problem,
    duration: interview.duration,
    status: interview.status,
    finalScore: interview.finalScore,
    aiFeedback: interview.aiFeedback,
    metrics: {
      totalSubmissions,
      totalHints,
      totalAudioTime,
      timeSpent
    },
    codeAnalysis: latestAnalysis,
    insights,
    timeline: generateTimeline(interview),
    recommendations: generateRecommendations(interview, latestAnalysis)
  };
}

// Helper function to generate candidate summary
function generateCandidateSummary(interviews) {
  const completedInterviews = interviews.filter(i => i.status === 'completed');
  const totalInterviews = interviews.length;
  
  if (completedInterviews.length === 0) {
    return {
      candidate: {
        name: interviews[0]?.candidate?.name || 'Unknown',
        email: interviews[0]?.candidate?.email || 'unknown@example.com',
        totalInterviews,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        totalTimeSpent: 0,
        preferredLanguages: [],
        strengths: [],
        weaknesses: []
      },
      performanceHistory: [],
      skillBreakdown: [],
      recentInterviews: []
    };
  }
  
  // Calculate scores
  const scores = completedInterviews.map(i => i.finalScore?.overall || 0);
  const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const bestScore = Math.max(...scores);
  const worstScore = Math.min(...scores);
  
  // Calculate total time spent
  const totalTimeSpent = completedInterviews.reduce((sum, i) => sum + (i.duration || 0), 0);
  
  // Get preferred languages
  const allLanguages = completedInterviews.flatMap(i => i.problem.allowedLanguages || []);
  const languageCounts = {};
  allLanguages.forEach(lang => {
    languageCounts[lang] = (languageCounts[lang] || 0) + 1;
  });
  const preferredLanguages = Object.entries(languageCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([lang]) => lang);
  
  // Analyze strengths and weaknesses
  const allStrengths = completedInterviews.flatMap(i => i.aiFeedback?.strengths || []);
  const allWeaknesses = completedInterviews.flatMap(i => i.aiFeedback?.weaknesses || []);
  
  const strengths = getMostCommon(allStrengths, 5);
  const weaknesses = getMostCommon(allWeaknesses, 5);
  
  // Generate performance history
  const performanceHistory = completedInterviews
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(i => ({
      date: i.createdAt,
      score: i.finalScore?.overall || 0,
      difficulty: i.problem.difficulty,
      category: i.problem.category
    }));
  
  // Generate skill breakdown
  const skillBreakdown = [
    { skill: 'Problem Solving', score: averageScore, trend: 'stable' },
    { skill: 'Code Quality', score: Math.max(0, averageScore - 5), trend: 'up' },
    { skill: 'Time Management', score: Math.min(100, averageScore + 5), trend: 'stable' },
    { skill: 'Algorithm Design', score: Math.max(0, averageScore - 10), trend: 'up' }
  ];
  
  // Recent interviews
  const recentInterviews = completedInterviews
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(i => ({
      _id: i._id,
      candidate: {
        name: i.candidate?.name || 'Unknown',
        email: i.candidate?.email || 'unknown@example.com'
      },
      problem: {
        title: i.problem?.title || 'Unknown Problem',
        difficulty: i.problem?.difficulty || 'medium',
        category: i.problem?.category || 'general'
      },
      status: i.status,
      finalScore: {
        overall: i.finalScore?.overall || 0
      },
      createdAt: i.createdAt
    }));
  
  return {
    candidate: {
      name: interviews[0]?.candidate?.name || 'Unknown',
      email: interviews[0]?.candidate?.email || 'unknown@example.com',
      totalInterviews,
      averageScore,
      bestScore,
      worstScore,
      totalTimeSpent,
      preferredLanguages,
      strengths,
      weaknesses
    },
    performanceHistory,
    skillBreakdown,
    recentInterviews
  };
}

// Helper function to generate analytics
async function generateAnalytics(timeRange = '30d') {
  const totalInterviews = await Interview.countDocuments();
  const completedInterviews = await Interview.countDocuments({ status: 'completed' });
  const totalCandidates = await User.countDocuments({ role: 'candidate' });
  
  // Calculate average score
  const completedWithScores = await Interview.find({ 
    status: 'completed', 
    'finalScore.overall': { $exists: true } 
  });
  const averageScore = completedWithScores.length > 0 
    ? Math.round(completedWithScores.reduce((sum, i) => sum + i.finalScore.overall, 0) / completedWithScores.length)
    : 0;
  
  // Get difficulty distribution
  const difficultyDistribution = await Interview.aggregate([
    { $group: { _id: '$problem.difficulty', count: { $sum: 1 } } },
    { $project: { difficulty: '$_id', count: 1, _id: 0 } }
  ]);
  
  // Get category distribution
  const categoryDistribution = await Interview.aggregate([
    { $group: { _id: '$problem.category', count: { $sum: 1 } } },
    { $project: { category: '$_id', count: 1, _id: 0 } }
  ]);
  
  // Get score distribution
  const scoreDistribution = [
    { range: '0-20', count: 0, percentage: 0 },
    { range: '21-40', count: 0, percentage: 0 },
    { range: '41-60', count: 0, percentage: 0 },
    { range: '61-80', count: 0, percentage: 0 },
    { range: '81-100', count: 0, percentage: 0 }
  ];
  
  completedWithScores.forEach(interview => {
    const score = interview.finalScore.overall;
    if (score <= 20) scoreDistribution[0].count++;
    else if (score <= 40) scoreDistribution[1].count++;
    else if (score <= 60) scoreDistribution[2].count++;
    else if (score <= 80) scoreDistribution[3].count++;
    else scoreDistribution[4].count++;
  });
  
  const totalScores = scoreDistribution.reduce((sum, range) => sum + range.count, 0);
  scoreDistribution.forEach(range => {
    range.percentage = totalScores > 0 ? Math.round((range.count / totalScores) * 100) : 0;
  });
  
  // Get time trends (last 30 days)
  const timeTrends = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const dayInterviews = await Interview.find({
      createdAt: { $gte: dayStart, $lte: dayEnd }
    });
    
    const dayScores = dayInterviews
      .filter(i => i.finalScore?.overall)
      .map(i => i.finalScore.overall);
    const avgScore = dayScores.length > 0 
      ? Math.round(dayScores.reduce((sum, score) => sum + score, 0) / dayScores.length)
      : 0;
    
    timeTrends.push({
      date: dayStart.toISOString(),
      interviews: dayInterviews.length,
      averageScore: avgScore
    });
  }
  
  // Get top performers
  const topPerformers = await User.aggregate([
    { $match: { role: 'candidate' } },
    { $lookup: { from: 'interviews', localField: '_id', foreignField: 'candidate', as: 'interviews' } },
    { $match: { 'interviews.status': 'completed', 'interviews.finalScore.overall': { $exists: true } } },
    { $project: {
      name: 1,
      email: 1,
      totalInterviews: { $size: '$interviews' },
      averageScore: { $avg: '$interviews.finalScore.overall' }
    }},
    { $sort: { averageScore: -1 } },
    { $limit: 10 }
  ]);
  
  return {
    overview: {
      totalInterviews,
      completedInterviews,
      averageScore,
      totalCandidates
    },
    scoreDistribution,
    difficultyDistribution,
    categoryDistribution,
    timeTrends,
    topPerformers
  };
}

// Helper function to generate interview statistics
async function generateInterviewStats(query) {
  const interviews = await Interview.find(query);
  const completedInterviews = interviews.filter(i => i.status === 'completed');
  
  const stats = {
    total: interviews.length,
    completed: completedInterviews.length,
    inProgress: interviews.filter(i => i.status === 'in_progress').length,
    cancelled: interviews.filter(i => i.status === 'cancelled').length
  };
  
  if (completedInterviews.length > 0) {
    const scores = completedInterviews.map(i => i.finalScore?.overall || 0);
    stats.averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    stats.highestScore = Math.max(...scores);
    stats.lowestScore = Math.min(...scores);
    
    const durations = completedInterviews.map(i => i.duration || 0);
    stats.averageDuration = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }
  
  return stats;
}

// Helper functions
function calculateCodingTime(submissions) {
  if (submissions.length < 2) return 0;
  
  let totalTime = 0;
  for (let i = 1; i < submissions.length; i++) {
    const timeDiff = new Date(submissions[i].timestamp) - new Date(submissions[i-1].timestamp);
    totalTime += timeDiff;
  }
  
  return Math.round(totalTime / (1000 * 60)); // Convert to minutes
}

function calculateThinkingTime(submissions) {
  // Estimate thinking time as gaps between submissions
  if (submissions.length < 2) return 0;
  
  let totalTime = 0;
  for (let i = 1; i < submissions.length; i++) {
    const timeDiff = new Date(submissions[i].timestamp) - new Date(submissions[i-1].timestamp);
    // Only count gaps longer than 2 minutes as "thinking time"
    if (timeDiff > 2 * 60 * 1000) {
      totalTime += timeDiff - (2 * 60 * 1000);
    }
  }
  
  return Math.round(totalTime / (1000 * 60)); // Convert to minutes
}

function generateInsights(interview, latestAnalysis) {
  const insights = [];
  
  if (latestAnalysis) {
    if (latestAnalysis.score > 80) {
      insights.push("Excellent code quality and problem-solving approach");
    } else if (latestAnalysis.score > 60) {
      insights.push("Good code quality with room for improvement");
    } else {
      insights.push("Code needs significant improvement in quality and approach");
    }
    
    if (latestAnalysis.syntaxErrors.length === 0) {
      insights.push("Clean syntax with no errors");
    } else {
      insights.push(`${latestAnalysis.syntaxErrors.length} syntax errors found`);
    }
  }
  
  const hintsUsed = interview.hints?.length || 0;
  if (hintsUsed === 0) {
    insights.push("Independent problem-solving without hints");
  } else if (hintsUsed <= 3) {
    insights.push("Used hints appropriately when needed");
  } else {
    insights.push("Relied heavily on hints - consider more practice");
  }
  
  return insights;
}

function generateTimeline(interview) {
  const timeline = [];
  
  // Add interview start
  if (interview.startTime) {
    timeline.push({
      timestamp: interview.startTime,
      event: 'Interview Started',
      type: 'system'
    });
  }
  
  // Add code submissions
  interview.codeSubmissions?.forEach((submission, index) => {
    timeline.push({
      timestamp: submission.timestamp,
      event: `Code Submission ${index + 1}`,
      type: 'code',
      details: {
        language: submission.language,
        score: submission.aiAnalysis?.score || 0
      }
    });
  });
  
  // Add hints
  interview.hints?.forEach((hint, index) => {
    timeline.push({
      timestamp: hint.timestamp,
      event: `Hint ${index + 1}`,
      type: 'hint',
      details: {
        content: hint.content,
        type: hint.type
      }
    });
  });
  
  // Add interview end
  if (interview.endTime) {
    timeline.push({
      timestamp: interview.endTime,
      event: 'Interview Completed',
      type: 'system'
    });
  }
  
  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function generateRecommendations(interview, latestAnalysis) {
  const recommendations = [];
  
  if (latestAnalysis) {
    if (latestAnalysis.score < 70) {
      recommendations.push("Practice more coding problems to improve problem-solving skills");
    }
    
    if (latestAnalysis.syntaxErrors.length > 0) {
      recommendations.push("Focus on syntax accuracy and code correctness");
    }
    
    if (latestAnalysis.suggestions.length > 0) {
      recommendations.push(...latestAnalysis.suggestions.slice(0, 3));
    }
  }
  
  const hintsUsed = interview.hints?.length || 0;
  if (hintsUsed > 5) {
    recommendations.push("Try to solve problems more independently before asking for hints");
  }
  
  return recommendations;
}

function getMostCommon(items, limit) {
  const counts = {};
  items.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([item]) => item);
}

// Generate comprehensive analytics including interview sessions
async function generateComprehensiveAnalytics() {
  try {
    // Get interview session data
    const totalSessions = await InterviewSession.countDocuments({ status: 'completed' });
    const averageScore = await InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avgScore: { $avg: '$overallScore' } } }
    ]);

    const averageDuration = await InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avgDuration: { $avg: '$totalDuration' } } }
    ]);

    // Score distribution
    const scoreDistribution = await InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      {
        $bucket: {
          groupBy: '$overallScore',
          boundaries: [0, 40, 60, 80, 100],
          default: 'other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    // Rating distribution
    const ratingDistribution = await InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$finalAssessment.overallRating',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent sessions
    const recentSessions = await InterviewSession.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('candidateEmail candidateName completedAt overallScore finalAssessment.overallRating');

    // Performance metrics
    const performanceMetrics = await InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          avgCodeChanges: { $avg: '$performanceMetrics.codeChanges' },
          avgSyntaxErrors: { $avg: '$performanceMetrics.syntaxErrors' },
          avgLogicIssues: { $avg: '$performanceMetrics.logicIssues' },
          avgHintsUsed: { $avg: '$performanceMetrics.hintsUsed' },
          avgCodeQuality: { $avg: '$performanceMetrics.averageCodeQuality' }
        }
      }
    ]);

    // Problem completion rates
    const problemCompletion = await InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$problems' },
      {
        $group: {
          _id: '$problems.problemTitle',
          totalAttempts: { $sum: 1 },
          completed: { $sum: { $cond: ['$problems.completed', 1, 0] } },
          avgScore: { $avg: '$problems.score' }
        }
      },
      {
        $project: {
          problemTitle: '$_id',
          completionRate: { $multiply: [{ $divide: ['$completed', '$totalAttempts'] }, 100] },
          avgScore: 1,
          totalAttempts: 1,
          completed: 1,
          _id: 0
        }
      }
    ]);

    return {
      totalSessions,
      averageScore: averageScore[0]?.avgScore || 0,
      averageDuration: averageDuration[0]?.avgDuration || 0,
      scoreDistribution,
      ratingDistribution,
      recentSessions,
      performanceMetrics: performanceMetrics[0] || {},
      problemCompletion,
      generatedAt: new Date()
    };
  } catch (error) {
    console.error('Error generating comprehensive analytics:', error);
    throw error;
  }
}

module.exports = router;
