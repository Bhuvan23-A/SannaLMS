const db = require('../utils/db');
const s3 = require('../utils/s3');
const plagiarism = require('../utils/plagiarism');

/**
 * Handle Assignment Upload and Plagiarism Scanning
 */
exports.submitAssignment = async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { studentId, assignmentId } = req.body;
  const file = req.file;

  if (!tenantId || !studentId || !assignmentId || !file) {
    return res.status(400).json({ error: 'Missing required parameters or file' });
  }

  try {
    const schema = db.getTenantSchema(tenantId);
    
    // Save file buffer contents for plagiarism scanning
    const fileContent = file.buffer.toString('utf-8');

    // 1. Upload the file to tenant-isolated S3 container (MinIO)
    const fileKey = `assignments/${assignmentId}/${studentId}_${Date.now()}_${file.originalname}`;
    const fileUrl = await s3.uploadFile(tenantId, fileKey, file.buffer, file.mimetype);

    // 2. Perform Plagiarism Scan locally against all other student submissions for this assignment
    const existingSubmissions = await db.query(
      `SELECT id, student_id, code_content FROM ${schema}.assignment_submissions 
       WHERE assignment_id = $1 AND student_id != $2 AND code_content IS NOT NULL`,
      [assignmentId, studentId]
    );

    let maxSimilarity = 0;
    let flaggedAgainst = null;

    for (const sub of existingSubmissions.rows) {
      const score = plagiarism.calculateSimilarity(fileContent, sub.code_content);
      if (score > maxSimilarity) {
        maxSimilarity = score;
        flaggedAgainst = sub.student_id;
      }
    }

    const plagiarismStatus = maxSimilarity >= 60 ? 'FLAGGED' : 'CLEAN';

    // 3. Save submission details in PostgreSQL
    const insertResult = await db.query(
      `INSERT INTO ${schema}.assignment_submissions 
       (assignment_id, student_id, file_url, code_content, plagiarism_score, plagiarism_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, plagiarism_score, plagiarism_status, submitted_at`,
      [assignmentId, studentId, fileUrl, fileContent, maxSimilarity, plagiarismStatus]
    );

    res.json({
      message: 'Assignment submitted successfully',
      submissionId: insertResult.rows[0].id,
      fileUrl,
      plagiarismReport: {
        score: maxSimilarity,
        status: plagiarismStatus,
        flaggedAgainst: flaggedAgainst,
      },
      submittedAt: insertResult.rows[0].submitted_at,
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * Distribute submissions for anonymized Peer Reviews
 */
exports.assignPeerReviews = async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { assignmentId, reviewsPerStudent = 2 } = req.body;

  if (!tenantId || !assignmentId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const schema = db.getTenantSchema(tenantId);

    // Fetch all submissions
    const subQuery = await db.query(
      `SELECT id, student_id FROM ${schema}.assignment_submissions WHERE assignment_id = $1`,
      [assignmentId]
    );

    const submissions = subQuery.rows;
    if (submissions.length < 2) {
      return res.status(400).json({ error: 'Not enough submissions to start peer review' });
    }

    const allocations = [];

    // Distribute anonymized reviews
    // Simple round-robin shift to guarantee students don't review themselves
    for (let i = 0; i < submissions.length; i++) {
      const reviewer = submissions[i].student_id;
      
      let assignedCount = 0;
      let offset = 1;

      while (assignedCount < reviewsPerStudent && offset < submissions.length) {
        const targetIdx = (i + offset) % submissions.length;
        const targetSubmission = submissions[targetIdx];

        if (targetSubmission.student_id !== reviewer) {
          allocations.push({
            assignmentId,
            submissionId: targetSubmission.id,
            reviewerId: reviewer,
          });
          assignedCount++;
        }
        offset++;
      }
    }

    // Insert all peer reviews allocations into database
    for (const alloc of allocations) {
      await db.query(
        `INSERT INTO ${schema}.peer_reviews (assignment_id, submission_id, reviewer_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [alloc.assignmentId, alloc.submissionId, alloc.reviewerId]
      );
    }

    res.json({
      message: 'Peer reviews assigned successfully',
      totalAssignedReviews: allocations.length,
    });
  } catch (error) {
    console.error('Error assigning peer reviews:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * Submit Feedback and score for a Peer Review
 */
exports.submitPeerReview = async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { reviewerId, submissionId, score, feedback } = req.body;

  if (!tenantId || !reviewerId || !submissionId || score === undefined) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const schema = db.getTenantSchema(tenantId);

    const updateResult = await db.query(
      `UPDATE ${schema}.peer_reviews 
       SET score = $1, feedback = $2, submitted_at = CURRENT_TIMESTAMP
       WHERE submission_id = $3 AND reviewer_id = $4
       RETURNING id, submitted_at`,
      [parseInt(score, 10), feedback, submissionId, reviewerId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Peer review allocation not found for this reviewer' });
    }

    res.json({
      message: 'Peer review submitted successfully',
      reviewId: updateResult.rows[0].id,
      submittedAt: updateResult.rows[0].submitted_at,
    });
  } catch (error) {
    console.error('Error submitting peer review:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
