const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
const PORT = process.env.PORT || 4001;
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'master';

const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, {}, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token', details: err.message });
    }
    req.user = decoded;
    
    // Extract tenant from token (Keycloak custom attribute or simply passing it in header)
    req.tenant = req.headers['x-tenant-id'] || 'default';
    
    next();
  });
};

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'UP', part: 'Part 1: Infrastructure & Security' });
});

// Protected endpoint to verify identity and tenant
app.get('/api/v1/auth/me', requireAuth, (req, res) => {
  res.json({
    message: 'Identity verified successfully',
    tenant: req.tenant,
    user: {
      id: req.user.sub,
      email: req.user.email,
      username: req.user.preferred_username
    }
  });
});

// Authentication endpoint placeholder
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password, tenantId } = req.body;
  res.json({
    message: 'Login successful placeholder. In production, authenticate directly via Keycloak.',
    tenant: tenantId || 'default',
    token: 'jwt_mock_token_sannalms_2026',
    user: { email, role: 'STUDENT' }
  });
});

app.listen(PORT, () => {
  console.log(`[Part 1] Auth Service running on port ${PORT}`);
});
