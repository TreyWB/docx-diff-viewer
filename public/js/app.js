/**
 * Main Application Logic
 * Orchestrates file upload, diff rendering, and scroll sync
 */

const App = {
  init() {
    FileUpload.init();
    ScrollSync.init();

    const compareBtn = document.getElementById('compare');
    const resetBtn = document.getElementById('reset');

    compareBtn.addEventListener('click', () => this.handleCompare());
    resetBtn.addEventListener('click', () => this.handleReset());
  },

  showView(view) {
    // Remove all view classes
    document.body.classList.remove('compare-view', 'loading-view');

    // Add the appropriate class
    if (view === 'compare') {
      document.body.classList.add('compare-view');
    } else if (view === 'loading') {
      document.body.classList.add('loading-view');
    }
    // 'landing' is the default (no class needed)
  },

  async handleCompare() {
    const error = document.getElementById('error');

    // Hide error and show loading
    error.style.display = 'none';
    this.showView('loading');

    try {
      // Get file names before upload
      const fileNames = FileUpload.getFileNames();

      const result = await FileUpload.upload();

      if (result && result.success) {
        // Update panel headers with file names
        document.getElementById('left-header').textContent = fileNames.original;
        document.getElementById('right-header').textContent = fileNames.modified;

        // Render the diff
        DiffRenderer.render(result);

        // Show compare view
        this.showView('compare');
        ScrollSync.reset();
      } else {
        throw new Error(result?.error || 'Failed to compare documents');
      }
    } catch (err) {
      error.textContent = err.message;
      error.style.display = 'block';
      this.showView('landing');
    }
  },

  handleReset() {
    // Clear diff content
    document.getElementById('left-content').innerHTML = '';
    document.getElementById('right-content').innerHTML = '';

    // Reset file uploads
    FileUpload.reset();

    // Reset stats
    document.getElementById('stat-added').textContent = '0';
    document.getElementById('stat-removed').textContent = '0';
    document.getElementById('stat-modified').textContent = '0';
    document.getElementById('stat-unchanged').textContent = '0';

    // Show landing page
    this.showView('landing');
  },
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
