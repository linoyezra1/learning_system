const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'נא להזין שם משתמש וסיסמה' });
  }

  // Trim username to match how it's stored from Excel
  const trimmedUsername = String(username || '').trim().toLowerCase();

  if (!trimmedUsername) {
    return res.status(400).json({ error: 'נא להזין שם משתמש תקין' });
  }

  db.get(
    'SELECT * FROM users WHERE LOWER(TRIM(username)) = ?',
    [trimmedUsername],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בבסיס הנתונים' });
      }

      if (!user) {
        return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
      }

      // Update last login
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role
        }
      });
    }
  );
});

// Register (for testing - should be restricted in production)
router.post('/register', async (req, res) => {
  const { username, password, fullName, role = 'student' } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: 'נא למלא את כל השדות הנדרשים' });
  }

  // Trim username to match how it's stored from Excel
  const trimmedUsername = String(username || '').trim();

  if (!trimmedUsername) {
    return res.status(400).json({ error: 'נא להזין שם משתמש תקין' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
    [trimmedUsername, hashedPassword, fullName, role],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'שם המשתמש כבר קיים' });
        }
        return res.status(500).json({ error: 'שגיאה ביצירת משתמש' });
      }

      res.json({
        message: 'משתמש נוצר בהצלחה',
        userId: this.lastID
      });
    }
  );
});

// Verify token
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'לא נמצא טוקן' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'טוקן לא תקין' });
    }

    db.get('SELECT id, username, full_name, role FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'משתמש לא נמצא' });
      }

      res.json({ user });
    });
  });
});

module.exports = router;



