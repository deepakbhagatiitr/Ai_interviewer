import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface Interview {
  _id: string;
  candidate: {
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
  finalScore?: {
    overall: number;
  };
  duration?: number;
}

interface Analytics {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  totalCandidates: number;
  scoreDistribution: Array<{ range: string; count: number; percentage: number }>;
  recentInterviews: Interview[];
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [comprehensiveAnalytics, setComprehensiveAnalytics] = useState<any>(null);
  const [interviewSessions, setInterviewSessions] = useState<any[]>([]);
  const [aiInteractions, setAiInteractions] = useState<any[]>([]);
  const [interviewCompletions, setInterviewCompletions] = useState<any[]>([]);
  const [interviewAnalytics, setInterviewAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'interviews' | 'candidates' | 'reports' | 'ai-insights' | 'settings'>('overview');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/candidate');
      return;
    }
    fetchAnalytics();
    fetchInterviewSessions();
    fetchComprehensiveAnalytics();
    fetchAIInteractions();
    fetchInterviewCompletions();
    fetchInterviewAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/reports/analytics');
      setAnalytics((response.data as any).analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviewSessions = async () => {
    try {
      const response = await axios.get('/interview-sessions/sessions');
      setInterviewSessions((response.data as any).sessions || []);
    } catch (error) {
      console.error('Error fetching interview sessions:', error);
    }
  };

  const fetchComprehensiveAnalytics = async () => {
    try {
      const response = await axios.get('/reports/comprehensive-analytics');
      setComprehensiveAnalytics((response.data as any).analytics);
    } catch (error) {
      console.error('Error fetching comprehensive analytics:', error);
    }
  };

  const fetchAIInteractions = async () => {
    try {
      const response = await axios.get('/ai-interactions/metrics');
      setAiInteractions((response.data as any) || []);
    } catch (error) {
      console.error('Error fetching AI interactions:', error);
    }
  };

  const fetchInterviewCompletions = async () => {
    try {
      const response = await axios.get('/ai-interactions/interview-completions');
      setInterviewCompletions((response.data as any).completions || []);
    } catch (error) {
      console.error('Error fetching interview completions:', error);
    }
  };

  const fetchInterviewAnalytics = async () => {
    try {
      const response = await axios.get('/ai-interactions/interview-analytics');
      setInterviewAnalytics((response.data as any) || {});
    } catch (error) {
      console.error('Error fetching interview analytics:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">CodeSage Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'interviews', name: 'Recent Interviews', icon: Calendar },
              { id: 'candidates', name: 'Candidates', icon: Users },
              { id: 'reports', name: 'Reports', icon: FileText },
              { id: 'ai-insights', name: 'AI Insights', icon: TrendingUp },
              { id: 'settings', name: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Interviews</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.totalInterviews}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Completed</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.completedInterviews}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Average Score</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.averageScore}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Candidates</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.totalCandidates}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Performance Summary</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {interviewSessions.length}
                    </div>
                    <div className="text-sm text-gray-500">Total Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {interviewSessions.length > 0 ? 
                        Math.round(interviewSessions.reduce((sum, s) => sum + s.overallScore, 0) / interviewSessions.length) : 0}%
                    </div>
                    <div className="text-sm text-gray-500">Average Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {interviewSessions.filter(s => s.rating === 'excellent' || s.rating === 'good').length}
                    </div>
                    <div className="text-sm text-gray-500">High Performers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Interviews Table */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Interviews</h3>
              </div>
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {interviewSessions.slice(0, 10).map((session) => (
                      <tr key={session.sessionId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {session.candidateName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {session.candidateEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Coding Interview</div>
                          <div className="text-sm text-gray-500">
                            Multiple Problems • 45 min
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            session.rating === 'excellent' ? 'bg-green-100 text-green-800' :
                            session.rating === 'good' ? 'bg-blue-100 text-blue-800' :
                            session.rating === 'average' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {session.rating}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.overallScore}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(session.completedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interviews' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">All Interviews</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500">Interview management interface will be implemented here.</p>
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Candidates</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500">Candidate management interface will be implemented here.</p>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Interview Completion Analytics */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Interview Completion Analytics</h3>
                <p className="text-sm text-gray-500">Comprehensive data from completed interviews</p>
              </div>
              <div className="p-6">
                {interviewAnalytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {interviewAnalytics.totalCompletedInterviews || 0}
                      </div>
                      <div className="text-sm text-gray-500">Completed Interviews</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {Math.round(interviewAnalytics.avgOverallScore || 0)}%
                      </div>
                      <div className="text-sm text-gray-500">Average Overall Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {Math.round((interviewAnalytics.avgSessionDuration || 0) / 60)}m
                      </div>
                      <div className="text-sm text-gray-500">Avg Session Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {Math.round(interviewAnalytics.avgInteractionsPerInterview || 0)}
                      </div>
                      <div className="text-sm text-gray-500">Avg AI Interactions</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading interview analytics...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Interview Metrics */}
            {interviewAnalytics && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Detailed Interview Metrics</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">AI Assistance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Hints per Interview:</span>
                          <span className="text-sm font-medium">{Math.round(interviewAnalytics.avgHintsPerInterview || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Suggestions per Interview:</span>
                          <span className="text-sm font-medium">{Math.round(interviewAnalytics.avgSuggestionsPerInterview || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Logic Issues:</span>
                          <span className="text-sm font-medium">{Math.round(interviewAnalytics.avgLogicIssuesPerInterview || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Syntax Errors:</span>
                          <span className="text-sm font-medium">{Math.round(interviewAnalytics.avgSyntaxErrorsPerInterview || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Code Quality</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Maintainability:</span>
                          <span className="text-sm font-medium">{Math.round(interviewAnalytics.avgMaintainability || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Session Duration:</span>
                          <span className="text-sm font-medium">{Math.round((interviewAnalytics.avgSessionDuration || 0) / 60)}m</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Timeline</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">First Completion:</span>
                          <span className="text-sm font-medium">
                            {interviewAnalytics.firstCompletion ? new Date(interviewAnalytics.firstCompletion).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Last Completion:</span>
                          <span className="text-sm font-medium">
                            {interviewAnalytics.lastCompletion ? new Date(interviewAnalytics.lastCompletion).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Completed Interviews Table */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Completed Interviews</h3>
                <p className="text-sm text-gray-500">Detailed view of all completed interview sessions</p>
              </div>
              <div className="p-6">
                {interviewCompletions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Candidate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rating
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            AI Interactions
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hints
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Suggestions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {interviewCompletions.map((completion, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {completion.candidateEmail}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(completion.completedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {Math.round(completion.sessionDuration / 60)}m
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                completion.overallScore >= 80 ? 'bg-green-100 text-green-800' :
                                completion.overallScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {completion.overallScore}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                completion.overallRating === 'excellent' ? 'bg-green-100 text-green-800' :
                                completion.overallRating === 'good' ? 'bg-blue-100 text-blue-800' :
                                completion.overallRating === 'average' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {completion.overallRating}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {completion.totalInteractions}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {completion.totalHints}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {completion.totalSuggestions}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No completed interviews found.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Overview */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Legacy Performance Overview</h3>
              </div>
              <div className="p-6">
                {comprehensiveAnalytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {comprehensiveAnalytics.totalSessions}
                      </div>
                      <div className="text-sm text-gray-500">Total Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {Math.round(comprehensiveAnalytics.averageScore)}%
                      </div>
                      <div className="text-sm text-gray-500">Average Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {Math.round(comprehensiveAnalytics.averageDuration / 60)}m
                      </div>
                      <div className="text-sm text-gray-500">Avg Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {comprehensiveAnalytics.performanceMetrics?.avgCodeQuality?.toFixed(1) || 0}
                      </div>
                      <div className="text-sm text-gray-500">Avg Code Quality</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading analytics...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Score Distribution */}
            {comprehensiveAnalytics && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Score Distribution</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {comprehensiveAnalytics.scoreDistribution.map((bucket: any, index: number) => (
                      <div key={index} className="flex items-center">
                        <div className="w-20 text-sm text-gray-600">
                          {bucket._id === 'other' ? 'Other' : `${bucket._id}-${bucket._id + 20}`}
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(bucket.count / comprehensiveAnalytics.totalSessions) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-12 text-sm text-gray-600 text-right">
                          {bucket.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rating Distribution */}
            {comprehensiveAnalytics && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Performance Ratings</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {comprehensiveAnalytics.ratingDistribution.map((rating: any, index: number) => (
                      <div key={index} className="text-center">
                        <div className={`text-2xl font-bold ${
                          rating._id === 'excellent' ? 'text-green-600' :
                          rating._id === 'good' ? 'text-blue-600' :
                          rating._id === 'average' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {rating.count}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {rating._id || 'Unknown'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Problem Completion Rates */}
            {comprehensiveAnalytics && comprehensiveAnalytics.problemCompletion && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Problem Completion Rates</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {comprehensiveAnalytics.problemCompletion.map((problem: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-gray-900">{problem.problemTitle}</h4>
                          <span className="text-sm text-gray-500">
                            {problem.completed}/{problem.totalAttempts} completed
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${problem.completionRate}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {Math.round(problem.completionRate)}%
                          </div>
                          <div className="text-sm text-gray-600">
                            Avg: {Math.round(problem.avgScore)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            {comprehensiveAnalytics && comprehensiveAnalytics.performanceMetrics && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Performance Metrics</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(comprehensiveAnalytics.performanceMetrics.avgCodeChanges || 0)}
                      </div>
                      <div className="text-sm text-gray-500">Avg Code Changes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {Math.round(comprehensiveAnalytics.performanceMetrics.avgSyntaxErrors || 0)}
                      </div>
                      <div className="text-sm text-gray-500">Avg Syntax Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.round(comprehensiveAnalytics.performanceMetrics.avgHintsUsed || 0)}
                      </div>
                      <div className="text-sm text-gray-500">Avg Hints Used</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai-insights' && (
          <div className="space-y-6">
            {/* AI Interaction Metrics */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">AI Interaction Metrics</h3>
                <p className="text-sm text-gray-500">Detailed analysis of AI interactions with candidates</p>
              </div>
              <div className="p-6">
                {aiInteractions.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {aiInteractions.reduce((sum, interaction) => sum + interaction.totalInteractions, 0)}
                        </div>
                        <div className="text-sm text-gray-500">Total AI Interactions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {Math.round(aiInteractions.reduce((sum, interaction) => sum + interaction.avgScore, 0) / aiInteractions.length) || 0}%
                        </div>
                        <div className="text-sm text-gray-500">Average AI Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {aiInteractions.reduce((sum, interaction) => sum + interaction.totalHints, 0)}
                        </div>
                        <div className="text-sm text-gray-500">Total Hints Given</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">
                          {aiInteractions.reduce((sum, interaction) => sum + interaction.totalSuggestions, 0)}
                        </div>
                        <div className="text-sm text-gray-500">Total Suggestions</div>
                      </div>
                    </div>

                    {/* Candidate Performance Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Candidate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Interactions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Avg Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Hints
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Suggestions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Code Quality
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Activity
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {aiInteractions.map((interaction, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {interaction.candidateEmail}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {interaction.totalInteractions}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  interaction.avgScore >= 80 ? 'bg-green-100 text-green-800' :
                                  interaction.avgScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {interaction.avgScore}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {interaction.totalHints}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {interaction.totalSuggestions}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {interaction.avgMaintainability?.toFixed(1) || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(interaction.lastInteraction).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No AI interaction data available yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Human-Readable Performance Summary */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Performance Summary</h3>
                <p className="text-sm text-gray-500">Human-readable analysis of candidate performance and problem-solving journey</p>
              </div>
              <div className="p-6">
                {aiInteractions.length > 0 ? (
                  <div className="space-y-4">
                    {aiInteractions.map((interaction, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            {interaction.candidateEmail}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {new Date(interaction.lastInteraction).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-700">
                          <p>
                            <strong>Performance Overview:</strong> This candidate has engaged in {interaction.totalInteractions} AI interactions 
                            with an average score of {interaction.avgScore}%. They have received {interaction.totalHints} hints and 
                            {interaction.totalSuggestions} suggestions from the AI system.
                          </p>
                          <p>
                            <strong>Code Quality:</strong> The candidate's code maintainability score averages {interaction.avgMaintainability?.toFixed(1) || 'N/A'}, 
                            indicating {interaction.avgMaintainability >= 80 ? 'excellent' : interaction.avgMaintainability >= 60 ? 'good' : 'needs improvement'} 
                            code quality practices.
                          </p>
                          <p>
                            <strong>Problem-Solving Journey:</strong> The candidate has attempted {interaction.problemsAttempted} different problems 
                            using {interaction.languagesUsed?.join(', ') || 'multiple'} programming languages. 
                            {interaction.totalLogicIssues > 0 ? ` They encountered ${interaction.totalLogicIssues} logic issues during their coding sessions.` : ' They showed strong logical thinking with minimal issues.'}
                          </p>
                          <p>
                            <strong>AI Assistance:</strong> The AI provided {interaction.totalHints} hints and {interaction.totalSuggestions} suggestions, 
                            indicating {interaction.totalHints > interaction.totalSuggestions ? 'the candidate needed more guidance on problem-solving approach' : 'the candidate had good problem-solving skills but needed refinement suggestions'}.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No performance summaries available yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Settings</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500">System settings will be implemented here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
