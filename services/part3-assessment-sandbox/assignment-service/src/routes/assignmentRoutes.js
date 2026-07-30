const express = require('express');
const multer = require('multer');
const router = express.Router();
const controller = require('../controllers/assignmentController');

// Multer memory storage configuration for clean buffer processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

router.post('/submit', upload.single('file'), controller.submitAssignment);
router.post('/peer-review/assign', controller.assignPeerReviews);
router.post('/peer-review/submit', controller.submitPeerReview);

module.exports = router;
