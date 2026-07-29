/**
 * Local Code Plagiarism Detection Engine using the Winnowing Algorithm
 */

// Simple string hashing function (similar to Java's String.hashCode but positive)
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Tokenize/Clean code by removing whitespaces, comments, and normalizing variable placeholders
 */
function cleanCode(code) {
  // 1. Remove single-line comments
  let cleaned = code.replace(/\/\/.*$/gm, '');
  // 2. Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  // 3. Remove Python single/multi line comments
  cleaned = cleaned.replace(/#.*$/gm, '');
  cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');
  cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');
  // 4. Remove all whitespaces and convert to lowercase
  cleaned = cleaned.replace(/\s+/g, '').toLowerCase();
  
  return cleaned;
}

/**
 * Generate k-grams from cleaned text
 */
function getKGrams(text, k = 12) {
  const kGrams = [];
  if (text.length < k) {
    return kGrams;
  }
  for (let i = 0; i <= text.length - k; i++) {
    kGrams.push(text.substring(i, i + k));
  }
  return kGrams;
}

/**
 * Winnowing Algorithm to select fingerprints from k-gram hashes
 */
function winnow(hashes, w = 4) {
  const fingerprints = new Set();
  const n = hashes.length;
  if (n < w) {
    // If not enough hashes for a window, just select the minimum
    let minVal = Infinity;
    hashes.forEach(h => {
      if (h < minVal) minVal = h;
    });
    if (minVal !== Infinity) fingerprints.add(minVal);
    return fingerprints;
  }

  // Sliding window of size w
  for (let i = 0; i <= n - w; i++) {
    let minVal = Infinity;
    for (let j = 0; j < w; j++) {
      if (hashes[i + j] < minVal) {
        minVal = hashes[i + j];
      }
    }
    fingerprints.add(minVal);
  }

  return fingerprints;
}

/**
 * Generate document fingerprint
 */
function getFingerprint(code) {
  const cleaned = cleanCode(code);
  const kGrams = getKGrams(cleaned, 12);
  const hashes = kGrams.map(hashString);
  return winnow(hashes, 4);
}

/**
 * Calculate Jaccard similarity score between two code files (0 to 100)
 */
function calculateSimilarity(code1, code2) {
  if (!code1 || !code2) return 0;

  const fp1 = getFingerprint(code1);
  const fp2 = getFingerprint(code2);

  if (fp1.size === 0 || fp2.size === 0) return 0;

  // Find intersection
  let intersectionCount = 0;
  fp1.forEach(hash => {
    if (fp2.has(hash)) {
      intersectionCount++;
    }
  });

  const unionSize = fp1.size + fp2.size - intersectionCount;
  const similarity = (intersectionCount / unionSize) * 100;
  
  return Math.round(similarity * 100) / 100;
}

module.exports = {
  cleanCode,
  calculateSimilarity,
};
