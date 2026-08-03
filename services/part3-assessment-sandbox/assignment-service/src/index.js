const express = require('express');
const cors = require('cors');
const assignmentRoutes = require('./routes/assignmentRoutes');

const app = express();
const PORT = process.env.PORT || 4005;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    service: 'assignment-service',
    status: 'UP',
    part: 'Part 3: Assignment & Plagiarism Engine',
    timestamp: new Date()
  });
});

// Routes
app.use('/api/v1/assignment', assignmentRoutes);

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[Part 3] Assignment & Plagiarism Engine Service running on port ${PORT}`);
});
