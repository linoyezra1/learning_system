const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const next = require('next');
const { Pool } = require('pg'); 
const bcrypt = require('bcryptjs'); 
require('dotenv').config();

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const coursesRoutes = require('./routes/courses');
const slidesRoutes = require('./routes/slides');
const progressRoutes = require('./routes/progress');
const questionsRoutes = require('./routes/questions');
const reportsRoutes = require('./routes/reports');
const materialsRoutes = require('./routes/materials');

const app = express();
const PORT = process.env.PORT || 3001;
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(__dirname, '..') });
const handle = nextApp.getRequestHandler();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// פונקציית עזר לאתחול בסיס הנתונים ואיפוס סיסמת מנהל
async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
  });

  try {
    console.log('--- Database Initialization Started ---');

    console.log('[init] Creating table: users...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'student',
        full_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('[init] Table users OK');

    console.log('[init] Alter table users (add columns if missing)...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)').catch(() => {});
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP').catch(() => {});
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE').catch(() => {});
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS course_group_id TEXT').catch(() => {});
    console.log('[init] Alter users OK');

    console.log('[init] Creating table: courses...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[init] Table courses OK');

    console.log('[init] Creating table: modules...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        order_index INTEGER DEFAULT 0
      )
    `);
    console.log('[init] Table modules OK');

    console.log('[init] Creating table: slides...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS slides (
        id SERIAL PRIMARY KEY,
        module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        min_reading_time INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0
      )
    `);
    console.log('[init] Table slides OK');

    console.log('[init] Creating table: slide_progress...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS slide_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slide_id INTEGER NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
        time_spent INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(user_id, slide_id)
      )
    `);
    console.log('[init] Table slide_progress OK');

    console.log('[init] Creating table: user_progress...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        total_slides INTEGER DEFAULT 0,
        completed_slides INTEGER DEFAULT 0,
        total_time_spent INTEGER DEFAULT 0,
        last_accessed TIMESTAMP WITH TIME ZONE,
        UNIQUE(user_id, course_id)
      )
    `);
    console.log('[init] Table user_progress OK');

    console.log('[init] Creating table: practice_questions...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_questions (
        id SERIAL PRIMARY KEY,
        module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
        slide_id INTEGER REFERENCES slides(id) ON DELETE SET NULL,
        question TEXT NOT NULL,
        options TEXT,
        correct_answer VARCHAR(255),
        explanation TEXT
      )
    `);
    console.log('[init] Table practice_questions OK');

    console.log('[init] Creating table: student_questions...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_questions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slide_id INTEGER REFERENCES slides(id) ON DELETE SET NULL,
        question TEXT NOT NULL,
        answer TEXT,
        answered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending',
        answered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[init] Table student_questions OK');

    console.log('[init] Creating table: user_answers...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_answers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES practice_questions(id) ON DELETE CASCADE,
        answer VARCHAR(255),
        is_correct INTEGER DEFAULT 0
      )
    `);
    console.log('[init] Table user_answers OK');

    console.log('[init] Creating table: reports...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_data TEXT,
        report_type VARCHAR(100) DEFAULT 'completion',
        expires_at TIMESTAMP WITH TIME ZONE,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[init] Table reports OK');

    console.log('[init] Upserting admin user...');
    const hashedPw = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      ['admin', hashedPw, 'admin']
    );
    console.log('[init] Admin user OK');

    console.log('--- Database Initialization Finished ---');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message || err);
    console.error('❌ Error code:', err.code);
    console.error('❌ Full error:', err);
  } finally {
    await pool.end();
  }
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/slides', slidesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/materials', materialsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.all('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  return handle(req, res);
});

nextApp
  .prepare()
  .then(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('[startup] DATABASE_URL not set - skipping database initialization');
    } else {
      console.log('[startup] Running database initialization (before listen)...');
      await initializeDatabase();
      console.log('[startup] Database initialization completed');
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
