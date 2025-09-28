const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const InterviewSession = require('../models/InterviewSession');

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

// Get all interview sessions for admin dashboard
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(50)
      .select('sessionId candidateEmail candidateName startedAt completedAt overallScore finalAssessment.overallRating performanceMetrics.totalTimeSpent');

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        sessionId: session.sessionId,
        candidateEmail: session.candidateEmail,
        candidateName: session.candidateName,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        overallScore: session.overallScore,
        rating: session.finalAssessment?.overallRating || 'average',
        duration: session.performanceMetrics?.totalTimeSpent || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching interview sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interview sessions' });
  }
});

// Get detailed session data
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await InterviewSession.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Generate performance summary
    const performanceSummary = session.generatePerformanceSummary();

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        candidateEmail: session.candidateEmail,
        candidateName: session.candidateName,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        status: session.status,
        totalDuration: session.totalDuration,
        overallScore: session.overallScore,
        problems: session.problems,
        codeSubmissions: session.codeSubmissions,
        performanceMetrics: session.performanceMetrics,
        finalAssessment: session.finalAssessment,
        performanceSummary
      }
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session details' });
  }
});

// Get analytics for admin dashboard
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const totalSessions = await InterviewSession.countDocuments({ status: 'completed' });
    const averageScore = await InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avgScore: { $avg: '$overallScore' } } }
    ]);

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

    const ratingDistribution = await InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$finalAssessment.overallRating',
          count: { $sum: 1 }
        }
      }
    ]);

    const averageDuration = await InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avgDuration: { $avg: '$totalDuration' } } }
    ]);

    const recentSessions = await InterviewSession.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('candidateEmail candidateName completedAt overallScore finalAssessment.overallRating');

    res.json({
      success: true,
      analytics: {
        totalSessions,
        averageScore: averageScore[0]?.avgScore || 0,
        averageDuration: averageDuration[0]?.avgDuration || 0,
        scoreDistribution,
        ratingDistribution,
        recentSessions
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// Get candidate performance summary
router.get('/candidate/:email/summary', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    
    const sessions = await InterviewSession.find({ 
      candidateEmail: email, 
      status: 'completed' 
    }).sort({ completedAt: -1 });

    if (sessions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No completed sessions found for this candidate' 
      });
    }

    const latestSession = sessions[0];
    const performanceSummary = latestSession.generatePerformanceSummary();

    // Calculate trends
    const averageScore = sessions.reduce((sum, s) => sum + s.overallScore, 0) / sessions.length;
    const improvementTrend = sessions.length > 1 ? 
      sessions[0].overallScore - sessions[sessions.length - 1].overallScore : 0;

    res.json({
      success: true,
      candidate: {
        email: latestSession.candidateEmail,
        name: latestSession.candidateName,
        totalSessions: sessions.length,
        latestSession: {
          sessionId: latestSession.sessionId,
          completedAt: latestSession.completedAt,
          overallScore: latestSession.overallScore,
          rating: latestSession.finalAssessment?.overallRating || 'average'
        },
        averageScore,
        improvementTrend,
        performanceSummary,
        allSessions: sessions.map(s => ({
          sessionId: s.sessionId,
          completedAt: s.completedAt,
          overallScore: s.overallScore,
          rating: s.finalAssessment?.overallRating || 'average'
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching candidate summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch candidate summary' });
  }
});

module.exports = router;
