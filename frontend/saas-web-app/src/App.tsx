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
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#f87171', background: '#0f172a', fontFamily: 'system-ui, sans-serif', padding: '20px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)', padding: '24px', borderRadius: '12px', maxWidth: '500px', backdropFilter: 'blur(8px)' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#f87171' }}>SSO Connection Error</h2>
          <p style={{ color: '#cbd5e1', margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5' }}>{initError}</p>
          <button onClick={() => window.location.reload()} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/control-center" element={<ControlCenter />} />
        <Route path="/part3" element={<Part3Console />} />
      </Routes>

    </BrowserRouter>
  );
};

export default App;
