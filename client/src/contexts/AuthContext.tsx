import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  profile: {
    experience: string;
    preferredLanguages: string[];
    timezone?: string;
    avatar?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
  profile?: {
    experience: string;
    preferredLanguages: string[];
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults for Vite proxy
axios.defaults.baseURL = '/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      console.log('Initializing authentication...');
      
      // Wait a bit to ensure server is ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const storedToken = localStorage.getItem('token');
      console.log('Stored token:', storedToken ? 'exists' : 'not found');
      console.log('Token value:', storedToken);
      
      if (storedToken) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          console.log('Set axios header:', axios.defaults.headers.common['Authorization']);
          console.log('Making request to /auth/me...');
          
          // Add timeout to prevent hanging
          const response = await Promise.race([
            axios.get('/auth/me'),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Authentication timeout')), 5000)
            )
          ]);
          
          console.log('Auth response:', response.data);
          setUser((response.data as any).user);
          setToken(storedToken);
          console.log('Authentication successful');
        } catch (error: any) {
          console.error('Auth initialization failed:', error);
          // Only clear token if it's an authentication error, not a network error
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          } else {
            // For network errors, keep the token but set user to null
            setUser(null);
          }
        }
      }
      setLoading(false);
      console.log('Auth initialization complete');
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Login attempt ${attempt}/${maxRetries} with:`, { 
          email: typeof email === 'string' ? email : email?.email || email,
          emailType: typeof email,
          baseURL: axios.defaults.baseURL 
        });
        
        // Ensure we're sending the correct data format
        const loginData = {
          email: typeof email === 'string' ? email : email?.email || email,
          password: password
        };
        
        console.log('Sending login data:', loginData);
        const response = await axios.post('/auth/login', loginData);
        console.log('Login response:', response.data);
        const { token: newToken, user: userData } = response.data as any;
        
        localStorage.setItem('token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        setToken(newToken);
        setUser(userData);
        return; // Success, exit the retry loop
      } catch (error: any) {
        console.error(`Login attempt ${attempt} failed:`, error);
        lastError = error;
        
        // If it's a 500 error and we have retries left, wait and try again
        if (error.response?.status === 500 && attempt < maxRetries) {
          console.log(`Retrying in ${attempt * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        } else {
          break; // Exit retry loop
        }
      }
    }
    
    console.error('All login attempts failed:', lastError);
    throw new Error(lastError.response?.data?.error || 'Login failed after multiple attempts');
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      const { token: newToken, user: newUser } = response.data as any;
      
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setToken(newToken);
      setUser(newUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
