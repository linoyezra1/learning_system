const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const next = require('next');
const { Pool } = require('pg'); 
const bcrypt = require('bcryptjs'); // <--- התיקון כאן: הוספתי js בסוף
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

// פונקציית עזר ליצירת המנהל הראשון ב-PostgreSQL
async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
  });

  try {
    console.log('--- Database Initialization Started ---');
    
    // 1. יצירת טבלת משתמשים אם היא לא קיימת
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'student',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. בדיקה אם קיים משתמש admin
    const checkAdmin = await pool.query("SELECT * FROM users WHERE username = 'admin'");
    
    if (checkAdmin.rowCount === 0) {
      // 3. יצירת סיסמה מוצפנת למנהל (admin123)
      // התיקון כאן: bcryptjs עובד בדיוק אותו דבר
      const hashedPw = await bcrypt.hash('admin123', 10); 
      await pool.query(
        "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
        ['admin', hashedPw, 'admin']
      );
      console.log('✅ Success: Admin user created (admin / admin123)');
    } else {
      console.log('ℹ️ Info: Admin user already exists');
    }
    
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
