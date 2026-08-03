const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const COURSE_ID = 1; // Same course as add-full-content and slides (course_id = 1)

function isTableMissingError(err) {
  return err && (err.code === '42P01' || (err.message && err.message.includes('does not exist')));
}

const emptyProgress = {
  total_slides: 0,
  completed_slides: 0,
  total_time_spent: 0,
  completion_percentage: 0
};

// Get user's own progress (total_slides from slides table so student sees real count even before any progress)
router.get('/my-progress', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    `SELECT COUNT(*)::int as total_slides
     FROM slides s
     JOIN modules m ON s.module_id = m.id
     WHERE m.course_id = 1`,
    [],
    (err, countRow) => {
      if (err) {
        if (isTableMissingError(err)) return res.json(emptyProgress);
        return res.status(500).json({ error: 'שגיאה בטעינת התקדמות' });
      }
      const totalSlides = (countRow && countRow.total_slides) ? countRow.total_slides : 0;

      db.get(
        `SELECT up.completed_slides, up.total_time_spent, c.title as course_title
         FROM user_progress up
         JOIN courses c ON up.course_id = c.id
         WHERE up.user_id = ? AND up.course_id = 1`,
        [userId],
        (err2, progress) => {
          if (err2 && !isTableMissingError(err2)) {
            return res.status(500).json({ error: 'שגיאה בטעינת התקדמות' });
          }
          const completed = (progress && progress.completed_slides != null) ? progress.completed_slides : 0;
          const timeSpent = (progress && progress.total_time_spent != null) ? progress.total_time_spent : 0;
          const pct = totalSlides > 0 ? Math.round((Number(completed) / totalSlides) * 10000) / 100 : 0;
          res.json({
            total_slides: totalSlides,
            completed_slides: completed,
            total_time_spent: timeSpent,
            completion_percentage: pct,
            course_title: (progress && progress.course_title) || 'הקורס שלי'
          });
        }
      );
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
      COUNT(DISTINCT CASE WHEN sp.completed = true THEN sp.slide_id END) as completed_slides,
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
        if (isTableMissingError(err)) return res.json([]);
        return res.status(500).json({ error: 'שגיאה בטעינת התקדמות מפורטת' });
      }
      res.json(Array.isArray(modules) ? modules : []);
    }
  );
});

// Get all students (instructor only). LEFT JOIN so every student appears even with no user_progress row.
router.get('/all', authenticateToken, requireRole(['instructor', 'admin']), (req, res) => {
  db.all(
    `SELECT 
      u.id,
      u.username,
      COALESCE(u.full_name, u.username) as full_name,
      u.course_group_id,
      (SELECT COUNT(*)::int FROM slides s JOIN modules m ON s.module_id = m.id WHERE m.course_id = 1) as total_slides,
      COALESCE(up.completed_slides, 0) as completed_slides,
      COALESCE(up.total_time_spent, 0) as total_time_spent,
      up.last_accessed,
      ROUND(((CAST(COALESCE(up.completed_slides, 0) AS FLOAT) / NULLIF((SELECT COUNT(*) FROM slides s JOIN modules m ON s.module_id = m.id WHERE m.course_id = 1), 0)) * 100)::numeric, 2) as completion_percentage
    FROM users u
    LEFT JOIN user_progress up ON u.id = up.user_id AND up.course_id = 1
    WHERE LOWER(TRIM(u.role)) = 'student'
    ORDER BY COALESCE(u.full_name, u.username), u.username`,
    [],
    (err, students) => {
      if (err) {
        if (isTableMissingError(err)) return res.json([]);
        return res.status(500).json({ error: 'שגיאה בטעינת התקדמות תלמידים' });
      }
      res.json(Array.isArray(students) ? students : []);
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
        if (isTableMissingError(err)) return res.json([]);
        return res.status(500).json({ error: 'שגיאה בטעינת התקדמות תלמיד' });
      }
      res.json(Array.isArray(slides) ? slides : []);
    }
  );
});

module.exports = router;






