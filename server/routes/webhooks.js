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

function maskSecret(value) {
  if (value == null || value === '') return '(empty)';
  const s = String(value);
  if (s.length <= 4) return '****';
  return s.slice(0, 2) + '***' + s.slice(-2) + ` (len=${s.length})`;
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/** Log timestamp, IP, headers, and raw body before auth. */
function logIncomingRequest(req, res, next) {
  const timestamp = new Date().toISOString();
  const originIp = getClientIp(req);

  console.log('========== LMS WEBHOOK INCOMING REQUEST ==========');
  console.log(`[webhook] timestamp: ${timestamp}`);
  console.log(`[webhook] origin IP: ${originIp}`);
  console.log(`[webhook] method: ${req.method}`);
  console.log(`[webhook] path: ${req.originalUrl || req.url}`);
  console.log('[webhook] ALL headers:', JSON.stringify(req.headers, null, 2));
  console.log('[webhook] key headers:', {
    authorization: req.headers['authorization'] || '(missing)',
    'x-webhook-secret': req.headers['x-webhook-secret'] || '(missing)',
    'x-api-key': req.headers['x-api-key'] || '(missing)',
    'content-type': req.headers['content-type'] || '(missing)',
  });
  console.log('[webhook] raw request body/payload:', JSON.stringify(req.body, null, 2));
  console.log('==================================================');

  next();
}

function authenticateWebhook(req, res, next) {
  const expectedSecret = getExpectedSecret();
  const incomingSecret =
    req.headers['x-api-key'] ||
    req.headers['x-webhook-secret'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null) ||
    '';

  console.log('[webhook] AUTH CHECK:');
  console.log('[webhook]   CRM_WEBHOOK_SECRET set:', Boolean(process.env.CRM_WEBHOOK_SECRET));
  console.log('[webhook]   WEBHOOK_API_KEY set:', Boolean(process.env.WEBHOOK_API_KEY));
  console.log('[webhook]   expectedSecret (masked):', maskSecret(expectedSecret));
  console.log('[webhook]   incomingSecret (masked):', maskSecret(incomingSecret));
  console.log('[webhook]   incomingSecret source:',
    req.headers['x-api-key']
      ? 'x-api-key'
      : req.headers['x-webhook-secret']
        ? 'x-webhook-secret'
        : req.headers.authorization
          ? 'authorization Bearer'
          : 'none'
  );

  if (!expectedSecret) {
    console.error('[webhook] CRM_WEBHOOK_SECRET is not configured — rejecting with 503');
    return res.status(503).json({
      success: false,
      error: 'Webhook is not configured on the server (missing CRM_WEBHOOK_SECRET)',
    });
  }

  const secretsMatch = Boolean(incomingSecret) && incomingSecret === expectedSecret;
  console.log('[webhook]   secret comparison result (incomingSecret === expectedSecret):', secretsMatch);

  if (!secretsMatch) {
    console.warn('🔒 LMS Webhook Auth Failed: Secret mismatch');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - invalid or missing API key (secret mismatch)',
    });
  }

  console.log('[webhook] AUTH OK — secret matched');
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

  console.log('[webhook] PAYLOAD EXTRACTION:');
  console.log('[webhook]   username:', username);
  console.log('[webhook]   id_number / idNumber:', idNumber);
  console.log('[webhook]   email:', email);
  console.log('[webhook]   phone:', phone);
  console.log('[webhook]   fullName:', fullName);
  console.log('[webhook]   courseType:', courseType);
  console.log('[webhook]   password provided:', Boolean(password && String(password).trim()));

  const missing = [];
  if (!fullName || !String(fullName).trim()) missing.push('fullName');
  if (!username || !String(username).trim()) missing.push('username');
  if (!password || !String(password).trim()) missing.push('password');
  if (!courseType || !String(courseType).trim()) missing.push('courseType');

  if (missing.length > 0) {
    console.warn('[webhook] VALIDATION FAILED — missing required fields:', missing);
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      missing,
    });
  }

  console.log('[webhook] VALIDATION OK — all required fields present');

  const cleanUsername = String(username).trim();
  const cleanFullName = String(fullName).trim();
  const cleanCourseType = String(courseType).trim();
  const cleanEmail = email != null ? String(email).trim() : null;
  const cleanPhone = phone != null ? String(phone).trim() : null;
  const cleanIdNumber = idNumber != null ? String(idNumber).trim() : null;

  console.log('[webhook] NORMALIZED FIELDS:', {
    username: cleanUsername,
    fullName: cleanFullName,
    courseType: cleanCourseType,
    email: cleanEmail,
    phone: cleanPhone,
    id_number: cleanIdNumber,
  });

  try {
    console.log('[webhook] DB: starting bcrypt password hashing...');
    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);
    console.log('[webhook] DB: bcrypt hashing complete');

    const selectSql = 'SELECT id FROM users WHERE LOWER(TRIM(username)) = ?';
    const selectParams = [cleanUsername.toLowerCase()];
    console.log('[webhook] DB: checking for existing user');
    console.log('[webhook]   SQL:', selectSql);
    console.log('[webhook]   params:', selectParams);

    const existing = await new Promise((resolve, reject) => {
      db.get(selectSql, selectParams, (err, row) => (err ? reject(err) : resolve(row)));
    });

    if (existing) {
      console.warn('[webhook] DB: duplicate username found, id=', existing.id);
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        username: cleanUsername,
        details: `Username already exists with id=${existing.id}`,
      });
    }

    const insertSql = `INSERT INTO users (username, password, full_name, role, course_group_id, email, phone, id_number)
         VALUES (?, ?, ?, 'student', ?, ?, ?, ?)
         RETURNING id`;
    const insertParams = [
      cleanUsername,
      '(hashed)',
      cleanFullName,
      cleanCourseType,
      cleanEmail || null,
      cleanPhone || null,
      cleanIdNumber || null,
    ];

    console.log('[webhook] DB: inserting new user');
    console.log('[webhook]   SQL:', insertSql.replace(/\s+/g, ' ').trim());
    console.log('[webhook]   params (password redacted):', insertParams);

    const userId = await new Promise((resolve, reject) => {
      db.run(
        insertSql,
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

    console.log(`✅ LMS User Created Successfully: ${cleanUsername} (userId=${userId})`);

    return res.status(201).json({
      success: true,
      userId: userId != null ? String(userId) : null,
      message: 'User created successfully',
      username: cleanUsername,
      courseType: cleanCourseType,
      knownCourseType: KNOWN_COURSE_TYPES.includes(cleanCourseType.toLowerCase()),
    });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error(`❌ LMS User Creation DB Error: ${msg}`);
    console.error('[webhook] full stack trace:', err && err.stack ? err.stack : err);

    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('UNIQUE')) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        username: cleanUsername,
        details: msg,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create user',
      details: msg,
    });
  }
}

router.post('/webhook-create', logIncomingRequest, authenticateWebhook, createUserFromWebhook);
router.post('/create-user', logIncomingRequest, authenticateWebhook, createUserFromWebhook);

module.exports = router;
module.exports.KNOWN_COURSE_TYPES = KNOWN_COURSE_TYPES;
