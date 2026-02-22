const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('--- ניסיון התחברות ---');
  console.log('שם משתמש שהוזן:', username);

  if (!username || !password) {
    return res.status(400).json({ error: 'נא להזין שם משתמש וסיסמה' });
  }

  const trimmedUsername = String(username || '').trim().toLowerCase();

  // שימי לב: השאילתה מותאמת לשמות ב-Postgres
  db.get(
    'SELECT * FROM users WHERE LOWER(TRIM(username)) = ?',
    [trimmedUsername],
    async (err, user) => {
      if (err) {
        console.error('שגיאת בסיס נתונים:', err);
        return res.status(500).json({ error: 'שגיאה בבסיס הנתונים' });
      }

      if (!user) {
        console.log('תוצאה: המשתמש לא נמצא בטבלה');
        return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
      }

      console.log('תוצאה: המשתמש נמצא, בודק סיסמה...');
      
      // השוואת הסיסמה שהוזנה לסיסמה המוצפנת בבסיס הנתונים
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        console.log('תוצאה: הסיסמה לא תואמת');
        return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
      }

      console.log('תוצאה: התחברות הצליחה עבור:', user.username);

      // עדכון כניסה אחרונה (אם העמודה קיימת, אם לא - זה פשוט לא יעשה כלום)
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
          fullName: user.full_name || user.username, // מגבה למקרה שאין full_name
          role: user.role
        }
      });
    }
  );
});

// Register
router.post('/register', async (req, res) => {
  const { username, password, fullName, role = 'student' } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: 'נא למלא את כל השדות הנדרשים' });
  }

  const trimmedUsername = String(username || '').trim();
  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
    [trimmedUsername, hashedPassword, fullName, role],
    function(err) {
      if (err) {
        console.error('שגיאה ברישום:', err);
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
