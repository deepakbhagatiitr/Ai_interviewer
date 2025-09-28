import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinInterview: (sessionId: string) => void;
  leaveInterview: () => void;
  sendCodeChange: (data: CodeChangeData) => void;
  requestHint: (data: HintRequestData) => void;
  sendAudioData: (data: AudioData) => void;
  runTests: (data: TestRequestData) => void;
  completeInterview: () => void;
}

interface CodeChangeData {
  code: string;
  language: string;
  cursorPosition?: { line: number; column: number };
}

interface HintRequestData {
  code: string;
  language: string;
}

interface AudioData {
  audioBuffer: ArrayBuffer;
  type: 'speech_to_text' | 'text_to_speech';
  duration?: number;
}

interface TestRequestData {
  code: string;
  language: string;
  testCases: any[];
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    if (token && user) {
      const newSocket = io(SOCKET_URL, {
        auth: {
          token
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [token, user]);

  const joinInterview = (sessionId: string) => {
    if (socket) {
      socket.emit('join_interview', { sessionId });
    }
  };

  const leaveInterview = () => {
    if (socket) {
      socket.emit('leave_interview');
    }
  };

  const sendCodeChange = (data: CodeChangeData) => {
    if (socket) {
      socket.emit('code_change', data);
    }
  };

  const requestHint = (data: HintRequestData) => {
    if (socket) {
      socket.emit('request_hint', data);
    }
  };

  const sendAudioData = (data: AudioData) => {
    if (socket) {
      socket.emit('audio_data', data);
    }
  };

  const runTests = (data: TestRequestData) => {
    if (socket) {
      socket.emit('run_tests', data);
    }
  };

  const completeInterview = () => {
    if (socket) {
      socket.emit('complete_interview');
    }
  };

  const value = {
    socket,
    connected,
    joinInterview,
    leaveInterview,
    sendCodeChange,
    requestHint,
    sendAudioData,
    runTests,
    completeInterview
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
