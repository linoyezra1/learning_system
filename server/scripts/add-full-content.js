const db = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Helper function to calculate minimum reading time (words per minute = 200, add buffer)
function calculateReadingTime(text) {
  // Remove HTML tags for word count
  const plainText = text.replace(/<[^>]*>/g, ' ');
  const words = plainText.split(/\s+/).filter(word => word.length > 0).length;
  // Average reading speed: 200 words per minute = ~3.3 words per second
  const seconds = Math.ceil((words / 3.3) * 1.5); // 1.5x buffer for comprehension
  return Math.max(30, seconds); // Minimum 30 seconds
}

// Helper function to wait for database operations
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function addFullContent() {
  console.log('מתחיל להוסיף תוכן מלא מחוברת 44...');
  console.log('');

  // Wait for database initialization
  await new Promise(resolve => setTimeout(resolve, 500));

  // Get course and modules
  const course = await dbGet('SELECT id FROM courses WHERE id = 1');
  if (!course) {
    console.error('קורס לא נמצא!');
    process.exit(1);
  }

  const modules = await dbGet('SELECT * FROM modules WHERE course_id = 1 ORDER BY order_index');
  
  // Module 1: יסודות עזרה ראשונה
  let module = await dbGet('SELECT * FROM modules WHERE course_id = 1 AND title LIKE ?', ['%יסודות%']);
  if (!module) {
    const moduleId = await dbRun('INSERT INTO modules (course_id, title, order_index) VALUES (1, ?, 1)', ['יסודות עזרה ראשונה']);
    module = { id: moduleId, title: 'יסודות עזרה ראשונה' };
  }

  console.log(`מוסיף תוכן למודול: ${module.title}`);

  // Slide 1: מהי עזרה ראשונה
  let slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 1)`,
    [
      module.id,
      'מהי עזרה ראשונה?',
      `<h2>מהי עזרה ראשונה?</h2>
      <p>עזרה ראשונה היא מתן סיוע מיידי לאדם שנפגע או חלה בפתאומיות, עד להגעת צוות רפואי מקצועי.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;">
        <tr style="background: var(--brand-cream);">
          <th style="padding: 1rem; border: 2px solid var(--brand-deep); text-align: right;">הצלת חיים</th>
          <th style="padding: 1rem; border: 2px solid var(--brand-deep); text-align: right;">מניעת החמרה</th>
          <th style="padding: 1rem; border: 2px solid var(--brand-deep); text-align: right;">תמיכה ראשונית</th>
        </tr>
        <tr>
          <td style="padding: 1rem; border: 2px solid var(--border-color);">מתן טיפול מיידי שיכול להציל את חיי הנפגע</td>
          <td style="padding: 1rem; border: 2px solid var(--border-color);">עצירת התדרדרות המצב והגנה על הנפגע</td>
          <td style="padding: 1rem; border: 2px solid var(--border-color);">סיוע עד קבלת טיפול רפואי מתקדם</td>
        </tr>
      </table>
      
      <p><strong>☐ חשוב לזכור</strong></p>
      <p>עזרה ראשונה יכולה לעשות את ההבדל בין חיים ומוות ולמנוע נזקים בלתי הפיכים. כל שנייה קריטית במצבי חירום.</p>`,
      calculateReadingTime('עזרה ראשונה היא מתן סיוע מיידי לאדם שנפגע או חלה בפתאומיות')
    ]
  );

  // Question for slide 1
  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מהי עזרה ראשונה?',
      JSON.stringify({
        'א': 'מתן סיוע מיידי לאדם שנפגע או חלה בפתאומיות, עד להגעת צוות רפואי מקצועי',
        'ב': 'טיפול רפואי מלא בבית חולים',
        'ג': 'טיפול רק בפציעות קלות',
        'ד': 'טיפול רק למבוגרים'
      }),
      'א',
      'עזרה ראשונה היא מתן סיוע מיידי לאדם שנפגע או חלה בפתאומיות, עד להגעת צוות רפואי מקצועי.'
    ]
  );

  // Slide 2: משולש החיים
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 2)`,
    [
      module.id,
      'משולש החיים',
      `<h2>משולש החיים</h2>
      <p>משולש החיים מייצג את שלושת האיברים החיוניים ביותר לקיום החיים: <strong>המוח, הלב והריאות</strong>. פגיעה באחד מהם מהווה סכנת חיים מיידית.</p>
      
      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin: 2rem 0;">
        <div style="padding: 1.5rem; background: #e3f2fd; border-right: 4px solid #2196f3; border-radius: 8px;">
          <h3 style="margin-top: 0;">הלב</h3>
          <p style="margin-bottom: 0;"><strong>משאבת הדם</strong> - מזרים דם וחמצן לכל הגוף</p>
        </div>
        
        <div style="padding: 1.5rem; background: #e8f5e9; border-right: 4px solid #4caf50; border-radius: 8px;">
          <h3 style="margin-top: 0;">הריאות</h3>
          <p style="margin-bottom: 0;"><strong>מערכת הנשימה</strong> - מספקות חמצן ומסלקות פחמן דו-חמצני</p>
        </div>
        
        <div style="padding: 1.5rem; background: #fff3e0; border-right: 4px solid #ff9800; border-radius: 8px;">
          <h3 style="margin-top: 0;">המוח</h3>
          <p style="margin-bottom: 0;"><strong>מרכז השליטה</strong> - מנהל את כל תפקודי הגוף</p>
        </div>
      </div>
      
      <p><strong>☐ עיקרון קריטי</strong></p>
      <p>פגיעה באחד משלושת האיברים החיוניים – מוח, לב או ריאות – מהווה סכנת חיים מיידית ודורשת התערבות מיידית. כל אחד מהאיברים הללו אחראי לתפקוד חיוני שמבטיח את המשך חיי הגוף.</p>`,
      calculateReadingTime('משולש החיים מייצג את שלושת האיברים החיוניים ביותר לקיום החיים: המוח, הלב והריאות')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
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

  // Slide 3: המוח - מרכז השליטה של הגוף
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 3)`,
    [
      module.id,
      'המוח – מרכז השליטה של הגוף',
      `<h2>המוח – מרכז השליטה של הגוף</h2>
      <p>המוח הוא האיבר המרכזי של מערכת העצבים, אשר אחראי על ניהול ותיאום כל תפקודי הגוף, פיזיים וקוגניטיביים כאחד.</p>
      
      <h3>תפקודים עיקריים:</h3>
      <ul style="line-height: 2;">
        <li><strong>שליטה על תפקודים חיוניים אוטומטיים:</strong> נשימה, קצב הלב, ויסות חום הגוף ולחץ הדם</li>
        <li><strong>תיאום תנועות:</strong> תנועות רצוניות ובלתי רצוניות של השרירים</li>
        <li><strong>עיבוד מידע חושי:</strong> ראיה, שמיעה, ריח, טעם ומישוש</li>
        <li><strong>זיכרון ולמידה:</strong> אחסון ושליפה של מידע</li>
        <li><strong>מצב הכרה:</strong> ניהול מצבי ערות ושינה</li>
      </ul>
      
      <p><strong>חשיבות החמצן למוח:</strong></p>
      <p>המוח הוא האיבר הצורך את כמות החמצן הגדולה ביותר בגוף - כ-20% מכלל צריכת החמצן של הגוף, למרות שהוא מהווה רק כ-2% ממשקל הגוף.</p>
      
      <p><strong>פגיעות אפשריות:</strong></p>
      <ul style="line-height: 2;">
        <li>חוסר חמצן (אנוקסיה) - עלול לגרום לנזק בלתי הפיך תוך דקות ספורות</li>
        <li>פגיעות ראש (טראומה) - עלולות לגרום לדימום תוך מוחי, בצקת או לחץ תוך גולגולתי</li>
        <li>שבץ מוחי - הפרעה באספקת הדם למוח</li>
      </ul>`,
      calculateReadingTime('המוח הוא האיבר המרכזי של מערכת העצבים, אשר אחראי על ניהול ותיאום כל תפקודי הגוף')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'כמה אחוז מכלל צריכת החמצן של הגוף צורך המוח?',
      JSON.stringify({
        'א': 'כ-20%',
        'ב': 'כ-5%',
        'ג': 'כ-50%',
        'ד': 'כ-10%'
      }),
      'א',
      'המוח צורך כ-20% מכלל צריכת החמצן של הגוף, למרות שהוא מהווה רק כ-2% ממשקל הגוף.'
    ]
  );

  // Module 2: הערכת מצב
  module = await dbGet('SELECT * FROM modules WHERE course_id = 1 AND title LIKE ?', ['%הערכת מצב%']);
  if (!module) {
    const moduleId = await dbRun('INSERT INTO modules (course_id, title, order_index) VALUES (1, ?, 2)', ['הערכת מצב']);
    module = { id: moduleId, title: 'הערכת מצב' };
  }

  console.log(`מוסיף תוכן למודול: ${module.title}`);

  // Slide 1: סיווג רמות הכרה
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 1)`,
    [
      module.id,
      'סיווג רמות הכרה',
      `<h2>סיווג רמות הכרה</h2>
      <p>הערכת מצב ההכרה של הנפגע היא חיונית לקביעת חומרת הפגיעה ולקבלת החלטות טיפוליות.</p>
      
      <h3>רמות הכרה עיקריות:</h3>
      
      <div style="padding: 1rem; background: #e8f5e9; border-radius: 8px; margin: 1rem 0;">
        <h4 style="margin-top: 0;">הכרה מלאה</h4>
        <p>הנפגע ער, מגיב, מבין ונענה לשאלות. יודע מי הוא, היכן הוא ומה קרה.</p>
      </div>
      
      <div style="padding: 1rem; background: #fff3e0; border-radius: 8px; margin: 1rem 0;">
        <h4 style="margin-top: 0;">הכרה חלקית / בלבול</h4>
        <p>הנפגע ער אך מבולבל, לא יכול לענות על כל השאלות או מתקשה להבין מה קורה סביבו.</p>
      </div>
      
      <div style="padding: 1rem; background: #ffebee; border-radius: 8px; margin: 1rem 0;">
        <h4 style="margin-top: 0;">אין הכרה / מחוסר הכרה</h4>
        <p>הנפגע לא מגיב לגירויים, לא עונה על שאלות ולא מגיב לכאב. מצב מסכן חיים הדורש התערבות מיידית.</p>
      </div>
      
      <h3>שיטת AVPU:</h3>
      <ul style="line-height: 2;">
        <li><strong>A - Alert</strong> (ער): הנפגע ער ובעל הכרה מלאה</li>
        <li><strong>V - Voice</strong> (קול): מגיב לקול אך לא ער לגמרי</li>
        <li><strong>P - Pain</strong> (כאב): מגיב לכאב בלבד</li>
        <li><strong>U - Unresponsive</strong> (לא מגיב): לא מגיב לכל גירוי</li>
      </ul>`,
      calculateReadingTime('הערכת מצב ההכרה של הנפגע היא חיונית לקביעת חומרת הפגיעה')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה מסמל האות A בשיטת AVPU?',
      JSON.stringify({
        'א': 'Alert - ער ובעל הכרה מלאה',
        'ב': 'Airway - נתיב אוויר',
        'ג': 'Action - פעולה',
        'ד': 'Ambulance - אמבולנס'
      }),
      'א',
      'A בשיטת AVPU מסמל Alert - הנפגע ער ובעל הכרה מלאה.'
    ]
  );

  // Slide 2: מדדים חיוניים
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 2)`,
    [
      module.id,
      'מדדים חיוניים',
      `<h2>מדדים חיוניים</h2>
      <p>מדדים חיוניים הם מדדי הגוף הבסיסיים שמעידים על תפקוד תקין של מערכות החיים החיוניות.</p>
      
      <h3>המדדים החיוניים העיקריים:</h3>
      
      <div style="display: grid; gap: 1rem; margin: 1.5rem 0;">
        <div style="padding: 1rem; border: 2px solid var(--brand-deep); border-radius: 8px;">
          <h4 style="margin-top: 0;">דופק (Pulse)</h4>
          <p>מספר פעימות הלב לדקה. מבוגר: 60-100 פעימות לדקה. ילד: 80-120 פעימות לדקה.</p>
        </div>
        
        <div style="padding: 1rem; border: 2px solid var(--brand-deep); border-radius: 8px;">
          <h4 style="margin-top: 0;">נשימה (Respiration)</h4>
          <p>מספר נשימות לדקה. מבוגר: 12-20 נשימות לדקה. ילד: 20-30 נשימות לדקה.</p>
        </div>
        
        <div style="padding: 1rem; border: 2px solid var(--brand-deep); border-radius: 8px;">
          <h4 style="margin-top: 0;">לחץ דם (Blood Pressure)</h4>
          <p>לחץ הדם בעורקים. תקין: 120/80 מ"מ כספית. ניתן למדידה רק עם מכשור רפואי.</p>
        </div>
        
        <div style="padding: 1rem; border: 2px solid var(--brand-deep); border-radius: 8px;">
          <h4 style="margin-top: 0;">טמפרטורת גוף</h4>
          <p>תקין: 36.5-37.5 מעלות צלזיוס. חום מעל 38 מעלות מעיד על מחלה או זיהום.</p>
        </div>
      </div>
      
      <p><strong>חשוב:</strong> כל חריגה מהערכים התקינים עלולה להעיד על בעיה רפואית הדורשת טיפול.</p>`,
      calculateReadingTime('מדדים חיוניים הם מדדי הגוף הבסיסיים שמעידים על תפקוד תקין')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מהו מספר הנשימות התקין לדקה למבוגר?',
      JSON.stringify({
        'א': '12-20 נשימות לדקה',
        'ב': '20-30 נשימות לדקה',
        'ג': '30-40 נשימות לדקה',
        'ד': '40-50 נשימות לדקה'
      }),
      'א',
      'מספר הנשימות התקין למבוגר הוא 12-20 נשימות לדקה.'
    ]
  );

  // Module 3: החייאה
  module = await dbGet('SELECT * FROM modules WHERE course_id = 1 AND title LIKE ?', ['%החייאה%']);
  if (!module) {
    const moduleId = await dbRun('INSERT INTO modules (course_id, title, order_index) VALUES (1, ?, 3)', ['החייאה']);
    module = { id: moduleId, title: 'החייאה' };
  }

  console.log(`מוסיף תוכן למודול: ${module.title}`);

  // Slide 1: החייאה למבוגר - סכמת החייאה
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 1)`,
    [
      module.id,
      'החייאה למבוגר - סכמת החייאה',
      `<h2>החייאה למבוגר - סכמת החייאה</h2>
      
      <h3>צעדים ראשונים:</h3>
      <ol style="line-height: 2.5; font-size: 1.1rem;">
        <li><strong>בדיקת הכרה</strong> - טלטול קל של הנפגע ושאלה: "האם אתה שומע אותי?"</li>
        <li><strong>קריאה לעזרה</strong> - "האם יש רופא כאן?" או "תזמינו מד"א - 101!"</li>
        <li><strong>פתיחת נתיב אוויר</strong> - הטיית ראש לאחור והרמת סנטר (Head Tilt-Chin Lift)</li>
        <li><strong>בדיקת נשימה</strong> - ראייה (תנועת בית חזה), שמיעה (קול נשימה), הרגשה (אוויר על הלחי) - למשך 10 שניות</li>
      </ol>
      
      <h3>במידה ואין נשימה:</h3>
      <div style="background: #ffebee; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-right: 4px solid #f44336;">
        <p style="font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem;">התחל החייאה!</p>
        <ol style="line-height: 2.5; font-size: 1.1rem;">
          <li><strong>30 לחיצות חזה</strong> - במרכז החזה, עומק 5-6 ס"מ, בקצב של 100-120 לחיצות לדקה</li>
          <li><strong>2 הנשמות</strong> - הנשמה מפה לפה, כל הנשמה למשך שנייה אחת</li>
          <li><strong>המשך סדרה של 30:2</strong> - 30 לחיצות ו-2 הנשמות, ללא הפסקה</li>
        </ol>
        <p style="margin-top: 1rem;"><strong>המשך החייאה ללא הפסקה</strong> עד להגעת צוות רפואי מקצועי או חיבור לדפיברילטור (AED).</p>
      </div>
      
      <h3>חשוב לזכור:</h3>
      <ul style="line-height: 2;">
        <li>אין להפסיק החייאה ללא סיבה מוצדקת</li>
        <li>לחיצות חזה הן החשובות ביותר - אם אינך יכול או לא רוצה לבצע הנשמות, בצע רק לחיצות חזה</li>
        <li>אם יש דפיברילטור - חבר אותו מיד והמשך לפי הוראותיו</li>
        <li>החייאה איכותית מצילה חיים!</li>
      </ul>`,
      calculateReadingTime('החייאה למבוגר - בדיקת הכרה, קריאה לעזרה, פתיחת נתיב אוויר, בדיקת נשימה')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
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

  // Slide 2: החייאת ילד
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 2)`,
    [
      module.id,
      'החייאת ילד',
      `<h2>החייאת ילד</h2>
      <p>החייאת ילד דומה להחייאה למבוגר, אך יש כמה הבדלים חשובים:</p>
      
      <h3>הבדלים עיקריים בהחייאת ילד:</h3>
      
      <div style="background: #e3f2fd; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h4 style="margin-top: 0;">גיל הילד: 1-8 שנים</h4>
        
        <h5>סכמת החייאה:</h5>
        <ul style="line-height: 2;">
          <li>התחל עם 5 הנשמות ראשונות</li>
          <li>לאחר מכן: <strong>15 לחיצות חזה : 2 הנשמות</strong> (לא 30:2 כמו במבוגר!)</li>
          <li>עומק לחיצות: כשליש מעומק בית החזה</li>
          <li>קצב: 100-120 לחיצות לדקה (כמו במבוגר)</li>
        </ul>
      </div>
      
      <h3>שלבי ההחייאה:</h3>
      <ol style="line-height: 2.5;">
        <li><strong>בדיקת הכרה</strong> - טלטול קל ושאלה</li>
        <li><strong>קריאה לעזרה</strong> - "תזמינו מד"א!"</li>
        <li><strong>פתיחת נתיב אוויר</strong> - הטיית ראש עדינה לאחור</li>
        <li><strong>בדיקת נשימה</strong> - 10 שניות</li>
        <li><strong>5 הנשמות ראשונות</strong> - אם אין נשימה</li>
        <li><strong>30 לחיצות חזה</strong> - במרכז החזה</li>
        <li><strong>2 הנשמות</strong></li>
        <li><strong>המשך 15:2</strong> - 15 לחיצות ו-2 הנשמות</li>
      </ol>
      
      <p><strong>חשוב:</strong> בילדים, סיבת המוות היא לרוב נשימתית, ולכן ההנשמות חשובות מאוד!</p>`,
      calculateReadingTime('החייאת ילד דומה להחייאה למבוגר, אך יש כמה הבדלים חשובים')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מהו היחס בין לחיצות חזה להנשמות בהחייאת ילד (גיל 1-8 שנים)?',
      JSON.stringify({
        'א': '15 לחיצות : 2 הנשמות',
        'ב': '30 לחיצות : 2 הנשמות',
        'ג': '5 לחיצות : 1 הנשמה',
        'ד': '10 לחיצות : 2 הנשמות'
      }),
      'א',
      'בהחייאת ילד (גיל 1-8 שנים), היחס הוא 15 לחיצות חזה לכל 2 הנשמות, בניגוד למבוגר שבו היחס הוא 30:2.'
    ]
  );

  // Slide 3: החייאת תינוקות
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 3)`,
    [
      module.id,
      'החייאת תינוקות',
      `<h2>החייאת תינוקות</h2>
      <p>תינוק = מגיל לידה ועד שנה אחת. ההחייאה שונה משמעותית מהחייאה למבוגר או ילד.</p>
      
      <div style="background: #fff3e0; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-right: 4px solid #ff9800;">
        <h3 style="margin-top: 0;">הבדלים חשובים בהחייאת תינוק:</h3>
        
        <h4>סכמת החייאה:</h4>
        <ul style="line-height: 2;">
          <li>התחל עם <strong>5 הנשמות ראשונות</strong></li>
          <li>לאחר מכן: <strong>15 לחיצות חזה : 2 הנשמות</strong></li>
          <li>לחיצות חזה בשתי אצבעות או בשתי אצבעות + אגודל</li>
          <li>עומק: כשליש מעומק בית החזה</li>
          <li>קצב: 100-120 לחיצות לדקה</li>
        </ul>
        
        <h4>טכניקת הלחיצות:</h4>
        <ul style="line-height: 2;">
          <li>מקום הלחיצה: מתחת לקו הפטמות, במרכז בית החזה</li>
          <li>שימוש ב-2 אצבעות (אצבע + אמה) או 2 אצבעות + אגודל</li>
          <li>התינוק מונח על משטח קשיח</li>
        </ul>
        
        <h4>טכניקת ההנשמה:</h4>
        <ul style="line-height: 2;">
          <li>הנשמה מפה לפה ולאף יחד</li>
          <li>הנשמה עדינה יותר - רק כמות אוויר של לחי</li>
          <li>נשימה אחת למשך שנייה</li>
        </ul>
      </div>
      
      <h3>שלבי ההחייאה:</h3>
      <ol style="line-height: 2.5;">
        <li><strong>בדיקת הכרה</strong> - דקירה קלה בכף הרגל</li>
        <li><strong>קריאה לעזרה</strong> - "תזמינו מד"א!"</li>
        <li><strong>פתיחת נתיב אוויר</strong> - הטייה עדינה מאוד</li>
        <li><strong>בדיקת נשימה</strong> - 10 שניות</li>
        <li><strong>5 הנשמות ראשונות</strong></li>
        <li><strong>30 לחיצות חזה</strong> - בשתי אצבעות</li>
        <li><strong>2 הנשמות</strong> - מפה לפה ולאף</li>
        <li><strong>המשך 15:2</strong></li>
      </ol>
      
      <p><strong>חשוב ביותר:</strong> בתינוקות, סיבת המוות היא כמעט תמיד נשימתית, ולכן ההנשמות הן קריטיות!</p>`,
      calculateReadingTime('תינוק = מגיל לידה ועד שנה אחת. ההחייאה שונה משמעותית מהחייאה למבוגר')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'איך מבצעים לחיצות חזה בהחייאת תינוק?',
      JSON.stringify({
        'א': 'בשתי אצבעות או שתי אצבעות + אגודל, מתחת לקו הפטמות',
        'ב': 'בשתי כפות ידיים, במרכז החזה',
        'ג': 'באגודל אחד בלבד',
        'ד': 'בכף יד אחת, כמו במבוגר'
      }),
      'א',
      'בהחייאת תינוק, לחיצות החזה מתבצעות בשתי אצבעות (אצבע + אמה) או שתי אצבעות + אגודל, מתחת לקו הפטמות, במרכז בית החזה.'
    ]
  );

  // Slide 4: דפיברילטור (AED)
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 4)`,
    [
      module.id,
      'דפיברילטור (AED)',
      `<h2>דפיברילטור - מכשיר החייאה אוטומטי (AED)</h2>
      
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-right: 4px solid #4caf50;">
        <h3 style="margin-top: 0;">מהו דפיברילטור?</h3>
        <p>מכשיר חשמלי אוטומטי שמנתח את קצב הלב ומעביר שוק חשמלי במקרה הצורך. <strong>שימוש נכון בדפיברילטור יכול להציל חיים!</strong></p>
      </div>
      
      <h3>מתי להשתמש בדפיברילטור?</h3>
      <ul style="line-height: 2;">
        <li>בנפגע מחוסר הכרה שאינו נושם</li>
        <li>במצב של דום לב (עצירת פעילות הלב)</li>
        <li>כאשר המכשיר זמין - יש להשתמש בו מיד!</li>
      </ul>
      
      <h3>שלבי השימוש בדפיברילטור:</h3>
      <ol style="line-height: 2.5;">
        <li><strong>הפעל את המכשיר</strong> - פתח את התיק והפעל את המכשיר (לרוב כפתור ירוק)</li>
        <li><strong>הצמד את המדבקות</strong> - הדבק את המדבקות על בית החזה לפי ההוראות במכשיר</li>
          <ul style="margin-right: 2rem;">
            <li>מדבקה אחת - מתחת לעצם הבריח הימני</li>
            <li>מדבקה שנייה - מתחת לבית השחי השמאלי, על הצד</li>
          </ul>
        <li><strong>התרחק מהנפגע</strong> - המכשיר מנתח את קצב הלב - אין לגעת בנפגע!</li>
        <li><strong>עקוב אחר הוראות המכשיר</strong> - המכשיר ידבר וינחה אותך</li>
        <li><strong>אם המכשיר מורה על שוק:</strong>
          <ul style="margin-right: 2rem;">
            <li>ודא שאיש אינו נוגע בנפגע</li>
            <li>לחץ על כפתור השוק (כפתור מהבהב)</li>
          </ul>
        </li>
        <li><strong>המשך החייאה</strong> - אחרי השוק, המשך 30:2 (30 לחיצות, 2 הנשמות)</li>
        <li><strong>המכשיר יבדוק שוב</strong> - המשך לפי הוראותיו</li>
      </ol>
      
      <div style="background: #ffebee; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
        <p><strong>⚠️ חשוב לזכור:</strong></p>
        <ul style="line-height: 2; margin-bottom: 0;">
          <li>אין להשתמש בדפיברילטור על נפגע רטוב - יש לייבש אותו תחילה</li>
          <li>אין להשתמש במים בקרבת המכשיר</li>
          <li>אם הנפגע עם קוצב לב - יש להצמיד את המדבקות במרחק 8 ס"מ מהקוצב</li>
          <li>אם יש תכשיטים או מטילי מתכת על בית החזה - יש להסירם</li>
        </ul>
      </div>
      
      <p><strong>חשוב:</strong> דפיברילטור בטוח לשימוש, גם על ידי אנשים ללא הכשרה רפואית. המכשיר מנחה את המשתמש ומונע טעויות.</p>`,
      calculateReadingTime('דפיברילטור - מכשיר חשמלי אוטומטי שמנתח את קצב הלב ומעביר שוק חשמלי')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות לפני שימוש בדפיברילטור על נפגע רטוב?',
      JSON.stringify({
        'א': 'לייבש את הנפגע תחילה',
        'ב': 'להשפריץ מים עליו',
        'ג': 'להצמיד את המדבקות מיד',
        'ד': 'לא צריך לעשות כלום'
      }),
      'א',
      'אין להשתמש בדפיברילטור על נפגע רטוב - יש לייבש אותו תחילה, אחרת החשמל לא יעבור נכון.'
    ]
  );

  // Module 4: מצבי חירום נשימתיים
  module = await dbGet('SELECT * FROM modules WHERE course_id = 1 AND title LIKE ?', ['%נשימתיים%']);
  if (!module) {
    const moduleId = await dbRun('INSERT INTO modules (course_id, title, order_index) VALUES (1, ?, 4)', ['מצבי חירום נשימתיים']);
    module = { id: moduleId, title: 'מצבי חירום נשימתיים' };
  }

  console.log(`מוסיף תוכן למודול: ${module.title}`);

  // Slide 1: חנק מגוף זר
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 1)`,
    [
      module.id,
      'חנק מגוף זר',
      `<h2>חנק מגוף זר</h2>
      <p>חנק מגוף זר הוא מצב חירום מסוכן המתרחש כאשר גוף זר (מזון, צעצוע, וכו') חוסם את נתיב האוויר.</p>
      
      <h3>סימנים לזיהוי חנק:</h3>
      <ul style="line-height: 2;">
        <li>הנפגע אוחז בגרון (סימן אוניברסלי)</li>
        <li>קושי בנשימה או נשימה רועשת</li>
        <li>שיעול</li>
        <li>קושי בדיבור או חוסר יכולת לדבר</li>
        <li>שינוי צבע - הפנים הופכות לכחולות או אדומות</li>
        <li>הכרה מעורפלת או אובדן הכרה</li>
      </ul>
      
      <div style="background: #ffebee; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-right: 4px solid #f44336;">
        <h3 style="margin-top: 0;">טיפול בחנק - מבוגר או ילד מעל שנה:</h3>
        
        <h4>אם הנפגע בהכרה ושיעול:</h4>
        <ul style="line-height: 2;">
          <li>עודד אותו להשתעל</li>
          <li>אל תכה אותו על הגב</li>
          <li>עקוב אחר מצבו</li>
        </ul>
        
        <h4>אם השיעול לא יעיל או הנפגע לא יכול לדבר:</h4>
        <ol style="line-height: 2.5;">
          <li><strong>5 מכות גב</strong> - עומד מאחורי הנפגע, מכה בין השכמות עם כף היד</li>
          <li><strong>5 לחיצות בטן (Heimlich)</strong> - עומד מאחורי הנפגע, ידיים סביב הבטן, לחיצות פנימה ולמעלה</li>
          <li><strong>חזור על 5+5</strong> עד שהגוף הזר יוצא או שהנפגע מאבד הכרה</li>
        </ol>
        
        <h4>אם הנפגע מחוסר הכרה:</h4>
        <ol style="line-height: 2.5;">
          <li>התחל החייאה (30:2)</li>
          <li>בכל פתיחה לבדיקת נשימה, בדוק אם רואה את הגוף הזר בפה</li>
          <li>אם רואה - נסה להוציא אותו באצבעות</li>
          <li>המשך החייאה</li>
        </ol>
      </div>
      
      <div style="background: #e3f2fd; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בחנק - תינוק (עד שנה):</h3>
        <ol style="line-height: 2.5;">
          <li><strong>5 מכות גב</strong> - התינוק על הידיים, ראש למטה, מכה בין השכמות</li>
          <li><strong>5 לחיצות חזה</strong> - התינוק על הידיים, לחיצות בשתי אצבעות (כמו בהחייאה)</li>
          <li><strong>חזור על 5+5</strong> עד שהגוף הזר יוצא או שהתינוק מאבד הכרה</li>
          <li>אם התינוק מחוסר הכרה - התחל החייאה</li>
        </ol>
      </div>`,
      calculateReadingTime('חנק מגוף זר הוא מצב חירום מסוכן המתרחש כאשר גוף זר חוסם את נתיב האוויר')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה הסדר הנכון לטיפול בחנק במבוגר בהכרה?',
      JSON.stringify({
        'א': '5 מכות גב, ואז 5 לחיצות בטן (Heimlich)',
        'ב': '5 לחיצות בטן, ואז 5 מכות גב',
        'ג': 'החייאה מיידית',
        'ד': 'רק מכות גב'
      }),
      'א',
      'הסדר הנכון: תחילה 5 מכות גב בין השכמות, ואז 5 לחיצות בטן (Heimlich), וחוזר חלילה עד שהגוף הזר יוצא.'
    ]
  );

  // Slide 2: אסתמה
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 2)`,
    [
      module.id,
      'אסתמה',
      `<h2>אסתמה</h2>
      <p>אסתמה היא מחלה כרונית של דרכי הנשימה הגורמת להתקפי קוצר נשימה, שיעול וצפצופים.</p>
      
      <h3>סימנים להתקף אסתמה:</h3>
      <ul style="line-height: 2;">
        <li>קוצר נשימה</li>
        <li>שיעול</li>
        <li>צפצופים בנשימה</li>
        <li>קושי בדיבור</li>
        <li>התכווצות שרירי בית החזה</li>
        <li>חרדה</li>
        <li>שימוש בשרירי עזר לנשימה</li>
      </ul>
      
      <h3>טיפול בהתקף אסתמה:</h3>
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <ol style="line-height: 2.5;">
          <li><strong>הושב את הנפגע</strong> - תנוחה נוחה עם תמיכה לידיים</li>
          <li><strong>הרגע את הנפגע</strong> - דבר אליו בקול רגוע</li>
          <li><strong>בדוק אם יש משאף</strong> - רוב חולי האסתמה נושאים משאף</li>
          <li><strong>עזור בשימוש במשאף</strong> - אם הנפגע לא יכול להשתמש בו לבד</li>
          <li><strong>אפשר אוויר צח</strong> - פתח חלונות, הרחק מגירויים</li>
          <li><strong>תזמין מד"א</strong> - אם אין שיפור תוך כמה דקות או המצב מחמיר</li>
        </ol>
      </div>
      
      <h3>מתי לקרוא למד"א (101)?</h3>
      <ul style="line-height: 2;">
        <li>התקף ראשון ללא אבחון קודם</li>
        <li>אין שיפור לאחר שימוש במשאף</li>
        <li>הנפגע לא יכול לדבר</li>
        <li>צבע כחול סביב השפתיים</li>
        <li>אובדן הכרה או הכרה מעורפלת</li>
        <li>חוסר תגובה למשאף</li>
      </ul>
      
      <p><strong>חשוב:</strong> התקף אסתמה חמור הוא מצב מסכן חיים הדורש טיפול רפואי מיידי.</p>`,
      calculateReadingTime('אסתמה היא מחלה כרונית של דרכי הנשימה הגורמת להתקפי קוצר נשימה')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות תחילה בהתקף אסתמה?',
      JSON.stringify({
        'א': 'להושיב את הנפגע בתנוחה נוחה ולהרגיע אותו',
        'ב': 'להתחיל החייאה מיד',
        'ג': 'להשכיב את הנפגע',
        'ד': 'לתת לו לשתות מים'
      }),
      'א',
      'תחילה יש להושיב את הנפגע בתנוחה נוחה, לתמוך לו בידיים ולהרגיע אותו. זה עוזר לו לנשום יותר טוב.'
    ]
  );

  // Module 5: מצבי חירום רפואיים
  module = await dbGet('SELECT * FROM modules WHERE course_id = 1 AND title LIKE ?', ['%רפואיים%']);
  if (!module) {
    const moduleId = await dbRun('INSERT INTO modules (course_id, title, order_index) VALUES (1, ?, 5)', ['מצבי חירום רפואיים']);
    module = { id: moduleId, title: 'מצבי חירום רפואיים' };
  }

  console.log(`מוסיף תוכן למודול: ${module.title}`);

  // Slide 1: עילפון
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 1)`,
    [
      module.id,
      'עילפון',
      `<h2>עילפון</h2>
      <p>עילפון הוא אובדן הכרה זמני שנגרם בדרך כלל מחוסר אספקת דם למוח.</p>
      
      <h3>סיבות נפוצות לעילפון:</h3>
      <ul style="line-height: 2;">
        <li>ירידה בלחץ הדם</li>
        <li>חרדה או לחץ נפשי</li>
        <li>עמידה ממושכת</li>
        <li>חום סביבה גבוה</li>
        <li>התייבשות</li>
        <li>עצירת נשימה לזמן ממושך</li>
        <li>שינוי תנוחה מהיר</li>
      </ul>
      
      <h3>סימנים לפני עילפון:</h3>
      <ul style="line-height: 2;">
        <li>סחרחורת</li>
        <li>הזעה</li>
        <li>חיוורון</li>
        <li>רעד</li>
        <li>ראיה מטושטשת</li>
        <li>טשטוש הכרה</li>
      </ul>
      
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בעילפון:</h3>
        
        <h4>אם הנפגע עדיין בהכרה (לפני עילפון):</h4>
        <ol style="line-height: 2.5;">
          <li>הושיב אותו או השכיב אותו</li>
          <li>הרכין את ראשו בין הברכיים (אם יושב)</li>
          <li>הרגע אותו</li>
          <li>הרם את רגליו (אם שוכב)</li>
        </ol>
        
        <h4>אם הנפגע כבר מחוסר הכרה:</h4>
        <ol style="line-height: 2.5;">
          <li><strong>בדוק הכרה</strong> - האם הוא מגיב?</li>
          <li><strong>בדוק נשימה</strong> - האם הוא נושם?</li>
          <li><strong>אם נושם:</strong>
            <ul style="margin-right: 2rem;">
              <li>השכב אותו בתנוחת התאוששות (על הצד)</li>
              <li>הרם את רגליו (אם אין חשד לפגיעה בעמוד השדרה)</li>
              <li>פתח כפתורים צמודים</li>
              <li>אפשר אוויר צח</li>
              <li>תזמין מד"א אם לא מתעורר תוך דקה-שתיים</li>
            </ul>
          </li>
          <li><strong>אם לא נושם:</strong> התחל החייאה!</li>
        </ol>
      </div>
      
      <p><strong>חשוב:</strong> אם הנפגע מתעורר תוך דקות ספורות ומרגיש טוב, זה כנראה עילפון פשוט. אם לא מתעורר או יש סימנים נוספים - תזמין מד"א מיד!</p>`,
      calculateReadingTime('עילפון הוא אובדן הכרה זמני שנגרם בדרך כלל מחוסר אספקת דם למוח')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות עם נפגע מחוסר הכרה שעילף ונושם?',
      JSON.stringify({
        'א': 'להשכיב אותו בתנוחת התאוששות ולהרים את רגליו',
        'ב': 'להתחיל החייאה מיד',
        'ג': 'להרים אותו לעמידה',
        'ד': 'לתת לו לשתות מים'
      }),
      'א',
      'אם נפגע מחוסר הכרה שנושם, יש להשכיב אותו בתנוחת התאוששות (על הצד), להרים את רגליו כדי לשפר אספקת דם למוח, ולאפשר אוויר צח.'
    ]
  );

  // Slide 2: אלרגיה ושוק אנפילקטי
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 2)`,
    [
      module.id,
      'אלרגיה ושוק אנפילקטי',
      `<h2>אלרגיה ושוק אנפילקטי</h2>
      <p>שוק אנפילקטי הוא תגובה אלרגית חריפה וסכנת חיים העלולה להתרחש תוך דקות ספורות לאחר חשיפה לאלרגן.</p>
      
      <h3>סימנים לשוק אנפילקטי:</h3>
      <ul style="line-height: 2;">
        <li>קושי נשימתי או צפצופים</li>
        <li>נפיחות בפנים, שפתיים, לשון או גרון</li>
        <li>פריחה או אודם בעור</li>
        <li>גרד עז</li>
        <li>דופק מהיר וחלש</li>
        <li>ירידה בלחץ הדם</li>
        <li>סחרחורת או אובדן הכרה</li>
        <li>בחילות והקאות</li>
      </ul>
      
      <div style="background: #ffebee; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-right: 4px solid #f44336;">
        <h3 style="margin-top: 0;">טיפול בשוק אנפילקטי:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>תזמין מד"א מיד! (101)</strong> - זה מצב חירום מסכן חיים</li>
          <li><strong>בדוק אם יש מזרק אפינפרין (EpiPen)</strong> - אם יש, עזור בשימוש</li>
          <li><strong>הושבע את הנפגע</strong> - אם נושם, תנוחה נוחה</li>
          <li><strong>הרגע את הנפגע</strong></li>
          <li><strong>אם יש קושי נשימתי</strong> - פתח נתיב אוויר, הוצא חפצים מהפה</li>
          <li><strong>אם מחוסר הכרה ולא נושם</strong> - התחל החייאה!</li>
          <li><strong>הסר את האלרגן אם אפשר</strong> - עקוץ דבורה, וכו'</li>
        </ol>
      </div>
      
      <p><strong>חשוב:</strong> שוק אנפילקטי עלול להיות קטלני תוך דקות. אין להמתין - יש לקרוא למד"א מיד!</p>`,
      calculateReadingTime('שוק אנפילקטי הוא תגובה אלרגית חריפה וסכנת חיים העלולה להתרחש תוך דקות')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות ראשון בשוק אנפילקטי?',
      JSON.stringify({
        'א': 'לתזמן מד"א מיד (101) - זה מצב חירום מסכן חיים',
        'ב': 'לתת מים',
        'ג': 'להשכיב את הנפגע',
        'ד': 'לחכות שזה יעבור'
      }),
      'א',
      'שוק אנפילקטי הוא מצב חירום מסכן חיים שעלול להיות קטלני תוך דקות. יש לתזמן מד"א מיד (101) בלי דיחוי.'
    ]
  );

  // Slide 3: הרעלות
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 3)`,
    [
      module.id,
      'הרעלות',
      `<h2>הרעלות</h2>
      <p>הרעלה היא מצב שבו חומר רעיל נכנס לגוף ופוגע בתפקוד התקין שלו.</p>
      
      <h3>דרכי כניסת רעלים לגוף:</h3>
      <ul style="line-height: 2;">
        <li>בליעה (שתייה או אכילה)</li>
        <li>נשימה (שאיפת גזים או אדים)</li>
        <li>מגע עם העור</li>
        <li>הזרקה</li>
      </ul>
      
      <h3>סימנים להרעלה:</h3>
      <ul style="line-height: 2;">
        <li>בחילות והקאות</li>
        <li>כאבי בטן</li>
        <li>שלשול</li>
        <li>קושי נשימתי</li>
        <li>כוויות סביב הפה (בהרעלת בליעה)</li>
        <li>פריחה בעור (בהרעלת מגע)</li>
        <li>הכרה מעורפלת או אובדן הכרה</li>
        <li>פרכוסים</li>
      </ul>
      
      <div style="background: #fff3e0; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בהרעלה:</h3>
        
        <h4>עקרונות כלליים:</h4>
        <ol style="line-height: 2.5;">
          <li><strong>תזמין מד"א (101)</strong> - וודא שמתקבל מידע על סוג הרעל</li>
          <li><strong>ודא בטיחות</strong> - אין להיכנס למקום מסוכן ללא ציוד מתאים</li>
          <li><strong>הרחיק את הנפגע מהרעל</strong></li>
          <li><strong>שמור על נתיב אוויר פתוח</strong></li>
          <li><strong>אל תגרום להקאה</strong> - אלא אם מד"א או רופא מורים כך</li>
          <li><strong>שמור דוגמא של החומר</strong> - אם אפשר, קח את החומר לרופא</li>
        </ol>
        
        <h4>הרעלת בליעה:</h4>
        <ul style="line-height: 2;">
          <li>אל תגרום להקאה</li>
          <li>אם הנפגע בהכרה - תן ללגום מים (רק אם מד"א מורים)</li>
          <li>אל תנסה לנטרל את הרעל</li>
        </ul>
        
        <h4>הרעלת נשימה:</h4>
        <ul style="line-height: 2;">
          <li>הוצא את הנפגע למקום מאוורר</li>
          <li>ודא שאתה בטוח - אל תכנס למקום מסוכן</li>
          <li>אם מחוסר הכרה ולא נושם - התחל החייאה</li>
        </ul>
        
        <h4>הרעלת מגע:</h4>
        <ul style="line-height: 2;">
          <li>הסר בגדים מזוהמים</li>
          <li>שטוף במים זורמים למשך 15-20 דקות</li>
          <li>אל תשפשף</li>
        </ul>
      </div>
      
      <p><strong>חשוב:</strong> במקרה של הרעלה - תמיד תזמין מד"א. אין לנסות לטפל לבד!</p>`,
      calculateReadingTime('הרעלה היא מצב שבו חומר רעיל נכנס לגוף ופוגע בתפקוד התקין שלו')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות בהרעלת בליעה?',
      JSON.stringify({
        'א': 'לתזמן מד"א ולדאוג לנתיב אוויר פתוח - אל לגרום להקאה אלא אם מד"א מורים',
        'ב': 'לגרום להקאה מיד',
        'ג': 'לתת חלב או מים כדי לנטרל',
        'ד': 'לחכות שזה יעבור'
      }),
      'א',
      'בהרעלת בליעה יש לתזמן מד"א מיד, לדאוג לנתיב אוויר פתוח, ולהימנע מגרימת הקאה אלא אם מד"א או רופא מורים כך במפורש.'
    ]
  );

  // Slide 4: אוטם בשריר הלב
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 4)`,
    [
      module.id,
      'אוטם בשריר הלב (התקף לב)',
      `<h2>אוטם בשריר הלב (התקף לב)</h2>
      <p>אוטם בשריר הלב מתרחש כאשר עורק כלילי נסתם או נחסם, מה שמוביל לחוסר אספקת דם וחמצן לשריר הלב.</p>
      
      <h3>סימנים להתקף לב:</h3>
      <ul style="line-height: 2;">
        <li><strong>כאב או לחץ בחזה</strong> - לרוב במרכז החזה, יכול להקרין לזרועות, כתפיים, צוואר, לסת או גב</li>
        <li>קוצר נשימה</li>
        <li>הזעה</li>
        <li>בחילות או הקאות</li>
        <li>סחרחורת</li>
        <li>חרדה</li>
        <li>עייפות קיצונית</li>
      </ul>
      
      <div style="background: #ffebee; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-right: 4px solid #f44336;">
        <p><strong>⚠️ חשוב:</strong> לא כל התקפי הלב מתבטאים בכאב חזה קלאסי. אצל נשים וקשישים הסימנים יכולים להיות שונים (קוצר נשימה, עייפות, בחילות).</p>
      </div>
      
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בהתקף לב:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>תזמין מד"א מיד! (101)</strong> - כל דקה חשובה</li>
          <li><strong>הושבע את הנפגע</strong> - תנוחה נוחה, חצי ישיבה</li>
          <li><strong>הרגע את הנפגע</strong> - פחד וחרדה מחמירים את המצב</li>
          <li><strong>פתח בגדים צמודים</strong></li>
          <li><strong>אפשר אוויר צח</strong></li>
          <li><strong>בדוק אם יש תרופות</strong> - אספירין (אם מד"א מורים) או ניטרוגליצרין (לחולי לב)</li>
          <li><strong>הכן את עצמך לחייאה</strong> - אם הנפגע יאבד הכרה, התחל החייאה</li>
          <li><strong>אם יש דפיברילטור</strong> - הכן אותו לשימוש</li>
        </ol>
      </div>
      
      <p><strong>זמן = שריר לב:</strong> כל דקה חשובה בהתקף לב. ככל שהטיפול הרפואי מגיע מהר יותר, כך הנזק לשריר הלב קטן יותר.</p>`,
      calculateReadingTime('אוטם בשריר הלב מתרחש כאשר עורק כלילי נסתם או נחסם')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה הסימן העיקרי של התקף לב?',
      JSON.stringify({
        'א': 'כאב או לחץ בחזה (יכול להקרין לזרועות, צוואר, לסת)',
        'ב': 'כאב ראש',
        'ג': 'כאב ברגל',
        'ד': 'שיעול'
      }),
      'א',
      'הסימן העיקרי של התקף לב הוא כאב או לחץ בחזה, לרוב במרכז החזה, שיכול להקרין לזרועות, כתפיים, צוואר, לסת או גב.'
    ]
  );

  // Slide 5: סוכרת והיפוגליקמיה
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 5)`,
    [
      module.id,
      'סוכרת והיפוגליקמיה',
      `<h2>סוכרת והיפוגליקמיה</h2>
      <p>היפוגליקמיה (רמת סוכר נמוכה בדם) היא מצב מסוכן שעלול להתרחש אצל חולי סוכרת.</p>
      
      <h3>סימנים להיפוגליקמיה:</h3>
      <ul style="line-height: 2;">
        <li>רעד</li>
        <li>הזעה</li>
        <li>חיוורון</li>
        <li>דופק מהיר</li>
        <li>סחרחורת</li>
        <li>בלבול</li>
        <li>שינויי התנהגות</li>
        <li>הכרה מעורפלת או אובדן הכרה</li>
        <li>פרכוסים</li>
      </ul>
      
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בהיפוגליקמיה:</h3>
        
        <h4>אם הנפגע בהכרה:</h4>
        <ol style="line-height: 2.5;">
          <li><strong>תן סוכר</strong> - סוכריות, מיץ מתוק, או דבש</li>
          <li><strong>אם אין שיפור תוך 15 דקות</strong> - תן עוד סוכר</li>
          <li><strong>אחרי שיפור</strong> - תן אוכל המכיל פחמימות (סנדוויץ', ביסקוויט)</li>
          <li><strong>תזמין מד"א</strong> - אם אין שיפור או המצב מחמיר</li>
        </ol>
        
        <h4>אם הנפגע מחוסר הכרה או לא יכול לבלוע:</h4>
        <ol style="line-height: 2.5;">
          <li><strong>אל תנסה להאכיל אותו!</strong> - הוא עלול להיחנק</li>
          <li><strong>תזמין מד"א מיד (101)</strong></li>
          <li><strong>השכב אותו בתנוחת התאוששות</strong> - אם נושם</li>
          <li><strong>אם לא נושם</strong> - התחל החייאה</li>
        </ol>
      </div>
      
      <p><strong>חשוב:</strong> אם הנפגע אומר שהוא חולה סוכרת ומרגיש רע - תן לו סוכר מייד, גם אם לא בטוח שהיפוגליקמיה.</p>`,
      calculateReadingTime('היפוגליקמיה היא רמת סוכר נמוכה בדם שעלולה להתרחש אצל חולי סוכרת')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לתת לנפגע בהכרה עם היפוגליקמיה?',
      JSON.stringify({
        'א': 'סוכר - סוכריות, מיץ מתוק, או דבש',
        'ב': 'מים',
        'ג': 'אוכל מלוח',
        'ד': 'שום דבר - רק לחכות'
      }),
      'א',
      'אם הנפגע בהכרה עם היפוגליקמיה, יש לתת סוכר מייד - סוכריות, מיץ מתוק, או דבש, כדי להעלות את רמת הסוכר בדם.'
    ]
  );

  // Slide 6: שבץ מוחי
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 6)`,
    [
      module.id,
      'שבץ מוחי',
      `<h2>שבץ מוחי</h2>
      <p>שבץ מוחי הוא הפרעה באספקת הדם למוח, הגורמת למוות של תאי מוח.</p>
      
      <h3>סימנים לשבץ מוחי:</h3>
      <ul style="line-height: 2;">
        <li><strong>חולשה או שיתוק פתאומי</strong> - בפנים, זרוע או רגל, לרוב בצד אחד של הגוף</li>
        <li><strong>קשיים בדיבור</strong> - דיבור לא ברור או בלבול</li>
        <li><strong>קשיים בראיה</strong> - ראייה מטושטשת או כפולה, אובדן ראייה באחת העיניים</li>
        <li><strong>כאב ראש חזק ופתאומי</strong></li>
        <li><strong>איבוד שיווי משקל</strong> - סחרחורת, קושי בהליכה</li>
        <li><strong>בלבול</strong></li>
      </ul>
      
      <div style="background: #fff3e0; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
        <h4 style="margin-top: 0;">בדיקה מהירה - שיטת FAST:</h4>
        <ul style="line-height: 2;">
          <li><strong>F - Face</strong> (פנים): בקש מהנפגע לחייך - האם צד אחד נופל?</li>
          <li><strong>A - Arms</strong> (זרועות): בקש להרים את שתי הזרועות - האם אחת נופלת?</li>
          <li><strong>S - Speech</strong> (דיבור): בקש לדבר - האם הדיבור לא ברור?</li>
          <li><strong>T - Time</strong> (זמן): אם יש אחד מהסימנים - תזמין מד"א מיד!</li>
        </ul>
      </div>
      
      <div style="background: #ffebee; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-right: 4px solid #f44336;">
        <h3 style="margin-top: 0;">טיפול בשבץ מוחי:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>תזמין מד"א מיד! (101)</strong> - כל דקה חשובה</li>
          <li><strong>שמור על נתיב אוויר פתוח</strong> - במיוחד אם יש הקאות</li>
          <li><strong>השכב את הנפגע</strong> - על הצד הנפגע (אם יש שיתוק)</li>
          <li><strong>אל תן לאכול או לשתות</strong> - עלול להיחנק</li>
          <li><strong>הרגע את הנפגע</strong></li>
          <li><strong>ודא שהנפגע נושם</strong> - אם לא נושם, התחל החייאה</li>
          <li><strong>רשום את שעת הופעת הסימנים</strong> - חשוב לרופאים</li>
        </ol>
      </div>
      
      <p><strong>זמן = תאי מוח:</strong> בשבץ מוחי, כל דקה חשובה. טיפול מהיר יכול למנוע נזק קבוע.</p>`,
      calculateReadingTime('שבץ מוחי הוא הפרעה באספקת הדם למוח, הגורמת למוות של תאי מוח')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה מסמל האות F בשיטת FAST לזיהוי שבץ מוחי?',
      JSON.stringify({
        'א': 'Face - פנים - האם צד אחד נופל?',
        'ב': 'Faint - התעלפות',
        'ג': 'Fever - חום',
        'ד': 'Fast - מהירות'
      }),
      'א',
      'F בשיטת FAST מסמל Face - יש לבדוק אם הנפגע יכול לחייך, ואם צד אחד של הפנים נופל.'
    ]
  );

  // Slide 7: פרכוסים
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 7)`,
    [
      module.id,
      'פרכוסים',
      `<h2>פרכוסים</h2>
      <p>פרכוס הוא פעילות חשמלית לא תקינה במוח הגורמת לתנועות בלתי רצוניות ולעיתים לאובדן הכרה.</p>
      
      <h3>סימנים לפרכוס:</h3>
      <ul style="line-height: 2;">
        <li>תנועות בלתי רצוניות של הגוף</li>
        <li>נוקשות שרירים</li>
        <li>ריר מהפה</li>
        <li>שפתיים כחולות</li>
        <li>אובדן הכרה</li>
        <li>אובדן שליטה על שלפוחית השתן או המעיים</li>
      </ul>
      
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בפרכוס:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>השאר את הנפגע שוכב</strong> - אל תנסה להחזיק אותו</li>
          <li><strong>הרחק חפצים מסוכנים</strong> - כדי למנוע פציעה</li>
          <li><strong>הנח משהו רך מתחת לראש</strong></li>
          <li><strong>הסר בגדים צמודים</strong> - במיוחד סביב הצוואר</li>
          <li><strong>אל תכניס דבר לפה!</strong> - לא אצבעות, לא כף, שום דבר</li>
          <li><strong>תזמין מד"א</strong> - אם הפרכוס נמשך יותר מ-5 דקות או חוזר</li>
          <li><strong>אחרי הפרכוס</strong> - השכב את הנפגע בתנוחת התאוששות</li>
          <li><strong>ודא נשימה</strong> - אם לא נושם אחרי הפרכוס, התחל החייאה</li>
        </ol>
      </div>
      
      <div style="background: #ffebee; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
        <p><strong>⚠️ מה לא לעשות בפרכוס:</strong></p>
        <ul style="line-height: 2; margin-bottom: 0;">
          <li>אל תכניס דבר לפה של הנפגע</li>
          <li>אל תנסה להחזיק או לעצור את התנועות</li>
          <li>אל תנסה להעיר את הנפגע</li>
          <li>אל תן מים או תרופות במהלך הפרכוס</li>
        </ul>
      </div>`,
      calculateReadingTime('פרכוס הוא פעילות חשמלית לא תקינה במוח הגורמת לתנועות בלתי רצוניות')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה לא צריך לעשות במהלך פרכוס?',
      JSON.stringify({
        'א': 'לא להכניס דבר לפה של הנפגע',
        'ב': 'להחזיק את הנפגע חזק',
        'ג': 'לתת מים לנפגע',
        'ד': 'לנסות להעיר את הנפגע'
      }),
      'א',
      'במהלך פרכוס אין להכניס דבר לפה של הנפגע - לא אצבעות, לא כף, שום דבר. זה עלול לגרום לשבירת שיניים או חנק.'
    ]
  );

  // Module 6: מצבי סביבה
  module = await dbGet('SELECT * FROM modules WHERE course_id = 1 AND title LIKE ?', ['%סביבה%']);
  if (!module) {
    const moduleId = await dbRun('INSERT INTO modules (course_id, title, order_index) VALUES (1, ?, 6)', ['מצבי סביבה']);
    module = { id: moduleId, title: 'מצבי סביבה' };
  }

  console.log(`מוסיף תוכן למודול: ${module.title}`);

  // Slide 1: התייבשות
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 1)`,
    [
      module.id,
      'התייבשות',
      `<h2>התייבשות</h2>
      <p>התייבשות היא מצב שבו הגוף מאבד יותר נוזלים ממה שהוא מקבל, מה שמוביל לחוסר איזון בנוזלי הגוף.</p>
      
      <h3>סימנים להתייבשות:</h3>
      <ul style="line-height: 2;">
        <li>צמא</li>
        <li>פה יבש</li>
        <li>עור יבש</li>
        <li>הזעה מועטה או לא קיימת</li>
        <li>שתן כהה או מועט</li>
        <li>סחרחורת</li>
        <li>עייפות</li>
        <li>בלבול</li>
        <li>דופק מהיר</li>
        <li>ירידה בלחץ הדם</li>
      </ul>
      
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בהתייבשות:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>הסר את הנפגע מהשמש/חום</strong></li>
          <li><strong>הושבע את הנפגע</strong> - במקום קריר ומוצל</li>
          <li><strong>תן מים</strong> - אם הנפגע בהכרה ויכול לבלוע</li>
          <li><strong>תן משקאות איזוטוניים</strong> - אם יש (מחזירים מלחים)</li>
          <li><strong>קרר את הנפגע</strong> - רטב במגבות קרות, מאוורר</li>
          <li><strong>תזמין מד"א</strong> - אם ההתייבשות חמורה או הנפגע לא משתפר</li>
          <li><strong>אם מחוסר הכרה</strong> - השכב בתנוחת התאוששות, תזמין מד"א</li>
        </ol>
      </div>
      
      <p><strong>חשוב:</strong> התייבשות חמורה היא מצב מסכן חיים. יש לטפל בה מיד ולמנוע אותה.</p>`,
      calculateReadingTime('התייבשות היא מצב שבו הגוף מאבד יותר נוזלים ממה שהוא מקבל')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה הסימן הראשון של התייבשות?',
      JSON.stringify({
        'א': 'צמא',
        'ב': 'חום גבוה',
        'ג': 'כאב ראש',
        'ד': 'שיעול'
      }),
      'א',
      'הסימן הראשון והשכיח ביותר של התייבשות הוא צמא.'
    ]
  );

  // Slide 2: היפותרמיה
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 2)`,
    [
      module.id,
      'היפותרמיה (היפותרמיה)',
      `<h2>היפותרמיה (היפותרמיה)</h2>
      <p>היפותרמיה היא ירידה בטמפרטורת הגוף מתחת ל-35 מעלות צלזיוס, מה שמסכן את תפקוד הגוף.</p>
      
      <h3>סימנים להיפותרמיה:</h3>
      <ul style="line-height: 2;">
        <li>רעד (בשלבים הראשונים)</li>
        <li>עור קר וחיוור</li>
        <li>דופק חלש ואיטי</li>
        <li>נשימה איטית ורדודה</li>
        <li>בלבול</li>
        <li>עייפות קיצונית</li>
        <li>חוסר תגובה</li>
        <li>אובדן הכרה</li>
      </ul>
      
      <div style="background: #e3f2fd; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בהיפותרמיה:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>הסר מהקור</strong> - הוצא למקום חם ומוגן</li>
          <li><strong>הסר בגדים רטובים</strong> - החלף בבגדים יבשים</li>
          <li><strong>חמם את הנפגע</strong> - כיסוי בשמיכות, מגע עור לעור, משקאות חמים (אם בהכרה)</li>
          <li><strong>אל תחמם מהר מדי!</strong> - חימום מהיר מדי יכול לגרום לנזק</li>
          <li><strong>אל תניח במים חמים</strong> - זה מסוכן</li>
          <li><strong>ודא נשימה</strong> - אם לא נושם, התחל החייאה</li>
          <li><strong>תזמין מד"א</strong> - במיוחד אם היפותרמיה חמורה</li>
        </ol>
      </div>
      
      <p><strong>חשוב:</strong> היפותרמיה חמורה היא מצב מסכן חיים הדורש טיפול רפואי מיידי.</p>`,
      calculateReadingTime('היפותרמיה היא ירידה בטמפרטורת הגוף מתחת ל-35 מעלות צלזיוס')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות תחילה בהיפותרמיה?',
      JSON.stringify({
        'א': 'להוציא את הנפגע מהקור ולהסיר בגדים רטובים',
        'ב': 'לשים את הנפגע במים חמים',
        'ג': 'לחמם מהר מאוד',
        'ד': 'לתת מים קרים'
      }),
      'א',
      'תחילה יש להוציא את הנפגע מהקור למקום חם ומוגן, ולהסיר בגדים רטובים ולהחליף בבגדים יבשים.'
    ]
  );

  // Slide 3: הכשת נחש
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 3)`,
    [
      module.id,
      'הכשת נחש',
      `<h2>הכשת נחש</h2>
      <p>הכשת נחש ארסי היא מצב חירום רפואי הדורש טיפול מיידי.</p>
      
      <h3>סימנים להכשת נחש:</h3>
      <ul style="line-height: 2;">
        <li>סימני נשיכה - שני חורים או שריטה</li>
        <li>כאב מקומי</li>
        <li>נפיחות סביב מקום ההכשה</li>
        <li>שינוי צבע - אדום, כחול</li>
        <li>בחילות והקאות</li>
        <li>קושי נשימתי</li>
        <li>בלבול</li>
        <li>דופק מהיר</li>
        <li>חולשה</li>
      </ul>
      
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בהכשת נחש:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>הרחק את הנפגע מהנחש</strong> - ודא שהנחש רחוק</li>
          <li><strong>תזמין מד"א מיד! (101)</strong> - חשוב להגיע לבית חולים מהר</li>
          <li><strong>השכב את הנפגע</strong> - תנועה מגדילה את ספיגת הארס</li>
          <li><strong>השאר את האיבר המוכש בתנוחה נמוכה</strong> - מתחת לרמת הלב</li>
          <li><strong>הסר תכשיטים ובגדים צמודים</strong> - לפני שהנפיחות תגבר</li>
          <li><strong>שמור על הנפגע רגוע</strong></li>
          <li><strong>רשם את סוג הנחש אם אפשר</strong> - עוזר לרופאים</li>
          <li><strong>אל תחתוך את מקום ההכשה</strong></li>
          <li><strong>אל תמצוץ את הארס</strong></li>
          <li><strong>אל תשים קרח</strong></li>
          <li><strong>אל תשים חוסם עורקים</strong> - אלא אם מד"א מורים כך</li>
        </ol>
      </div>
      
      <div style="background: #ffebee; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
        <p><strong>⚠️ מה לא לעשות בהכשת נחש:</strong></p>
        <ul style="line-height: 2; margin-bottom: 0;">
          <li>אל תחתוך את מקום ההכשה</li>
          <li>אל תמצוץ את הארס</li>
          <li>אל תשים קרח</li>
          <li>אל תשים חוסם עורקים (לרוב)</li>
          <li>אל תרוץ או תנועה - זה מגדיל את ספיגת הארס</li>
        </ul>
      </div>`,
      calculateReadingTime('הכשת נחש ארסי היא מצב חירום רפואי הדורש טיפול מיידי')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות עם איבר מוכש נחש?',
      JSON.stringify({
        'א': 'להשאיר אותו בתנוחה נמוכה (מתחת לרמת הלב) ולהשכיב את הנפגע',
        'ב': 'להרים אותו גבוה',
        'ג': 'לשים קרח',
        'ד': 'לחתוך את מקום ההכשה'
      }),
      'א',
      'באיבר מוכש נחש יש להשכיב את הנפגע ולהשאיר את האיבר בתנוחה נמוכה (מתחת לרמת הלב), כדי להאט את ספיגת הארס. יש להימנע מתנועה.'
    ]
  );

  // Module 7: טראומה
  module = await dbGet('SELECT * FROM modules WHERE course_id = 1 AND title LIKE ?', ['%טראומה%']);
  if (!module) {
    const moduleId = await dbRun('INSERT INTO modules (course_id, title, order_index) VALUES (1, ?, 7)', ['טראומה']);
    module = { id: moduleId, title: 'טראומה' };
  }

  console.log(`מוסיף תוכן למודול: ${module.title}`);

  // Slide 1: מבוא לטראומה
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 1)`,
    [
      module.id,
      'מבוא לטראומה',
      `<h2>מבוא לטראומה</h2>
      <p>טראומה היא פגיעה פיזית כתוצאה מכוח חיצוני - תאונה, נפילה, מכה, וכו'.</p>
      
      <h3>עקרונות טיפול בטראומה:</h3>
      <ol style="line-height: 2.5;">
        <li><strong>בטיחות</strong> - ודא שהמקום בטוח לך ולנפגע</li>
        <li><strong>הערכת מצב מהירה</strong> - בדוק הכרה, נשימה, דימום</li>
        <li><strong>טיפול בדימום פורץ</strong> - עצור דימום מאסיבי</li>
        <li><strong>קיבוע צוואר</strong> - אם יש חשד לפגיעה בעמוד השדרה</li>
        <li><strong>הגנה על נתיב האוויר</strong></li>
        <li><strong>תזמין מד"א (101)</strong></li>
      </ol>
      
      <div style="background: #fff3e0; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">סדר פעולות בטראומה:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>Safety</strong> - בטיחות (האם המקום בטוח?)</li>
          <li><strong>Airway</strong> - נתיב אוויר (פתוח?)</li>
          <li><strong>Breathing</strong> - נשימה (נושם?)</li>
          <li><strong>Circulation</strong> - דופק ודימום (יש דימום פורץ?)</li>
          <li><strong>Disability</strong> - מצב הכרה (הכרה?)</li>
          <li><strong>Exposure</strong> - חשיפה (חשוף פגיעות נוספות)</li>
        </ol>
        <p style="margin-top: 1rem; font-weight: bold;">זכור: ABCDE - סדר הטיפול בטראומה</p>
      </div>
      
      <h3>חשד לפגיעה בעמוד השדרה:</h3>
      <p>אם יש חשד לפגיעה בעמוד השדרה (תאונת דרכים, נפילה מגובה, פגיעת ראש) - יש לקבע את הצוואר והירכיים ולא להזיז את הנפגע אלא אם כן חייבים (סכנה מיידית).</p>`,
      calculateReadingTime('טראומה היא פגיעה פיזית כתוצאה מכוח חיצוני - תאונה, נפילה, מכה')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה הסדר הנכון בטיפול בטראומה?',
      JSON.stringify({
        'א': 'בטיחות, נתיב אוויר, נשימה, דופק/דימום, מצב הכרה',
        'ב': 'דימום, נשימה, הכרה',
        'ג': 'החייאה מיידית',
        'ד': 'קיבוע שברים, אז בטיחות'
      }),
      'א',
      'הסדר הנכון בטיפול בטראומה הוא: בטיחות (Safety), נתיב אוויר (Airway), נשימה (Breathing), דופק ודימום (Circulation), מצב הכרה (Disability), חשיפה (Exposure) - ABCDE.'
    ]
  );

  // Slide 2: פגיעות ראש
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 2)`,
    [
      module.id,
      'פגיעות ראש',
      `<h2>פגיעות ראש</h2>
      <p>פגיעות ראש הן מסוכנות ועלולות לגרום לנזק מוחי או דימום תוך גולגולתי.</p>
      
      <h3>סימנים לפגיעת ראש חמורה:</h3>
      <ul style="line-height: 2;">
        <li>אובדן הכרה (אפילו קצר)</li>
        <li>בלבול או שינוי התנהגות</li>
        <li>בחילות והקאות</li>
        <li>כאב ראש חזק</li>
        <li>נוזל שקוף מהאוזן או האף (חשד לשבר בבסיס הגולגולת)</li>
        <li>התקפי פרכוסים</li>
        <li>חוסר שיווי משקל</li>
        <li>דיבור לא ברור</li>
      </ul>
      
      <div style="background: #ffebee; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-right: 4px solid #f44336;">
        <h3 style="margin-top: 0;">טיפול בפגיעת ראש:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>קבע את הצוואר</strong> - ידנית או עם צווארון</li>
          <li><strong>אל תזיז את הנפגע</strong> - אלא אם כן יש סכנה מיידית</li>
          <li><strong>ודא נשימה</strong> - אם לא נושם, התחל החייאה</li>
          <li><strong>אם נושם</strong> - השכב בתנוחת התאוששות (אם אין חשד לשבר בעמוד שדרה)</li>
          <li><strong>אל תחסום את האוזן/אף</strong> - אם יש נוזל שקוף</li>
          <li><strong>עצור דימום חיצוני</strong> - בלחץ ישיר</li>
          <li><strong>תזמין מד"א מיד (101)</strong></li>
        </ol>
      </div>
      
      <div style="background: #fff3e0; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
        <p><strong>⚠️ סימן אזהרה - נוזל שקוף מהאוזן/אף:</strong></p>
        <p>נוזל שקוף מהאוזן או האף אחרי פגיעת ראש עלול להעיד על <strong>שבר בבסיס הגולגולת</strong>. אל תחסום את האוזן/אף - זה עלול לגרום ללחץ תוך גולגולתי!</p>
      </div>`,
      calculateReadingTime('פגיעות ראש הן מסוכנות ועלולות לגרום לנזק מוחי או דימום תוך גולגולתי')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות אם יש נוזל שקוף מהאוזן אחרי פגיעת ראש?',
      JSON.stringify({
        'א': 'לא לחסום את האוזן ולתזמן מד"א - זה עלול להיות שבר בבסיס הגולגולת',
        'ב': 'לחסום את האוזן במטליות',
        'ג': 'להטות את הראש לניקוז',
        'ד': 'לשטוף את האוזן במים'
      }),
      'א',
      'נוזל שקוף מהאוזן או האף אחרי פגיעת ראש עלול להעיד על שבר בבסיס הגולגולת. אל תחסום - זה עלול לגרום ללחץ תוך גולגולתי. יש לתזמן מד"א מיד.'
    ]
  );

  // Slide 3: חבלה בעמוד שדרה
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 3)`,
    [
      module.id,
      'חבלה בעמוד שדרה',
      `<h2>חבלה בעמוד שדרה</h2>
      <p>חבלה בעמוד השדרה היא מצב מסוכן שעלול לגרום לשיתוק קבוע אם לא מטפלים בו נכון.</p>
      
      <h3>מתי לחשוד בחבלה בעמוד שדרה:</h3>
      <ul style="line-height: 2;">
        <li>תאונת דרכים</li>
        <li>נפילה מגובה</li>
        <li>פגיעת ראש</li>
        <li>פגיעת צוואר</li>
        <li>כאב בצוואר או גב</li>
        <li>שיתוק או חולשה בגפיים</li>
        <li>חוסר תחושה בגפיים</li>
        <li>קושי בנשימה</li>
      </ul>
      
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בחבלת עמוד שדרה:</h3>
        <ol style="line-height: 2.5;">
          <li><strong>קבע את הצוואר ידנית</strong> - תמוך בידיים, אל תזיז</li>
          <li><strong>אל תזיז את הנפגע!</strong> - אלא אם כן יש סכנה מיידית (אש, מים, וכו')</li>
          <li><strong>ודא נשימה</strong> - אם לא נושם, התחל החייאה תוך שמירה על יישור הצוואר</li>
          <li><strong>תזמין מד"א מיד (101)</strong> - צוות מקצועי יידע להזיז בבטחה</li>
          <li><strong>אם חייבים להזיז</strong> (סכנה מיידית):
            <ul style="margin-right: 2rem;">
              <li>צריך מספר אנשים</li>
              <li>שמור על יישור מלא של הראש, צוואר וגב</li>
              <li>הזז כמו "בול עץ" - הכל ביחד</li>
              <li>השתמש בלוח קשיח אם יש</li>
            </ul>
          </li>
        </ol>
      </div>
      
      <div style="background: #ffebee; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
        <p><strong>⚠️ חשוב ביותר:</strong></p>
        <p>תנועה לא נכונה של נפגע עם חבלת עמוד שדרה עלולה לגרום לשיתוק קבוע! אם אין סכנה מיידית - אל תזיז!</p>
      </div>`,
      calculateReadingTime('חבלה בעמוד השדרה היא מצב מסוכן שעלול לגרום לשיתוק קבוע')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות עם נפגע שחושד שיש לו חבלת עמוד שדרה?',
      JSON.stringify({
        'א': 'לקבוע את הצוואר ידנית ולא להזיז את הנפגע (אלא אם יש סכנה מיידית)',
        'ב': 'להרים את הנפגע מיד לעמידה',
        'ג': 'לנסות להזיז אותו לבד',
        'ד': 'לתת לו לנסות לעמוד'
      }),
      'א',
      'בחבלת עמוד שדרה יש לקבוע את הצוואר ידנית ולא להזיז את הנפגע, אלא אם כן יש סכנה מיידית. תנועה לא נכונה עלולה לגרום לשיתוק קבוע.'
    ]
  );

  // Slide 4: שברים בגפיים
  slideId = await dbRun(
    `INSERT OR REPLACE INTO slides (module_id, title, content, min_reading_time, order_index) 
     VALUES (?, ?, ?, ?, 4)`,
    [
      module.id,
      'שברים בגפיים',
      `<h2>שברים בגפיים</h2>
      <p>שבר הוא שבירה של עצם. יכול להיות שבר סגור (העצם שבורה אבל העור שלם) או שבר פתוח (העצם בולטת החוצה).</p>
      
      <h3>סימנים לשבר:</h3>
      <ul style="line-height: 2;">
        <li>כאב חזק</li>
        <li>נפיחות</li>
        <li>שינוי צורה של האיבר</li>
        <li>קושי או חוסר יכולת להזיז את האיבר</li>
        <li>שמיעת קול שבירה בזמן הפציעה</li>
        <li>שבר פתוח - עצם בולטת דרך העור</li>
        <li>דימום (במיוחד בשבר פתוח)</li>
      </ul>
      
      <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
        <h3 style="margin-top: 0;">טיפול בשבר:</h3>
        
        <h4>שבר סגור:</h4>
        <ol style="line-height: 2.5;">
          <li><strong>אל תנסה ליישר את האיבר!</strong></li>
          <li><strong>קבע את האיבר</strong> - במנח שמצאת אותו</li>
          <li><strong>קרר</strong> - קרח או מים קרים (עטוף במגבת)</li>
          <li><strong>הגבה</strong> - כדי להקטין נפיחות</li>
          <li><strong>תזמין מד"א</strong> - או קח לבית חולים</li>
        </ol>
        
        <h4>שבר פתוח:</h4>
        <ol style="line-height: 2.5;">
          <li><strong>עצור דימום</strong> - לחץ ישיר סביב השבר (לא על העצם!)</li>
          <li><strong>כסה את השבר</strong> - תחבושת סטרילית, אל תנסה להחזיר את העצם</li>
          <li><strong>קבע את האיבר</strong> - במנח שמצאת אותו</li>
          <li><strong>אל תנסה לנקות את השבר</strong></li>
          <li><strong>תזמין מד"א מיד (101)</strong></li>
        </ol>
      </div>
      
      <div style="background: #ffebee; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
        <p><strong>⚠️ מה לא לעשות בשבר:</strong></p>
        <ul style="line-height: 2; margin-bottom: 0;">
          <li>אל תנסה ליישר את האיבר</li>
          <li>אל תנסה להחזיר עצם בולטת בשבר פתוח</li>
          <li>אל תנקה את השבר הפתוח</li>
          <li>אל תיתן אוכל או שתייה - אולי יצטרך ניתוח</li>
        </ul>
      </div>`,
      calculateReadingTime('שבר הוא שבירה של עצם. יכול להיות שבר סגור או שבר פתוח')
    ]
  );

  await dbRun(
    `INSERT OR IGNORE INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      slideId,
      'מה צריך לעשות בשבר פתוח (כאשר העצם בולטת)?',
      JSON.stringify({
        'א': 'עצירת דימום פורץ, כיסוי סטרילי של העצם וקיבוע הגפה כפי שהיא',
        'ב': 'ניסיון להחזיר את העצם למקומה מתחת לעור',
        'ג': 'יישור הגפה בכוח כדי שיהיה קל לקבע אותה',
        'ד': 'שטיפת העצם במים זורמים'
      }),
      'א',
      'בשבר פתוח יש לעצור דימום בלחץ ישיר (סביב השבר, לא על העצם), לכסות את העצם בתחבושת סטרילית, ולקבע את הגפה במנח שמצאת אותה. אין להחזיר את העצם או לנקות אותה.'
    ]
  );

  console.log('');
  console.log('✅ הוספת תוכן הושלמה בהצלחה!');
  console.log('');
  console.log('התוכן כולל:');
  console.log('✅ יסודות עזרה ראשונה (3 שקפים)');
  console.log('✅ הערכת מצב (2 שקפים)');
  console.log('✅ החייאה (4 שקפים - מבוגר, ילד, תינוק, דפיברילטור)');
  console.log('✅ מצבי חירום נשימתיים (2 שקפים)');
  console.log('✅ מצבי חירום רפואיים (7 שקפים)');
  console.log('✅ מצבי סביבה (3 שקפים)');
  console.log('✅ טראומה (4 שקפים)');
  console.log('');
  console.log('סה"כ: כ-25 שקפים עם שאלות תרגול!');
  console.log('');
  
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      }
      process.exit(0);
    });
  }, 500);
}

addFullContent();

