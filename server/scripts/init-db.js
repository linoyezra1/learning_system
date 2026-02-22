require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  console.log('Initializing database with sample data...');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Set it in .env or your environment.');
    process.exit(1);
  }

  try {
    const ensureCourse = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM courses WHERE id = 1', (err, row) => (err ? reject(err) : resolve(row)));
    });
    if (!ensureCourse) {
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO courses (title, description) VALUES (?, ?)', ['קורס עזרה ראשונה - חוברת 44', ''], (err) => (err ? reject(err) : resolve()));
      });
    }

    const adminPassword = await bcrypt.hash('ezramedical1999', 10);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, full_name, role)
         VALUES (?, ?, 'מנהל המערכת', 'admin')
         ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, full_name = EXCLUDED.full_name`,
        ['admin', adminPassword],
        (err) => (err ? reject(err) : resolve())
      );
    });

    const studentPassword = await bcrypt.hash('student123', 10);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, full_name, role)
         VALUES ('student1', ?, 'סטודנט לדוגמה', 'student')
         ON CONFLICT (username) DO NOTHING`,
        [studentPassword],
        (err) => (err ? reject(err) : resolve())
      );
    });

    const modules = [
      { title: 'יסודות עזרה ראשונה', order: 1 },
      { title: 'הערכת מצב', order: 2 },
      { title: 'החייאה', order: 3 },
      { title: 'מצבי חירום נשימתיים', order: 4 },
      { title: 'מצבי חירום רפואיים', order: 5 },
      { title: 'מצבי סביבה', order: 6 },
      { title: 'טראומה', order: 7 }
    ];

    for (const mod of modules) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO modules (course_id, title, order_index) VALUES (1, ?, ?)',
          [mod.title, mod.order],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }

    console.log('Database initialized successfully!');
    console.log('Default credentials:');
    console.log('Admin: username=admin, password=ezramedical1999');
    console.log('Student: username=student1, password=student123');
  } catch (err) {
    console.error('Error during init:', err);
    process.exit(1);
  } finally {
    db.close(() => process.exit(0));
  }
}

initDatabase();
