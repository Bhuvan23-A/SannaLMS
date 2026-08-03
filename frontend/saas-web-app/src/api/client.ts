import Keycloak from 'keycloak-js';
import axios from 'axios';

// Dynamically resolve the base URL — works in localhost AND production server
const getBaseUrl = () => window.location.origin;

// Initialize Keycloak — uses relative /auth/ path proxied by NGINX
const keycloakConfig = {
  url: `${getBaseUrl()}/auth`,
  realm: 'sannalms',
  clientId: 'sannalms-client'
};

export const keycloak = new Keycloak(keycloakConfig);

// Setup API Client — uses relative /api/ path proxied by NGINX to Kong Gateway
export const apiClient = axios.create({
  baseURL: '/api/v1',
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
