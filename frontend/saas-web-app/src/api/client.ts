import Keycloak from 'keycloak-js';
import axios from 'axios';

// Initialize Keycloak
const keycloakConfig = {
  url: 'http://localhost:8180',
  realm: 'sannalms',
  clientId: 'sannalms-client'
};

export const keycloak = new Keycloak(keycloakConfig);

// Setup API Client pointing to Kong Gateway
export const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Axios interceptor to automatically attach the token
apiClient.interceptors.request.use(
  async (config) => {
    if (keycloak.token) {
      // Refresh token if it expires in less than 30 seconds
      try {
        await keycloak.updateToken(30);
        config.headers.Authorization = `Bearer ${keycloak.token}`;
      } catch (error) {
        console.error('Failed to refresh token', error);
        keycloak.login();
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);
