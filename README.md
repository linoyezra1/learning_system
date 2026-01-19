# מערכת לימוד מתוקשבת - עזרה ראשונה חוברת 44

מערכת לימוד מתוקשבת מלאה לקורס עזרה ראשונה לפי דרישות משרד הבריאות.

## דרישות שנענו

✅ **הפקת דו"ח** - המערכת מאפשרת הפקת דו"ח PDF על כל משתמש עם הוכחת ביצוע הלימוד המתוקשב המלא. הדוחות נשמרים במערכת למשך 3 שנים לפחות.

✅ **בקרת מדריך** - מדריך הקורס יכול לוודא שחניך סיים את כלל הלימוד המתוקשב באופן משביע רצון.

✅ **ממשק בעברית** - כל המערכת תומכת בשפת החניך (עברית) עם תמיכה מלאה בכיוון RTL.

✅ **תכנים מתוקשבים** - המערכת תומכת בלומדות המשלבות טקסט, תמונות, אנימציות וסרטונים.

✅ **כניסה אישית** - כל סטודנט נכנס עם שם משתמש וסיסמה אישיים.

✅ **מדידת זמן** - המערכת מודדת זמן לימוד בכל שקף ולא מאפשרת דילוג לפני סיום זמן הקריאה המינימלי.

✅ **שאלות תרגול** - כל שקף יכול לכלול שאלות תרגול עצמי עם משוב מיידי.

✅ **שאלות למדריך** - לכל סטודנט יש אפשרות להפנות שאלות למדריך הקורס.

✅ **הורדה והדפסה** - סטודנטים יכולים להוריד ולהדפיס את חומרי הלימוד.

✅ **מעקב עצמי** - כל סטודנט יכול לראות את התקדמותו ויכול לחזור על החומר מספר פעמים.

## טכנולוגיות

- **Frontend**: Next.js 14 עם React ו-TypeScript
- **Backend**: Express.js עם Node.js
- **Database**: SQLite (ניתן להעביר ל-PostgreSQL בקלות)
- **Authentication**: JWT tokens
- **PDF Generation**: PDFKit

## התקנה והרצה

### 1. התקנת תלויות

```bash
npm install
```

### 2. אתחול בסיס הנתונים

```bash
npm run init-db
```

זה יוצר:
- משתמש מנהל: `admin` / `admin123`
- משתמש סטודנט לדוגמה: `student1` / `student123`

### 2.5. הוספת תוכן מלא מחוברת 44

```bash
npm run add-full-content
```

זה מוסיף את כל התוכן המלא מחוברת 44:
- ✅ יסודות עזרה ראשונה (3 שקפים)
- ✅ הערכת מצב (2 שקפים)
- ✅ החייאה (4 שקפים - מבוגר, ילד, תינוק, דפיברילטור)
- ✅ מצבי חירום נשימתיים (2 שקפים)
- ✅ מצבי חירום רפואיים (7 שקפים - עילפון, אלרגיה, הרעלות, התקף לב, סוכרת, שבץ מוחי, פרכוסים)
- ✅ מצבי סביבה (3 שקפים - התייבשות, היפותרמיה, הכשת נחש)
- ✅ טראומה (4 שקפים - מבוא, פגיעות ראש, חבלת עמוד שדרה, שברים)

**סה"כ: כ-25 שקפים עם שאלות תרגול!**

התוכן מבוסס ישירות על חוברת 44 ללא שינויים במלל.

### 3. הרצת השרת

טרמינל 1 - Backend:
```bash
npm run server
```

השרת ירוץ על http://localhost:3001

טרמינל 2 - Frontend:
```bash
npm run dev
```

האפליקציה תיפתח על http://localhost:3000

## מבנה הפרויקט

```
├── app/                    # Next.js pages
│   ├── dashboard/          # לוח בקרה
│   ├── course/             # תצוגת קורס
│   └── page.tsx            # עמוד התחברות
├── components/             # React components
│   ├── Login.tsx
│   ├── StudentDashboard.tsx
│   ├── InstructorDashboard.tsx
│   ├── CourseViewer.tsx
│   ├── SlideViewer.tsx
│   ├── PracticeQuestions.tsx
│   └── AskQuestion.tsx
├── server/                 # Express backend
│   ├── config/
│   │   └── database.js     # הגדרות בסיס נתונים
│   ├── routes/             # API routes
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── slides.js
│   │   ├── progress.js
│   │   ├── questions.js
│   │   └── reports.js
│   └── index.js            # שרת Express
└── database/               # SQLite database files
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - התחברות
- `POST /api/auth/register` - רישום (לצורך בדיקה)
- `GET /api/auth/verify` - אימות טוקן

### Courses
- `GET /api/courses` - רשימת קורסים
- `GET /api/courses/:id` - פרטי קורס עם מודולים

### Slides
- `GET /api/slides/module/:moduleId` - שקפים לפי מודול
- `GET /api/slides/:slideId` - שקף בודד
- `GET /api/slides/:slideId/progress` - התקדמות בשקף
- `POST /api/slides/:slideId/progress` - עדכון התקדמות

### Progress
- `GET /api/progress/my-progress` - התקדמות אישית
- `GET /api/progress/my-progress/detailed` - התקדמות מפורטת לפי מודולים
- `GET /api/progress/all` - כל התלמידים (מדריך בלבד)

### Questions
- `GET /api/questions` - שאלות תרגול
- `POST /api/questions/:questionId/answer` - הגשת תשובה
- `POST /api/questions/ask` - שאלה למדריך
- `GET /api/questions/my-questions` - השאלות שלי
- `GET /api/questions/all-questions` - כל השאלות (מדריך)

### Reports
- `GET /api/reports/completion/:userId` - יצירת דוח PDF
- `GET /api/reports/user/:userId` - רשימת דוחות של משתמש

## הוספת תוכן

כדי להוסיף תוכן לקורס, ניתן להשתמש ב-API או להוסיף ישירות לבסיס הנתונים:

1. **הוספת מודול**:
```sql
INSERT INTO modules (course_id, title, order_index) 
VALUES (1, 'שם המודול', 1);
```

2. **הוספת שקף**:
```sql
INSERT INTO slides (module_id, title, content, min_reading_time, order_index) 
VALUES (1, 'כותרת שקף', '<p>תוכן השקף</p>', 30, 1);
```

3. **הוספת שאלה**:
```sql
INSERT INTO practice_questions (slide_id, question, options, correct_answer, explanation) 
VALUES (1, 'מהי עזרה ראשונה?', '{"א": "תשובה א", "ב": "תשובה ב"}', 'א', 'הסבר');
```

## הערות

- המערכת כוללת אבטחה בסיסית עם JWT tokens
- הדוחות נשמרים למשך 3 שנים לפחות (ניתן להגדיר תאריך תפוגה)
- ניתן להוסיף תמונות וסרטונים באמצעות שדה `media_url` בשקפים
- המערכת מודדת זמן לימוד מדויק ומכריחה קריאה מינימלית של כל שקף

## רישיון

פרויקט זה נוצר לפי דרישות משרד הבריאות לקורס עזרה ראשונה חוברת 44.

