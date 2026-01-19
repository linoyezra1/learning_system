const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  console.log('Initializing database with sample data...');

  // Wait a bit for database to initialize
  await new Promise(resolve => setTimeout(resolve, 500));

  // Create default admin (password: admin123)
  const adminPassword = await bcrypt.hash('admin123', 10);
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO users (id, username, password, full_name, role) 
       VALUES (1, 'admin', ?, 'מנהל המערכת', 'admin')`,
      [adminPassword],
      (err) => {
        if (err) {
          console.error('Error creating admin user:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });

  // Create sample student (password: student123)
  const studentPassword = await bcrypt.hash('student123', 10);
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO users (username, password, full_name, role) 
       VALUES ('student1', ?, 'סטודנט לדוגמה', 'student')`,
      [studentPassword],
      (err) => {
        if (err) {
          console.error('Error creating student user:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });

  // Course already exists from database.js initialization
  // Now create modules based on the handbook content
  const modules = [
    { title: 'יסודות עזרה ראשונה', order: 1 },
    { title: 'הערכת מצב', order: 2 },
    { title: 'החייאה', order: 3 },
    { title: 'מצבי חירום נשימתיים', order: 4 },
    { title: 'מצבי חירום רפואיים', order: 5 },
    { title: 'מצבי סביבה', order: 6 },
    { title: 'טראומה', order: 7 }
  ];

  for (const module of modules) {
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO modules (course_id, title, order_index) VALUES (1, ?, ?)',
        [module.title, module.order],
        (err) => {
          if (err) {
            console.error(`Error creating module ${module.title}:`, err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  console.log('Database initialized successfully!');
  console.log('Default credentials:');
  console.log('Admin: username=admin, password=admin123');
  console.log('Student: username=student1, password=student123');
  
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      }
      process.exit(0);
    });
  }, 500);
}

initDatabase();

