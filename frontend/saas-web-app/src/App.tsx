import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ControlCenter from './ControlCenter';
import { Dashboard } from './pages/Dashboard';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, login } = useAuth();
  
  if (!isAuthenticated) {
    login();
    return null;
  }
  return children;
};

const App: React.FC = () => {
  const { isInitialized, initError } = useAuth();

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#94a3b8', background: '#0f172a' }}>
        <div>Initializing Secure SSO Session...</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#ef4444', background: '#0f172a', padding: '2rem', textAlign: 'center' }}>
        <div>
          <h2>Connection Error</h2>
          <p>{initError}</p>
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem' }}>Please run `docker-compose up -d` to start Keycloak on port 8080.</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ControlCenter />} />
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
