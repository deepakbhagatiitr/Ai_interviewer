import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  Plus, 
  Play, 
  BarChart3, 
  LogOut, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Users
} from 'lucide-react';
import InterviewList from './InterviewList';
import CreateInterviewDialog from './CreateInterviewDialog';
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
    description: string;
    difficulty: string;
    category: string;
  };
  status: string;
  createdAt: string;
  finalScore?: {
    overall: number;
  };
}

const Dashboard: React.FC = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    fetchInterviews();
  }, []);

  // Redirect to login if not authenticated after loading
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateInterview = () => {
    if (!user || authLoading) {
      console.log('User not authenticated or still loading:', { user, authLoading });
      return;
    }
    setCreateDialogOpen(true);
  };

  const handleInterviewCreated = (newInterview: Interview) => {
    setInterviews([newInterview, ...interviews]);
    setCreateDialogOpen(false);
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600">
            {authLoading ? 'Authenticating...' : 'Loading interviews...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                CodeSage Admin Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCreateInterview}
                disabled={!user || authLoading}
                className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Interview
              </button>
              
              <button
                onClick={() => navigate('/reports')}
                className="btn-secondary flex items-center"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-600" />
                  </div>
                  <span className="text-gray-700">{user?.name}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      {user?.name} ({user?.role})
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your interviews and track your progress
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                <p className="text-2xl font-semibold text-gray-900">{interviews.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {interviews.filter(i => i.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {interviews.filter(i => i.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {interviews.filter(i => i.finalScore).length > 0
                    ? Math.round(
                        interviews
                          .filter(i => i.finalScore)
                          .reduce((sum, i) => sum + (i.finalScore?.overall || 0), 0) /
                        interviews.filter(i => i.finalScore).length
                      )
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Interviews */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Recent Interviews</h3>
          </div>
          <InterviewList
            interviews={interviews}
            onInterviewClick={(sessionId) => navigate(`/interview/${sessionId}`)}
          />
        </div>

        <CreateInterviewDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onInterviewCreated={handleInterviewCreated}
        />
      </main>
    </div>
  );
};

export default Dashboard;