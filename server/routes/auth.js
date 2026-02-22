const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const trimmedUsername = String(username || '').trim().toLowerCase();

  db.get(
    'SELECT * FROM users WHERE LOWER(TRIM(username)) = ?',
    [trimmedUsername],
    async (err, user) => {
      if (err) return res.status(500).json({ error: 'שגיאה בבסיס הנתונים' });
      if (!user) return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // כאן התיקון הקריטי: אנחנו שולחים גם full_name וגם fullName
      // כדי לוודא שה-Frontend מוצא את מה שהוא מחפש
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name || user.username,
          fullName: user.full_name || user.username, 
          role: user.role
        }
      });
    }
  );
});

router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'לא נמצא טוקן' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'טוקן לא תקין' });

    db.get('SELECT id, username, role FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'משתמש לא נמצא' });
      
      res.json({ 
        user: {
          ...user,
          full_name: user.username,
          fullName: user.username
        } 
      });
    });
  });
});

module.exports = router;
