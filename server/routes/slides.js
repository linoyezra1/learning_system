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
      res.json(slides);
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

// Update slide progress (time tracking)
router.post('/:slideId/progress', authenticateToken, (req, res) => {
  const { slideId } = req.params;
  const { timeSpent, completed } = req.body;
  const userId = req.user.id;

  // Check minimum reading time
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

    // Check if progress exists
    db.get(
      'SELECT * FROM slide_progress WHERE user_id = ? AND slide_id = ?',
      [userId, slideId],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'שגיאה בשמירת התקדמות' });
        }

        if (existing) {
          // Update existing progress
          const newTimeSpent = existing.time_spent + timeSpent;
          const newCompleted = completed ? 1 : existing.completed;
          const newCompletedAt = completed ? new Date().toISOString() : existing.completed_at;

          db.run(
            `UPDATE slide_progress 
             SET time_spent = ?, completed = ?, completed_at = ?
             WHERE user_id = ? AND slide_id = ?`,
            [newTimeSpent, newCompleted, newCompletedAt, userId, slideId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'שגיאה בשמירת התקדמות' });
              }

              updateUserProgressSummary(userId);

              res.json({ 
                message: 'התקדמות נשמרה בהצלחה',
                progressId: existing.id
              });
            }
          );
        } else {
          // Insert new progress
          db.run(
            `INSERT INTO slide_progress (user_id, slide_id, time_spent, completed, completed_at)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, slideId, timeSpent, completed ? 1 : 0, completed ? new Date().toISOString() : null],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'שגיאה בשמירת התקדמות' });
              }

              updateUserProgressSummary(userId);

              res.json({ 
                message: 'התקדמות נשמרה בהצלחה',
                progressId: this.lastID
              });
            }
          );
        }
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
  // This will be called to update the overall progress
  db.get(
    `SELECT 
      COUNT(DISTINCT s.id) as total_slides,
      COUNT(DISTINCT sp.slide_id) as completed_slides,
      COALESCE(SUM(sp.time_spent), 0) as total_time
    FROM slides s
    LEFT JOIN slide_progress sp ON s.id = sp.slide_id AND sp.user_id = ? AND sp.completed = 1
    WHERE s.module_id IN (SELECT id FROM modules WHERE course_id = 1)`,
    [userId],
    (err, result) => {
      if (!err && result) {
        // Check if progress exists
        db.get(
          'SELECT * FROM user_progress WHERE user_id = ? AND course_id = 1',
          [userId],
          (err, existing) => {
            if (!err) {
              if (existing) {
                // Update existing
                db.run(
                  `UPDATE user_progress 
                   SET total_slides = ?, completed_slides = ?, total_time_spent = ?, last_accessed = CURRENT_TIMESTAMP
                   WHERE user_id = ? AND course_id = 1`,
                  [result.total_slides, result.completed_slides, result.total_time, userId]
                );
              } else {
                // Insert new
                db.run(
                  `INSERT INTO user_progress (user_id, course_id, total_slides, completed_slides, total_time_spent, last_accessed)
                   VALUES (?, 1, ?, ?, ?, CURRENT_TIMESTAMP)`,
                  [userId, result.total_slides, result.completed_slides, result.total_time]
                );
              }
            }
          }
        );
      }
    }
  );
}

module.exports = router;

