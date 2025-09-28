import React, { useState } from 'react';
import { Lightbulb, ThumbsUp, ThumbsDown, RefreshCw, Clock, CheckCircle, ChevronDown } from 'lucide-react';

interface Hint {
  id: string;
  content: string;
  category: 'algorithm' | 'syntax' | 'optimization' | 'debugging';
  difficulty: 'easy' | 'medium' | 'hard';
  used: boolean;
  rating?: 'helpful' | 'not-helpful' | null;
}

interface HintPanelProps {
  hints: Hint[];
  onRequestHint: () => void;
  onUseHint: (hintId: string) => void;
  onRateHint: (hintId: string, rating: 'helpful' | 'not-helpful') => void;
  loading?: boolean;
  disabled?: boolean;
}

const HintPanel: React.FC<HintPanelProps> = ({
  hints,
  onRequestHint,
  onUseHint,
  onRateHint,
  loading = false,
  disabled = false
}) => {
  const [expandedHint, setExpandedHint] = useState<string | null>(null);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'algorithm': return 'bg-blue-100 text-blue-800';
      case 'syntax': return 'bg-green-100 text-green-800';
      case 'optimization': return 'bg-purple-100 text-purple-800';
      case 'debugging': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleHint = (hintId: string) => {
    setExpandedHint(expandedHint === hintId ? null : hintId);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2" />
            Hints
          </h3>
          <button
            onClick={onRequestHint}
            disabled={disabled || loading}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>New Hint</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        {hints.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              No hints available yet. Click "New Hint" to get AI assistance.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {hints.map((hint) => (
              <div
                key={hint.id}
                className={`border rounded-lg transition-all ${
                  hint.used 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <button
                  onClick={() => toggleHint(hint.id)}
                  className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Lightbulb className={`h-4 w-4 ${
                        hint.used ? 'text-green-600' : 'text-yellow-500'
                      }`} />
                      {hint.used && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {hint.category.charAt(0).toUpperCase() + hint.category.slice(1)} Hint
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(hint.category)}`}>
                      {hint.category}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(hint.difficulty)}`}>
                      {hint.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {hint.rating && (
                      <div className="flex items-center space-x-1">
                        {hint.rating === 'helpful' ? (
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform ${
                      expandedHint === hint.id ? 'rotate-180' : ''
                    }`} />
                  </div>
                </button>

                {expandedHint === hint.id && (
                  <div className="px-3 pb-3 border-t border-gray-200">
                    <div className="pt-3">
                      <p className="text-sm text-gray-700 mb-3">{hint.content}</p>
                      
                      <div className="flex items-center justify-between">
                        {!hint.used ? (
                          <button
                            onClick={() => onUseHint(hint.id)}
                            className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            Use This Hint
                          </button>
                        ) : (
                          <span className="text-sm text-green-600 font-medium flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Used
                          </span>
                        )}

                        {hint.used && !hint.rating && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Was this helpful?</span>
                            <button
                              onClick={() => onRateHint(hint.id, 'helpful')}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Helpful"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onRateHint(hint.id, 'not-helpful')}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Not helpful"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hint Statistics */}
        {hints.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {hints.filter(h => h.used).length}
                </div>
                <div className="text-gray-500">Used</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {hints.filter(h => h.rating === 'helpful').length}
                </div>
                <div className="text-gray-500">Helpful</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HintPanel;