import React, { useState } from 'react';
import { 
  Code, 
  CheckCircle, 
  AlertTriangle, 
  Lightbulb, 
  Clock, 
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CodeAnalysisProps {
  analysis: {
    timestamp: string;
    syntaxErrors: string[];
    logicIssues: string[];
    suggestions: string[];
    hints: string[];
    score: number;
    feedback: string;
    codeMetrics: {
      totalLines: number;
      nonEmptyLines: number;
      characters: number;
      complexity: number;
      readability: number;
    };
  } | null;
}

const CodeAnalysis: React.FC<CodeAnalysisProps> = ({ analysis }) => {
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

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center mb-2">
          <Code className="h-5 w-5 mr-2" />
          Code Analysis
        </h3>
        <p className="text-sm text-gray-500">
          Start coding to see real-time analysis...
        </p>
      </div>
    );
  }

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

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Code className="h-5 w-5 mr-2" />
          Code Analysis
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Overall Score */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
              {analysis.score}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getScoreBgColor(analysis.score)}`}
              style={{ width: `${analysis.score}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {getScoreLabel(analysis.score)}
          </p>
        </div>

        {/* Code Metrics */}
        <div className="border border-gray-200 rounded-lg">
          <button
            onClick={() => toggleSection('metrics')}
            className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              <span className="font-medium">Code Metrics</span>
            </div>
            {expandedSections.has('metrics') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.has('metrics') && (
            <div className="px-4 pb-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm">
                  <span className="font-medium">Lines:</span> {analysis.codeMetrics.totalLines}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Non-empty:</span> {analysis.codeMetrics.nonEmptyLines}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Characters:</span> {analysis.codeMetrics.characters}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Complexity:</span> {analysis.codeMetrics.complexity}/10
                </div>
                <div className="text-sm col-span-2">
                  <span className="font-medium">Readability:</span> {analysis.codeMetrics.readability}/100
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Syntax Errors */}
        {analysis.syntaxErrors && analysis.syntaxErrors.length > 0 && (
          <div className="border border-red-200 rounded-lg">
            <div className="px-4 py-3 bg-red-50 border-b border-red-200">
              <h4 className="text-sm font-medium text-red-800 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Syntax Errors ({analysis.syntaxErrors.length})
              </h4>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {analysis.syntaxErrors.map((error, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <span className="text-sm text-gray-900">{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Logic Issues */}
        {analysis.logicIssues && analysis.logicIssues.length > 0 && (
          <div className="border border-yellow-200 rounded-lg">
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
              <h4 className="text-sm font-medium text-yellow-800 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Logic Issues ({analysis.logicIssues.length})
              </h4>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {analysis.logicIssues.map((issue, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span className="text-sm text-gray-900">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div className="border border-blue-200 rounded-lg">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 flex items-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                Suggestions ({analysis.suggestions.length})
              </h4>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span className="text-sm text-gray-900">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* AI Feedback */}
        {analysis.feedback && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">AI Feedback</h4>
            <p className="text-sm text-gray-900">{analysis.feedback}</p>
          </div>
        )}

        {/* Available Hints */}
        {analysis.hints && analysis.hints.length > 0 && (
          <div className="border border-purple-200 rounded-lg">
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-200">
              <h4 className="text-sm font-medium text-purple-800 flex items-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                Available Hints ({analysis.hints.length})
              </h4>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {analysis.hints.map((hint, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-purple-500 mt-0.5" />
                    <span className="text-sm text-gray-900">{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* No Issues */}
        {(!analysis.syntaxErrors || analysis.syntaxErrors.length === 0) && 
         (!analysis.logicIssues || analysis.logicIssues.length === 0) && 
         (!analysis.suggestions || analysis.suggestions.length === 0) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">
                No issues detected! Your code looks good.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeAnalysis;