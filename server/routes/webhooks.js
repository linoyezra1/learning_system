const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const router = express.Router();

/**
 * Recommended / documented courseType values stored in users.course_group_id.
 * Any non-empty string is accepted so CRM can send custom group ids.
 */
const KNOWN_COURSE_TYPES = ['first_aid', 'medical', 'general', 'course_44'];

function getExpectedSecret() {
  return process.env.CRM_WEBHOOK_SECRET || process.env.WEBHOOK_API_KEY || '';
}

function authenticateWebhook(req, res, next) {
  const expected = getExpectedSecret();
  if (!expected) {
    console.error('[webhook] CRM_WEBHOOK_SECRET is not configured');
    return res.status(503).json({
      success: false,
      error: 'Webhook is not configured on the server (missing CRM_WEBHOOK_SECRET)',
    });
  }

  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['x-webhook-secret'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!apiKey || apiKey !== expected) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - invalid or missing API key',
    });
  }

  next();
}

/**
 * POST /api/v1/users/webhook-create  (and /api/webhooks/create-user)
 * Creates a student user from CRM payload.
 *
 * Body: fullName, email, phone, idNumber, username, password, courseType
 */
async function createUserFromWebhook(req, res) {
  const {
    fullName,
    email,
    phone,
    idNumber,
    username,
    password,
    courseType,
  } = req.body || {};

  const missing = [];
  if (!fullName || !String(fullName).trim()) missing.push('fullName');
  if (!username || !String(username).trim()) missing.push('username');
  if (!password || !String(password).trim()) missing.push('password');
  if (!courseType || !String(courseType).trim()) missing.push('courseType');

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      missing,
    });
  }

  const cleanUsername = String(username).trim();
  const cleanFullName = String(fullName).trim();
  const cleanCourseType = String(courseType).trim();
  const cleanEmail = email != null ? String(email).trim() : null;
  const cleanPhone = phone != null ? String(phone).trim() : null;
  const cleanIdNumber = idNumber != null ? String(idNumber).trim() : null;

  try {
    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);

    // Check duplicate username (case-insensitive, same as login)
    const existing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE LOWER(TRIM(username)) = ?',
        [cleanUsername.toLowerCase()],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        username: cleanUsername,
      });
    }

    const userId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, full_name, role, course_group_id, email, phone, id_number)
         VALUES (?, ?, ?, 'student', ?, ?, ?, ?)
         RETURNING id`,
        [
          cleanUsername,
          hashedPassword,
          cleanFullName,
          cleanCourseType,
          cleanEmail || null,
          cleanPhone || null,
          cleanIdNumber || null,
        ],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });

    return res.status(201).json({
      success: true,
      userId: userId != null ? String(userId) : null,
      message: 'User created successfully',
      username: cleanUsername,
      courseType: cleanCourseType,
      knownCourseType: KNOWN_COURSE_TYPES.includes(cleanCourseType.toLowerCase()),
    });
  } catch (err) {
    console.error('[webhook] create user failed:', err);
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        username: cleanUsername,
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
  }
}

router.post('/webhook-create', authenticateWebhook, createUserFromWebhook);
router.post('/create-user', authenticateWebhook, createUserFromWebhook);

module.exports = router;
module.exports.KNOWN_COURSE_TYPES = KNOWN_COURSE_TYPES;
