/**
 * Scroll Synchronization
 * Keeps both panels scrolled to the same position
 */

const ScrollSync = {
  leftPanel: null,
  rightPanel: null,
  isScrolling: false,
  scrollTimeout: null,

  init() {
    this.leftPanel = document.getElementById('left-content');
    this.rightPanel = document.getElementById('right-content');

    this.leftPanel.addEventListener('scroll', () => this.handleScroll('left'));
    this.rightPanel.addEventListener('scroll', () => this.handleScroll('right'));
  },

  handleScroll(source) {
    // Prevent feedback loops
    if (this.isScrolling) return;

    this.isScrolling = true;

    const sourcePanel = source === 'left' ? this.leftPanel : this.rightPanel;
    const targetPanel = source === 'left' ? this.rightPanel : this.leftPanel;

    // Calculate scroll percentage
    const scrollPercentage = sourcePanel.scrollTop / (sourcePanel.scrollHeight - sourcePanel.clientHeight);

    // Apply to target panel
    requestAnimationFrame(() => {
      const targetScrollTop = scrollPercentage * (targetPanel.scrollHeight - targetPanel.clientHeight);

      if (isFinite(targetScrollTop)) {
        targetPanel.scrollTop = targetScrollTop;
      }

      // Debounce to prevent feedback
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 50);
    });
  },

  reset() {
    if (this.leftPanel) this.leftPanel.scrollTop = 0;
    if (this.rightPanel) this.rightPanel.scrollTop = 0;
  },
};
