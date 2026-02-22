const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get slides by module
router.get('/module/:moduleId', authenticateToken, (req, res) => {
  const { moduleId } = req.params;

  db.all(
    'SELECT * FROM slides WHERE module_id = ? ORDER BY order_index ASC',
    [moduleId],
    (err, slides) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת השקפים' });
      }
      res.json(Array.isArray(slides) ? slides : []);
    }
  );
});

// Get single slide
router.get('/:slideId', authenticateToken, (req, res) => {
  const { slideId } = req.params;

  db.get(
    'SELECT * FROM slides WHERE id = ?',
    [slideId],
    (err, slide) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת השקף' });
      }
      if (!slide) {
        return res.status(404).json({ error: 'שקף לא נמצא' });
      }
      res.json(slide);
    }
  );
});

// Update slide progress (time tracking) — PostgreSQL upsert so progress is always saved
router.post('/:slideId/progress', authenticateToken, (req, res) => {
  const { slideId } = req.params;
  const { timeSpent, completed } = req.body;
  const userId = req.user.id;

  db.get('SELECT min_reading_time FROM slides WHERE id = ?', [slideId], (err, slide) => {
    if (err || !slide) {
      return res.status(404).json({ error: 'שקף לא נמצא' });
    }

    if (completed && timeSpent < slide.min_reading_time) {
      return res.status(400).json({
        error: `יש לקרוא את השקף לפחות ${slide.min_reading_time} שניות לפני מעבר לשקף הבא`,
        minTime: slide.min_reading_time,
        currentTime: timeSpent
      });
    }

    const completedVal = completed ? true : false;
    const completedAt = completed ? new Date().toISOString() : null;

    db.run(
      `INSERT INTO slide_progress (user_id, slide_id, time_spent, completed, completed_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, slide_id) DO UPDATE SET
         time_spent = slide_progress.time_spent + EXCLUDED.time_spent,
         completed = slide_progress.completed OR EXCLUDED.completed,
         completed_at = COALESCE(slide_progress.completed_at, EXCLUDED.completed_at)`,
      [userId, slideId, timeSpent, completedVal, completedAt],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'שגיאה בשמירת התקדמות' });
        }
        updateUserProgressSummary(userId);
        res.json({ message: 'התקדמות נשמרה בהצלחה', progressId: this.lastID });
      }
    );
  });
});

// Get user progress for slide
router.get('/:slideId/progress', authenticateToken, (req, res) => {
  const { slideId } = req.params;
  const userId = req.user.id;

  db.get(
    'SELECT * FROM slide_progress WHERE user_id = ? AND slide_id = ?',
    [userId, slideId],
    (err, progress) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת התקדמות' });
      }
      res.json(progress || { timeSpent: 0, completed: false });
    }
  );
});

function updateUserProgressSummary(userId) {
  db.get(
    `SELECT 
      COUNT(DISTINCT s.id)::int as total_slides,
      COUNT(DISTINCT CASE WHEN (sp.completed = true OR sp.completed = 1) THEN sp.slide_id END)::int as completed_slides,
      COALESCE(SUM(sp.time_spent), 0)::int as total_time
    FROM slides s
    LEFT JOIN slide_progress sp ON s.id = sp.slide_id AND sp.user_id = ? AND (sp.completed = true OR sp.completed = 1)
    WHERE s.module_id IN (SELECT id FROM modules WHERE course_id = 1)`,
    [userId],
    (err, result) => {
      if (err || !result) return;
      const { total_slides, completed_slides, total_time } = result;
      db.run(
        `INSERT INTO user_progress (user_id, course_id, total_slides, completed_slides, total_time_spent, last_accessed)
         VALUES (?, 1, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, course_id) DO UPDATE SET
           total_slides = EXCLUDED.total_slides,
           completed_slides = EXCLUDED.completed_slides,
           total_time_spent = EXCLUDED.total_time_spent,
           last_accessed = CURRENT_TIMESTAMP`,
        [userId, total_slides, completed_slides, total_time]
      );
    }
  );
}

module.exports = router;

