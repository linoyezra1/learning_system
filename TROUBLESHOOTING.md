# פתרון בעיות

## בעיה: שגיאת 404 ב-/api/auth/verify

### תסמינים
- כשמנסים להתחבר, הדפדפן מקבל שגיאת 404 על `/api/auth/verify`
- Backend רץ על פורט 3001
- Frontend רץ על פורט 3000

### פתרון

המערכת תיקנה את הבעיה בשתי דרכים:

1. **Next.js API Routes** - נוצרו routes ב-`app/api/auth/verify/route.ts` שיעבירו בקשות ל-backend
2. **קריאות ישירות** - הקוד עודכן להשתמש ישירות ב-`http://localhost:3001`

### איך לבדוק שהכל עובד:

1. **ודא ש-backend רץ:**
   ```bash
   npm run server
   ```
   אמור לראות:
   ```
   Server is running on port 3001
   Connected to SQLite database
   ```

2. **ודא ש-frontend רץ:**
   ```bash
   npm run dev
   ```
   אמור להיות זמין ב: http://localhost:3000

3. **נסה להתחבר:**
   - שם משתמש: `admin`
   - סיסמה: `admin123`

### אם עדיין יש בעיות:

1. **בדוק את קובץ `.env`:**
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

2. **נקה cache של Next.js:**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **בדוק ב-Console של הדפדפן (F12):**
   - בדוק אם יש שגיאות CORS
   - בדוק שהבקשות יוצאות לכתובת הנכונה

4. **בדוק Network Tab:**
   - וודא שהבקשות יוצאות ל-`http://localhost:3001/api/auth/verify`
   - לא ל-`http://localhost:3000/api/auth/verify`

### פתרונות נוספים:

#### שימוש ב-Next.js API Routes (מומלץ)
המערכת כוללת Next.js API routes ב-`app/api/auth/` שיעבירו את הבקשות ל-backend.
זה מאפשר להשתמש ב-`/api/auth/verify` במקום `http://localhost:3001/api/auth/verify`.

#### שימוש ישיר ב-Backend
כל הקריאות עודכנו להשתמש ב-`http://localhost:3001` עם fallback למשתנה סביבה.

## בעיות נפוצות אחרות

### שגיאת CORS
אם אתה רואה שגיאות CORS, וודא ש-`server/index.js` כולל:
```javascript
app.use(cors());
```

### Database locked
אם אתה רואה שגיאת "database is locked":
1. סגור את כל החיבורים לבסיס הנתונים
2. מחק את קובץ ה-database וצור מחדש: `npm run init-db`

### Port already in use
אם הפורט תפוס:
1. שנה את הפורט ב-`.env`:
   ```
   PORT=3002
   NEXT_PUBLIC_API_URL=http://localhost:3002
   ```
2. או עצור את התהליך שרץ על הפורט

### Token לא עובד
אם אתה מקבל שגיאת "טוקן לא תקין":
1. נקה את localStorage:
   ```javascript
   localStorage.clear();
   ```
2. התחבר מחדש

### שגיאת bcrypt
אם אתה רואה שגיאה עם bcrypt:
```bash
npm install bcryptjs
```

## לוגים לבדיקה

### Backend אמור להציג:
```
Server is running on port 3001
Connected to SQLite database
Database initialized successfully
POST /api/auth/login 200
GET /api/auth/verify 200
```

### Frontend אמור להציג:
- אין שגיאות 404
- התחברות מוצלחת → redirect ל-/dashboard



