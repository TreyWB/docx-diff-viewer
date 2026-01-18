/**
 * Diff Renderer
 * Renders the diff result to the DOM
 */

const DiffRenderer = {
  render(data) {
    const leftContent = document.getElementById('left-content');
    const rightContent = document.getElementById('right-content');

    // Clear existing content
    leftContent.innerHTML = '';
    rightContent.innerHTML = '';

    // Update stats
    this.updateStats(data.stats);

    // Render each aligned block pair
    for (const entry of data.alignedBlocks) {
      const leftBlock = this.renderBlock(entry.left, entry.wordDiff, 'left');
      const rightBlock = this.renderBlock(entry.right, entry.wordDiff, 'right');

      leftContent.appendChild(leftBlock);
      rightContent.appendChild(rightBlock);
    }
  },

  updateStats(stats) {
    document.getElementById('stat-added').textContent = stats.added;
    document.getElementById('stat-removed').textContent = stats.removed;
    document.getElementById('stat-modified').textContent = stats.modified;
    document.getElementById('stat-unchanged').textContent = stats.unchanged;
    document.getElementById('stats').style.display = 'flex';
  },

  renderBlock(blockData, wordDiff, side) {
    const div = document.createElement('div');
    div.className = 'diff-block';

    if (!blockData || blockData.isPlaceholder) {
      div.classList.add('placeholder');
      div.innerHTML = '<div class="placeholder-block"></div>';
      return div;
    }

    div.classList.add(blockData.status);

    // Handle different block types
    switch (blockData.type) {
      case 'table':
        div.innerHTML = this.renderTable(blockData, wordDiff, side);
        break;
      case 'image':
        div.innerHTML = this.renderImage(blockData);
        break;
      default:
        div.innerHTML = this.renderText(blockData, wordDiff, side);
    }

    return div;
  },

  renderText(block, wordDiff, side) {
    // If there's word-level diff and it's not a table diff
    if (wordDiff && Array.isArray(wordDiff)) {
      return this.applyWordDiff(wordDiff, side, block.type, block.level);
    }

    // Use original HTML
    return block.html || `<p>${this.escapeHtml(block.content)}</p>`;
  },

  applyWordDiff(wordDiff, side, type, level) {
    const parts = [];

    for (const part of wordDiff) {
      if (part.added && side === 'left') {
        // Skip added parts on left side
        continue;
      }
      if (part.removed && side === 'right') {
        // Skip removed parts on right side
        continue;
      }

      let className = '';
      if (part.removed) {
        className = 'diff-word-removed';
      } else if (part.added) {
        className = 'diff-word-added';
      }

      if (className) {
        parts.push(`<span class="${className}">${this.escapeHtml(part.value)}</span>`);
      } else {
        parts.push(this.escapeHtml(part.value));
      }
    }

    const content = parts.join('');

    // Wrap in appropriate tag
    if (type === 'heading' && level) {
      return `<h${level}>${content}</h${level}>`;
    }
    return `<p>${content}</p>`;
  },

  renderTable(block, wordDiff, side) {
    // If we have table-specific word diff
    if (wordDiff && wordDiff.type === 'table') {
      return this.renderTableWithDiff(block, wordDiff, side);
    }

    // Render original table HTML
    return block.html;
  },

  renderTableWithDiff(block, tableDiff, side) {
    const rows = [];

    for (let r = 0; r < tableDiff.rows.length; r++) {
      const rowDiff = tableDiff.rows[r];
      const rowExists = side === 'left' ? rowDiff.leftRowExists : rowDiff.rightRowExists;

      if (!rowExists) {
        // Row doesn't exist on this side - render placeholder cells
        const placeholderCells = rowDiff.cells.map(() => '<td class="placeholder-block"></td>').join('');
        rows.push(`<tr>${placeholderCells}</tr>`);
        continue;
      }

      const cells = [];
      for (const cellDiff of rowDiff.cells) {
        const cellData = side === 'left' ? cellDiff.left : cellDiff.right;

        if (!cellData) {
          cells.push('<td class="placeholder-block"></td>');
          continue;
        }

        const cellClass = `cell-${cellData.status}`;

        // Apply word diff if available
        if (cellDiff.wordDiff && cellData.status === 'modified') {
          const content = this.applyWordDiffContent(cellDiff.wordDiff, side);
          cells.push(`<td class="${cellClass}">${content}</td>`);
        } else {
          cells.push(`<td class="${cellClass}">${this.escapeHtml(cellData.content)}</td>`);
        }
      }

      rows.push(`<tr>${cells.join('')}</tr>`);
    }

    return `<table>${rows.join('')}</table>`;
  },

  applyWordDiffContent(wordDiff, side) {
    const parts = [];

    for (const part of wordDiff) {
      if (part.added && side === 'left') continue;
      if (part.removed && side === 'right') continue;

      let className = '';
      if (part.removed) className = 'diff-word-removed';
      else if (part.added) className = 'diff-word-added';

      if (className) {
        parts.push(`<span class="${className}">${this.escapeHtml(part.value)}</span>`);
      } else {
        parts.push(this.escapeHtml(part.value));
      }
    }

    return parts.join('');
  },

  renderImage(block) {
    if (block.src) {
      return `<img src="${block.src}" alt="Document image" />`;
    }
    return block.html;
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
