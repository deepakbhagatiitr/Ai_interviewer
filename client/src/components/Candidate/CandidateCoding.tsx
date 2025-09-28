import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock, 
  Zap, 
  Bot,
  LogOut,
  Mic,
  MicOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import CodeEditor from '../Interview/CodeEditor';
import ProblemDescription from '../Interview/ProblemDescription';
import TestResults from '../Interview/TestResults';
import { getStarterTemplate } from '../../utils/codeTemplates';
import ChatInterface from './ChatInterface';

interface TestResult {
  testCase: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime: number;
  memoryUsage: number;
}

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  timeLimit: number;
  allowedLanguages: string[];
  testCases: Array<{
    input: string;
    expectedOutput: string;
    explanation: string;
  }>;
}

const CandidateCoding: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('C++');
  const [analysis, setAnalysis] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes in seconds
  const [currentProblem, setCurrentProblem] = useState(0);
  const [stuckTime, setStuckTime] = useState<Date | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  
  // Hints system
  const [hintTier, setHintTier] = useState(0); // 0 = no hints, 1-3 = tier levels
  const [idleStartTime, setIdleStartTime] = useState<Date | null>(null);
  const [syntaxErrors, setSyntaxErrors] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResponseEnabled, setAiResponseEnabled] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [interviewSessionId, setInterviewSessionId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<Array<{
    id: string;
    type: 'ai' | 'system';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>>([]);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioSupported, setAudioSupported] = useState(false);
  
  // AI response cooldown state
  const [lastAIResponseTime, setLastAIResponseTime] = useState<Date | null>(null);
  const [aiResponseCooldown, setAiResponseCooldown] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
  const [isAILoading, setIsAILoading] = useState(false);

  // Add message to session
  const addSessionMessage = (type: 'ai' | 'system', content: string, metadata?: any) => {
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
      metadata
    };
    setSessionMessages(prev => [...prev, message]);
  };

  // Check if enough time has passed since last AI response (2 minutes)
  const canSendAIResponse = () => {
    if (!lastAIResponseTime) return true;
    const now = new Date();
    const timeDiff = now.getTime() - lastAIResponseTime.getTime();
    const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
    const canSend = timeDiff >= twoMinutes;
    console.log('🤖 Cooldown check:', { 
      timeDiff, 
      twoMinutes, 
      canSend, 
      cooldownActive: aiResponseCooldown 
    });
    return canSend && !aiResponseCooldown;
  };

  // Update AI response time and cooldown
  const updateAIResponseTime = () => {
    setLastAIResponseTime(new Date());
    setAiResponseCooldown(true);
    
    // Auto-disable cooldown after 2 minutes
    setTimeout(() => {
      setAiResponseCooldown(false);
    }, 2 * 60 * 1000);
  };

  // Audio recording functions
  const startAudioRecording = async () => {
    try {
      setIsRecording(true);
      addSessionMessage('system', 'Listening... Please speak now.');
      console.log('🎤 Starting speech recognition...');
      
      // Use SpeechRecognition directly instead of MediaRecorder
      const text = await speechToText();
      
      if (text && text.trim()) {
        // Add user's spoken text to chat
        addSessionMessage('system', `You said: "${text}"`);
        
        // Check if we can send AI response (2-minute cooldown)
        if (canSendAIResponse()) {
          // Show loading state immediately
          setIsAILoading(true);
          addSessionMessage('system', 'AI is thinking... Please wait 2 minutes for response.');
          updateAIResponseTime(); // Start cooldown timer immediately
          
          // Delay the actual API call for 2 minutes
          setTimeout(() => {
            if (socket) {
              socket.emit('audio_analysis', {
                text: text,
                sessionId: interviewSessionId || 'candidate-session',
                candidateEmail: user?.email || 'anonymous@example.com',
                problemId: currentProblem,
                language: language,
                code: code
              });
              console.log('🤖 Audio analysis sent after 2-minute delay');
            }
          }, 2 * 60 * 1000); // Wait exactly 2 minutes before sending
        } else {
          const minutesLeft = Math.ceil(cooldownTimeLeft / 60);
          addSessionMessage('system', `AI is thinking... Please wait ${minutesLeft} more minute(s) before asking another question. Focus on your code!`);
        }
      } else {
        addSessionMessage('system', 'Could not process audio. Please try speaking more clearly.');
      }
    } catch (error) {
      console.error('Error starting audio recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('not supported')) {
        addSessionMessage('system', 'Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      } else if (errorMessage.includes('permission')) {
        addSessionMessage('system', 'Microphone permission denied. Please allow microphone access and try again.');
      } else if (errorMessage.includes('timeout')) {
        addSessionMessage('system', 'No speech detected. Please try speaking louder or closer to the microphone.');
      } else {
        addSessionMessage('system', `Audio error: ${errorMessage}. Please try again.`);
      }
    } finally {
      setIsRecording(false);
    }
  };

  const stopAudioRecording = () => {
    // SpeechRecognition will stop automatically when it detects speech
    setIsRecording(false);
    console.log('🎤 Audio recording stopped');
  };

  const speechToText = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check if Speech Recognition is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let hasResult = false;
      let timeoutId: NodeJS.Timeout;

      // Set a timeout to prevent hanging
      timeoutId = setTimeout(() => {
        if (!hasResult) {
          recognition.stop();
          reject(new Error('Speech recognition timeout - please try again'));
        }
      }, 10000); // 10 second timeout

      recognition.onresult = (event: any) => {
        hasResult = true;
        clearTimeout(timeoutId);
        const transcript = event.results[0][0].transcript;
        console.log('🎤 Speech recognition result:', transcript);
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        hasResult = true;
        clearTimeout(timeoutId);
        console.error('🎤 Speech recognition error:', event.error);
        reject(new Error(event.error));
      };

      recognition.onend = () => {
        clearTimeout(timeoutId);
        if (!hasResult) {
          reject(new Error('No speech detected - please try speaking louder'));
        }
      };

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
      };

      // Start recognition
      try {
        recognition.start();
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('🎤 Error starting speech recognition:', error);
        reject(error);
      }
    });
  };
  
  const problems: Problem[] = [
    {
      id: 1,
      title: '3Sum (LeetCode #15)',
      description: `Given an integer array nums, return all the unique triplets [nums[i], nums[j], nums[k]] such that:

• i != j, i != k, and j != k
• nums[i] + nums[j] + nums[k] == 0

The solution set must not contain duplicate triplets.

`,
      difficulty: 'Medium',
      category: 'Array',
      timeLimit: 45,
      allowedLanguages: ['C++'],
      testCases: [
        {
          input: '[-1,0,1,2,-1,-4]',
          expectedOutput: '[[-1,-1,2],[-1,0,1]]',
          explanation: 'The unique triplets that sum to zero are [-1,-1,2] and [-1,0,1]'
        },
        {
          input: '[0,1,1]',
          expectedOutput: '[]',
          explanation: 'No triplets sum to zero'
        },
        {
          input: '[0,0,0]',
          expectedOutput: '[[0,0,0]]',
          explanation: 'The only triplet that sums to zero is [0,0,0]'
        }
      ]
    },
    {
      id: 2,
      title: 'Product of Array Except Self (LeetCode #238)',
      description: `Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

You must solve it without using division and in O(n) time.

 `,
      difficulty: 'Medium',
      category: 'Array',
      timeLimit: 45,
      allowedLanguages: ['C++'],
      testCases: [
        {
          input: '[1,2,3,4]',
          expectedOutput: '[24,12,8,6]',
          explanation: 'answer[0] = 2*3*4 = 24, answer[1] = 1*3*4 = 12, etc.'
        },
        {
          input: '[-1,1,0,-3,3]',
          expectedOutput: '[0,0,9,0,0]',
          explanation: 'Any element multiplied by 0 results in 0'
        }
      ]
    }
  ];

  const allowedLanguages = ['C++'];

  // Hint generation based on problem and tier
  const generateHint = (tier: number): string => {
    const problem = problems[currentProblem];
    
    if (problem.title.includes('3Sum')) {
      switch (tier) {
        case 1:
          return "Can you think of a data structure that helps with fast lookups and avoiding duplicates?";
        case 2:
          return "A hash set can help you track which numbers you've seen already. Also consider sorting the array first.";
        case 3:
          return "Try sorting the array first, then for each element, use two pointers to find pairs that sum to the negative of that element.";
        default:
          return "";
      }
    } else if (problem.title.includes('Product of Array Except Self')) {
      switch (tier) {
        case 1:
          return "Think about how you can calculate the product of all elements except the current one without using division.";
        case 2:
          return "Consider using prefix and suffix products. Calculate the product of all elements to the left and right of each position.";
        case 3:
          return "Use two passes: first pass calculates left products, second pass calculates right products and combines them.";
        default:
          return "";
      }
    }
    return "";
  };

  // Check if user needs a hint
  const checkForHint = () => {
    const now = new Date();
    console.log('🔍 Checking for hints...', {
      idleStartTime: idleStartTime ? new Date(idleStartTime).toLocaleTimeString() : null,
      syntaxErrors,
      hintTier,
      codeLength: code.length,
      hasNestedLoops: code.includes('for') && code.includes('for') && code.includes('for')
    });
    
    // Rule 1: Idle for more than 2-3 minutes
    if (idleStartTime) {
      const idleDuration = now.getTime() - idleStartTime.getTime();
      console.log('⏰ Idle duration:', Math.round(idleDuration / 1000), 'seconds');
      if (idleDuration > 2 * 60 * 1000 && hintTier < 3) { // 2 minutes
        console.log('🚨 Triggering hint due to idle time');
        triggerHint();
        return;
      }
    }
    
    // Rule 2: Repeated syntax/logic mistakes
    if (syntaxErrors >= 3 && hintTier < 3) {
      console.log('🚨 Triggering hint due to syntax errors:', syntaxErrors);
      triggerHint();
      return;
    }
    
    // Rule 3: Inefficient approach (basic check)
    if (code.includes('for') && code.includes('for') && code.includes('for') && hintTier < 3) {
      console.log('🚨 Triggering hint due to nested loops');
      triggerHint();
      return;
    }
    
    console.log('✅ No hint needed at this time');
  };

  // Trigger hint
  const triggerHint = () => {
    if (hintTier < 3) {
      const newTier = hintTier + 1;
      const newHint = generateHint(newTier);
      console.log('💡 Generating hint:', {
        currentTier: hintTier,
        newTier,
        hint: newHint,
        problem: problems[currentProblem].title
      });
      if (newHint) {
        // Hints are now handled by AI response
        console.log('📝 New hint available:', newHint);
        setHintTier(newTier);
        setIdleStartTime(null); // Reset idle timer
        setSyntaxErrors(0); // Reset error count
        console.log('🎯 Hint triggered successfully! Tier:', newTier);
      }
    } else {
      console.log('🚫 Maximum hints reached (3/3)');
    }
  };

  // Check audio support on component mount
  useEffect(() => {
    const checkAudioSupport = () => {
      const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      const hasGetUserMedia = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      
      // Only need SpeechRecognition and getUserMedia for this implementation
      const supported = hasSpeechRecognition && hasGetUserMedia;
      setAudioSupported(supported);
      
      console.log('🎤 Audio support check:', {
        hasSpeechRecognition,
        hasGetUserMedia,
        supported,
        userAgent: navigator.userAgent
      });
    };

    checkAudioSupport();
  }, []);

  // Real-time countdown timer for AI cooldown
  useEffect(() => {
    if (!aiResponseCooldown || !lastAIResponseTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeDiff = now.getTime() - lastAIResponseTime.getTime();
      const twoMinutes = 2 * 60 * 1000;
      const timeLeft = Math.max(0, twoMinutes - timeDiff);
      
      setCooldownTimeLeft(Math.ceil(timeLeft / 1000));
      
      if (timeDiff >= twoMinutes) {
        setAiResponseCooldown(false);
        setCooldownTimeLeft(0);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [aiResponseCooldown, lastAIResponseTime]);

  // Monitor for hints and analysis every 2 minutes
  useEffect(() => {
    console.log('⏰ Starting comprehensive monitoring interval (2 minutes)');
    const monitoringInterval = setInterval(() => {
      const now = new Date();
      console.log('🕐 2-minute monitoring check:', {
        timestamp: now.toLocaleTimeString(),
        codeLength: code.length,
        language,
        currentProblem: problems[currentProblem].title,
        idleTime: idleStartTime ? Math.round((now.getTime() - idleStartTime.getTime()) / 1000) : 0,
        syntaxErrors,
        hintTier,
        hasAnalysis: !!analysis
      });
      
      // Check for hints
      checkForHint();
      
      // Trigger analysis if code has changed significantly and cooldown allows
      if (code.trim().length >= 3 && socket && aiResponseEnabled && canSendAIResponse()) {
        console.log('📊 Triggering periodic analysis (will send after 2 minutes)');
        setIsAnalyzing(true);
        setIsAILoading(true);
        updateAIResponseTime(); // Start cooldown immediately
        
        // Delay the actual API call for 2 minutes
        setTimeout(() => {
          socket.emit('code_change', {
            sessionId: 'candidate-session',
            code,
            language,
            cursorPosition: { line: 1, column: 1 }
          });
          console.log('📊 Periodic analysis sent after 2-minute delay');
        }, 2 * 60 * 1000); // Wait exactly 2 minutes before sending
      } else if (code.trim().length >= 3 && socket && aiResponseEnabled && !canSendAIResponse()) {
        console.log('📊 Periodic analysis skipped due to cooldown');
      }
    }, 120000); // Check every 2 minutes
    
    return () => {
      console.log('⏹️ Stopping comprehensive monitoring interval');
      clearInterval(monitoringInterval);
    };
  }, [idleStartTime, syntaxErrors, hintTier, code, language, currentProblem, analysis, socket, aiResponseEnabled]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        
        // Log timer every 1 minute
        if (newTime % 60 === 0) {
          const minutes = Math.floor(newTime / 60);
          const seconds = newTime % 60;
          console.log(`⏰ Interview Timer: ${minutes}:${seconds.toString().padStart(2, '0')} remaining`);
        }
        
        if (newTime <= 0) {
          console.log('⏰ Interview time completed!');
          handleCompleteInterview();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize code with starter template when language or problem changes
  useEffect(() => {
    const template = getStarterTemplate(language, problems[currentProblem].title);
    console.log('📝 Template check:', {
      language,
      problem: problems[currentProblem].title,
      hasTemplate: !!template,
      codeLength: code.length,
      isEmpty: code.trim().length === 0
    });
    
    // Always load template when language or problem changes
    if (template) {
      console.log('🚀 Loading starter template for', language, problems[currentProblem].title);
      setCode(template);
    }
  }, [language, currentProblem]);

  // Code change detection for hints and real-time analysis
  useEffect(() => {
    // Code change tracking removed - handled by AI response
    setIdleStartTime(null);
    
    console.log('⌨️ Code changed:', {
      length: code.length,
      isEmpty: code.trim().length === 0,
      timestamp: new Date().toLocaleTimeString()
    });
    
    // Reset idle timer when user types
    if (code.trim().length > 0) {
      setIdleStartTime(null);
      console.log('🔄 Idle timer reset - user is typing');
      
      // Debounce real-time analysis to prevent spam
      const analysisTimeout = setTimeout(() => {
        if (socket && code.trim().length >= 3 && aiResponseEnabled && canSendAIResponse()) {
          setIsAnalyzing(true);
          setIsAILoading(true);
          updateAIResponseTime(); // Start cooldown immediately
          
          // Delay the actual API call for 2 minutes
          setTimeout(() => {
            socket.emit('code_change', {
              sessionId: 'candidate-session',
              code,
              language,
              cursorPosition: { line: 1, column: 1 }
            });
            console.log('📊 Real-time analysis sent after 2-minute delay');
          }, 2 * 60 * 1000); // Wait exactly 2 minutes before sending
          
          console.log('📊 Real-time analysis triggered (will send after 2 minutes)');
          
          // Clear analyzing state after 10 seconds if no response
          setTimeout(() => {
            setIsAnalyzing(false);
          }, 10000);
        } else if (socket && code.trim().length >= 3 && aiResponseEnabled && !canSendAIResponse()) {
          console.log('📊 Real-time analysis skipped due to cooldown');
        }
      }, 5000); // 5 second debounce to reduce spam
      
      return () => clearTimeout(analysisTimeout);
    } else {
      setIdleStartTime(new Date());
      console.log('⏸️ Idle timer started - code is empty');
    }
  }, [code, socket, language, aiResponseEnabled]);

  // Stuck detection
  useEffect(() => {
    if (code.trim().length === 0) {
      setStuckTime(new Date());
    } else {
      setStuckTime(null);
    }
  }, [code]);

  // Check if stuck for more than 2 minutes
  useEffect(() => {
    if (stuckTime) {
      const checkStuck = setInterval(() => {
        const now = new Date();
        const stuckDuration = now.getTime() - stuckTime.getTime();
        if (stuckDuration > 2 * 60 * 1000) { // 2 minutes
          moveToNextProblem();
        }
      }, 1000);

      return () => clearInterval(checkStuck);
    }
  }, [stuckTime]);

  // Start interview session tracking
  useEffect(() => {
    if (socket && !sessionStarted && user?.email) {
      console.log('🚀 Starting interview session tracking...');
      socket.emit('start_interview_session', {
        candidateEmail: user.email,
        candidateName: user.name || 'Candidate'
      });
      setSessionStarted(true);
      
      // Add welcome message
      addSessionMessage('system', 'Welcome to the CodeSage Interview! The AI will provide feedback and guidance as you code. Click the bot icon to view all AI responses.');
    }
  }, [socket, sessionStarted, user]);

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      socket.on('code_analysis', (data) => {
        console.log('📊 Code analysis received:', {
          sessionId: data.sessionId,
          hasAnalysis: !!data.analysis,
          syntaxErrors: data.analysis?.syntaxErrors?.length || 0,
          bigO: data.analysis?.codeMetrics?.bigO?.complexity || 'O(1)',
          timestamp: data.timestamp
        });
        setAnalysis(data.analysis);
        setIsAnalyzing(false);
        
        // Add AI analysis to session messages if AI response is enabled
        if (data.analysis && aiResponseEnabled) {
          const analysisContent = data.analysis.feedback || 'Code analysis completed';
          addSessionMessage('ai', analysisContent, {
            type: 'code_analysis',
            analysis: data.analysis
          });
          
          // Clear loading state
          setIsAILoading(false);
          
          // Auto-popup chat after AI finishes thinking (with small delay for better UX)
          setTimeout(() => {
            setShowChat(true);
          }, 500);
        } else if (data.analysis && !aiResponseEnabled) {
          console.log('🤖 Code analysis response skipped - AI disabled');
        }
      });

      socket.on('test_results', (data) => {
        console.log('🧪 Test results received:', {
          resultsCount: data.results?.length || 0,
          results: data.results,
          aiResponse: data.aiResponse,
          testScore: data.testScore,
          passedTests: data.passedTests,
          totalTests: data.totalTests,
          timestamp: data.timestamp
        });
        console.log('📊 Setting test results state:', data.results);
        setTestResults(data.results || []);
        setRunning(false);
        console.log('✅ Test results state updated');

        // Add AI test response to session messages if available
        if (data.aiResponse && aiResponseEnabled) {
          let testContent = '';
          if (data.aiResponse.analysis) testContent += `**Analysis:** ${data.aiResponse.analysis}\n\n`;
          if (data.aiResponse.questions && data.aiResponse.questions.length > 0) {
            testContent += `**Follow-up Question:**\n${data.aiResponse.questions[0]}`;
          }
          
          if (testContent.trim()) {
            addSessionMessage('ai', testContent.trim(), {
              type: 'test_results',
              testScore: data.testScore,
              passedTests: data.passedTests,
              totalTests: data.totalTests,
              results: data.results
            });
            
            // Clear loading state
            setIsAILoading(false);
            
            // Auto-popup chat after AI provides test feedback (with small delay for better UX)
            setTimeout(() => {
              setShowChat(true);
            }, 500);
          }
        } else if (data.aiResponse && !aiResponseEnabled) {
          console.log('🤖 Test results AI response skipped - AI disabled');
        }
      });

      socket.on('test_connection_response', (data) => {
        console.log('✅ Test connection response:', data);
      });

      socket.on('interview_session_started', (data) => {
        console.log('📊 Interview session started:', data);
        setInterviewSessionId(data.sessionId);
      });

      socket.on('interview_session_completed', (data) => {
        console.log('📊 Interview session completed:', data);
        // Handle session completion
      });

      socket.on('error', (data) => {
        console.error('Socket error:', data.message);
        // Don't show socket errors to user in practice mode
        if (data.message !== 'No active interview session') {
          console.warn('Non-critical socket error:', data.message);
        }
        setRunning(false);
      });

      socket.on('audio_analysis_response', (data) => {
        console.log('🎤 Audio analysis response received:', {
          hasResponse: !!data.response,
          responseLength: data.response?.length || 0,
          originalText: data.originalText,
          aiResponseEnabled
        });
        
        if (data.response && aiResponseEnabled) {
          console.log('🎤 Adding AI response to chat:', data.response.substring(0, 100) + '...');
          addSessionMessage('ai', data.response, {
            type: 'audio_analysis',
            originalText: data.originalText,
            analysis: data.analysis
          });
          
          // Clear loading state
          setIsAILoading(false);
          
          // Auto-popup chat after AI responds
          setTimeout(() => {
            setShowChat(true);
          }, 500);
        } else {
          console.log('🎤 AI response not added:', {
            hasResponse: !!data.response,
            aiResponseEnabled
          });
        }
      });

      return () => {
        socket.off('code_analysis');
        socket.off('test_results');
        socket.off('test_connection_response');
        socket.off('error');
        socket.off('audio_analysis_response');
      };
    }
  }, [socket, aiResponseEnabled]);

  const moveToNextProblem = () => {
    if (currentProblem < problems.length - 1) {
      console.log('🔄 Moving to next problem:', {
        from: currentProblem,
        to: currentProblem + 1,
        problem: problems[currentProblem + 1].title
      });
      setCurrentProblem(prev => prev + 1);
      setCode('');
      setAnalysis(null);
      setTestResults([]);
      setStuckTime(null);
      // Reset state for new problem
      setHintTier(0);
      setSyntaxErrors(0);
      setIdleStartTime(null);
      console.log('🔄 Hints reset for new problem');
    } else {
      handleCompleteInterview();
    }
  };

  const handleCodeChange = (newCode: string) => {
    console.log('📝 Code changed:', {
      newCodeLength: newCode.length,
      newCode: newCode.substring(0, 50) + '...',
      previousCodeLength: code.length
    });
    
    setCode(newCode);
    
    // Track syntax errors for hint system
    if (analysis && analysis.syntaxErrors && analysis.syntaxErrors.length > 0) {
      setSyntaxErrors(prev => {
        const newCount = prev + 1;
        console.log('❌ Syntax error detected! Count:', newCount);
        console.log('🔍 Syntax errors:', analysis.syntaxErrors);
        return newCount;
      });
    }

    // Log real-time metrics
    if (analysis && analysis.codeMetrics) {
      console.log('📊 Real-time metrics updated:', {
        bigO: analysis.codeMetrics.bigO,
        executionTime: analysis.codeMetrics.executionTime,
        memoryUsage: analysis.codeMetrics.memoryUsage,
        cyclomaticComplexity: analysis.codeMetrics.cyclomaticComplexity,
        maintainabilityIndex: analysis.codeMetrics.maintainabilityIndex
      });
    }

    // Provide basic fallback analysis if no analysis is available and user has typed enough
    if (!analysis && newCode.trim().length >= 10) {
      const basicAnalysis = {
        timestamp: new Date(),
        syntaxErrors: [],
        logicIssues: ['Code analysis in progress...'],
        suggestions: ['Please wait for AI analysis to complete'],
        hints: ['Keep coding while we analyze your code'],
        score: 0,
        feedback: 'AI is analyzing your code. Please wait for detailed feedback.',
        codeMetrics: {
          totalLines: newCode.split('\n').length,
          nonEmptyLines: newCode.split('\n').filter(line => line.trim()).length,
          characters: newCode.length,
          complexity: 1,
          readability: 50,
          bigO: { complexity: 'O(1)', score: 0 },
          executionTime: { estimated: 1, complexity: 'O(1)', confidence: 0 },
          memoryUsage: { estimated: newCode.length * 2, unit: 'bytes', breakdown: {} },
          cyclomaticComplexity: { value: 1, level: 'Low', maintainable: true },
          maintainabilityIndex: { value: 50, level: 'Fair', factors: {} }
        }
      };
      setAnalysis(basicAnalysis);
      console.log('📊 Basic fallback analysis provided');
    }
    
    // Note: Real-time analysis is now handled in the useEffect with debouncing
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  const handleRunTests = () => {
    console.log('🚀 handleRunTests called');
    console.log('📝 Current code state:', {
      codeLength: code.length,
      code: code,
      language: language,
      currentProblem: currentProblem
    });
    
    if (!socket) {
      console.error('❌ No socket connection available');
      return;
    }
    
    if (!code.trim()) {
      console.error('❌ No code to test');
      return;
    }
    
    setRunning(true);
    console.log('🚀 Running tests with:', {
      sessionId: 'candidate-session',
      language,
      testCasesCount: problems[currentProblem].testCases.length,
      testCases: problems[currentProblem].testCases,
      codeLength: code.length,
      code: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
      fullCode: code
    });
    
    // Clear previous test results
    setTestResults([]);
    
    socket.emit('run_tests', {
      sessionId: 'candidate-session',
      code,
      language,
      testCases: problems[currentProblem].testCases
    });
  };

  const handleRunSingleTest = (testCase: string) => {
    if (!socket) return;
    
    socket.emit('run_single_test', {
      sessionId: 'candidate-session',
      code,
      language,
      testCase
    });
  };

  const handleCompleteInterview = () => {
    if (socket && interviewSessionId) {
      console.log('📊 Completing interview session:', interviewSessionId);
      socket.emit('complete_interview_session', {
        sessionId: interviewSessionId
      });
    }
    setShowCompleteDialog(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const overallScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  // Debug test results
  console.log('📊 Test results state:', {
    testResults: testResults,
    totalTests: totalTests,
    passedTests: passedTests,
    failedTests: totalTests - passedTests,
    overallScore: overallScore
  });

  // Track test results changes
  useEffect(() => {
    console.log('🔄 Test results changed:', {
      testResults: testResults,
      length: testResults.length,
      running: running
    });
  }, [testResults, running]);

  if (user?.role !== 'candidate') {
    navigate('/admin');
    return null;
  }

  return (
    <>
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes popupAppear {
          0% {
            transform: scale(0) translateY(20px);
            opacity: 0;
          }
          50% {
            transform: scale(1.05) translateY(-5px);
            opacity: 0.8;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        
      `}</style>
      
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">CodeSage Interview</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                <span className={timeLeft < 300 ? 'text-red-600 font-semibold' : ''}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Problem {currentProblem + 1} of {problems.length}
              </div>
              {/* AI Response Toggle */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={aiResponseEnabled}
                    onChange={(e) => setAiResponseEnabled(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  AI Response
                </label>
              </div>
              <button
                onClick={() => logout()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - AI Response and Problem Description */}
          <div className="space-y-6">
            {/* Circular Bot in Top-Left */}
            <div className="relative">
              {/* Bot Circle */}
              <div 
                onClick={() => setShowChat(true)}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 ${
                  aiResponseEnabled 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                    : 'bg-gradient-to-br from-gray-400 to-gray-600'
                }`}
              >
                {/* Bot Eyes */}
                <div className="flex space-x-1">
                  <div className={`w-2 h-2 rounded-full ${aiResponseEnabled ? 'bg-white' : 'bg-gray-200'}`}></div>
                  <div className={`w-2 h-2 rounded-full ${aiResponseEnabled ? 'bg-white' : 'bg-gray-200'}`}></div>
                </div>
                
                {/* Bot Mouth */}
                <div className={`absolute bottom-3 left-1/2 transform -translate-x-1/2 w-4 h-1 rounded-full ${
                  aiResponseEnabled ? 'bg-white' : 'bg-gray-200'
                }`}></div>
                
                {/* Disabled indicator */}
                {!aiResponseEnabled && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-0.5 bg-white"></div>
                  </div>
                )}
              </div>
              
              {/* Thinking Dots Animation */}
              {isAnalyzing && aiResponseEnabled && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              )}
              
            </div>

            <ProblemDescription problem={problems[currentProblem]} />
            
            {/* Real-time Code Metrics */}
            {analysis && analysis.codeMetrics && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <Zap className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-blue-800">Real-time Metrics</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Big O Complexity */}
                  <div className="bg-white p-3 rounded border">
                    <div className="text-xs text-gray-500 mb-1">Complexity</div>
                    <div className="text-lg font-bold text-blue-600">
                      {analysis.codeMetrics.bigO?.complexity || 'O(1)'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {analysis.codeMetrics.bigO?.score ? `Score: ${analysis.codeMetrics.bigO.score}/4` : ''}
                    </div>
                  </div>

                  {/* Execution Time */}
                  <div className="bg-white p-3 rounded border">
                    <div className="text-xs text-gray-500 mb-1">Est. Time</div>
                    <div className="text-lg font-bold text-green-600">
                      {analysis.codeMetrics.executionTime?.estimated || 1}ms
                    </div>
                    <div className="text-xs text-gray-600">
                      {analysis.codeMetrics.executionTime?.complexity || 'O(1)'}
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div className="bg-white p-3 rounded border">
                    <div className="text-xs text-gray-500 mb-1">Memory</div>
                    <div className="text-lg font-bold text-purple-600">
                      {analysis.codeMetrics.memoryUsage?.estimated || 0}
                    </div>
                    <div className="text-xs text-gray-600">
                      {analysis.codeMetrics.memoryUsage?.unit || 'bytes'}
                    </div>
                  </div>

                  {/* Maintainability */}
                  <div className="bg-white p-3 rounded border">
                    <div className="text-xs text-gray-500 mb-1">Maintainability</div>
                    <div className="text-lg font-bold text-orange-600">
                      {analysis.codeMetrics.maintainabilityIndex?.value || 100}
                    </div>
                    <div className="text-xs text-gray-600">
                      {analysis.codeMetrics.maintainabilityIndex?.level || 'Good'}
                    </div>
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Cyclomatic Complexity:</span>
                    <span className={`ml-2 font-medium ${
                      analysis.codeMetrics.cyclomaticComplexity?.value <= 10 ? 'text-green-600' :
                      analysis.codeMetrics.cyclomaticComplexity?.value <= 20 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {analysis.codeMetrics.cyclomaticComplexity?.value || 1}
                    </span>
                    <span className="text-gray-500 ml-1">
                      ({analysis.codeMetrics.cyclomaticComplexity?.level || 'Low'})
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Lines of Code:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      {analysis.codeMetrics.nonEmptyLines || 0}
                    </span>
                    <span className="text-gray-500 ml-1">
                      / {analysis.codeMetrics.totalLines || 0}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Characters:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      {analysis.codeMetrics.characters || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}




          </div>

          {/* Right Column - Code Editor and Results */}
          <div className="space-y-6">
            {/* Code Editor */}
            <CodeEditor
              value={code}
              onChange={handleCodeChange}
              language={language}
              onLanguageChange={handleLanguageChange}
              allowedLanguages={allowedLanguages}
              problemTitle={problems[currentProblem].title}
            />



            {/* Test Results */}
            <TestResults
              key={`test-results-${testResults.length}-${running}`}
              results={testResults}
              onRunTests={handleRunTests}
              onRunSingleTest={handleRunSingleTest}
              running={running}
              overallScore={overallScore}
              totalTests={problems[currentProblem].testCases.length}
              passedTests={passedTests}
              failedTests={totalTests - passedTests}
              sampleTestCases={problems[currentProblem].testCases}
            />

          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-between">
          <div className="flex space-x-4">
            {/* Debug: Audio Support Status */}
            <div className="text-sm text-gray-600 flex items-center space-x-4">
             
              {aiResponseCooldown && (
                <div className="text-orange-600 flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                  <span>AI Thinking: {Math.floor(cooldownTimeLeft / 60)}m {cooldownTimeLeft % 60}s left</span>
                </div>
              )}
              {isAILoading && !aiResponseCooldown && (
                <div className="text-blue-600 flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>AI Processing...</span>
                </div>
              )}
            </div>
            
            {/* Audio Recording Button */}
            {audioSupported ? (
              <button
                onClick={isRecording ? stopAudioRecording : startAudioRecording}
                disabled={isRecording || aiResponseCooldown || isAILoading}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
                  isRecording 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : aiResponseCooldown
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : isAILoading
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-green-600 text-white hover:bg-green-700'
                } ${(isRecording || aiResponseCooldown || isAILoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (aiResponseCooldown || isAILoading) ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                <span>
                  {isRecording ? 'Listening...' : 
                   aiResponseCooldown ? 'AI Thinking...' : 
                   isAILoading ? 'AI Processing...' : 'Start Recording'}
                </span>
              </button>
            ) : (
              <button
                disabled
                className="px-4 py-2 rounded-md flex items-center space-x-2 bg-gray-400 text-white cursor-not-allowed"
              >
                <Mic className="h-4 w-4" />
                <span>Audio Not Supported</span>
              </button>
            )}
          
            {currentProblem > 0 && (
              <button
                onClick={() => setCurrentProblem(prev => prev - 1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Previous Problem
              </button>
            )}
           
          </div>
          
          <button
            onClick={handleCompleteInterview}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Complete Interview
          </button>
        </div>
      </div>

      {/* Complete Interview Dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCompleteDialog(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CheckCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Complete Interview
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to complete the interview? This action cannot be undone.
                      </p>
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-gray-600">
                          <strong>Time Remaining:</strong> {formatTime(timeLeft)}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Problems Completed:</strong> {currentProblem + 1} of {problems.length}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Tests Passed:</strong> {passedTests} of {totalTests}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Overall Score:</strong> {overallScore}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowCompleteDialog(false);
                    navigate('/candidate/chat');
                  }}
                >
                  Complete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowCompleteDialog(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Chat Interface */}
      <ChatInterface
        messages={sessionMessages}
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />
      </div>
    </>
  );
};

export default CandidateCoding;
