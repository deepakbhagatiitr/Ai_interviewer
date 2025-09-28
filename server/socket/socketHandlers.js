const jwt = require('jsonwebtoken');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const ChatMessage = require('../models/ChatMessage');
const AIInteraction = require('../models/AIInteraction');
const codeAnalysisService = require('../services/codeAnalysisService');
const { aiService } = require('../services/aiService');
const codeExecutionService = require('../services/codeExecutionService');

// Helper function to save chat message
const saveChatMessage = async (sessionId, candidateEmail, messageType, content, metadata = {}) => {
  try {
    const message = new ChatMessage({
      sessionId,
      candidateEmail,
      messageType,
      content,
      metadata
    });
    await message.save();
    console.log('💬 Chat message saved:', { messageType, contentLength: content.length });
    return message;
  } catch (error) {
    console.error('❌ Error saving chat message:', error);
    return null;
  }
};

// Helper function to save AI interaction
const saveAIInteraction = async (interactionData) => {
  try {
    const interaction = new AIInteraction(interactionData);
    await interaction.save();
    console.log('🤖 AI interaction saved:', { 
      type: interactionData.interactionType, 
      candidateEmail: interactionData.candidateEmail,
      problemId: interactionData.problemId 
    });
    return interaction;
  } catch (error) {
    console.error('❌ Error saving AI interaction:', error);
    return null;
  }
};

const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected to socket`);
    
    // Map hardcoded user IDs to their emails
    const userEmailMap = {
      'user1-id': 'user1@gmail.com',
      'user2-id': 'user2@gmail.com', 
      'user3-id': 'user3@gmail.com',
      'admin-user-id': 'admin@gmail.com'
    };
    
    // Set user email for hardcoded users
    if (userEmailMap[socket.userId]) {
      socket.user = { email: userEmailMap[socket.userId] };
    }
    
    // Initialize interview session tracking
    socket.interviewSession = null;
    socket.sessionStartTime = Date.now();
    socket.codeChangeCount = 0;
    socket.hintCount = 0;

    // Helper function to start interview session
    const startInterviewSession = async (candidateEmail, candidateName) => {
      try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const interviewSession = new InterviewSession({
          sessionId,
          candidateEmail,
          candidateName,
          startedAt: new Date(),
          status: 'in-progress',
          problems: [
            {
              problemId: '3sum',
              problemTitle: '3Sum (LeetCode #15)',
              difficulty: 'medium',
              timeSpent: 0,
              completed: false,
              score: 0,
              attempts: 0,
              hintsUsed: 0
            },
            {
              problemId: 'product-except-self',
              problemTitle: 'Product of Array Except Self (LeetCode #238)',
              difficulty: 'medium',
              timeSpent: 0,
              completed: false,
              score: 0,
              attempts: 0,
              hintsUsed: 0
            }
          ],
          performanceMetrics: {
            totalTimeSpent: 0,
            idleTime: 0,
            codeChanges: 0,
            syntaxErrors: 0,
            logicIssues: 0,
            hintsUsed: 0,
            hintsByType: { nudge: 0, guide: 0, direction: 0 },
            averageCodeQuality: 0,
            averageBigO: 'O(1)',
            averageMaintainability: 0,
            problemSolvingApproach: 'methodical',
            debuggingSkills: 5,
            codeEfficiency: 5,
            problemUnderstanding: 5
          }
        });

        await interviewSession.save();
        socket.interviewSession = interviewSession;
        console.log('📊 Interview session started:', { sessionId, candidateEmail });
        
        return interviewSession;
      } catch (error) {
        console.error('Error starting interview session:', error);
        return null;
      }
    };

    // Join interview room
    socket.on('join_interview', async (data) => {
      try {
        const { sessionId } = data;
        const interview = await Interview.findOne({ sessionId });
        
        if (!interview) {
          socket.emit('error', { message: 'Interview session not found' });
          return;
        }

        // Check if user is authorized to join this interview
        if (interview.candidate.toString() !== socket.userId && 
            interview.interviewer?.toString() !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized to join this interview' });
          return;
        }

        socket.join(sessionId);
        socket.currentSession = sessionId;
        
        // Update interview status if starting
        if (interview.status === 'scheduled') {
          interview.status = 'in_progress';
          interview.startTime = new Date();
          await interview.save();
        }

        socket.emit('joined_interview', {
          sessionId,
          problem: interview.problem,
          status: interview.status
        });

        // Notify other participants
        socket.to(sessionId).emit('participant_joined', {
          userId: socket.userId,
          role: socket.userRole
        });

      } catch (error) {
        console.error('Error joining interview:', error);
        socket.emit('error', { message: 'Failed to join interview' });
      }
    });

    // Handle real-time code changes
    socket.on('code_change', async (data) => {
      try {
        const { code, language, cursorPosition, sessionId } = data;
        
        // Allow code analysis without formal interview session for practice mode
        let interview = null;
        if (socket.currentSession) {
          interview = await Interview.findOne({ sessionId: socket.currentSession });
        }

        // Create a session ID for analysis if not provided
        const analysisSessionId = sessionId || `practice-${socket.userId}-${Date.now()}`;

        // Skip analysis for very short code to prevent spam
        if (!code || code.trim().length < 3) {
          return;
        }

        // Track code changes for interview session
        if (socket.interviewSession) {
          socket.codeChangeCount++;
          socket.interviewSession.performanceMetrics.codeChanges = socket.codeChangeCount;
          
          // Update problem time spent
          const currentTime = Date.now();
          const timeSpent = Math.floor((currentTime - socket.sessionStartTime) / 1000);
          socket.interviewSession.performanceMetrics.totalTimeSpent = timeSpent;
          
          // Update current problem time
          const currentProblemIndex = 0; // For now, assume first problem
          if (socket.interviewSession.problems[currentProblemIndex]) {
            socket.interviewSession.problems[currentProblemIndex].timeSpent = timeSpent;
          }
        }

        // Get problem context (use default practice problem if no interview)
        const problemContext = interview ? {
          title: interview.problem?.title || 'Practice Problem',
          description: interview.problem?.description || 'Practice coding problem',
          difficulty: interview.problem?.difficulty || 'medium',
          constraints: interview.problem?.constraints || [],
          examples: interview.problem?.examples || []
        } : {
          title: 'Practice Problem',
          description: 'Practice coding problem - analyze your code in real-time',
          difficulty: 'medium',
          constraints: [],
          examples: []
        };

        console.log('🔍 Analyzing code:', {
          sessionId: analysisSessionId,
          language,
          codeLength: code.length,
          hasInterview: !!interview
        });

        // Perform real-time code analysis
        const analysis = await codeAnalysisService.analyzeCodeInRealTime(
          analysisSessionId,
          code,
          language,
          problemContext
        );

        console.log('📊 Analysis complete:', {
          sessionId: analysisSessionId,
          syntaxErrors: analysis.syntaxErrors?.length || 0,
          bigO: analysis.codeMetrics?.bigO?.complexity || 'O(1)',
          maintainability: analysis.codeMetrics?.maintainabilityIndex?.value || 100
        });

        // Update interview session metrics
        if (socket.interviewSession) {
          const syntaxErrorCount = analysis.syntaxErrors?.length || 0;
          const logicIssueCount = analysis.logicIssues?.length || 0;
          
          socket.interviewSession.performanceMetrics.syntaxErrors += syntaxErrorCount;
          socket.interviewSession.performanceMetrics.logicIssues += logicIssueCount;
          
          // Update code quality metrics
          if (analysis.codeMetrics) {
            socket.interviewSession.performanceMetrics.averageCodeQuality = 
              (socket.interviewSession.performanceMetrics.averageCodeQuality + (analysis.codeMetrics.maintainabilityIndex?.value || 100)) / 2;
            socket.interviewSession.performanceMetrics.averageBigO = analysis.codeMetrics.bigO?.complexity || 'O(1)';
            socket.interviewSession.performanceMetrics.averageMaintainability = 
              (socket.interviewSession.performanceMetrics.averageMaintainability + (analysis.codeMetrics.maintainabilityIndex?.value || 100)) / 2;
          }
        }

        // Save AI analysis as chat message
        if (analysis && analysis.feedback) {
          const candidateEmail = socket.user?.email || 'anonymous@example.com';
          await saveChatMessage(
            analysisSessionId,
            candidateEmail,
            'ai',
            analysis.feedback,
            {
              analysisType: 'code_analysis',
              problemId: interview?.problem?.id || null,
              codeMetrics: analysis.codeMetrics,
              syntaxErrors: analysis.syntaxErrors?.length || 0,
              logicIssues: analysis.logicIssues?.length || 0,
              score: analysis.score
            }
          );
        }

        // Save AI interaction for detailed tracking
        if (analysis) {
          const candidateEmail = socket.user?.email || 'anonymous@example.com';
          console.log('💾 Saving AI interaction for:', candidateEmail);
          await saveAIInteraction({
            sessionId: analysisSessionId,
            candidateEmail,
            interactionType: 'code_analysis',
            problemId: interview?.problem?.id || 0,
            problemTitle: problemContext.title,
            language,
            codeLength: code.length,
            analysis: {
              syntaxErrors: analysis.syntaxErrors || [],
              logicIssues: analysis.logicIssues || [],
              suggestions: analysis.suggestions || [],
              hints: analysis.hints || [],
              score: analysis.score || 0,
              feedback: analysis.feedback || '',
              bigO: analysis.codeMetrics?.bigO?.complexity || 'O(1)',
              maintainability: analysis.codeMetrics?.maintainabilityIndex?.value || 100,
              executionTime: typeof analysis.codeMetrics?.executionTime === 'object' 
                ? analysis.codeMetrics.executionTime.estimated || 0 
                : analysis.codeMetrics?.executionTime || 0,
              memoryUsage: typeof analysis.codeMetrics?.memoryUsage === 'object' 
                ? analysis.codeMetrics.memoryUsage.estimated || 0 
                : analysis.codeMetrics?.memoryUsage || 0,
              cyclomaticComplexity: typeof analysis.codeMetrics?.cyclomaticComplexity === 'object' 
                ? analysis.codeMetrics.cyclomaticComplexity.value || 1 
                : analysis.codeMetrics?.cyclomaticComplexity || 1
            },
            metadata: {
              cursorPosition,
              hasInterview: !!interview,
              timestamp: new Date()
            }
          });
        }

        // Emit analysis results to the specific socket (not broadcast)
        socket.emit('code_analysis', {
          sessionId: analysisSessionId,
          analysis,
          cursorPosition,
          timestamp: new Date()
        });

        // Store code submission only if we have an interview session
        if (interview && code && code.trim().length > 0) {
          const codeSubmission = {
            timestamp: new Date(),
            code,
            language,
            aiAnalysis: analysis
          };

          interview.codeSubmissions.push(codeSubmission);
          await interview.save();
        }

      } catch (error) {
        console.error('Error processing code change:', error);
        socket.emit('error', { message: 'Failed to analyze code' });
      }
    });

    // Handle hint requests
    socket.on('request_hint', async (data) => {
      try {
        const { code, language } = data;
        
        if (!socket.currentSession) {
          socket.emit('error', { message: 'No active interview session' });
          return;
        }

        const interview = await Interview.findOne({ sessionId: socket.currentSession });
        if (!interview) {
          socket.emit('error', { message: 'Interview session not found' });
          return;
        }

        // Generate hint
        const hint = await codeAnalysisService.generateHint(
          socket.currentSession,
          code,
          language,
          interview.problem.description
        );

        // Store hint in interview
        interview.hints.push({
          timestamp: new Date(),
          type: 'general', // Use valid enum value
          content: hint.content,
          aiGenerated: true
        });
        await interview.save();

        // Send hint to all participants
        io.to(socket.currentSession).emit('hint_provided', {
          hint,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error generating hint:', error);
        socket.emit('error', { message: 'Failed to generate hint' });
      }
    });

    // Handle audio interactions
    socket.on('audio_data', async (data) => {
      try {
        const { audioBuffer, type } = data; // type: 'speech_to_text' or 'text_to_speech'
        
        if (!socket.currentSession) {
          socket.emit('error', { message: 'No active interview session' });
          return;
        }

        let processedContent = '';
        
        if (type === 'speech_to_text') {
          // Process speech to text
          processedContent = await aiService.processSpeechToText(audioBuffer);
          
          // Store audio interaction
          const interview = await Interview.findOne({ sessionId: socket.currentSession });
          if (interview) {
            interview.audioInteractions.push({
              timestamp: new Date(),
              type: 'speech_to_text',
              content: processedContent,
              duration: data.duration || 0
            });
            await interview.save();
          }
        }

        // Broadcast processed audio to all participants
        io.to(socket.currentSession).emit('audio_processed', {
          type,
          content: processedContent,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error processing audio:', error);
        socket.emit('error', { message: 'Failed to process audio' });
      }
    });

    // Handle test connection
    socket.on('test_connection', (data) => {
      console.log('🔌 Test connection received:', data);
      socket.emit('test_connection_response', {
        message: 'Hello from server',
        timestamp: new Date(),
        socketId: socket.id
      });
    });

    // Handle interview session start
    socket.on('start_interview_session', async (data) => {
      try {
        const { candidateEmail, candidateName } = data;
        
        if (socket.interviewSession) {
          console.log('📊 Interview session already exists:', socket.interviewSession.sessionId);
          socket.emit('interview_session_started', {
            sessionId: socket.interviewSession.sessionId,
            message: 'Session already active'
          });
          return;
        }

        const session = await startInterviewSession(candidateEmail, candidateName);
        
        if (session) {
          socket.emit('interview_session_started', {
            sessionId: session.sessionId,
            message: 'Interview session started successfully'
          });
        } else {
          socket.emit('error', { message: 'Failed to start interview session' });
        }
      } catch (error) {
        console.error('Error starting interview session:', error);
        socket.emit('error', { message: 'Failed to start interview session' });
      }
    });

    // Handle interview session completion
    socket.on('complete_interview_session', async (data) => {
      try {
        if (!socket.interviewSession) {
          socket.emit('error', { message: 'No active interview session' });
          return;
        }

        // Generate final assessment
        const performanceSummary = socket.interviewSession.generatePerformanceSummary();
        
        // Calculate final ratings
        const overallScore = socket.interviewSession.overallScore;
        let overallRating = 'average';
        if (overallScore >= 90) overallRating = 'excellent';
        else if (overallScore >= 75) overallRating = 'good';
        else if (overallScore >= 60) overallRating = 'average';
        else if (overallScore >= 40) overallRating = 'below-average';
        else overallRating = 'poor';

        // Generate AI assessment
        const aiAssessment = await aiService.generateInterviewAssessment(performanceSummary, socket.interviewSession);

        // Update session with final assessment
        socket.interviewSession.status = 'completed';
        socket.interviewSession.completedAt = new Date();
        socket.interviewSession.totalDuration = Math.floor((Date.now() - socket.sessionStartTime) / 1000);
        socket.interviewSession.finalAssessment = {
          technicalSkills: Math.min(10, Math.max(1, Math.round(overallScore / 10))),
          problemSolving: Math.min(10, Math.max(1, Math.round(performanceSummary.codePerformance.testSuccessRate / 10))),
          codeQuality: Math.min(10, Math.max(1, Math.round(performanceSummary.codeQuality.averageCodeQuality / 10))),
          communication: 7, // Default for now
          overallRating,
          strengths: aiAssessment.strengths || [],
          weaknesses: aiAssessment.weaknesses || [],
          recommendations: aiAssessment.recommendations || [],
          summary: aiAssessment.summary || 'Interview completed successfully.'
        };

        await socket.interviewSession.save();

        // Store comprehensive AI interaction summary for this interview
        const candidateEmail = socket.user?.email || 'anonymous@example.com';
        const sessionId = socket.interviewSession.sessionId;
        
        console.log('📊 Completing interview for:', candidateEmail, 'Session:', sessionId);
        
        // Calculate comprehensive metrics from all AI interactions during this session
        const sessionInteractions = await AIInteraction.find({ sessionId });
        console.log('📊 Found session interactions:', sessionInteractions.length);
        
        if (sessionInteractions.length > 0) {
          // Calculate aggregated metrics
          const totalInteractions = sessionInteractions.length;
          const codeAnalysisInteractions = sessionInteractions.filter(i => i.interactionType === 'code_analysis');
          const testFeedbackInteractions = sessionInteractions.filter(i => i.interactionType === 'test_feedback');
          
          const totalHints = sessionInteractions.reduce((sum, i) => sum + (i.analysis?.hints?.length || 0), 0);
          const totalSuggestions = sessionInteractions.reduce((sum, i) => sum + (i.analysis?.suggestions?.length || 0), 0);
          const totalLogicIssues = sessionInteractions.reduce((sum, i) => sum + (i.analysis?.logicIssues?.length || 0), 0);
          const totalSyntaxErrors = sessionInteractions.reduce((sum, i) => sum + (i.analysis?.syntaxErrors?.length || 0), 0);
          
          const avgScore = sessionInteractions.reduce((sum, i) => sum + (i.analysis?.score || 0), 0) / totalInteractions;
          const avgTestScore = testFeedbackInteractions.reduce((sum, i) => sum + (i.testResults?.testScore || 0), 0) / Math.max(testFeedbackInteractions.length, 1);
          const avgMaintainability = sessionInteractions.reduce((sum, i) => sum + (i.analysis?.maintainability || 0), 0) / totalInteractions;
          const avgExecutionTime = sessionInteractions.reduce((sum, i) => sum + (i.analysis?.executionTime || 0), 0) / totalInteractions;
          const avgMemoryUsage = sessionInteractions.reduce((sum, i) => sum + (i.analysis?.memoryUsage || 0), 0) / totalInteractions;
          
          // Get all problems attempted
          const problemsAttempted = [...new Set(sessionInteractions.map(i => i.problemId))];
          const languagesUsed = [...new Set(sessionInteractions.map(i => i.language))];
          
          // Get all follow-up questions asked
          const allFollowUpQuestions = sessionInteractions
            .filter(i => i.followUpQuestions && i.followUpQuestions.length > 0)
            .flatMap(i => i.followUpQuestions);
          
          // Create comprehensive interview completion record
          const interviewCompletionData = {
            sessionId,
            candidateEmail,
            interactionType: 'interview_completion',
            problemId: 0, // Special ID for interview completion
            problemTitle: 'Complete Interview Session',
            language: languagesUsed.join(', '),
            codeLength: sessionInteractions.reduce((sum, i) => sum + i.codeLength, 0),
            analysis: {
              syntaxErrors: [],
              logicIssues: [],
              suggestions: [],
              hints: [],
              score: overallScore,
              feedback: `Interview completed with ${totalInteractions} AI interactions`,
              bigO: 'N/A',
              maintainability: avgMaintainability,
              executionTime: avgExecutionTime,
              memoryUsage: avgMemoryUsage,
              cyclomaticComplexity: 0
            },
            testResults: {
              testScore: avgTestScore,
              passedTests: 0,
              totalTests: 0,
              results: []
            },
            followUpQuestions: allFollowUpQuestions,
            metadata: {
              interviewCompletion: true,
              totalInteractions,
              codeAnalysisCount: codeAnalysisInteractions.length,
              testFeedbackCount: testFeedbackInteractions.length,
              totalHints,
              totalSuggestions,
              totalLogicIssues,
              totalSyntaxErrors,
              avgScore,
              avgTestScore,
              avgMaintainability,
              avgExecutionTime,
              avgMemoryUsage,
              problemsAttempted,
              languagesUsed,
              overallRating,
              finalAssessment: socket.interviewSession.finalAssessment,
              performanceSummary,
              aiAssessment,
              sessionDuration: socket.interviewSession.totalDuration,
              completedAt: new Date()
            }
          };
          
          // Save the comprehensive interview completion record
          await saveAIInteraction(interviewCompletionData);
          
          console.log('📊 Comprehensive interview data saved:', {
            sessionId,
            candidateEmail,
            totalInteractions,
            totalHints,
            totalSuggestions,
            avgScore: avgScore.toFixed(2),
            overallRating,
            problemsAttempted: problemsAttempted.length,
            languagesUsed: languagesUsed.length
          });
        }

        console.log('📊 Interview session completed:', {
          sessionId: socket.interviewSession.sessionId,
          overallScore: socket.interviewSession.overallScore,
          duration: socket.interviewSession.totalDuration,
          rating: overallRating
        });

        socket.emit('interview_session_completed', {
          sessionId: socket.interviewSession.sessionId,
          overallScore: socket.interviewSession.overallScore,
          performanceSummary,
          finalAssessment: socket.interviewSession.finalAssessment
        });

      } catch (error) {
        console.error('Error completing interview session:', error);
        socket.emit('error', { message: 'Failed to complete interview session' });
      }
    });

    // Handle test execution
    socket.on('run_tests', async (data) => {
      try {
        const { code, language, testCases, sessionId } = data;
        
        console.log('🧪 Running tests:', {
          hasSession: !!socket.currentSession,
          sessionId: sessionId || 'practice-mode',
          language,
          testCasesCount: testCases?.length || 0,
          codeLength: code?.length || 0,
          code: code?.substring(0, 200) + (code?.length > 200 ? '...' : ''),
          fullCode: code
        });

        // Parse string inputs to actual arrays/objects for execution
        const parsedTestCases = testCases.map(testCase => {
          try {
            // Parse the input string to actual array/object
            const parsedInput = JSON.parse(testCase.input);
            console.log('✅ Parsed test case input:', {
              original: testCase.input,
              parsed: parsedInput,
              type: typeof parsedInput
            });
            return {
              ...testCase,
              input: parsedInput
            };
          } catch (parseError) {
            console.warn('❌ Failed to parse test case input:', testCase.input, parseError.message);
            // Keep original string if parsing fails
            return testCase;
          }
        });

        console.log('📝 Parsed test cases:', parsedTestCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput
        })));

        // Execute tests using real code execution service
        const testResults = await codeExecutionService.executeTests(code, language, parsedTestCases);
        
        console.log('✅ Test execution complete:', {
          resultsCount: testResults.length,
          passed: testResults.filter(r => r.passed).length,
          failed: testResults.filter(r => !r.passed).length
        });

        // Track test results in interview session
        if (socket.interviewSession) {
          const passedTests = testResults.filter(r => r.passed).length;
          const totalTests = testResults.length;
          const overallScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
          const averageExecutionTime = testResults.reduce((sum, r) => sum + r.executionTime, 0) / totalTests || 0;
          const averageMemoryUsage = testResults.reduce((sum, r) => sum + r.memoryUsage, 0) / totalTests || 0;

          // Create code submission record
          const codeSubmission = {
            problemId: '3sum', // For now, assume first problem
            problemTitle: '3Sum (LeetCode #15)',
            language,
            code,
            testResults,
            overallScore,
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            averageExecutionTime,
            averageMemoryUsage
          };

          socket.interviewSession.codeSubmissions.push(codeSubmission);
          
          // Update problem metrics
          const currentProblemIndex = 0; // For now, assume first problem
          if (socket.interviewSession.problems[currentProblemIndex]) {
            socket.interviewSession.problems[currentProblemIndex].score = overallScore;
            socket.interviewSession.problems[currentProblemIndex].attempts++;
            socket.interviewSession.problems[currentProblemIndex].completed = overallScore >= 80; // 80% threshold
          }

          // Update overall session score
          socket.interviewSession.overallScore = socket.interviewSession.calculateOverallScore();
          
          // Save the session
          await socket.interviewSession.save();
          
          console.log('📊 Interview session updated:', {
            sessionId: socket.interviewSession.sessionId,
            overallScore: socket.interviewSession.overallScore,
            codeSubmissions: socket.interviewSession.codeSubmissions.length
          });
        }
        
        // Generate AI analysis based on test results
        const passedTests = testResults.filter(r => r.passed).length;
        const totalTests = testResults.length;
        const testScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
        
        console.log('🤖 Generating AI analysis based on test results:', {
          testScore,
          passedTests,
          totalTests,
          language
        });

        // Create test analysis context for AI
        const testAnalysisContext = {
          testResults,
          testScore,
          passedTests,
          totalTests,
          language,
          code: code.substring(0, 500), // Limit code length for AI analysis
          problemTitle: '3Sum (LeetCode #15)'
        };

        // Generate AI response based on test performance
        const aiResponse = await aiService.generateTestBasedResponse(testAnalysisContext);
        
        console.log('🤖 AI test analysis complete:', {
          hasResponse: !!aiResponse,
          responseLength: aiResponse?.length || 0
        });

        // Save AI test response as chat message
        if (aiResponse && (aiResponse.analysis || aiResponse.questions || aiResponse.feedback)) {
          const candidateEmail = socket.user?.email || 'anonymous@example.com';
          const sessionId = socket.interviewSession?.sessionId || 'test-session';
          
          // Combine all AI response content into a single message
          let combinedContent = '';
          if (aiResponse.analysis) combinedContent += `**Analysis:** ${aiResponse.analysis}\n\n`;
          if (aiResponse.questions && aiResponse.questions.length > 0) {
            combinedContent += `**Follow-up Questions:**\n${aiResponse.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n`;
          }
          if (aiResponse.feedback) combinedContent += `**Feedback:** ${aiResponse.feedback}`;
          
          await saveChatMessage(
            sessionId,
            candidateEmail,
            'ai',
            combinedContent.trim(),
            {
              analysisType: 'test_results',
              problemId: 1, // 3Sum problem
              testResults: {
                testScore,
                passedTests,
                totalTests,
                results: testResults
              }
            }
          );
        }

        // Save AI interaction for test feedback
        if (aiResponse) {
          const candidateEmail = socket.user?.email || 'anonymous@example.com';
          const sessionId = socket.interviewSession?.sessionId || 'test-session';
          console.log('💾 Saving test feedback AI interaction for:', candidateEmail);
          
          await saveAIInteraction({
            sessionId,
            candidateEmail,
            interactionType: 'test_feedback',
            problemId: 1, // 3Sum problem
            problemTitle: '3Sum (LeetCode #15)',
            language,
            codeLength: code.length,
            testResults: {
              testScore,
              passedTests,
              totalTests,
              results: testResults.map(result => ({
                testCase: `Test Case ${testResults.indexOf(result) + 1}`,
                input: result.input,
                expectedOutput: result.expectedOutput,
                actualOutput: result.actualOutput,
                passed: result.passed,
                executionTime: result.executionTime,
                memoryUsage: result.memoryUsage,
                error: result.error
              }))
            },
            followUpQuestions: aiResponse.questions || [],
            metadata: {
              aiAnalysis: aiResponse.analysis,
              aiFeedback: aiResponse.feedback,
              timestamp: new Date()
            }
          });
        }

        // Send test results back to the client
        console.log('📤 Sending test results to client:', {
          resultsCount: testResults.length,
          results: testResults,
          socketId: socket.id
        });
        
        socket.emit('test_results', {
          results: testResults,
          aiResponse: aiResponse,
          testScore,
          passedTests,
          totalTests,
          timestamp: new Date()
        });
        
        console.log('✅ Test results sent to client');

        // Update interview with test results if there's an active session
        if (socket.currentSession) {
          const interview = await Interview.findOne({ sessionId: socket.currentSession });
          if (interview && interview.codeSubmissions.length > 0) {
            const lastSubmission = interview.codeSubmissions[interview.codeSubmissions.length - 1];
            lastSubmission.testResults = testResults;
            await interview.save();
          }
        }

      } catch (error) {
        console.error('Error running tests:', error);
        socket.emit('error', { message: 'Failed to run tests' });
      }
    });

    // Handle audio analysis
    socket.on('audio_analysis', async (data) => {
      await handleAudioAnalysis(socket, data);
    });

    // Handle interview completion
    socket.on('complete_interview', async (data) => {
      try {
        if (!socket.currentSession) {
          socket.emit('error', { message: 'No active interview session' });
          return;
        }

        const interview = await Interview.findOne({ sessionId: socket.currentSession });
        if (!interview) {
          socket.emit('error', { message: 'Interview session not found' });
          return;
        }

        // End the interview
        await interview.endInterview();

        // Generate final AI feedback
        const aiFeedback = await aiService.generateInterviewFeedback(interview);
        interview.aiFeedback = aiFeedback;
        await interview.save();

        // Calculate final scores
        const finalScore = calculateFinalScore(interview);
        interview.finalScore = finalScore;
        await interview.save();

        // Broadcast interview completion
        io.to(socket.currentSession).emit('interview_completed', {
          finalScore,
          aiFeedback,
          duration: interview.duration,
          timestamp: new Date()
        });

        // Clean up session
        codeAnalysisService.clearSession(socket.currentSession);

      } catch (error) {
        console.error('Error completing interview:', error);
        socket.emit('error', { message: 'Failed to complete interview' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      if (socket.currentSession) {
        codeAnalysisService.clearSession(socket.currentSession);
      }
    });
  });
};

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

// Audio analysis handler
const handleAudioAnalysis = async (socket, data) => {
  try {
    console.log('🎤 Processing audio analysis:', {
      candidateEmail: data.candidateEmail,
      text: data.text,
      problemId: data.problemId,
      language: data.language
    });

    const { text, sessionId, candidateEmail, problemId, language, code } = data;

    // Generate AI response based on spoken text
    const aiResponse = await aiService.generateAudioAnalysis({
      spokenText: text,
      problemId: problemId,
      problemTitle: problemId === 0 ? '3Sum (LeetCode #15)' : 'Product of Array Except Self (LeetCode #238)',
      language: language,
      currentCode: code,
      sessionId: sessionId
    });

    console.log('🤖 AI audio analysis generated:', {
      hasResponse: !!aiResponse,
      responseLength: aiResponse?.length || 0
    });

    // Save AI interaction for audio analysis
    if (aiResponse) {
      await saveAIInteraction({
        sessionId: sessionId,
        candidateEmail: candidateEmail,
        interactionType: 'audio_analysis',
        problemId: problemId,
        problemTitle: problemId === 0 ? '3Sum (LeetCode #15)' : 'Product of Array Except Self (LeetCode #238)',
        language: language,
        codeLength: code?.length || 0,
        analysis: {
          syntaxErrors: [],
          logicIssues: [],
          suggestions: [],
          hints: [],
          score: 0,
          feedback: aiResponse,
          bigO: 'N/A',
          maintainability: 0,
          executionTime: 0,
          memoryUsage: 0,
          cyclomaticComplexity: 0
        },
        metadata: {
          originalText: text,
          audioAnalysis: true,
          timestamp: new Date()
        }
      });

      // Save as chat message
      await saveChatMessage(
        sessionId,
        candidateEmail,
        'ai',
        aiResponse,
        {
          type: 'audio_analysis',
          originalText: text,
          problemId: problemId
        }
      );
    }

    // Send response back to client
    socket.emit('audio_analysis_response', {
      response: aiResponse,
      originalText: text,
      analysis: {
        problemId: problemId,
        language: language
      }
    });

    console.log('✅ Audio analysis response sent to client');

  } catch (error) {
    console.error('❌ Error processing audio analysis:', error);
    socket.emit('audio_analysis_response', {
      response: 'Sorry, I had trouble processing your audio input. Please try again.',
      originalText: data.text,
      error: true
    });
  }
};

module.exports = { setupSocketHandlers };
