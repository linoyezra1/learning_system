const db = require('../config/database');

// Sample content based on the handbook
async function addSampleContent() {
  console.log('Adding sample content...');

  // Get course ID
  db.get('SELECT id FROM courses WHERE id = 1', (err, course) => {
    if (err || !course) {
      console.error('Course not found');
      process.exit(1);
    }

    // Get modules
    db.all('SELECT * FROM modules WHERE course_id = 1 ORDER BY order_index', (err, modules) => {
      if (err || !modules.length) {
        console.error('Modules not found');
        process.exit(1);
      }

      // Module 1: יסודות עזרה ראשונה
      const module1 = modules.find(m => m.title.includes('יסודות'));
      if (module1) {
        // Slide 1: מהי עזרה ראשונה
        db.run(
          `INSERT OR IGNORE INTO slides (module_id, title, content, min_reading_time, order_index) 
           VALUES (?, ?, ?, 30, 1)`,
          [
            module1.id,
            'מהי עזרה ראשונה?',
            `<h2>מהי עזרה ראשונה?</h2>
            <p>עזרה ראשונה היא מתן סיוע מיידי לאדם שנפגע או חלה בפתאומיות, עד להגעת צוות רפואי מקצועי.</p>
            <h3>מטרות עזרה ראשונה:</h3>
            <ul>
              <li><strong>הצלת חיים</strong> - מתן טיפול מיידי שיכול להציל את חיי הנפגע</li>
              <li><strong>מניעת החמרה</strong> - עצירת התדרדרות המצב והגנה על הנפגע</li>
              <li><strong>תמיכה ראשונית</strong> - סיוע עד קבלת טיפול רפואי מתקדם</li>
            </ul>
            <p><strong>חשוב לזכור:</strong> עזרה ראשונה יכולה לעשות את ההבדל בין חיים ומוות ולמנוע נזקים בלתי הפיכים. כל שנייה קריטית במצבי חירום.</p>`,
            30
          ]
        );

        // Slide 2: משולש החיים
        db.run(
          `INSERT OR IGNORE INTO slides (module_id, title, content, min_reading_time, order_index) 
           VALUES (?, ?, ?, 40, 2)`,
          [
            module1.id,
            'משולש החיים',
            `<h2>משולש החיים</h2>
            <p>משולש החיים מייצג את שלושת האיברים החיוניים ביותר לקיום החיים: המוח, הלב והריאות. פגיעה באחד מהם מהווה סכנת חיים מיידית.</p>
            <h3>הלב</h3>
            <p>משאבת הדם - מזרים דם וחמצן לכל הגוף</p>
            <h3>הריאות</h3>
            <p>מערכת הנשימה - מספקות חמצן ומסלקות פחמן דו-חמצני</p>
            <h3>המוח</h3>
            <p>מרכז השליטה - מנהל את כל תפקודי הגוף</p>
            <p><strong>עיקרון קריטי:</strong> פגיעה באחד משלושת האיברים החיוניים – מוח, לב או ריאות – מהווה סכנת חיים מיידית ודורשת התערבות מיידית.</p>`,
            40
          ]
        );

        // Add practice question
        db.run(
          `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            module1.id,
            'מהו משולש החיים?',
            JSON.stringify({
              'א': 'שלושת האיברים החיוניים: מוח, לב, ריאות',
              'ב': 'שלושת שלבי החייאה',
              'ג': 'שלוש דרגות חומרה',
              'ד': 'שלושת סוגי הפציעות'
            }),
            'א',
            'משולש החיים מייצג את שלושת האיברים החיוניים ביותר: המוח, הלב והריאות. פגיעה באחד מהם מהווה סכנת חיים מיידית.'
          ]
        );
      }

      // Module 3: החייאה
      const module3 = modules.find(m => m.title.includes('החייאה'));
      if (module3) {
        db.run(
          `INSERT OR IGNORE INTO slides (module_id, title, content, min_reading_time, order_index) 
           VALUES (?, ?, ?, 60, 1)`,
          [
            module3.id,
            'החייאה למבוגר',
            `<h2>החייאה למבוגר - סכמת החייאה</h2>
            <h3>צעדים ראשונים:</h3>
            <ol>
              <li>בדיקת הכרה - טלטול קל של הנפגע</li>
              <li>קריאה לעזרה - "האם יש רופא כאן?"</li>
              <li>פתיחת נתיב אוויר - הטיית ראש לאחור</li>
              <li>בדיקת נשימה - ראייה, שמיעה, הרגשה (10 שניות)</li>
            </ol>
            <h3>במידה ואין נשימה:</h3>
            <ol>
              <li>30 לחיצות חזה במרכז החזה</li>
              <li>2 הנשמות</li>
              <li>המשך סדרה של 30:2 עד להגעת צוות רפואי או חיבור לדפיברילטור</li>
            </ol>
            <p><strong>חשוב:</strong> המשך החייאה ללא הפסקה עד להגעת צוות רפואי מקצועי או הפעלת דפיברילטור.</p>`,
            60
          ]
        );

        db.run(
          `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            module3.id,
            'מהו היחס בין לחיצות חזה להנשמות בהחייאה למבוגר?',
            JSON.stringify({
              'א': '30 לחיצות : 2 הנשמות',
              'ב': '15 לחיצות : 2 הנשמות',
              'ג': '30 לחיצות : 1 הנשמה',
              'ד': '10 לחיצות : 1 הנשמה'
            }),
            'א',
            'היחס הנכון בהחייאה למבוגר הוא 30 לחיצות חזה לכל 2 הנשמות.'
          ]
        );
      }

      console.log('Sample content added successfully!');
      process.exit(0);
    });
  });
}

addSampleContent();



