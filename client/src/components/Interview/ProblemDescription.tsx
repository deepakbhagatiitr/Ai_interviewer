import React, { useState } from 'react';
import { Clock, Code, Tag, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface Problem {
  title: string;
  description: string;
  difficulty: string;
  category: string;
  timeLimit: number;
  allowedLanguages: string[];
  testCases: Array<{
    input: string;
    expectedOutput: string;
    explanation?: string;
  }>;
  constraints?: string[];
  hints?: string[];
}

interface ProblemDescriptionProps {
  problem: Problem;
}

const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ problem }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['description', 'testCases']));

  // Debug: Log the problem data only when it changes
  React.useEffect(() => {
    console.log('=== ProblemDescription Debug ===');
    console.log('Problem object:', problem);
    console.log('Test cases array:', problem.testCases);
    console.log('Test cases length:', problem.testCases?.length);
    
    if (problem.testCases && problem.testCases.length > 0) {
      console.log('=== Test Case Details ===');
      problem.testCases.forEach((testCase, index) => {
        console.log(`Test Case ${index + 1}:`, {
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          explanation: testCase.explanation
        });
      });
    } else {
      console.log('No test cases found or empty array');
    }
    console.log('=== End Debug ===');
  }, [problem]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'algorithms': return 'bg-blue-100 text-blue-800';
      case 'data-structures': return 'bg-purple-100 text-purple-800';
      case 'system-design': return 'bg-orange-100 text-orange-800';
      case 'frontend': return 'bg-pink-100 text-pink-800';
      case 'backend': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{problem.title}</h2>
        
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(problem.difficulty)}`}>
            {problem.difficulty ? problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1) : 'Medium'}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(problem.category)}`}>
            {problem.category?.replace('-', ' ') || 'General'}
          </span>
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(problem.timeLimit || 60)}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {(problem.allowedLanguages || []).map((lang) => (
            <span
              key={lang}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Description */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('description')}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">Problem Description</span>
              {expandedSections.has('description') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.has('description') && (
              <div className="px-4 pb-4 border-t border-gray-200">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{problem.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Constraints */}
          {problem.constraints && problem.constraints.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('constraints')}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">Constraints</span>
                {expandedSections.has('constraints') ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              {expandedSections.has('constraints') && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <ul className="space-y-1">
                    {problem.constraints.map((constraint, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{constraint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Test Cases */}
          {problem.testCases && problem.testCases.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('testCases')}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">
                  Test Cases ({problem.testCases.length})
                </span>
                {expandedSections.has('testCases') ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              {expandedSections.has('testCases') && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="space-y-4">
                    {problem.testCases.map((testCase, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Input:</span>
                          <pre className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border overflow-x-auto">
                            {testCase.input}
                          </pre>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Expected Output:</span>
                          <pre className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border overflow-x-auto">
                            {testCase.expectedOutput}
                          </pre>
                        </div>
                        {testCase.explanation && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Explanation:</span>
                            <p className="mt-1 text-sm text-gray-600">{testCase.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProblemDescription;