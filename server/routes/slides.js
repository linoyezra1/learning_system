const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const COURSE_ID = 1; // Matches add-full-content and progress routes

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

// Ensure user has a user_progress row for course 1 so they appear in instructor list and updates attach
function ensureUserProgressRow(userId, next) {
  db.run(
    `INSERT INTO user_progress (user_id, course_id, total_slides, completed_slides, total_time_spent, last_accessed)
     VALUES (?, ?, 0, 0, 0, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, course_id) DO UPDATE SET last_accessed = CURRENT_TIMESTAMP`,
    [userId, COURSE_ID],
    function(err) {
      if (next) next(err);
    }
  );
}

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

    ensureUserProgressRow(userId, (ensureErr) => {
      if (ensureErr) {
        return res.status(500).json({ error: 'שגיאה ברישום התקדמות' });
      }
      db.run(
        `INSERT INTO slide_progress (user_id, slide_id, time_spent, completed, completed_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, slide_id) DO UPDATE SET
           time_spent = slide_progress.time_spent + EXCLUDED.time_spent,
           completed = slide_progress.completed OR EXCLUDED.completed,
           completed_at = COALESCE(slide_progress.completed_at, EXCLUDED.completed_at)`,
        [userId, slideId, timeSpent, completedVal, completedAt],
        function(saveErr) {
          if (saveErr) {
            return res.status(500).json({ error: 'שגיאה בשמירת התקדמות' });
          }
          const progressId = this.lastID;
          updateUserProgressSummary(userId, (summaryErr) => {
            if (summaryErr) {
              console.error('updateUserProgressSummary failed:', summaryErr);
              return res.status(500).json({ error: 'שגיאה בעדכון סיכום התקדמות' });
            }
            res.json({ message: 'התקדמות נשמרה בהצלחה', progressId });
          });
        }
      );
    });
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

function updateUserProgressSummary(userId, callback) {
  db.get(
    `SELECT 
      COUNT(DISTINCT s.id)::int as total_slides,
      COUNT(DISTINCT CASE WHEN (sp.completed = true OR sp.completed = 1) THEN sp.slide_id END)::int as completed_slides,
      COALESCE(SUM(sp.time_spent), 0)::int as total_time
    FROM slides s
    LEFT JOIN slide_progress sp ON s.id = sp.slide_id AND sp.user_id = ? AND (sp.completed = true OR sp.completed = 1)
    WHERE s.module_id IN (SELECT id FROM modules WHERE course_id = ?)`,
    [userId, COURSE_ID],
    (err, result) => {
      if (err) {
        console.error('updateUserProgressSummary (count query):', err);
        return callback(err);
      }
      if (!result) {
        console.error('updateUserProgressSummary: count query returned no row');
        return callback(new Error('No count result'));
      }
      const { total_slides, completed_slides, total_time } = result;
      db.run(
        `INSERT INTO user_progress (user_id, course_id, total_slides, completed_slides, total_time_spent, last_accessed)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, course_id) DO UPDATE SET
           total_slides = EXCLUDED.total_slides,
           completed_slides = EXCLUDED.completed_slides,
           total_time_spent = EXCLUDED.total_time_spent,
           last_accessed = CURRENT_TIMESTAMP`,
        [userId, COURSE_ID, total_slides, completed_slides, total_time],
        function(runErr) {
          if (runErr) {
            console.error('updateUserProgressSummary (upsert):', runErr);
            return callback(runErr);
          }
          callback(null);
        }
      );
    }
  );
}

module.exports = router;

