# הוראות התקנה והפעלה

## דרישות מוקדמות

- Node.js גרסה 18 או חדשה יותר
- npm או yarn
- SQLite (מותקן אוטומטית עם Node.js)

## שלבי התקנה

### 1. התקנת תלויות

```bash
npm install
```

זה יתקין את כל החבילות הנדרשות:
- Next.js 14
- React 18
- Express.js
- SQLite3
- ועוד...

### 2. הגדרת סביבה

צור קובץ `.env` בשורש הפרויקט (או העתק מ-`.env.example`):

```env
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
DATABASE_PATH=./database/learning_system.db
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**חשוב**: שנה את `JWT_SECRET` במערכת ייצור!

### 3. אתחול בסיס הנתונים

```bash
npm run init-db
```

זה ייצור:
- את מבנה בסיס הנתונים
- משתמש מנהל: `admin` / `admin123`
- משתמש סטודנט לדוגמה: `student1` / `student123`
- קורס לדוגמה עם מודולים

### 4. הפעלת השרתים

**חשוב**: צריך להריץ את שני השרתים בו-זמנית!

**טרמינל 1 - Backend Server (Express)**:
```bash
npm run server
```
השרת ירוץ על http://localhost:3001

**טרמינל 2 - Frontend Server (Next.js)**:
```bash
npm run dev
```
האפליקציה תיפתח על http://localhost:3000

### 5. כניסה למערכת

פתח דפדפן וגש ל: http://localhost:3000

**משתמש מנהל**:
- שם משתמש: `admin`
- סיסמה: `admin123`

**משתמש סטודנט**:
- שם משתמש: `student1`
- סיסמה: `student123`

## הוספת תוכן

### יצירת משתמש חדש (כמדריך)

```bash
node -e "
const bcrypt = require('bcryptjs');
const db = require('./server/config/database');
const username = 'instructor1';
const password = 'instructor123';
const fullName = 'מדריך דוגמה';
bcrypt.hash(password, 10).then(hash => {
  db.run('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
    [username, hash, fullName, 'instructor'], (err) => {
    if (err) console.error(err);
    else console.log('User created:', username);
    process.exit(0);
  });
});
"
```

### יצירת מודול חדש

```sql
INSERT INTO modules (course_id, title, order_index) 
VALUES (1, 'שם המודול', 1);
```

### יצירת שקף

```sql
INSERT INTO slides (module_id, title, content, min_reading_time, order_index) 
VALUES (1, 'כותרת שקף', '<p>תוכן השקף כאן</p>', 30, 1);
```

### יצירת שאלת תרגול

```sql
INSERT INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
VALUES (
  1, 
  'מהי עזרה ראשונה?', 
  '{"א": "טיפול ראשוני לנפגע עד להגעת עזרה מקצועית", "ב": "טיפול בבית חולים", "ג": "טיפול בבית", "ד": "טיפול בחירום"}', 
  'א', 
  'עזרה ראשונה היא מתן סיוע מיידי לנפגע עד להגעת צוות רפואי מקצועי'
);
```

## פתרון בעיות

### שגיאה: "Port already in use"

אם פורט 3000 או 3001 תפוס:
- שנה את הפורט ב-`.env` וב-`package.json`
- או עצור את התהליך שרץ על הפורט

### שגיאה: "Cannot find module 'sqlite3'"

```bash
npm install sqlite3 --save
```

### שגיאה: "Database locked"

סגור את כל החיבורים לבסיס הנתונים והרץ מחדש.

### האפליקציה לא מתחברת ל-API

ודא ש:
- השרת Backend רץ על פורט 3001
- משתנה הסביבה `NEXT_PUBLIC_API_URL` מוגדר נכון
- אין בעיות CORS (השרת מוגדר לתמוך ב-CORS)

## ייצור (Production)

### בניית האפליקציה

```bash
npm run build
```

### הפעלת השרתים בייצור

```bash
# Backend
npm run server

# Frontend (בטרמינל אחר)
npm start
```

### העברת בסיס הנתונים ל-PostgreSQL

1. התקן `pg`:
```bash
npm install pg
```

2. שנה את `server/config/database.js` להשתמש ב-PostgreSQL במקום SQLite

3. עדכן את משתנה הסביבה `DATABASE_URL`

## אבטחה

**חשוב לפני ייצור**:

1. שנה את `JWT_SECRET` למפתח חזק ואקראי
2. הוסף HTTPS
3. הגבל את גישת ה-API רק למשתמשים מורשים
4. השתמש בסיסמאות חזקות
5. גבה את בסיס הנתונים באופן קבוע

## תמיכה

לשאלות או בעיות, צור issue ב-repository או פנה למפתח.



