const express = require('express');
const router = express.Router();
const controller = require('../controllers/assessmentController');

router.post('/start', controller.startTestSession);
router.post('/submit-answer', controller.submitAnswer);
router.post('/submit-test', controller.submitTest);

module.exports = router;
