const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get practice questions for a module or slide
router.get('/', authenticateToken, (req, res) => {
  const { moduleId, slideId } = req.query;

  let query = 'SELECT * FROM practice_questions WHERE 1=1';
  const params = [];

  if (moduleId) {
    query += ' AND module_id = ?';
    params.push(moduleId);
  }

  if (slideId) {
    query += ' AND slide_id = ?';
    params.push(slideId);
  }

  query += ' ORDER BY id';

  db.all(query, params, (err, questions) => {
    if (err) {
      return res.status(500).json({ error: 'שגיאה בטעינת השאלות' });
    }
    res.json(questions);
  });
});

// Submit answer to practice question
router.post('/:questionId/answer', authenticateToken, (req, res) => {
  const { questionId } = req.params;
  const { answer } = req.body;
  const userId = req.user.id;

  if (!answer) {
    return res.status(400).json({ error: 'נא לבחור תשובה' });
  }

  db.get('SELECT * FROM practice_questions WHERE id = ?', [questionId], (err, question) => {
    if (err || !question) {
      return res.status(404).json({ error: 'שאלה לא נמצאה' });
    }

    const isCorrect = answer === question.correct_answer;

    db.run(
      'INSERT INTO user_answers (user_id, question_id, answer, is_correct) VALUES (?, ?, ?, ?)',
      [userId, questionId, answer, isCorrect ? 1 : 0],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'שגיאה בשמירת התשובה' });
        }

        res.json({
          correct: isCorrect,
          correctAnswer: question.correct_answer,
          explanation: question.explanation
        });
      }
    );
  });
});

// Submit question to instructor
router.post('/ask', authenticateToken, (req, res) => {
  const { slideId, question } = req.body;
  const userId = req.user.id;

  if (!question) {
    return res.status(400).json({ error: 'נא להזין שאלה' });
  }

  db.run(
    'INSERT INTO student_questions (user_id, slide_id, question) VALUES (?, ?, ?)',
    [userId, slideId || null, question],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בשליחת השאלה' });
      }

      res.json({
        message: 'השאלה נשלחה למדריך',
        questionId: this.lastID
      });
    }
  );
});

// Get student's own questions
router.get('/my-questions', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT 
      sq.*,
      s.title as slide_title,
      m.title as module_title
    FROM student_questions sq
    LEFT JOIN slides s ON sq.slide_id = s.id
    LEFT JOIN modules m ON s.module_id = m.id
    WHERE sq.user_id = ?
    ORDER BY sq.created_at DESC`,
    [userId],
    (err, questions) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת השאלות' });
      }
      res.json(questions);
    }
  );
});

// Get all student questions (instructor only)
router.get('/all-questions', authenticateToken, requireRole(['instructor', 'admin']), (req, res) => {
  const { status } = req.query;

  let query = `SELECT 
    sq.*,
    u.full_name as student_name,
    u.username,
    s.title as slide_title,
    m.title as module_title
  FROM student_questions sq
  JOIN users u ON sq.user_id = u.id
  LEFT JOIN slides s ON sq.slide_id = s.id
  LEFT JOIN modules m ON s.module_id = m.id
  WHERE 1=1`;

  const params = [];

  if (status) {
    query += ' AND sq.status = ?';
    params.push(status);
  }

  query += ' ORDER BY sq.created_at DESC';

  db.all(query, params, (err, questions) => {
    if (err) {
      return res.status(500).json({ error: 'שגיאה בטעינת השאלות' });
    }
    res.json(questions);
  });
});

// Answer student question (instructor only)
router.post('/:questionId/answer-instructor', authenticateToken, requireRole(['instructor', 'admin']), (req, res) => {
  const { questionId } = req.params;
  const { answer } = req.body;
  const instructorId = req.user.id;

  if (!answer) {
    return res.status(400).json({ error: 'נא להזין תשובה' });
  }

  db.run(
    `UPDATE student_questions 
     SET answer = ?, answered_by = ?, status = 'answered', answered_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [answer, instructorId, questionId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בשמירת התשובה' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'שאלה לא נמצאה' });
      }

      res.json({ message: 'התשובה נשמרה בהצלחה' });
    }
  );
});

module.exports = router;



