import React, { createContext, useContext, useState, useEffect } from 'react';
import { keycloak } from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  initError: string | null;
  login: () => void;
  logout: () => void;
  userProfile: any | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    keycloak.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    }).then((authenticated) => {
      setIsAuthenticated(authenticated);
      setIsInitialized(true);
      if (authenticated) {
        keycloak.loadUserProfile().then(profile => {
          setUserProfile(profile);
        });
      }
    }).catch((err) => {
      console.error("Keycloak initialization failed", err);
      setInitError("Failed to connect to Keycloak SSO Server. Error: " + (err?.error || err?.message || JSON.stringify(err) || "Unknown Error"));
      setIsInitialized(true); // Always set initialized to true so the UI can render
    });
  }, []);

  const login = () => keycloak.login({ redirectUri: typeof window !== 'undefined' ? window.location.href : undefined });
  const logout = () => keycloak.logout({ redirectUri: typeof window !== 'undefined' ? window.location.origin : undefined });

  return (
    <AuthContext.Provider value={{ isAuthenticated, isInitialized, initError, login, logout, userProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
