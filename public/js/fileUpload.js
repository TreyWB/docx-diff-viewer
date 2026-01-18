/**
 * File Upload Handler
 * Handles file selection and upload to the server
 */

const FileUpload = {
  originalFile: null,
  modifiedFile: null,

  init() {
    const originalInput = document.getElementById('original');
    const modifiedInput = document.getElementById('modified');
    const originalButton = document.querySelector('#original-wrapper .file-button');
    const modifiedButton = document.querySelector('#modified-wrapper .file-button');

    // Click on button triggers file input
    originalButton.addEventListener('click', (e) => {
      e.stopPropagation();
      originalInput.click();
    });
    modifiedButton.addEventListener('click', (e) => {
      e.stopPropagation();
      modifiedInput.click();
    });

    // Handle file selection
    originalInput.addEventListener('change', (e) => {
      this.handleFileSelect(e, 'original');
    });

    modifiedInput.addEventListener('change', (e) => {
      this.handleFileSelect(e, 'modified');
    });
  },

  handleFileSelect(event, type) {
    const file = event.target.files[0];
    const nameSpan = document.getElementById(`${type}-name`);
    const wrapper = document.getElementById(`${type}-wrapper`);
    const button = wrapper.querySelector('.file-button');

    if (!file) {
      nameSpan.textContent = 'No file selected';
      button.textContent = 'Choose file';
      wrapper.classList.remove('has-file');
      this[`${type}File`] = null;
      this.updateCompareButton();
      return;
    }

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.docx')) {
      this.showError('Please select a .docx file');
      event.target.value = '';
      nameSpan.textContent = 'No file selected';
      button.textContent = 'Choose file';
      wrapper.classList.remove('has-file');
      this[`${type}File`] = null;
      this.updateCompareButton();
      return;
    }

    nameSpan.textContent = file.name;
    button.textContent = 'Change file';
    wrapper.classList.add('has-file');
    this[`${type}File`] = file;
    this.updateCompareButton();
  },

  updateCompareButton() {
    const compareBtn = document.getElementById('compare');
    compareBtn.disabled = !(this.originalFile && this.modifiedFile);
  },

  getFileNames() {
    return {
      original: this.originalFile ? this.originalFile.name : 'Original',
      modified: this.modifiedFile ? this.modifiedFile.name : 'Modified',
    };
  },

  async upload() {
    if (!this.originalFile || !this.modifiedFile) {
      this.showError('Please select both files');
      return null;
    }

    const formData = new FormData();
    formData.append('original', this.originalFile);
    formData.append('modified', this.modifiedFile);

    try {
      const response = await fetch('/api/diff', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to compare documents');
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  reset() {
    // Clear file selections
    this.originalFile = null;
    this.modifiedFile = null;

    // Reset inputs
    document.getElementById('original').value = '';
    document.getElementById('modified').value = '';

    // Reset UI
    ['original', 'modified'].forEach((type) => {
      const nameSpan = document.getElementById(`${type}-name`);
      const wrapper = document.getElementById(`${type}-wrapper`);
      const button = wrapper.querySelector('.file-button');

      nameSpan.textContent = 'No file selected';
      button.textContent = 'Choose file';
      wrapper.classList.remove('has-file');
    });

    this.updateCompareButton();
  },

  showError(message) {
    const errorEl = document.getElementById('error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';

    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  },
};
