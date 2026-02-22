const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Exact filename as provided - do not change
const HANDBOOK_FILENAME = 'חוברת לימוד עזרה ראשונה.pdf';

/**
 * GET /api/materials/download
 * Serves the handbook PDF with Content-Disposition: attachment so it downloads.
 * Looks in public/ first, then project root (for backwards compatibility).
 */
router.get('/download', (req, res) => {
  const rootDir = path.join(__dirname, '../..');
  const publicPath = path.join(rootDir, 'public', HANDBOOK_FILENAME);
  const rootPath = path.join(rootDir, HANDBOOK_FILENAME);

  let filePath = null;
  if (fs.existsSync(publicPath)) {
    filePath = publicPath;
  } else if (fs.existsSync(rootPath)) {
    filePath = rootPath;
  }

  if (!filePath) {
    return res.status(404).json({
      error: 'החוברת לא נמצאה. אנא הוסף את הקובץ "' + HANDBOOK_FILENAME + '" לתיקיית public/ או לשורש הפרויקט.'
    });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="' + HANDBOOK_FILENAME + '"');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending handbook:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'שגיאה בהורדת החוברת' });
      }
    }
  });
});

module.exports = router;
