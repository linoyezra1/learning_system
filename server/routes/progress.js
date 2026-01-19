const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get user's own progress
router.get('/my-progress', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    `SELECT 
      up.*,
      c.title as course_title,
      ROUND((CAST(up.completed_slides AS FLOAT) / NULLIF(up.total_slides, 0)) * 100, 2) as completion_percentage
    FROM user_progress up
    JOIN courses c ON up.course_id = c.id
    WHERE up.user_id = ?`,
    [userId],
    (err, progress) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת התקדמות' });
      }
      res.json(progress || {
        total_slides: 0,
        completed_slides: 0,
        total_time_spent: 0,
        completion_percentage: 0
      });
    }
  );
});

// Get detailed progress by module
router.get('/my-progress/detailed', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT 
      m.id as module_id,
      m.title as module_title,
      COUNT(DISTINCT s.id) as total_slides,
      COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN sp.slide_id END) as completed_slides,
      SUM(sp.time_spent) as time_spent
    FROM modules m
    LEFT JOIN slides s ON m.id = s.module_id
    LEFT JOIN slide_progress sp ON s.id = sp.slide_id AND sp.user_id = ?
    WHERE m.course_id = 1
    GROUP BY m.id, m.title
    ORDER BY m.order_index`,
    [userId],
    (err, modules) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת התקדמות מפורטת' });
      }
      res.json(modules);
    }
  );
});

// Get all students' progress (instructor only)
router.get('/all', authenticateToken, requireRole(['instructor', 'admin']), (req, res) => {
  db.all(
    `SELECT 
      u.id,
      u.username,
      u.full_name,
      up.total_slides,
      up.completed_slides,
      up.total_time_spent,
      up.last_accessed,
      ROUND((CAST(up.completed_slides AS FLOAT) / NULLIF(up.total_slides, 0)) * 100, 2) as completion_percentage
    FROM users u
    LEFT JOIN user_progress up ON u.id = up.user_id AND up.course_id = 1
    WHERE u.role = 'student'
    ORDER BY u.full_name`,
    (err, students) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת התקדמות תלמידים' });
      }
      res.json(students);
    }
  );
});

// Get specific student progress (instructor only)
router.get('/student/:userId', authenticateToken, requireRole(['instructor', 'admin']), (req, res) => {
  const { userId } = req.params;

  db.all(
    `SELECT 
      s.id as slide_id,
      s.title as slide_title,
      m.title as module_title,
      sp.time_spent,
      sp.completed,
      sp.completed_at
    FROM slides s
    JOIN modules m ON s.module_id = m.id
    LEFT JOIN slide_progress sp ON s.id = sp.slide_id AND sp.user_id = ?
    WHERE m.course_id = 1
    ORDER BY m.order_index, s.order_index`,
    [userId],
    (err, slides) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת התקדמות תלמיד' });
      }
      res.json(slides);
    }
  );
});

module.exports = router;



