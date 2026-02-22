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

    // Add columns to existing tables (no-op if already present)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
    `).catch(() => { /* ignore if columns already exist or table differs */ });

    // 2. יצירת סיסמה מוצפנת תקנית (admin123)
    const hashedPw = await bcrypt.hash('admin123', 10); 
    
    // 3. שימוש בפקודת UPSERT - אם המשתמש קיים, הוא מעדכן לו את הסיסמה. אם לא, הוא יוצר אותו.
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
