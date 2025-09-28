import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, Clock, Code } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface InterviewState {
  phase: 'chat' | 'coding' | 'completed';
  currentQuestion: number;
  startTime: Date;
  stuckTime?: Date;
  questions: Array<{
    id: number;
    title: string;
    description: string;
    difficulty: string;
    testCases: Array<{
      input: string;
      expectedOutput: string;
      explanation: string;
    }>;
  }>;
}

const CandidateChat: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [interviewState, setInterviewState] = useState<InterviewState>({
    phase: 'chat',
    currentQuestion: 0,
    startTime: new Date(),
    questions: [
      {
        id: 1,
        title: '3Sum (LeetCode #15)',
        description: `Given an integer array nums, return all the unique triplets [nums[i], nums[j], nums[k]] such that:

• i != j, i != k, and j != k
• nums[i] + nums[j] + nums[k] == 0

The solution set must not contain duplicate triplets.

🔹 Concepts tested: Sorting, Two-pointer technique, Hashing.`,
        difficulty: 'Medium',
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

🔹 Concepts tested: Prefix and Suffix arrays, Array manipulation, Space optimization.`,
        difficulty: 'Medium',
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
    ]
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user?.role !== 'candidate') {
      navigate('/admin');
      return;
    }

    // Initialize chat with AI greeting
    const initialMessages: Message[] = [
      {
        id: '1',
        type: 'ai',
        content: `Hello ${user.name}! 👋 Welcome to your CodeSage interview. I'll be your interviewer today. Let me start by asking you a few questions to get to know you better.`,
        timestamp: new Date()
      },
      {
        id: '2',
        type: 'ai',
        content: 'First, could you tell me about your programming experience? What languages are you most comfortable with?',
        timestamp: new Date()
      }
    ];
    setMessages(initialMessages);
  }, [user, navigate]);

  const addMessage = (content: string, type: 'user' | 'ai', isTyping = false) => {
    const message: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      isTyping
    };
    setMessages(prev => [...prev, message]);
  };

  const simulateAIResponse = (userMessage: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      
      // AI responses based on chat phase
      if (interviewState.phase === 'chat') {
        const responses = [
          "That's great! I can see you have solid experience. Let me ask you another question.",
          "Interesting! I'd love to hear more about your approach to problem-solving.",
          "Excellent! Now, tell me about a challenging project you've worked on recently.",
          "Perfect! I think I have a good understanding of your background. Are you ready for the coding round?",
          "Great! I'm impressed with your experience. Let's move to the coding challenges now. Get ready for the coding round! I'll switch you to the coding editor in 5 seconds..."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessage(randomResponse, 'ai');
        
        // After a few exchanges, transition to coding
        if (messages.length >= 6) {
          setTimeout(() => {
            addMessage("Get ready for the coding round! I'll switch you to the coding editor in 5 seconds...", 'ai');
            setTimeout(() => {
              setInterviewState(prev => ({ ...prev, phase: 'coding' }));
              navigate('/candidate/coding');
            }, 5000);
          }, 2000);
        }
      }
    }, 1000 + Math.random() * 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    addMessage(inputMessage, 'user');
    simulateAIResponse(inputMessage);
    setInputMessage('');
  };

  const handleLogout = () => {
    logout();
    navigate('/candidate/login');
  };

  if (interviewState.phase === 'coding') {
    return null; // Will be handled by coding component
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">CodeSage</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                <span>45:00</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Interface */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border h-96 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                    message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    {message.type === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-gray-100">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Interview Progress */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interview Progress</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Chat Phase</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Coding Phase</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateChat;
