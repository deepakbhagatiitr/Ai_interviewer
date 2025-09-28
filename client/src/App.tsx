import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Admin Components
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';

// Candidate Components
import CandidateLogin from './components/Candidate/CandidateLogin';
import CandidateRegister from './components/Candidate/CandidateRegister';
import CandidateChat from './components/Candidate/CandidateChat';
import CandidateCoding from './components/Candidate/CandidateCoding';

import './index.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Candidate Routes */}
              <Route path="/candidate" element={<CandidateLogin />} />
              <Route path="/candidate/login" element={<CandidateLogin />} />
              <Route path="/candidate/register" element={<CandidateRegister />} />
              <Route
                path="/candidate/chat"
                element={
                  <ProtectedRoute requiredRole="candidate">
                    <CandidateChat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/coding"
                element={
                  <ProtectedRoute requiredRole="candidate">
                    <CandidateCoding />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/candidate" replace />} />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;