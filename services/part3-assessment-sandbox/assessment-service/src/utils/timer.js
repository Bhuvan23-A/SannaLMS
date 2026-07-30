const Redis = require('ioredis');

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

const redis = new Redis({
  host: redisHost,
  port: redisPort,
});

redis.on('connect', () => {
  console.log('[Redis] Connected to Redis server successfully');
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});

/**
 * Start an adaptive testing session
 */
async function startSession(tenantId, studentId, testId, durationSeconds) {
  const sessionKey = `test_session:${tenantId}:${studentId}:${testId}`;
  const now = Math.floor(Date.now() / 1000);
  
  const sessionData = {
    startTime: now,
    duration: durationSeconds,
    isCompleted: 'false',
    currentDifficulty: '2', // Start at 2 (Medium)
    completedQuestions: JSON.stringify([]),
    answers: JSON.stringify({}),
  };

  // Store in Redis with expiration buffer (5 minutes)
  await redis.hset(sessionKey, sessionData);
  await redis.expire(sessionKey, durationSeconds + 300);
  
  return {
    startTime: now,
    duration: durationSeconds,
    currentDifficulty: 2,
  };
}

/**
 * Check if the session is active and not expired
 */
async function validateSession(tenantId, studentId, testId) {
  const sessionKey = `test_session:${tenantId}:${studentId}:${testId}`;
  const session = await redis.hgetall(sessionKey);

  if (!session || Object.keys(session).length === 0) {
    return { valid: false, reason: 'Session not found or expired' };
  }

  if (session.isCompleted === 'true') {
    return { valid: false, reason: 'Test already submitted' };
  }

  const now = Math.floor(Date.now() / 1000);
  const startTime = parseInt(session.startTime, 10);
  const duration = parseInt(session.duration, 10);
  const timeElapsed = now - startTime;

  if (timeElapsed > duration) {
    // Mark as completed in Redis so we don't evaluate further
    await redis.hset(sessionKey, 'isCompleted', 'true');
    return { valid: false, reason: 'Time limit exceeded' };
  }

  return {
    valid: true,
    currentDifficulty: parseInt(session.currentDifficulty, 10),
    completedQuestions: JSON.parse(session.completedQuestions || '[]'),
    answers: JSON.parse(session.answers || '{}'),
    timeLeft: duration - timeElapsed,
  };
}

/**
 * Save progress and update adaptive state
 */
async function saveProgress(tenantId, studentId, testId, questionId, answer, difficulty, answeredCorrectly) {
  const sessionKey = `test_session:${tenantId}:${studentId}:${testId}`;
  const session = await validateSession(tenantId, studentId, testId);

  if (!session.valid) {
    throw new Error(session.reason);
  }

  // Update answers
  const updatedAnswers = { ...session.answers, [questionId]: answer };
  
  // Add to completed list
  const updatedCompleted = [...session.completedQuestions];
  if (!updatedCompleted.includes(questionId)) {
    updatedCompleted.push(questionId);
  }

  // Calculate new difficulty (Adaptive logic)
  // Simple bucketing: Correct moves up (max 3), Incorrect moves down (min 1)
  let newDifficulty = session.currentDifficulty;
  if (answeredCorrectly) {
    newDifficulty = Math.min(3, newDifficulty + 1);
  } else {
    newDifficulty = Math.max(1, newDifficulty - 1);
  }

  await redis.hset(sessionKey, {
    answers: JSON.stringify(updatedAnswers),
    completedQuestions: JSON.stringify(updatedCompleted),
    currentDifficulty: newDifficulty.toString(),
  });

  return {
    nextDifficulty: newDifficulty,
    timeLeft: session.timeLeft,
  };
}

/**
 * Finalize and submit the session
 */
async function finalizeSession(tenantId, studentId, testId) {
  const sessionKey = `test_session:${tenantId}:${studentId}:${testId}`;
  const session = await validateSession(tenantId, studentId, testId);

  if (!session.valid && session.reason !== 'Time limit exceeded') {
    throw new Error(session.reason);
  }

  // Mark as completed
  await redis.hset(sessionKey, 'isCompleted', 'true');

  const rawAnswers = await redis.hget(sessionKey, 'answers');
  return JSON.parse(rawAnswers || '{}');
}

module.exports = {
  startSession,
  validateSession,
  saveProgress,
  finalizeSession,
  redis,
};
