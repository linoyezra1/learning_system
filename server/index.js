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
    
    // 1. Create users table with columns that match app queries (full_name, created_at, last_login)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'student',
        full_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );
    `);

    // Add columns to existing users table (no-op if already present)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
    `).catch(() => { /* ignore */ });

    // 2. courses (referenced by modules, user_progress, reports context)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. modules (referenced by slides)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        order_index INTEGER DEFAULT 0
      );
    `);

    // 4. slides (referenced by slide_progress, practice_questions, student_questions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS slides (
        id SERIAL PRIMARY KEY,
        module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        min_reading_time INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0
      );
    `);

    // 5. slide_progress (per-user per-slide progress)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS slide_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slide_id INTEGER NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
        time_spent INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(user_id, slide_id)
      );
    `);

    // 6. user_progress (per-user per-course summary)
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
      );
    `);

    // 7. practice_questions (quiz questions; routes filter by module_id and/or slide_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_questions (
        id SERIAL PRIMARY KEY,
        module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
        slide_id INTEGER REFERENCES slides(id) ON DELETE SET NULL,
        question TEXT NOT NULL,
        options TEXT,
        correct_answer VARCHAR(255),
        explanation TEXT
      );
    `);

    // 8. student_questions (questions from students to instructor)
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
      );
    `);

    // 9. user_answers (answers to practice_questions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_answers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES practice_questions(id) ON DELETE CASCADE,
        answer VARCHAR(255),
        is_correct INTEGER DEFAULT 0
      );
    `);

    // 10. reports (generated report metadata)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_data TEXT,
        report_type VARCHAR(100) DEFAULT 'completion',
        expires_at TIMESTAMP WITH TIME ZONE,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Admin user: hashed password (admin123) and upsert
    const hashedPw = await bcrypt.hash('admin123', 10); 
    
    // UPSERT admin - update password if exists, insert if not - אם המשתמש קיים, הוא מעדכן לו את הסיסמה. אם לא, הוא יוצר אותו.
    // זה מבטיח שהסיסמה ב-DB תמיד תהיה תואמת להצפנה של השרת הנוכחי
    const upsertAdminQuery = `
      INSERT INTO users (username, password, role) 
      VALUES ($1, $2, $3)
      ON CONFLICT (username) 
      DO UPDATE SET password = EXCLUDED.password;
    `;

    await pool.query(upsertAdminQuery, ['admin', hashedPw, 'admin']);
    
    console.log('✅ Success: Admin user is ready and password reset to "admin123"');
    console.log('--- Database Initialization Finished ---');
  } catch (err) {
    console.error('❌ Error during initialization:', err);
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
    if (process.env.DATABASE_URL) {
      await initializeDatabase();
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
