/**
 * Block Aligner Service
 * Creates aligned pairs for side-by-side display
 */

/**
 * Process aligned blocks to ensure proper rendering structure
 * Adds placeholders and prepares HTML for rendering
 * @param {Array} alignedBlocks - The aligned blocks from diffEngine
 * @returns {Array} Processed aligned blocks ready for frontend
 */
function processAlignedBlocks(alignedBlocks) {
  return alignedBlocks.map((entry, index) => {
    const processed = {
      index,
      left: processBlock(entry.left, 'left'),
      right: processBlock(entry.right, 'right'),
    };

    // Include word diff if present
    if (entry.wordDiff) {
      processed.wordDiff = entry.wordDiff;
    }

    return processed;
  });
}

/**
 * Process a single block for rendering
 */
function processBlock(blockEntry, side) {
  if (!blockEntry) {
    // Create placeholder for missing block
    return {
      isPlaceholder: true,
      status: 'placeholder',
      html: '<div class="placeholder-block"></div>',
    };
  }

  const { block, status } = blockEntry;

  return {
    isPlaceholder: false,
    type: block.type,
    id: block.id,
    status,
    content: block.content || '',
    html: block.html || '',
    // Include table-specific data
    ...(block.type === 'table' && { rows: block.rows }),
    // Include list-specific data
    ...(block.type === 'list' && { items: block.items, listType: block.listType }),
    // Include image-specific data
    ...(block.type === 'image' && { src: block.src }),
    // Include heading level
    ...(block.type === 'heading' && { level: block.level }),
  };
}

/**
 * Calculate the diff summary statistics
 */
function calculateDiffStats(alignedBlocks) {
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  for (const entry of alignedBlocks) {
    if (entry.left?.status === 'removed') removed++;
    if (entry.right?.status === 'added') added++;
    if (entry.left?.status === 'modified') modified++;
    if (entry.left?.status === 'unchanged') unchanged++;
  }

  return { added, removed, modified, unchanged };
}

module.exports = {
  processAlignedBlocks,
  calculateDiffStats,
};
