const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי Excel מותרים (.xlsx, .xls)'));
    }
  }
});

// Get all users (instructor only)
router.get('/', authenticateToken, requireRole(['instructor', 'admin']), (req, res) => {
  db.all(
    'SELECT id, username, full_name, role, created_at, last_login FROM users ORDER BY full_name',
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת המשתמשים' });
      }
      res.json(users);
    }
  );
});

// Get user by ID
router.get('/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;

  // Users can only see their own info, instructors can see all
  if (req.user.id.toString() !== userId.toString() && req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'אין הרשאה לצפות במידע זה' });
  }

  db.get(
    'SELECT id, username, full_name, role, created_at, last_login FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'משתמש לא נמצא' });
      }
      res.json(user);
    }
  );
});

// Create user (instructor only)
router.post('/', authenticateToken, requireRole(['instructor', 'admin']), async (req, res) => {
  const { username, password, fullName, role = 'student' } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: 'נא למלא את כל השדות הנדרשים' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, fullName, role],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'שם המשתמש כבר קיים' });
        }
        return res.status(500).json({ error: 'שגיאה ביצירת משתמש' });
      }

      res.json({
        id: this.lastID,
        username,
        fullName,
        role
      });
    }
  );
});

// Update users from Excel file (instructor only)
router.post('/update-from-excel', authenticateToken, requireRole(['instructor', 'admin']), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'לא הועלה קובץ' });
  }

  try {
    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Validate structure
    if (data.length === 0) {
      fs.unlinkSync(req.file.path); // Delete uploaded file
      return res.status(400).json({ error: 'הקובץ ריק או לא מכיל נתונים' });
    }

    // Check required columns
    const firstRow = data[0];
    if (!firstRow.hasOwnProperty('username') || !firstRow.hasOwnProperty('password')) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'הקובץ חייב להכיל עמודות: username ו-password' });
    }

    const results = {
      updated: 0,
      created: 0,
      errors: []
    };

    // Process each row sequentially
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const username = String(row.username || '').trim();
      const password = String(row.password || '').trim();

      // Validate row
      if (!username) {
        results.errors.push(`שורה ${i + 2}: שם משתמש חסר`);
        continue;
      }

      if (!password) {
        results.errors.push(`שורה ${i + 2}: סיסמה חסרה`);
        continue;
      }

      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists and update/create
        // Use same matching logic as login: LOWER(TRIM(username))
        await new Promise((resolve) => {
          const lowerUsername = username.toLowerCase();
          db.get('SELECT id, username FROM users WHERE LOWER(TRIM(username)) = ?', [lowerUsername], (err, existingUser) => {
            if (err) {
              console.error(`Error checking user ${username}:`, err);
              results.errors.push(`שורה ${i + 2}: שגיאה בבדיקת משתמש - ${err.message}`);
              resolve();
              return;
            }

            if (existingUser) {
              // Update existing user - use the actual username from DB to avoid case mismatch
              db.run(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, existingUser.id],
                function(updateErr) {
                  if (updateErr) {
                    console.error(`Error updating user ${username}:`, updateErr);
                    results.errors.push(`שורה ${i + 2}: שגיאה בעדכון משתמש ${username} - ${updateErr.message}`);
                  } else {
                    console.log(`Updated user: ${existingUser.username} (ID: ${existingUser.id})`);
                    results.updated++;
                  }
                  resolve();
                }
              );
            } else {
              // Create new user
              const fullName = username; // Default full_name to username
              const role = 'student'; // Default role

              db.run(
                'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
                [username, hashedPassword, fullName, role],
                function(insertErr) {
                  if (insertErr) {
                    if (insertErr.message.includes('UNIQUE constraint failed')) {
                      console.error(`User ${username} already exists (UNIQUE constraint)`);
                      results.errors.push(`שורה ${i + 2}: שם משתמש ${username} כבר קיים`);
                    } else {
                      console.error(`Error creating user ${username}:`, insertErr);
                      results.errors.push(`שורה ${i + 2}: שגיאה ביצירת משתמש ${username} - ${insertErr.message}`);
                    }
                  } else {
                    console.log(`Created new user: ${username} (ID: ${this.lastID})`);
                    results.created++;
                  }
                  resolve();
                }
              );
            }
          });
        });
      } catch (error) {
        results.errors.push(`שורה ${i + 2}: שגיאה בעיבוד - ${error.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'עדכון משתמשים הושלם',
      results: {
        updated: results.updated,
        created: results.created,
        total: results.updated + results.created,
        errors: results.errors.length > 0 ? results.errors : undefined
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error processing Excel file:', error);
    res.status(500).json({ error: 'שגיאה בעיבוד קובץ Excel: ' + error.message });
  }
});

// Get users from Excel file (read from users.xlsx in root)
router.post('/sync-from-excel', authenticateToken, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const excelPath = path.join(process.cwd(), 'users.xlsx');

    // Check if file exists
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({ error: 'קובץ users.xlsx לא נמצא בתיקיית הפרויקט' });
    }

    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Validate structure
    if (data.length === 0) {
      return res.status(400).json({ error: 'הקובץ ריק או לא מכיל נתונים' });
    }

    // Check required columns
    const firstRow = data[0];
    if (!firstRow.hasOwnProperty('username') || !firstRow.hasOwnProperty('password')) {
      return res.status(400).json({ error: 'הקובץ חייב להכיל עמודות: username ו-password' });
    }

    const results = {
      updated: 0,
      created: 0,
      errors: []
    };

    // Process each row sequentially
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const username = String(row.username || '').trim();
      const password = String(row.password || '').trim();

      // Validate row
      if (!username) {
        results.errors.push(`שורה ${i + 2}: שם משתמש חסר`);
        continue;
      }

      if (!password) {
        results.errors.push(`שורה ${i + 2}: סיסמה חסרה`);
        continue;
      }

      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists and update/create
        // Use same matching logic as login: LOWER(TRIM(username))
        await new Promise((resolve) => {
          const lowerUsername = username.toLowerCase();
          db.get('SELECT id, username FROM users WHERE LOWER(TRIM(username)) = ?', [lowerUsername], async (err, existingUser) => {
            if (err) {
              console.error(`Error checking user ${username}:`, err);
              results.errors.push(`שורה ${i + 2}: שגיאה בבדיקת משתמש - ${err.message}`);
              resolve();
              return;
            }

            if (existingUser) {
              // Update existing user - use the actual username from DB to avoid case mismatch
              db.run(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, existingUser.id],
                function(updateErr) {
                  if (updateErr) {
                    console.error(`Error updating user ${username}:`, updateErr);
                    results.errors.push(`שורה ${i + 2}: שגיאה בעדכון משתמש ${username} - ${updateErr.message}`);
                  } else {
                    console.log(`Updated user: ${existingUser.username} (ID: ${existingUser.id})`);
                    results.updated++;
                  }
                  resolve();
                }
              );
            } else {
              // Create new user
              const fullName = username; // Default full_name to username
              const role = 'student'; // Default role

              db.run(
                'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
                [username, hashedPassword, fullName, role],
                function(insertErr) {
                  if (insertErr) {
                    if (insertErr.message.includes('UNIQUE constraint failed')) {
                      console.error(`User ${username} already exists (UNIQUE constraint)`);
                      results.errors.push(`שורה ${i + 2}: שם משתמש ${username} כבר קיים`);
                    } else {
                      console.error(`Error creating user ${username}:`, insertErr);
                      results.errors.push(`שורה ${i + 2}: שגיאה ביצירת משתמש ${username} - ${insertErr.message}`);
                    }
                  } else {
                    console.log(`Created new user: ${username} (ID: ${this.lastID})`);
                    results.created++;
                  }
                  resolve();
                }
              );
            }
          });
        });
      } catch (error) {
        results.errors.push(`שורה ${i + 2}: שגיאה בעיבוד - ${error.message}`);
      }
    }

    res.json({
      message: 'סנכרון משתמשים הושלם',
      results: {
        updated: results.updated,
        created: results.created,
        total: results.updated + results.created,
        errors: results.errors.length > 0 ? results.errors : undefined
      }
    });
  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({ error: 'שגיאה בעיבוד קובץ Excel: ' + error.message });
  }
});

module.exports = router;
