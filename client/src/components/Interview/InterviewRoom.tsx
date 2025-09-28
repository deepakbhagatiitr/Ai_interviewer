import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Lightbulb,
  BarChart3,
  Mic,
  MicOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import CodeEditor from './CodeEditor';
import ProblemDescription from './ProblemDescription';
import CodeAnalysis from './CodeAnalysis';
import HintPanel from './HintPanel';
import TestResults from './TestResults';
import AudioRecorder from './AudioRecorder';
import axios from 'axios';

interface Problem {
  title: string;
  description: string;
  difficulty: string;
  category: string;
  timeLimit: number;
  allowedLanguages: string[];
  testCases: any[];
  constraints?: string[];
  hints?: string[];
}

interface Interview {
  _id: string;
  sessionId: string;
  candidate: {
    _id: string;
    name: string;
    email: string;
  };
  interviewer?: {
    _id: string;
    name: string;
    email: string;
  };
  problem: Problem;
  status: string;
  createdAt: string;
  finalScore?: {
    overall: number;
  };
}

const InterviewRoom: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  
  const [interview, setInterview] = useState<Interview | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [analysis, setAnalysis] = useState(null);
  const [hints, setHints] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const audioRecorderRef = useRef<any>(null);

  useEffect(() => {
    fetchInterview();
  }, [sessionId]);

  useEffect(() => {
    if (interview) {
      setTimeRemaining(interview.problem.timeLimit * 60); // Convert to seconds
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleCompleteInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [interview]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleCodeAnalysis = (data: any) => {
      console.log('Code analysis received:', data);
      setAnalysis(data);
    };

    const handleHintResponse = (data: any) => {
      console.log('Hint received:', data);
      setHints(prev => [...prev, { 
        id: Date.now().toString(),
        content: data.hint.content,
        category: 'algorithm',
        difficulty: 'medium',
        used: false,
        timestamp: data.timestamp
      }]);
    };

    const handleTestResults = (data: any) => {
      console.log('Test results received:', data);
      setTestResults(data.results || []);
    };

    const handleError = (error: any) => {
      console.error('Socket error:', error);
      setError(error.message || 'An error occurred');
    };

    // Join the interview room when socket connects
    if (interview) {
      socket.emit('join_interview', { sessionId: interview.sessionId });
    }

    // Listen for events
    socket.on('code_analysis', handleCodeAnalysis);
    socket.on('hint_provided', handleHintResponse);
    socket.on('test_results', handleTestResults);
    socket.on('error', handleError);

    return () => {
      socket.off('code_analysis', handleCodeAnalysis);
      socket.off('hint_provided', handleHintResponse);
      socket.off('test_results', handleTestResults);
      socket.off('error', handleError);
    };
  }, [socket, interview]);

  const fetchInterview = async () => {
    try {
      const response = await axios.get(`/interview/${sessionId}`);
      setInterview((response.data as any).interview);
    } catch (err: any) {
      setError('Failed to fetch interview details');
      console.error('Error fetching interview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    // Send code to server for real-time analysis
    if (socket && interview) {
      socket.emit('code_change', { 
        sessionId: interview.sessionId, 
        code: newCode, 
        language 
      });
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  const handleAudioData = (audioBuffer: ArrayBuffer, duration: number) => {
    // Handle audio data
    console.log('Audio recorded:', { duration, size: audioBuffer.byteLength });
  };

  const handleRequestHint = () => {
    // Request hint from AI
    if (socket && interview) {
      socket.emit('request_hint', { 
        sessionId: interview.sessionId, 
        code, 
        language 
      });
    }
  };

  const handleUseHint = (hintId: string) => {
    // Mark hint as used
    setHints(prev => prev.map(hint => 
      hint.id === hintId ? { ...hint, used: true } : hint
    ));
  };

  const handleRateHint = (hintId: string, rating: 'helpful' | 'not-helpful') => {
    // Rate hint
    setHints(prev => prev.map(hint => 
      hint.id === hintId ? { ...hint, rating } : hint
    ));
  };

  const handleRunTests = () => {
    // Run tests
    if (socket && interview) {
      socket.emit('run_tests', { 
        sessionId: interview.sessionId, 
        code, 
        language,
        testCases: interview.problem.testCases || []
      });
    }
  };

  const handleRunSingleTest = (testCase: string) => {
    // Run single test
    if (socket && interview) {
      socket.emit('run_single_test', { 
        sessionId: interview.sessionId, 
        code, 
        language, 
        testCase 
      });
    }
  };

  const handleCompleteInterview = () => {
    setShowCompleteDialog(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Interview not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {interview.problem.title}
                </h1>
                <p className="text-sm text-gray-500">
                  {interview.candidate.name} • {interview.problem.difficulty}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="font-mono">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              <button
                onClick={handleCompleteInterview}
                className="btn-primary flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Interview
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
          {/* Left Panel - Problem Description */}
          <div className="lg:col-span-3">
            <ProblemDescription problem={interview.problem} />
          </div>

          {/* Center Panel - Code Editor */}
          <div className="lg:col-span-5">
            <div className="h-full flex flex-col">
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Code Editor</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Language:</span>
                    <select
                      value={language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {interview.problem.allowedLanguages.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <CodeEditor
                  value={code}
                  onChange={handleCodeChange}
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  allowedLanguages={interview.problem.allowedLanguages}
                />
              </div>
              
              <div className="mt-4">
                <AudioRecorder
                  onAudioData={handleAudioData}
                  disabled={false}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Analysis and Results */}
          <div className="lg:col-span-4 space-y-4">
            <CodeAnalysis analysis={analysis} />
            <HintPanel
              hints={hints}
              onRequestHint={handleRequestHint}
              onUseHint={handleUseHint}
              onRateHint={handleRateHint}
              loading={false}
              disabled={false}
            />
            <TestResults
              results={testResults}
              onRunTests={handleRunTests}
              onRunSingleTest={handleRunSingleTest}
              running={false}
              totalTests={interview.problem.testCases.length}
              passedTests={testResults.filter(r => r.passed).length}
              failedTests={testResults.filter(r => !r.passed).length}
            />
          </div>
        </div>
      </main>

      {/* Complete Interview Dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCompleteDialog(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Complete Interview
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to complete this interview? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    if (socket && interview) {
                      socket.emit('complete_interview', { sessionId: interview.sessionId });
                    }
                    setShowCompleteDialog(false);
                    navigate('/dashboard');
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
    </div>
  );
};

export default InterviewRoom;