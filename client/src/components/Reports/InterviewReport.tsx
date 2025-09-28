import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle, 
  X, 
  TrendingUp, 
  Code, 
  Lightbulb, 
  Timer, 
  BarChart3 
} from 'lucide-react';
import axios from 'axios';

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
  problem: {
    title: string;
    difficulty: string;
    category: string;
  };
  status: string;
  createdAt: string;
  completedAt?: string;
  finalScore?: {
    overall: number;
    codeQuality: number;
    problemSolving: number;
    communication: number;
    timeManagement: number;
  };
  hintsUsed: number;
  testResults: {
    total: number;
    passed: number;
    failed: number;
  };
  codeAnalysis: {
    syntaxErrors: number;
    logicIssues: number;
    suggestions: number;
  };
}

const InterviewReport: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await axios.get('/interview');
      setInterviews((response.data as any).interviews);
    } catch (err: any) {
      setError('Failed to fetch interviews');
      console.error('Error fetching interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (interview: Interview) => {
    try {
      const response = await axios.get(`/reports/interview/${interview.sessionId}`);
      setSelectedInterview((response.data as any).report);
      setShowDetailDialog(true);
    } catch (err: any) {
      setError('Failed to fetch interview details');
      console.error('Error fetching interview details:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredInterviews = interviews.filter(interview => {
    if (filter === 'all') return true;
    return interview.status === filter;
  });

  const sortedInterviews = [...filteredInterviews].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'score':
        comparison = (a.finalScore?.overall || 0) - (b.finalScore?.overall || 0);
        break;
      case 'candidate':
        comparison = a.candidate.name.localeCompare(b.candidate.name);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading interviews...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Reports</h2>
        <p className="text-gray-600">View and analyze interview performance data</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters and Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Interviews</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="date">Date</option>
            <option value="score">Score</option>
            <option value="candidate">Candidate</option>
          </select>
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
          {sortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Interview List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {sortedInterviews.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews found</h3>
            <p className="text-gray-500">No interviews match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Problem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedInterviews.map((interview) => (
                  <tr key={interview._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {interview.candidate.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {interview.candidate.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {interview.problem.title}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(interview.problem.difficulty)}`}>
                            {interview.problem.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">
                            {interview.problem.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(interview.status)}`}>
                        {interview.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.finalScore ? (
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {interview.finalScore.overall}/100
                          </span>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                interview.finalScore.overall >= 80
                                  ? 'bg-green-500'
                                  : interview.finalScore.overall >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${interview.finalScore.overall}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(interview.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(interview)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {showDetailDialog && selectedInterview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDetailDialog(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Interview Report - {selectedInterview.candidate.name}
                  </h3>
                  <button
                    onClick={() => setShowDetailDialog(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Interview Details</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Candidate:</span>
                          <span className="text-sm font-medium">{selectedInterview.candidate.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Problem:</span>
                          <span className="text-sm font-medium">{selectedInterview.problem.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Difficulty:</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(selectedInterview.problem.difficulty)}`}>
                            {selectedInterview.problem.difficulty}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedInterview.status)}`}>
                            {selectedInterview.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Timeline</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Started:</span>
                          <span className="text-sm font-medium">{formatDate(selectedInterview.createdAt)}</span>
                        </div>
                        {selectedInterview.completedAt && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Completed:</span>
                            <span className="text-sm font-medium">{formatDate(selectedInterview.completedAt)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Duration:</span>
                          <span className="text-sm font-medium">
                            {selectedInterview.completedAt 
                              ? `${Math.round((new Date(selectedInterview.completedAt).getTime() - new Date(selectedInterview.createdAt).getTime()) / (1000 * 60))} minutes`
                              : 'In progress'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scores */}
                  {selectedInterview.finalScore && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Scores</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary-600">
                            {selectedInterview.finalScore.overall}
                          </div>
                          <div className="text-sm text-gray-600">Overall</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">
                            {selectedInterview.finalScore.codeQuality}
                          </div>
                          <div className="text-sm text-gray-600">Code Quality</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">
                            {selectedInterview.finalScore.problemSolving}
                          </div>
                          <div className="text-sm text-gray-600">Problem Solving</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">
                            {selectedInterview.finalScore.communication}
                          </div>
                          <div className="text-sm text-gray-600">Communication</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">
                            {selectedInterview.finalScore.timeManagement}
                          </div>
                          <div className="text-sm text-gray-600">Time Management</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Results */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Test Results</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {selectedInterview.testResults.total}
                        </div>
                        <div className="text-sm text-gray-600">Total Tests</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedInterview.testResults.passed}
                        </div>
                        <div className="text-sm text-gray-600">Passed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {selectedInterview.testResults.failed}
                        </div>
                        <div className="text-sm text-gray-600">Failed</div>
                      </div>
                    </div>
                  </div>

                  {/* Code Analysis */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Code Analysis</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {selectedInterview.codeAnalysis.syntaxErrors}
                        </div>
                        <div className="text-sm text-gray-600">Syntax Errors</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {selectedInterview.codeAnalysis.logicIssues}
                        </div>
                        <div className="text-sm text-gray-600">Logic Issues</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedInterview.codeAnalysis.suggestions}
                        </div>
                        <div className="text-sm text-gray-600">Suggestions</div>
                      </div>
                    </div>
                  </div>

                  {/* Hints Used */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Hints Used</h4>
                    <div className="flex items-center">
                      <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-2xl font-bold text-gray-900">
                        {selectedInterview.hintsUsed}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">hints used</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowDetailDialog(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewReport;