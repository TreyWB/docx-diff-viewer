const Diff = require('diff');
const { normalize, similarity } = require('../utils/textNormalizer');

/**
 * Compare two parsed documents and generate diff
 * @param {Object} original - Parsed original document
 * @param {Object} modified - Parsed modified document
 * @returns {Object} Diff result with aligned blocks
 */
function diffDocuments(original, modified) {
  const leftBlocks = original.blocks;
  const rightBlocks = modified.blocks;

  // Match blocks using LCS
  const matches = matchBlocks(leftBlocks, rightBlocks);

  // Build aligned output
  const alignedBlocks = buildAlignedBlocks(leftBlocks, rightBlocks, matches);

  return { alignedBlocks };
}

/**
 * Match blocks between two documents using LCS algorithm
 */
function matchBlocks(leftBlocks, rightBlocks) {
  const m = leftBlocks.length;
  const n = rightBlocks.length;

  // Build similarity matrix
  const simMatrix = [];
  for (let i = 0; i < m; i++) {
    simMatrix[i] = [];
    for (let j = 0; j < n; j++) {
      simMatrix[i][j] = blockSimilarity(leftBlocks[i], rightBlocks[j]);
    }
  }

  // LCS with similarity threshold
  const SIMILARITY_THRESHOLD = 0.3;
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (simMatrix[i - 1][j - 1] >= SIMILARITY_THRESHOLD) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find matches
  const matches = [];
  let i = m,
    j = n;

  while (i > 0 && j > 0) {
    if (simMatrix[i - 1][j - 1] >= SIMILARITY_THRESHOLD && dp[i][j] === dp[i - 1][j - 1] + 1) {
      matches.unshift({ left: i - 1, right: j - 1, similarity: simMatrix[i - 1][j - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return matches;
}

/**
 * Calculate similarity between two blocks
 */
function blockSimilarity(blockA, blockB) {
  // Different types have low similarity
  if (blockA.type !== blockB.type) {
    return 0;
  }

  // For tables, compare structure and content
  if (blockA.type === 'table') {
    return tableSimilarity(blockA, blockB);
  }

  // For other blocks, compare text content
  return similarity(blockA.content, blockB.content);
}

/**
 * Calculate similarity between two tables
 */
function tableSimilarity(tableA, tableB) {
  const rowsA = tableA.rows || [];
  const rowsB = tableB.rows || [];

  if (rowsA.length === 0 && rowsB.length === 0) return 1;
  if (rowsA.length === 0 || rowsB.length === 0) return 0;

  // Compare cell contents
  let totalCells = 0;
  let matchingCells = 0;

  const maxRows = Math.max(rowsA.length, rowsB.length);
  for (let r = 0; r < maxRows; r++) {
    const cellsA = rowsA[r]?.cells || [];
    const cellsB = rowsB[r]?.cells || [];
    const maxCells = Math.max(cellsA.length, cellsB.length);

    for (let c = 0; c < maxCells; c++) {
      totalCells++;
      const contentA = normalize(cellsA[c]?.content || '');
      const contentB = normalize(cellsB[c]?.content || '');
      if (contentA === contentB) {
        matchingCells++;
      }
    }
  }

  return totalCells > 0 ? matchingCells / totalCells : 1;
}

/**
 * Build aligned blocks from matches
 */
function buildAlignedBlocks(leftBlocks, rightBlocks, matches) {
  const aligned = [];
  let leftIdx = 0;
  let rightIdx = 0;
  let matchIdx = 0;

  while (leftIdx < leftBlocks.length || rightIdx < rightBlocks.length) {
    const currentMatch = matches[matchIdx];

    // Check if we have a match at current position
    if (currentMatch && currentMatch.left === leftIdx && currentMatch.right === rightIdx) {
      // Matched blocks
      const leftBlock = leftBlocks[leftIdx];
      const rightBlock = rightBlocks[rightIdx];
      const isModified = currentMatch.similarity < 1;

      const entry = {
        left: {
          block: leftBlock,
          status: isModified ? 'modified' : 'unchanged',
        },
        right: {
          block: rightBlock,
          status: isModified ? 'modified' : 'unchanged',
        },
      };

      // Generate word-level diff for modified blocks
      if (isModified) {
        entry.wordDiff = generateWordDiff(leftBlock, rightBlock);
      }

      aligned.push(entry);
      leftIdx++;
      rightIdx++;
      matchIdx++;
    } else if (currentMatch && leftIdx < currentMatch.left && rightIdx < currentMatch.right) {
      // Both sides have unmatched blocks before next match
      // Emit left as removed
      aligned.push({
        left: {
          block: leftBlocks[leftIdx],
          status: 'removed',
        },
        right: null,
      });
      leftIdx++;
    } else if (currentMatch && leftIdx < currentMatch.left) {
      // Left has unmatched blocks
      aligned.push({
        left: {
          block: leftBlocks[leftIdx],
          status: 'removed',
        },
        right: null,
      });
      leftIdx++;
    } else if (currentMatch && rightIdx < currentMatch.right) {
      // Right has unmatched blocks
      aligned.push({
        left: null,
        right: {
          block: rightBlocks[rightIdx],
          status: 'added',
        },
      });
      rightIdx++;
    } else if (!currentMatch && leftIdx < leftBlocks.length) {
      // No more matches, remaining left blocks are removed
      aligned.push({
        left: {
          block: leftBlocks[leftIdx],
          status: 'removed',
        },
        right: null,
      });
      leftIdx++;
    } else if (!currentMatch && rightIdx < rightBlocks.length) {
      // No more matches, remaining right blocks are added
      aligned.push({
        left: null,
        right: {
          block: rightBlocks[rightIdx],
          status: 'added',
        },
      });
      rightIdx++;
    } else {
      // Safety break
      break;
    }
  }

  return aligned;
}

/**
 * Generate word-level diff between two blocks
 */
function generateWordDiff(leftBlock, rightBlock) {
  if (leftBlock.type === 'table' && rightBlock.type === 'table') {
    return generateTableDiff(leftBlock, rightBlock);
  }

  const leftText = normalize(leftBlock.content || '');
  const rightText = normalize(rightBlock.content || '');

  const diff = Diff.diffWords(leftText, rightText);

  return diff.map((part) => ({
    value: part.value,
    added: part.added || false,
    removed: part.removed || false,
  }));
}

/**
 * Generate cell-level diff for tables
 */
function generateTableDiff(leftTable, rightTable) {
  const leftRows = leftTable.rows || [];
  const rightRows = rightTable.rows || [];
  const maxRows = Math.max(leftRows.length, rightRows.length);

  const rowDiffs = [];

  for (let r = 0; r < maxRows; r++) {
    const leftCells = leftRows[r]?.cells || [];
    const rightCells = rightRows[r]?.cells || [];
    const maxCells = Math.max(leftCells.length, rightCells.length);

    const cellDiffs = [];

    for (let c = 0; c < maxCells; c++) {
      const leftContent = normalize(leftCells[c]?.content || '');
      const rightContent = normalize(rightCells[c]?.content || '');

      if (leftContent === rightContent) {
        cellDiffs.push({
          left: { content: leftContent, status: 'unchanged' },
          right: { content: rightContent, status: 'unchanged' },
        });
      } else if (!leftCells[c]) {
        cellDiffs.push({
          left: null,
          right: { content: rightContent, status: 'added' },
        });
      } else if (!rightCells[c]) {
        cellDiffs.push({
          left: { content: leftContent, status: 'removed' },
          right: null,
        });
      } else {
        // Cell content changed
        const wordDiff = Diff.diffWords(leftContent, rightContent);
        cellDiffs.push({
          left: { content: leftContent, status: 'modified' },
          right: { content: rightContent, status: 'modified' },
          wordDiff: wordDiff.map((part) => ({
            value: part.value,
            added: part.added || false,
            removed: part.removed || false,
          })),
        });
      }
    }

    rowDiffs.push({
      leftRowExists: r < leftRows.length,
      rightRowExists: r < rightRows.length,
      cells: cellDiffs,
    });
  }

  return { type: 'table', rows: rowDiffs };
}

module.exports = { diffDocuments };
