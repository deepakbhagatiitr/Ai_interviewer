const express = require('express');
const router = express.Router();
const AIInteraction = require('../models/AIInteraction');
const { authenticateToken } = require('../middleware/auth');

// Get AI interactions for a specific candidate
router.get('/candidate/:candidateEmail', async (req, res) => {
  try {
    const { candidateEmail } = req.params;
    const { page = 1, limit = 50, interactionType } = req.query;
    
    const query = { candidateEmail };
    if (interactionType) {
      query.interactionType = interactionType;
    }
    
    const interactions = await AIInteraction.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await AIInteraction.countDocuments(query);
    
    res.json({
      interactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching AI interactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get AI interactions for a specific session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const interactions = await AIInteraction.find({ sessionId })
      .sort({ timestamp: 1 });
    
    res.json(interactions);
  } catch (error) {
    console.error('Error fetching session AI interactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get aggregated metrics for admin dashboard
router.get('/metrics', async (req, res) => {
  try {
    const { candidateEmail, startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (candidateEmail) matchQuery.candidateEmail = candidateEmail;
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
      if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
    }
    
    const metrics = await AIInteraction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$candidateEmail',
          totalInteractions: { $sum: 1 },
          avgScore: { $avg: '$analysis.score' },
          avgTestScore: { $avg: '$testResults.testScore' },
          totalHints: { $sum: { $size: '$analysis.hints' } },
          totalSuggestions: { $sum: { $size: '$analysis.suggestions' } },
          totalLogicIssues: { $sum: { $size: '$analysis.logicIssues' } },
          avgExecutionTime: { $avg: '$analysis.executionTime' },
          avgMemoryUsage: { $avg: '$analysis.memoryUsage' },
          avgMaintainability: { $avg: '$analysis.maintainability' },
          problemsAttempted: { $addToSet: '$problemId' },
          languagesUsed: { $addToSet: '$language' },
          lastInteraction: { $max: '$timestamp' },
          firstInteraction: { $min: '$timestamp' }
        }
      },
      {
        $project: {
          candidateEmail: '$_id',
          totalInteractions: 1,
          avgScore: { $round: ['$avgScore', 2] },
          avgTestScore: { $round: ['$avgTestScore', 2] },
          totalHints: 1,
          totalSuggestions: 1,
          totalLogicIssues: 1,
          avgExecutionTime: { $round: ['$avgExecutionTime', 2] },
          avgMemoryUsage: { $round: ['$avgMemoryUsage', 2] },
          avgMaintainability: { $round: ['$avgMaintainability', 2] },
          problemsAttempted: { $size: '$problemsAttempted' },
          languagesUsed: 1,
          lastInteraction: 1,
          firstInteraction: 1,
          _id: 0
        }
      },
      { $sort: { lastInteraction: -1 } }
    ]);
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching AI interaction metrics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get detailed performance summary for a candidate
router.get('/summary/:candidateEmail', async (req, res) => {
  try {
    const { candidateEmail } = req.params;
    
    const summary = await AIInteraction.aggregate([
      { $match: { candidateEmail } },
      {
        $group: {
          _id: null,
          totalInteractions: { $sum: 1 },
          avgScore: { $avg: '$analysis.score' },
          avgTestScore: { $avg: '$testResults.testScore' },
          totalHints: { $sum: { $size: '$analysis.hints' } },
          totalSuggestions: { $sum: { $size: '$analysis.suggestions' } },
          totalLogicIssues: { $sum: { $size: '$analysis.logicIssues' } },
          avgExecutionTime: { $avg: '$analysis.executionTime' },
          avgMemoryUsage: { $avg: '$analysis.memoryUsage' },
          avgMaintainability: { $avg: '$analysis.maintainability' },
          problemsAttempted: { $addToSet: '$problemId' },
          languagesUsed: { $addToSet: '$language' },
          lastInteraction: { $max: '$timestamp' },
          firstInteraction: { $min: '$timestamp' },
          // Get most common issues
          allLogicIssues: { $push: '$analysis.logicIssues' },
          allSuggestions: { $push: '$analysis.suggestions' },
          allHints: { $push: '$analysis.hints' }
        }
      },
      {
        $project: {
          totalInteractions: 1,
          avgScore: { $round: ['$avgScore', 2] },
          avgTestScore: { $round: ['$avgTestScore', 2] },
          totalHints: 1,
          totalSuggestions: 1,
          totalLogicIssues: 1,
          avgExecutionTime: { $round: ['$avgExecutionTime', 2] },
          avgMemoryUsage: { $round: ['$avgMemoryUsage', 2] },
          avgMaintainability: { $round: ['$avgMaintainability', 2] },
          problemsAttempted: { $size: '$problemsAttempted' },
          languagesUsed: 1,
          lastInteraction: 1,
          firstInteraction: 1,
          _id: 0
        }
      }
    ]);
    
    res.json(summary[0] || {});
  } catch (error) {
    console.error('Error fetching candidate summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comprehensive interview completion data for admin reports
router.get('/interview-completions', async (req, res) => {
  try {
    const { page = 1, limit = 50, candidateEmail } = req.query;
    
    const matchQuery = { 
      interactionType: 'interview_completion',
      'metadata.interviewCompletion': true 
    };
    
    if (candidateEmail) {
      matchQuery.candidateEmail = candidateEmail;
    }
    
    const completions = await AIInteraction.find(matchQuery)
      .sort({ 'metadata.completedAt': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await AIInteraction.countDocuments(matchQuery);
    
    // Format the data for admin display
    const formattedCompletions = completions.map(completion => ({
      id: completion._id,
      sessionId: completion.sessionId,
      candidateEmail: completion.candidateEmail,
      completedAt: completion.metadata.completedAt,
      sessionDuration: completion.metadata.sessionDuration,
      overallScore: completion.analysis.score,
      overallRating: completion.metadata.overallRating,
      totalInteractions: completion.metadata.totalInteractions,
      totalHints: completion.metadata.totalHints,
      totalSuggestions: completion.metadata.totalSuggestions,
      totalLogicIssues: completion.metadata.totalLogicIssues,
      totalSyntaxErrors: completion.metadata.totalSyntaxErrors,
      avgScore: completion.metadata.avgScore,
      avgTestScore: completion.metadata.avgTestScore,
      avgMaintainability: completion.metadata.avgMaintainability,
      problemsAttempted: completion.metadata.problemsAttempted,
      languagesUsed: completion.metadata.languagesUsed,
      finalAssessment: completion.metadata.finalAssessment,
      performanceSummary: completion.metadata.performanceSummary,
      aiAssessment: completion.metadata.aiAssessment
    }));
    
    res.json({
      completions: formattedCompletions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching interview completions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get interview completion analytics
router.get('/interview-analytics', async (req, res) => {
  try {
    const analytics = await AIInteraction.aggregate([
      { $match: { interactionType: 'interview_completion', 'metadata.interviewCompletion': true } },
      {
        $group: {
          _id: null,
          totalCompletedInterviews: { $sum: 1 },
          avgOverallScore: { $avg: '$analysis.score' },
          avgSessionDuration: { $avg: '$metadata.sessionDuration' },
          avgInteractionsPerInterview: { $avg: '$metadata.totalInteractions' },
          avgHintsPerInterview: { $avg: '$metadata.totalHints' },
          avgSuggestionsPerInterview: { $avg: '$metadata.totalSuggestions' },
          avgLogicIssuesPerInterview: { $avg: '$metadata.totalLogicIssues' },
          avgSyntaxErrorsPerInterview: { $avg: '$metadata.totalSyntaxErrors' },
          avgMaintainability: { $avg: '$metadata.avgMaintainability' },
          ratingDistribution: {
            $push: '$metadata.overallRating'
          },
          languagesDistribution: {
            $push: '$metadata.languagesUsed'
          },
          problemsDistribution: {
            $push: '$metadata.problemsAttempted'
          },
          lastCompletion: { $max: '$metadata.completedAt' },
          firstCompletion: { $min: '$metadata.completedAt' }
        }
      },
      {
        $project: {
          totalCompletedInterviews: 1,
          avgOverallScore: { $round: ['$avgOverallScore', 2] },
          avgSessionDuration: { $round: ['$avgSessionDuration', 2] },
          avgInteractionsPerInterview: { $round: ['$avgInteractionsPerInterview', 2] },
          avgHintsPerInterview: { $round: ['$avgHintsPerInterview', 2] },
          avgSuggestionsPerInterview: { $round: ['$avgSuggestionsPerInterview', 2] },
          avgLogicIssuesPerInterview: { $round: ['$avgLogicIssuesPerInterview', 2] },
          avgSyntaxErrorsPerInterview: { $round: ['$avgSyntaxErrorsPerInterview', 2] },
          avgMaintainability: { $round: ['$avgMaintainability', 2] },
          ratingDistribution: 1,
          languagesDistribution: 1,
          problemsDistribution: 1,
          lastCompletion: 1,
          firstCompletion: 1,
          _id: 0
        }
      }
    ]);
    
    res.json(analytics[0] || {});
  } catch (error) {
    console.error('Error fetching interview analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new AI interaction
router.post('/', async (req, res) => {
  try {
    const interaction = new AIInteraction(req.body);
    await interaction.save();
    res.status(201).json(interaction);
  } catch (error) {
    console.error('Error creating AI interaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update AI interaction email (for fixing data)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { candidateEmail } = req.body;
    
    const interaction = await AIInteraction.findByIdAndUpdate(
      id, 
      { candidateEmail }, 
      { new: true }
    );
    
    if (!interaction) {
      return res.status(404).json({ message: 'AI interaction not found' });
    }
    
    res.json(interaction);
  } catch (error) {
    console.error('Error updating AI interaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
