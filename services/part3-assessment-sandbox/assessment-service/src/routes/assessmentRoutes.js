const express = require('express');
const router = express.Router();
const controller = require('../controllers/assessmentController');

router.post('/start', controller.startTestSession);
router.post('/submit-answer', controller.submitAnswer);
router.post('/submit-test', controller.submitTest);

// Edulateral CodeLab Routes (CL-016 - CL-030)
router.post('/autosave', controller.autosaveProgress);
router.get('/session-state', controller.getSessionState);
router.post('/integrity-event', controller.logIntegrityEvent);
router.get('/live-monitor/:testId', controller.getLiveMonitor);
router.post('/similarity', controller.checkCodeSimilarity);
router.get('/codelab/daily-challenge', controller.getDailyChallenge);
router.get('/codelab/skills/:studentId', controller.getStudentSkills);
router.post('/codelab/submit-problem', controller.submitCodingProblem);

module.exports = router;

