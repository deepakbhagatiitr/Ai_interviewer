import React, { useState, useEffect } from 'react';
import { X, Plus, X as CloseIcon } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

interface CreateInterviewDialogProps {
  open: boolean;
  onClose: () => void;
  onInterviewCreated: (interview: any) => void;
}


const CreateInterviewDialog: React.FC<CreateInterviewDialogProps> = ({
  open,
  onClose,
  onInterviewCreated
}) => {
  const { user, loading: authLoading } = useAuth();
  
  // Debug user object
  useEffect(() => {
    console.log('User object changed:', user);
    console.log('User ID:', user?.id);
    console.log('Auth loading:', authLoading);
  }, [user, authLoading]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    category: 'general',
    timeLimit: 60,
    allowedLanguages: [] as string[]
  });

  const availableLanguages = ['JavaScript', 'Python', 'C++'];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const languages = availableLanguages;
  const difficulties = ['easy', 'medium', 'hard'];
  const categories = ['general', 'algorithms', 'data-structures', 'system-design', 'frontend', 'backend'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLanguageToggle = (language: string) => {
    setFormData({
      ...formData,
      allowedLanguages: formData.allowedLanguages.includes(language)
        ? formData.allowedLanguages.filter(lang => lang !== language)
        : [...formData.allowedLanguages, language]
    });
  };

  const testAPICall = async () => {
    try {
      console.log('Testing API call...');
      const response = await axios.post('/interview/generate-problem-content', {
        title: "Test Palindrome",
        description: "Write a function that determines whether a given string is a palindrome.",
        difficulty: "easy",
        category: "algorithms",
        allowedLanguages: ["JavaScript", "Python"]
      });
      console.log('Test API response:', response.data);
      alert('API test successful! Check console for details.');
    } catch (error: any) {
      console.error('Test API error:', error);
      alert(`API test failed: ${error.response?.data?.error || error.message}`);
    }
  };

  const generateProblemContent = async (formData: any) => {
    try {
      console.log('Making API call to generate problem content...');
      console.log('Current token:', localStorage.getItem('token'));
      console.log('Axios headers:', axios.defaults.headers.common);
      
      // Test if we can make a simple authenticated call first
      try {
        const testResponse = await axios.get('/auth/me');
        console.log('Auth test successful:', testResponse.data);
      } catch (authError) {
        console.error('Auth test failed:', authError);
        throw new Error('Authentication failed. Please login again.');
      }
      
      const response = await axios.post('/interview/generate-problem-content', {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        category: formData.category,
        allowedLanguages: formData.allowedLanguages
      });
      console.log('API response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error generating problem content:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      
      // Show error to user instead of silently falling back
      setError(`Failed to generate test cases: ${error.response?.data?.error || error.message}`);
      
      // Fallback to basic content
      return {
        testCases: [
          {
            input: "example input",
            expectedOutput: "expected output",
            explanation: "Basic test case - please customize based on your problem"
          },
          {
            input: "edge case input",
            expectedOutput: "edge case output",
            explanation: "Edge case test - please customize based on your problem"
          }
        ],
        constraints: [
          "Input will be valid according to the problem description",
          "Output should match the expected format",
          "Handle edge cases appropriately"
        ]
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate required fields
    if (!formData.title.trim()) {
      setError('Problem title is required');
      setLoading(false);
      return;
    }
    if (!formData.description.trim()) {
      setError('Problem description is required');
      setLoading(false);
      return;
    }
    if (!formData.allowedLanguages || formData.allowedLanguages.length === 0) {
      setError('Please select at least one programming language');
      setLoading(false);
      return;
    }
    
    // Check if user is loaded and has an ID
    if (!user || !user.id) {
      setError('Please wait for authentication to complete or try logging in again.');
      setLoading(false);
      return;
    }

        try {
          // Generate test cases and constraints using AI
          const generatedContent = await generateProblemContent(formData);
          console.log('Generated content:', generatedContent);
          
          const problem = {
            title: formData.title,
            description: formData.description,
            difficulty: formData.difficulty,
            category: formData.category,
            timeLimit: formData.timeLimit,
            allowedLanguages: formData.allowedLanguages,
            testCases: generatedContent.testCases,
            constraints: generatedContent.constraints
          };

      const requestData = {
        problem,
        candidateId: user.id,
        interviewerId: undefined // No interviewer for now
      };

      console.log('Sending request data:', requestData);
      console.log('User ID:', user?.id);
      console.log('Problem title:', problem.title);
      console.log('Form data:', formData);
      console.log('User object:', user);

      const response = await axios.post('/interview', requestData);

      onInterviewCreated((response.data as any).interview);
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        difficulty: 'medium',
        category: 'general',
        timeLimit: 60,
        allowedLanguages: []
      });
    } catch (err: any) {
      console.error('Error creating interview:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to create interview');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Don't render if user is not loaded or authentication is still loading
  if (authLoading || !user) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">
                  {authLoading ? 'Authenticating...' : 'Loading user data...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Interview</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="label">
                    Candidate
                  </label>
                  <div className="input bg-gray-50 text-gray-700">
                    {user ? `${user.name} (${user.email})` : 'Loading...'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    You will be the candidate for this interview
                  </p>
                </div>

                <div>
                  <label htmlFor="title" className="label">
                    Problem Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="input"
                    placeholder="e.g., Calculate Factorial"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="label">
                    Problem Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="input"
                    placeholder="e.g., Write a function to calculate the factorial of a given number n. The factorial of n is the product of all positive integers less than or equal to n."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="difficulty" className="label">
                      Difficulty
                    </label>
                    <select
                      id="difficulty"
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleChange}
                      className="input"
                    >
                      {difficulties.map((diff) => (
                        <option key={diff} value={diff}>
                          {diff.charAt(0).toUpperCase() + diff.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="category" className="label">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="input"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="timeLimit" className="label">
                      Time Limit (min)
                    </label>
                    <input
                      type="number"
                      id="timeLimit"
                      name="timeLimit"
                      value={formData.timeLimit}
                      onChange={handleChange}
                      min="15"
                      max="180"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">
                    Allowed Languages *
                  </label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {languages.map((language) => (
                        <button
                          key={language}
                          type="button"
                          onClick={() => handleLanguageToggle(language)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            formData.allowedLanguages.includes(language)
                              ? 'bg-primary-100 text-primary-800 border border-primary-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                    {formData.allowedLanguages.length === 0 && (
                      <p className="text-sm text-red-600">Please select at least one programming language</p>
                    )}
                    {formData.allowedLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {formData.allowedLanguages.map((language) => (
                          <span
                            key={language}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                          >
                            {language}
                            <button
                              type="button"
                              onClick={() => handleLanguageToggle(language)}
                              className="ml-1 h-3 w-3 rounded-full hover:bg-primary-200"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={testAPICall}
                className="w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Test API
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Interview'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateInterviewDialog;