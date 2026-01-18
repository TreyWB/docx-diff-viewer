const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseDocx } = require('../services/docxParser');
const { diffDocuments } = require('../services/diffEngine');
const { processAlignedBlocks, calculateDiffStats } = require('../services/blockAligner');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.docx') {
    cb(new Error('Only .docx files are allowed'));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const uploadFields = upload.fields([
  { name: 'original', maxCount: 1 },
  { name: 'modified', maxCount: 1 },
]);

/**
 * POST /api/diff
 * Compare two docx files and return the diff
 */
router.post('/diff', (req, res, next) => {
  uploadFields(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    const uploadedFiles = [];

    try {
      // Validate files were uploaded
      if (!req.files || !req.files.original || !req.files.modified) {
        return res.status(400).json({
          error: 'Both original and modified .docx files are required',
        });
      }

      const originalFile = req.files.original[0];
      const modifiedFile = req.files.modified[0];

      uploadedFiles.push(originalFile.path, modifiedFile.path);

      // Read file buffers
      const originalBuffer = fs.readFileSync(originalFile.path);
      const modifiedBuffer = fs.readFileSync(modifiedFile.path);

      // Parse both documents
      const [originalDoc, modifiedDoc] = await Promise.all([
        parseDocx(originalBuffer),
        parseDocx(modifiedBuffer),
      ]);

      // Generate diff
      const diffResult = diffDocuments(originalDoc, modifiedDoc);

      // Process for frontend
      const alignedBlocks = processAlignedBlocks(diffResult.alignedBlocks);
      const stats = calculateDiffStats(diffResult.alignedBlocks);

      // Clean up uploaded files
      cleanupFiles(uploadedFiles);

      res.json({
        success: true,
        stats,
        alignedBlocks,
      });
    } catch (error) {
      // Clean up uploaded files on error
      cleanupFiles(uploadedFiles);
      next(error);
    }
  });
});

/**
 * Clean up uploaded files
 */
function cleanupFiles(files) {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (err) {
      console.error('Failed to clean up file:', file, err.message);
    }
  }
}

module.exports = router;
