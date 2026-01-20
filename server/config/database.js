const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../database/learning_system.db');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )`);

  // Courses table
  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Modules table (chapters/topics)
  db.run(`CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`);

  // Slides table
  db.run(`CREATE TABLE IF NOT EXISTS slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    slide_type TEXT NOT NULL DEFAULT 'text',
    media_url TEXT,
    min_reading_time INTEGER DEFAULT 30,
    order_index INTEGER NOT NULL,
    FOREIGN KEY (module_id) REFERENCES modules(id)
  )`);

  // Slide progress table
  db.run(`CREATE TABLE IF NOT EXISTS slide_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    slide_id INTEGER NOT NULL,
    time_spent INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (slide_id) REFERENCES slides(id),
    UNIQUE(user_id, slide_id)
  )`);

  // Practice questions table
  db.run(`CREATE TABLE IF NOT EXISTS practice_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slide_id INTEGER,
    module_id INTEGER,
    question TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    options TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    FOREIGN KEY (slide_id) REFERENCES slides(id),
    FOREIGN KEY (module_id) REFERENCES modules(id)
  )`);

  // User answers table
  db.run(`CREATE TABLE IF NOT EXISTS user_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT 0,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (question_id) REFERENCES practice_questions(id)
  )`);

  // Student questions to instructor
  db.run(`CREATE TABLE IF NOT EXISTS student_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    slide_id INTEGER,
    question TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    answer TEXT,
    answered_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    answered_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (slide_id) REFERENCES slides(id),
    FOREIGN KEY (answered_by) REFERENCES users(id)
  )`);

  // Reports table (stored for 3+ years)
  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_data TEXT NOT NULL,
    report_type TEXT DEFAULT 'completion',
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // User progress summary
  db.run(`CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    total_slides INTEGER DEFAULT 0,
    completed_slides INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    UNIQUE(user_id, course_id)
  )`);

  // Create default course
  db.run(`INSERT OR IGNORE INTO courses (id, title, description) 
    VALUES (1, 'קורס עזרה ראשונה - חוברת 44', 'קורס מקיף בעזרה ראשונה לפי חוברת 44')`, (err) => {
    if (!err) {
      console.log('Database initialized successfully');
      // Create default users if they don't exist
      createDefaultUsers();
    }
  });
}

// Create default users (admin and student1) if they don't exist
function createDefaultUsers() {
  const bcrypt = require('bcryptjs');
  
  // Check if admin exists and create if not
  db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err);
      return;
    }
    
    if (!row) {
      // Create admin user
      bcrypt.hash('admin123', 10).then(adminPassword => {
        db.run(
          `INSERT OR IGNORE INTO users (id, username, password, full_name, role) 
           VALUES (1, 'admin', ?, 'מנהל המערכת', 'admin')`,
          [adminPassword],
          (err) => {
            if (err) {
              console.error('Error creating admin user:', err);
            } else {
              console.log('Default admin user created: username=admin, password=admin123');
            }
          }
        );
      }).catch(err => {
        console.error('Error hashing admin password:', err);
      });
    }
  });
  
  // Check if student1 exists and create if not
  db.get('SELECT id FROM users WHERE username = ?', ['student1'], (err, row) => {
    if (err) {
      console.error('Error checking student user:', err);
      return;
    }
    
    if (!row) {
      // Create student user
      bcrypt.hash('student123', 10).then(studentPassword => {
        db.run(
          `INSERT OR IGNORE INTO users (username, password, full_name, role) 
           VALUES ('student1', ?, 'סטודנט לדוגמה', 'student')`,
          [studentPassword],
          (err) => {
            if (err) {
              console.error('Error creating student user:', err);
            } else {
              console.log('Default student user created: username=student1, password=student123');
            }
          }
        );
      }).catch(err => {
        console.error('Error hashing student password:', err);
      });
    }
  });
}

module.exports = db;
