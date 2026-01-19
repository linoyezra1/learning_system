const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all courses
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM courses ORDER BY created_at DESC', (err, courses) => {
    if (err) {
      return res.status(500).json({ error: 'שגיאה בטעינת הקורסים' });
    }
    res.json(courses);
  });
});

// Get course with modules
router.get('/:courseId', authenticateToken, (req, res) => {
  const { courseId } = req.params;

  db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) {
      return res.status(404).json({ error: 'קורס לא נמצא' });
    }

    db.all(
      'SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC',
      [courseId],
      (err, modules) => {
        if (err) {
          return res.status(500).json({ error: 'שגיאה בטעינת הנושאים' });
        }
        res.json({ ...course, modules });
      }
    );
  });
});

// Create course (instructor only)
router.post('/', authenticateToken, requireRole(['instructor', 'admin']), (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'נא להזין כותרת לקורס' });
  }

  db.run(
    'INSERT INTO courses (title, description) VALUES (?, ?)',
    [title, description],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'שגיאה ביצירת קורס' });
      }
      res.json({ id: this.lastID, title, description });
    }
  );
});

// Create module (instructor only)
router.post('/:courseId/modules', authenticateToken, requireRole(['instructor', 'admin']), (req, res) => {
  const { courseId } = req.params;
  const { title, orderIndex } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'נא להזין כותרת לנושא' });
  }

  db.run(
    'INSERT INTO modules (course_id, title, order_index) VALUES (?, ?, ?)',
    [courseId, title, orderIndex || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'שגיאה ביצירת נושא' });
      }
      res.json({ id: this.lastID, courseId, title, orderIndex: orderIndex || 0 });
    }
  );
});

module.exports = router;



