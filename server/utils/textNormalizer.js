/**
 * Normalize text for comparison while preserving original for display
 */

/**
 * Normalize text by collapsing whitespace and trimming
 * @param {string} text - The text to normalize
 * @returns {string} Normalized text
 */
function normalize(text) {
  if (!text) return '';

  return text
    // Replace non-breaking spaces with regular spaces
    .replace(/\u00A0/g, ' ')
    // Replace various unicode whitespace characters
    .replace(/[\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    // Normalize line breaks to single space
    .replace(/[\r\n]+/g, ' ')
    // Collapse multiple whitespaces to single space
    .replace(/\s+/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Normalize text and convert to lowercase for case-insensitive comparison
 * @param {string} text - The text to normalize
 * @returns {string} Normalized lowercase text
 */
function normalizeForComparison(text) {
  return normalize(text).toLowerCase();
}

/**
 * Split text into words for word-level diffing
 * @param {string} text - The text to split
 * @returns {string[]} Array of words
 */
function splitIntoWords(text) {
  if (!text) return [];

  // Split on whitespace but keep punctuation attached to words
  return normalize(text).split(/\s+/).filter((word) => word.length > 0);
}

/**
 * Calculate similarity ratio between two strings (0 to 1)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity ratio
 */
function similarity(a, b) {
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return 1;
  if (!normA || !normB) return 0;

  const wordsA = splitIntoWords(normA);
  const wordsB = splitIntoWords(normB);

  if (wordsA.length === 0 && wordsB.length === 0) return 1;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  // Count matching words
  const setA = new Set(wordsA.map((w) => w.toLowerCase()));
  const setB = new Set(wordsB.map((w) => w.toLowerCase()));

  let matches = 0;
  for (const word of setA) {
    if (setB.has(word)) matches++;
  }

  // Jaccard similarity
  const union = new Set([...setA, ...setB]);
  return matches / union.size;
}

module.exports = {
  normalize,
  normalizeForComparison,
  splitIntoWords,
  similarity,
};
