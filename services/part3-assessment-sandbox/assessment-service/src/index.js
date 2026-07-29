const express = require('express');
const cors = require('cors');
const assessmentRoutes = require('./routes/assessmentRoutes');

const app = express();
const PORT = process.env.PORT || 4004;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    service: 'assessment-service',
    status: 'UP',
    part: 'Part 3: Assessment Engine',
    timestamp: new Date()
  });
});

// Routes
app.use('/api/v1/assessment', assessmentRoutes);

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[Part 3] Assessment Engine Service running on port ${PORT}`);
});
