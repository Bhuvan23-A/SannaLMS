import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ControlCenter from './ControlCenter';
import { Dashboard } from './pages/Dashboard';
import Part3Console from './pages/Part3Console';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, login } = useAuth();
  
  if (!isAuthenticated) {
    login();
    return null;
  }
  return children;
};

const App: React.FC = () => {
  const { isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#94a3b8', background: '#0f172a' }}>
        <div>Initializing Secure SSO Session...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ControlCenter />} />
        <Route path="/part3" element={<Part3Console />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
