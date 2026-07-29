/**
 * SannaLMS Local Demo: Plagiarism Winnowing and Adaptive Testing Selection Simulation
 */

// ==========================================
// 1. Plagiarism Winnowing Engine (Standalone)
// ==========================================

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function cleanCode(code) {
  // Remove comments
  let cleaned = code.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/#.*$/gm, '');
  cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');
  cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');
  // Remove whitespaces and convert to lowercase
  cleaned = cleaned.replace(/\s+/g, '').toLowerCase();
  return cleaned;
}

function getKGrams(text, k = 12) {
  const kGrams = [];
  if (text.length < k) return kGrams;
  for (let i = 0; i <= text.length - k; i++) {
    kGrams.push(text.substring(i, i + k));
  }
  return kGrams;
}

function winnow(hashes, w = 4) {
  const fingerprints = new Set();
  const n = hashes.length;
  if (n < w) {
    let minVal = Infinity;
    hashes.forEach(h => { if (h < minVal) minVal = h; });
    if (minVal !== Infinity) fingerprints.add(minVal);
    return fingerprints;
  }
  for (let i = 0; i <= n - w; i++) {
    let minVal = Infinity;
    for (let j = 0; j < w; j++) {
      if (hashes[i + j] < minVal) minVal = hashes[i + j];
    }
    fingerprints.add(minVal);
  }
  return fingerprints;
}

function getFingerprint(code) {
  const cleaned = cleanCode(code);
  const kGrams = getKGrams(cleaned, 12);
  const hashes = kGrams.map(hashString);
  return winnow(hashes, 4);
}

function calculateSimilarity(code1, code2) {
  const fp1 = getFingerprint(code1);
  const fp2 = getFingerprint(code2);
  if (fp1.size === 0 || fp2.size === 0) return 0;

  let intersectionCount = 0;
  fp1.forEach(hash => {
    if (fp2.has(hash)) intersectionCount++;
  });

  const unionSize = fp1.size + fp2.size - intersectionCount;
  return Math.round(((intersectionCount / unionSize) * 100) * 100) / 100;
}

// ==========================================
// 2. Adaptive Testing Engine Simulator
// ==========================================

class AdaptiveTestSimulator {
  constructor(studentName, durationSeconds = 60) {
    this.studentName = studentName;
    this.duration = durationSeconds;
    this.startTime = Math.floor(Date.now() / 1000);
    this.currentDifficulty = 2; // Start at Medium
    this.completedQuestions = [];
    this.score = 0;
  }

  // Get difficulty string
  getDifficultyLabel(level) {
    if (level === 1) return 'EASY';
    if (level === 2) return 'MEDIUM';
    return 'HARD';
  }

  // Process student response
  submitAnswer(questionText, points, isCorrect) {
    const timeElapsed = Math.floor(Date.now() / 1000) - this.startTime;
    const timeLeft = this.duration - timeElapsed;

    console.log(`\n[Test Session] Student: ${this.studentName} | Time Left: ${timeLeft}s`);
    console.log(`> Question: "${questionText}"`);
    console.log(`> Answer Submitted is: ${isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}`);

    if (isCorrect) {
      this.score += points;
      // Scale up difficulty (max 3)
      this.currentDifficulty = Math.min(3, this.currentDifficulty + 1);
    } else {
      // Scale down difficulty (min 1)
      this.currentDifficulty = Math.max(1, this.currentDifficulty - 1);
    }

    console.log(`> Score: ${this.score} pts`);
    console.log(`> Dynamic Difficulty adjusted to: ${this.getDifficultyLabel(this.currentDifficulty)} (Level ${this.currentDifficulty})`);
  }
}

// ==========================================
// 3. Execution/Demo Run
// ==========================================

console.log("===============================================================");
console.log("             SANNALMS PART 3 STANDALONE DEMO RUN               ");
console.log("===============================================================");

// Test 1: Winnowing Plagiarism engine
console.log("\n--- TEST 1: Code Plagiarism Winnowing Engine ---");

const originalPythonCode = `
# Python implementation to add two numbers
def solve(a, b):
    # This function sums two numbers
    result = a + b
    return result

print(solve(5, 10))
`;

const plagiarizedPythonCode = `
def solve(x, y):
    # Replaced variable names and modified comments
    val = x + y
    return val

print(solve(5, 10))
`;

const differentPythonCode = `
def print_squares(n):
    for i in range(n):
        print(i * i)
`;

console.log("Comparing Original Code vs Modified (Variable names changed, comments modified):");
const score1 = calculateSimilarity(originalPythonCode, plagiarizedPythonCode);
console.log(`👉 Plagiarism Similarity Score: ${score1}% (Status: ${score1 >= 60 ? '⚠️ FLAGGED' : 'CLEAN'})`);

console.log("\nComparing Original Code vs Entirely Different Function:");
const score2 = calculateSimilarity(originalPythonCode, differentPythonCode);
console.log(`👉 Plagiarism Similarity Score: ${score2}% (Status: ${score2 >= 60 ? '⚠️ FLAGGED' : 'CLEAN'})`);

// Test 2: Adaptive Testing engine simulation
console.log("\n--- TEST 2: Adaptive Difficulty Selection Simulator ---");
const test = new AdaptiveTestSimulator("Adithya");

// Question 1: Start at Medium
test.submitAnswer("What is the time complexity of binary search?", 10, true);

// Question 2: Scaled to Hard
test.submitAnswer("Describe Dijkstra's algorithm using priority queues.", 20, true);

// Question 3: Scaled to Hard
test.submitAnswer("Prove P vs NP using Turing machines.", 30, false);

// Question 4: Scaled down to Medium
test.submitAnswer("Implement a stack using two queues.", 15, false);

// Question 5: Scaled down to Easy
test.submitAnswer("What is the keyword to define a function in Python?", 5, true);

console.log("\n===============================================================");
console.log("Demo Completed Successfully!");
console.log("===============================================================");
