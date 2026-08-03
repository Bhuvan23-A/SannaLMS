const db = require('../utils/db');
const timer = require('../utils/timer');

/**
 * Start an adaptive testing session
 */
exports.startTestSession = async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { studentId, testId, durationSeconds } = req.body;

  if (!tenantId || !studentId || !testId || !durationSeconds) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const schema = db.getTenantSchema(tenantId);
    
    // Check if student has already submitted this test
    const subCheck = await db.query(
      `SELECT id FROM ${schema}.submissions WHERE student_id = $1 AND test_id = $2`,
      [studentId, testId]
    );

    if (subCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Test already submitted previously' });
    }

    // Initialize session in Redis
    const session = await timer.startSession(tenantId, studentId, testId, parseInt(durationSeconds, 10));

    // Fetch the first question of Medium difficulty (difficulty = 2)
    const questionQuery = await db.query(
      `SELECT id, text, type, options, difficulty, points FROM ${schema}.questions WHERE difficulty = $1 ORDER BY RANDOM() LIMIT 1`,
      [2]
    );

    let firstQuestion = null;
    if (questionQuery.rows.length > 0) {
      firstQuestion = questionQuery.rows[0];
    }

    res.json({
      message: 'Session started successfully',
      timeLeft: session.duration,
      difficulty: session.currentDifficulty,
      question: firstQuestion,
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Submit answer for a question and retrieve the next question (Adaptive Selector)
 */
exports.submitAnswer = async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { studentId, testId, questionId, answer } = req.body;

  if (!tenantId || !studentId || !testId || !questionId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const schema = db.getTenantSchema(tenantId);

    // 1. Validate timer session in Redis
    const session = await timer.validateSession(tenantId, studentId, testId);
    if (!session.valid) {
      return res.status(400).json({ error: session.reason });
    }

    // 2. Fetch correct answer from DB to check correctness
    const qQuery = await db.query(
      `SELECT correct_option, points, difficulty FROM ${schema}.questions WHERE id = $1`,
      [questionId]
    );

    if (qQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = qQuery.rows[0];
    const isCorrect = (question.correct_option === answer);

    // 3. Save progress and update difficulty state dynamically in Redis
    const progress = await timer.saveProgress(
      tenantId,
      studentId,
      testId,
      questionId,
      answer,
      question.difficulty,
      isCorrect
    );

    // Add current question to completed list
    const completedList = [...session.completedQuestions];
    if (!completedList.includes(questionId)) {
      completedList.push(questionId);
    }

    // 4. Fetch the next question based on the new adaptive difficulty
    let nextQuestion = null;
    const targetDifficulty = progress.nextDifficulty;

    // Try target difficulty first
    let nextQQuery = await db.query(
      `SELECT id, text, type, options, difficulty, points 
       FROM ${schema}.questions 
       WHERE difficulty = $1 AND id NOT IN (SELECT unnest($2::uuid[])) 
       ORDER BY RANDOM() LIMIT 1`,
      [targetDifficulty, completedList.length > 0 ? completedList : [null]]
    );

    // If target difficulty bucket has no questions left, try fallback to any difficulty
    if (nextQQuery.rows.length === 0) {
      nextQQuery = await db.query(
        `SELECT id, text, type, options, difficulty, points 
         FROM ${schema}.questions 
         WHERE id NOT IN (SELECT unnest($1::uuid[])) 
         ORDER BY RANDOM() LIMIT 1`,
        [completedList.length > 0 ? completedList : [null]]
      );
    }

    if (nextQQuery.rows.length > 0) {
      nextQuestion = nextQQuery.rows[0];
    }

    res.json({
      message: 'Answer processed',
      correct: isCorrect,
      timeLeft: progress.timeLeft,
      nextDifficulty: targetDifficulty,
      question: nextQuestion, // Will be null if test is completed (no more questions)
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * Finalize the test and save score to PostgreSQL
 */
exports.submitTest = async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { studentId, testId } = req.body;

  if (!tenantId || !studentId || !testId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const schema = db.getTenantSchema(tenantId);

    // 1. Retrieve all answers from Redis and finalize the session
    const answers = await timer.finalizeSession(tenantId, studentId, testId);
    const questionIds = Object.keys(answers);

    let totalScore = 0;

    if (questionIds.length > 0) {
      // 2. Fetch all corresponding questions to evaluate
      const qQuery = await db.query(
        `SELECT id, correct_option, points, negative_points FROM ${schema}.questions WHERE id IN (SELECT unnest($1::uuid[]))`,
        [questionIds]
      );

      const questionsMap = {};
      qQuery.rows.forEach(q => {
        questionsMap[q.id] = q;
      });

      // Calculate score with negative marking
      for (const [qId, ans] of Object.entries(answers)) {
        const question = questionsMap[qId];
        if (question) {
          if (question.correct_option === ans) {
            totalScore += question.points || 10;
          } else {
            totalScore -= question.negative_points || 0;
          }
        }
      }
    }

    // 3. Save final submission details in PostgreSQL
    const submissionResult = await db.query(
      `INSERT INTO ${schema}.submissions (student_id, test_id, score, answers)
       VALUES ($1, $2, $3, $4) RETURNING id, score, submitted_at`,
      [studentId, testId, totalScore, JSON.stringify(answers)]
    );

    // Clean up Redis session key
    const sessionKey = `test_session:${tenantId}:${studentId}:${testId}`;
    await timer.redis.del(sessionKey);

    res.json({
      message: 'Test submitted and saved successfully',
      submissionId: submissionResult.rows[0].id,
      score: submissionResult.rows[0].score,
      submittedAt: submissionResult.rows[0].submitted_at,
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
