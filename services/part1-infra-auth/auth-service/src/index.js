const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'UP', part: 'Part 1: Infrastructure & Security' });
});

// Authentication endpoint placeholder
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password, tenantId } = req.body;
  res.json({
    message: 'Login successful placeholder',
    tenant: tenantId || 'default',
    token: 'jwt_mock_token_sannalms_2026',
    user: { email, role: 'STUDENT' }
  });
});

app.listen(PORT, () => {
  console.log(`[Part 1] Auth Service running on port ${PORT}`);
});
