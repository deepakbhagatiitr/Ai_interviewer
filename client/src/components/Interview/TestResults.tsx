import React, { useState } from 'react';
import { Play, CheckCircle, X, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface TestResult {
  testCase: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime: number;
  memoryUsage: number;
}

interface TestResultsProps {
  results: TestResult[];
  onRunTests: () => void;
  onRunSingleTest: (testCase: string) => void;
  running: boolean;
  overallScore?: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  sampleTestCases?: Array<{
    input: string;
    expectedOutput: string;
    explanation: string;
  }>;
}

const TestResults: React.FC<TestResultsProps> = ({
  results,
  onRunTests,
  onRunSingleTest,
  running,
  overallScore,
  totalTests,
  passedTests,
  failedTests,
  sampleTestCases
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Play className="h-5 w-5 mr-2" />
            Test Results
          </h3>
          <button
            onClick={onRunTests}
            disabled={running}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{running ? 'Running...' : 'Run All Tests'}</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Overview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalTests}</div>
              <div className="text-sm text-gray-500">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{passedTests}</div>
              <div className="text-sm text-gray-500">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedTests}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(overallScore || 0)}`}>
                {overallScore || 0}%
              </div>
              <div className="text-sm text-gray-500">Score</div>
            </div>
          </div>
          
          {overallScore !== undefined && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getScoreBgColor(overallScore)}`}
                  style={{ width: `${overallScore}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('performance')}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                <span className="font-medium">Performance Metrics</span>
              </div>
              {expandedSections.has('performance') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.has('performance') && (
              <div className="px-4 pb-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Average Execution Time</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatTime(
                        results.reduce((sum, r) => sum + r.executionTime, 0) / results.length
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Average Memory Usage</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatMemory(
                        results.reduce((sum, r) => sum + r.memoryUsage, 0) / results.length
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Individual Test Results */}
        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('details')}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span className="font-medium">Test Details ({results.length})</span>
              </div>
              {expandedSections.has('details') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.has('details') && (
              <div className="px-4 pb-4 border-t border-gray-200">
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 ${
                        result.passed 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {result.passed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-red-600" />
                          )}
                          <span className="font-medium text-gray-900">
                            Test Case {index + 1}
                          </span>
                          <span className="text-sm text-gray-500">
                            {result.testCase}
                          </span>
                        </div>
                        <button
                          onClick={() => onRunSingleTest(result.testCase)}
                          disabled={running}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Play className="h-3 w-3" />
                          <span>Run</span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-700 mb-1">Input:</div>
                          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                            {Array.isArray(result.input) ? JSON.stringify(result.input) : result.input}
                          </pre>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700 mb-1">Expected Output:</div>
                          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                            {result.expectedOutput}
                          </pre>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700 mb-1">Actual Output:</div>
                          <pre className={`p-2 rounded border text-xs overflow-x-auto ${
                            result.passed ? 'bg-green-50' : 'bg-red-50'
                          }`}>
                            {Array.isArray(result.actualOutput) ? JSON.stringify(result.actualOutput) : result.actualOutput}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Time:</span>
                            <span className="font-medium">{formatTime(result.executionTime)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Memory:</span>
                            <span className="font-medium">{formatMemory(result.memoryUsage)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sample Test Cases */}
        {sampleTestCases && sampleTestCases.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('sample')}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span className="font-medium">Sample Test Cases ({sampleTestCases.length})</span>
              </div>
              {expandedSections.has('sample') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.has('sample') && (
              <div className="px-4 pb-4 border-t border-gray-200">
                <div className="space-y-3">
                  {sampleTestCases.map((testCase, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          Sample Test Case {index + 1}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-700 mb-1">Input:</div>
                          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                            {testCase.input}
                          </pre>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700 mb-1">Expected Output:</div>
                          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                            {testCase.expectedOutput}
                          </pre>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="font-medium text-gray-700 mb-1">Explanation:</div>
                        <p className="text-sm text-gray-600">{testCase.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {results.length === 0 && (
          <div className="text-center py-8">
            <Play className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              No test results yet. Click "Run All Tests" to execute your code.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults;