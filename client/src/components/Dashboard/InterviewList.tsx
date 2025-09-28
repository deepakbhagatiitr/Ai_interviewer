import React from 'react';
import { Play, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react';

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
    allowedLanguages: string[];
  };
  status: string;
  createdAt: string;
  finalScore?: {
    overall: number;
  };
}

interface InterviewListProps {
  interviews: Interview[];
  onInterviewClick: (sessionId: string) => void;
}

const InterviewList: React.FC<InterviewListProps> = ({ interviews, onInterviewClick }) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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

  if (interviews.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <Clock className="h-12 w-12" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No interviews</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new interview.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Problem
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Candidate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Languages
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
            {interviews.map((interview) => (
              <tr key={interview._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {interview.problem.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {interview.problem.category}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {interview.candidate.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {interview.candidate.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(interview.problem.difficulty)}`}>
                    {interview.problem.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {interview.problem.allowedLanguages.slice(0, 3).map((language, index) => (
                      <span
                        key={index}
                        className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                      >
                        {language}
                      </span>
                    ))}
                    {interview.problem.allowedLanguages.length > 3 && (
                      <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        +{interview.problem.allowedLanguages.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(interview.status)}`}>
                    {getStatusIcon(interview.status)}
                    <span className="ml-1">{interview.status}</span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {interview.finalScore ? (
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {interview.finalScore.overall}/100
                      </div>
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
                  <div className="flex space-x-2">
                    {interview.status === 'scheduled' && (
                      <button
                        onClick={() => onInterviewClick(interview.sessionId)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                        title="Start Interview"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </button>
                    )}
                    {interview.status === 'in_progress' && (
                      <button
                        onClick={() => onInterviewClick(interview.sessionId)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                        title="Continue Interview"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Continue
                      </button>
                    )}
                    {interview.status === 'completed' && (
                      <button
                        onClick={() => onInterviewClick(interview.sessionId)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                        title="View Interview"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InterviewList;