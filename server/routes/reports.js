const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { format } = require('date-fns');

const router = express.Router();

// Generate completion report for user
router.get('/completion/:userId', authenticateToken, requireRole(['instructor', 'admin']), (req, res) => {
  const { userId } = req.params;

  // Get user info
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    // Get progress
    db.get(
      `SELECT 
        up.*,
        c.title as course_title
      FROM user_progress up
      JOIN courses c ON up.course_id = c.id
      WHERE up.user_id = ?`,
      [userId],
      (err, progress) => {
        if (err) {
          return res.status(500).json({ error: 'שגיאה בטעינת נתונים' });
        }

        // Get detailed progress
        db.all(
          `SELECT 
            m.title as module_title,
            COUNT(DISTINCT s.id) as total_slides,
            COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN sp.slide_id END) as completed_slides,
            SUM(sp.time_spent) as time_spent
          FROM modules m
          LEFT JOIN slides s ON m.id = s.module_id
          LEFT JOIN slide_progress sp ON s.id = sp.slide_id AND sp.user_id = ? AND sp.completed = 1
          WHERE m.course_id = 1
          GROUP BY m.id, m.title
          ORDER BY m.order_index`,
          [userId],
          (err, moduleProgress) => {
            if (err) {
              return res.status(500).json({ error: 'שגיאה בטעינת נתונים מפורטים' });
            }

            // Generate PDF report
            const doc = new PDFDocument({
              margins: { top: 50, bottom: 50, left: 50, right: 50 },
              size: 'A4'
            });

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="report_${user.username}_${Date.now()}.pdf"`);

            doc.pipe(res);

            // Title
            doc.fontSize(20).text('דוח השלמת קורס', { align: 'right' });
            doc.moveDown();

            // User info
            doc.fontSize(14);
            doc.text(`שם משתמש: ${user.username}`, { align: 'right' });
            doc.text(`שם מלא: ${user.full_name}`, { align: 'right' });
            doc.text(`קורס: ${progress?.course_title || 'קורס עזרה ראשונה - חוברת 44'}`, { align: 'right' });
            doc.text(`תאריך יצירת הדוח: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, { align: 'right' });
            doc.moveDown();

            // Overall progress
            if (progress) {
              const completionPercentage = progress.total_slides > 0 
                ? ((progress.completed_slides / progress.total_slides) * 100).toFixed(2)
                : 0;

              doc.fontSize(16).text('סיכום כללי', { align: 'right' });
              doc.fontSize(12);
              doc.text(`סה"כ שקפים: ${progress.total_slides}`, { align: 'right' });
              doc.text(`שקפים הושלמו: ${progress.completed_slides}`, { align: 'right' });
              doc.text(`אחוז השלמה: ${completionPercentage}%`, { align: 'right' });
              doc.text(`זמן כולל: ${Math.floor(progress.total_time_spent / 60)} דקות`, { align: 'right' });
              doc.text(`תאריך גישה אחרונה: ${progress.last_accessed ? format(new Date(progress.last_accessed), 'dd/MM/yyyy HH:mm') : 'לא קיים'}`, { align: 'right' });
              doc.moveDown();
            }

            // Module progress
            if (moduleProgress && moduleProgress.length > 0) {
              doc.fontSize(16).text('התקדמות לפי נושאים', { align: 'right' });
              doc.moveDown();

              moduleProgress.forEach((module, index) => {
                const moduleCompletion = module.total_slides > 0
                  ? ((module.completed_slides / module.total_slides) * 100).toFixed(2)
                  : 0;

                doc.fontSize(14).text(`${index + 1}. ${module.module_title}`, { align: 'right' });
                doc.fontSize(12);
                doc.text(`  שקפים הושלמו: ${module.completed_slides} מתוך ${module.total_slides}`, { align: 'right' });
                doc.text(`  אחוז השלמה: ${moduleCompletion}%`, { align: 'right' });
                doc.text(`  זמן נלמד: ${Math.floor((module.time_spent || 0) / 60)} דקות`, { align: 'right' });
                doc.moveDown(0.5);
              });
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(10).text('דוח זה מוכיח השלמת לימוד מתוקשב מלא בקורס', { align: 'center' });
            doc.text('הדוח יישמר במערכת למשך 3 שנים לפחות', { align: 'center' });

            doc.end();

            // Save report metadata to database (for 3+ years)
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 3);

            const reportData = {
              user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name
              },
              progress,
              moduleProgress,
              generatedAt: new Date().toISOString()
            };

            db.run(
              'INSERT INTO reports (user_id, report_data, report_type, expires_at) VALUES (?, ?, ?, ?)',
              [userId, JSON.stringify(reportData), 'completion', expiresAt.toISOString()],
              (err) => {
                if (err) {
                  console.error('Error saving report to database:', err);
                }
              }
            );
          }
        );
      }
    );
  });
});

// Get all reports for a user
router.get('/user/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  // Users can only see their own reports, instructors can see all
  if (currentUserId.toString() !== userId.toString() && req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'אין הרשאה לצפות בדוחות אלה' });
  }

  db.all(
    'SELECT id, report_type, generated_at, expires_at FROM reports WHERE user_id = ? ORDER BY generated_at DESC',
    [userId],
    (err, reports) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בטעינת דוחות' });
      }
      res.json(reports);
    }
  );
});

// Get specific report data
router.get('/:reportId', authenticateToken, (req, res) => {
  const { reportId } = req.params;

  db.get('SELECT * FROM reports WHERE id = ?', [reportId], (err, report) => {
    if (err || !report) {
      return res.status(404).json({ error: 'דוח לא נמצא' });
    }

    // Check permissions
    if (req.user.id !== report.user_id && req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'אין הרשאה לצפות בדוח זה' });
    }

    res.json({
      ...report,
      report_data: JSON.parse(report.report_data)
    });
  });
});

module.exports = router;

