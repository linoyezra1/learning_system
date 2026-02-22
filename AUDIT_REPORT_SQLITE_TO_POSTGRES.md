# Audit Report: SQLite → PostgreSQL Migration & Post-Login Frontend Crash

**Date:** 2025-02-22  
**Scope:** Full codebase audit (no code changes).  
**Goal:** Identify schema mismatches, query compatibility, env/port/CORS, and root cause of "Application error: a client-side exception has occurred" immediately after successful login.

---

## Executive Summary

- **Most likely cause of the post-login crash:** The frontend calls `localStorage.setItem('user', JSON.stringify(data.user))` in `Login.tsx`. If `data.user` contains any non-JSON-serializable value (e.g. **BigInt** from PostgreSQL driver, or a getter that throws), `JSON.stringify` throws and Next.js surfaces it as "a client-side exception has occurred."
- **Critical schema mismatch:** The **users** table created in `server/index.js` has columns `id, username, password, role, "createdAt", "updatedAt"` only. It does **not** have `full_name`, `created_at`, or `last_login`. Several routes and scripts assume these columns exist and will fail.
- **Database wrapper:** `db.run` uses `res.insertId`, which **does not exist** in Node `pg`. So `this.lastID` is always `null`; any code that relies on it (new user id, new course id, etc.) gets wrong data. PostgreSQL requires `RETURNING id` and reading from the result.
- **SQLite-only syntax:** Multiple scripts and routes use `INSERT OR IGNORE` / `INSERT OR REPLACE` and `this.changes`; these must be converted to PostgreSQL `ON CONFLICT` and `res.rowCount` (or equivalent).

---

## 1. Frontend Crash After Login – Root Cause Analysis

### 1.1 Flow

1. User submits login in `components/Login.tsx`.
2. Request goes to `${apiUrl}/api/auth/login` (backend or Next.js proxy; see Port/CORS section).
3. Backend returns `{ token, user: { id, username, full_name, fullName, role } }`.
4. On success, Login does:
   - `localStorage.setItem('token', data.token);`
   - `localStorage.setItem('user', JSON.stringify(data.user));`  ← **likely throw site**
   - `router.push('/dashboard');`

If **any** of these throw, Next.js shows "Application error: a client-side exception has occurred."

### 1.2 Most Likely Cause: `JSON.stringify(data.user)` Throwing

- **BigInt:** If the PostgreSQL driver (or your wrapper) returns `id` as a JavaScript `BigInt`, `JSON.stringify` throws (BigInt is not JSON-serializable).
- **Other non-serializable values:** Getters, symbols, or circular refs could also cause this.

**Relevant code:**

```33:35:components/Login.tsx
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
```

**Recommendation:** In `server/routes/auth.js`, when building the login response, **force a plain, JSON-safe user object**, e.g.:

- `id: Number(user.id)` (so it’s never BigInt),
- `username: String(user.username)`,
- `full_name` / `fullName`: string (already using `user.full_name || user.username`),
- `role: String(user.role)`.

Do **not** send the raw `user` row from `db.get` (e.g. avoid spreading it) so that driver-specific types cannot leak.

### 1.3 Dashboard Does Not Use `localStorage.user` for Render

- **Dashboard** (`app/dashboard/page.tsx`) does **not** read the user from localStorage.
- It calls `/api/auth/verify` and sets `user` from `data.user` in the verify response.
- So the crash is **not** from the Dashboard reading a bad user from localStorage; it happens either in Login (during `setItem`/`router.push`) or very early in the Dashboard lifecycle (e.g. before verify returns).

Given the flow, the most plausible place for the exception is still in **Login.tsx** at `JSON.stringify(data.user)`.

### 1.4 Field Names: full_name vs fullName

- Backend auth already sends **both** `full_name` and `fullName` in the login and verify responses.
- Frontend uses **fullName** in:
  - `components/StudentDashboard.tsx` line 58: `{user.fullName}`
  - `components/InstructorDashboard.tsx` line 72: `{user.fullName}`
- So there is **no** frontend/backend name mismatch for the display name; the crash is not due to missing `fullName` in the response.

### 1.5 JWT and AuthContext

- There is **no** AuthContext in the codebase. Auth is done via:
  - `localStorage` for `token` and `user`,
  - and `/api/auth/verify` on the Dashboard (and similar token checks elsewhere).
- JWT is created in `server/routes/auth.js` with `jwt.sign({ id, username, role }, JWT_SECRET, { expiresIn: '7d' })` and verified in `server/middleware/auth.js`. Format is standard (payload + Bearer). No mismatch identified in JWT shape.

---

## 2. Schema Mismatch (Users Table)

### 2.1 What Exists in PostgreSQL (server/index.js)

Table creation in `server/index.js` (lines 39–47):

- `id` SERIAL PRIMARY KEY  
- `username` VARCHAR(255) UNIQUE NOT NULL  
- `password` VARCHAR(255) NOT NULL  
- `role` VARCHAR(50) DEFAULT 'student'  
- `"createdAt"` TIMESTAMP WITH TIME ZONE  
- `"updatedAt"` TIMESTAMP WITH TIME ZONE  

So: **no** `full_name`, **no** `created_at`, **no** `last_login` (and column names are camelCase for timestamps).

### 2.2 Where This Breaks

| File | Line(s) | Issue |
|------|--------|--------|
| `server/routes/users.js` | 30 | `SELECT ... full_name, created_at, last_login ... ORDER BY full_name` – columns do not exist. |
| `server/routes/users.js` | 50 | Same SELECT for single user. |
| `server/routes/users.js` | 70–71 | `INSERT INTO users (..., full_name, ...)` – column does not exist. |
| `server/routes/progress.js` | 66, 74 | `u.full_name`, `ORDER BY u.full_name` – column does not exist. |
| `server/routes/reports.js` | 71 | `user.full_name` – from `SELECT * FROM users`; row will not have `full_name`. |

**Recommendation:** Either:

- Add columns to the users table: `full_name` (e.g. VARCHAR), `created_at` / `last_login` (TIMESTAMP), and use them consistently, or  
- Keep current schema and change all code to use only `username` (and optionally `"createdAt"` / `"updatedAt"`) and stop selecting/inserting `full_name`, `created_at`, `last_login`. Then normalize in API responses (e.g. `fullName: user.username`) as you already do in auth.

---

## 3. Query Compatibility (SQLite → PostgreSQL)

### 3.1 db.run and lastID / insertId

- In `server/config/database.js`, `run` calls:  
  `actualCallback.call({ lastID: res ? res.insertId : null }, err);`
- Node `pg` result does **not** have `insertId`. So **`this.lastID` is always `null`** in every `db.run` callback.

**Places that use `this.lastID` (and will get null):**

| File | Line | Usage |
|------|------|--------|
| `server/routes/users.js` | 81 | `res.json({ id: this.lastID, ... })` – new user id wrong. |
| `server/routes/users.js` | 191, 327 | Logging new user id. |
| `server/routes/courses.js` | 54 | New course id. |
| `server/routes/courses.js` | 75 | New module id. |
| `server/routes/slides.js` | 110 | progressId. |
| `server/routes/questions.js` | 88 | questionId. |

**Recommendation:** Extend the db wrapper so `run` can execute statements with `RETURNING id` (or other columns) and pass the returned id (e.g. in a context object) to the callback, and use that instead of `this.lastID`. Alternatively, use a dedicated helper for INSERT ... RETURNING and use its result.

### 3.2 this.changes (SQLite-only)

- `server/routes/questions.js` line 171: `if (this.changes === 0)` – SQLite’s `run` callback exposes `this.changes`; your wrapper does not. So this is always “0” or undefined.

**Recommendation:** Use PostgreSQL’s `res.rowCount` (from the query result) and expose it in the callback context (e.g. `changes: res ? res.rowCount : 0`) so the same pattern works.

### 3.3 INSERT OR IGNORE / INSERT OR REPLACE

- **PostgreSQL does not support** `INSERT OR IGNORE` or `INSERT OR REPLACE`.
- Used in:
  - `server/scripts/init-db.js` (e.g. 32, 61)
  - `server/scripts/add-sample-content.js` (multiple)
  - `server/scripts/add-full-content.js` (multiple)

**Recommendation:** Replace with `INSERT ... ON CONFLICT (...) DO NOTHING` or `DO UPDATE SET ...` as appropriate. `server/index.js` already uses `ON CONFLICT (username) DO UPDATE` for the admin user; reuse that pattern.

### 3.4 Boolean Comparisons (completed = 1)

- In PostgreSQL, boolean columns are `true`/`false`. Comparing with `= 1` may not behave as in SQLite.
- Affected:
  - `server/routes/reports.js`: 38, 42 – `sp.completed = 1`
  - `server/routes/progress.js`: 43, 48 – `sp.completed = 1`
  - `server/routes/slides.js`: 145 – `sp.completed = 1`

**Recommendation:** Use `sp.completed = true` or `sp.completed IS TRUE` (and ensure `slide_progress.completed` is defined as BOOLEAN in PostgreSQL).

### 3.5 created_at vs createdAt

- `server/index.js` defines **`"createdAt"`** and **`"updatedAt"`** (camelCase).
- Other routes use **`created_at`** (snake_case), e.g.:
  - `server/routes/courses.js` line 9: `ORDER BY created_at DESC`

If the courses table (or others) were created with camelCase in Postgres, then `created_at` would not exist. **Recommendation:** Align column names (either all snake_case or all quoted camelCase) and use the same name in every query.

---

## 4. Environment Variables

| Variable | Where used | Notes |
|----------|-------------|--------|
| `DATABASE_URL` | `server/config/database.js` (pool), `server/index.js` (init) | Required for Postgres. |
| `JWT_SECRET` | `server/middleware/auth.js`, `server/routes/auth.js` | Fallback to default in middleware; should be set in production. |
| `PORT` | `server/index.js`, `lib/api.ts` (getInternalApiUrl) | Backend listen port / internal API URL. |
| `NEXT_PUBLIC_API_URL` | `lib/api.ts` (getApiUrl), `components/Login.tsx`, `next.config.js` | Client-side API base; must be set when frontend and backend are different origins. |
| `INTERNAL_API_URL` | `lib/api.ts` (getInternalApiUrl) | Used by Next.js API routes (e.g. auth login/verify) to call the backend. |

- No misuse found; only consistency and deployment configuration (see Port/CORS) need attention.

---

## 5. Port / CORS and API URL Consistency

- Backend listens on `process.env.PORT || 3001` (`server/index.js`).
- **Login.tsx** uses `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` and calls `${apiUrl}/api/auth/login`. So in production, if `NEXT_PUBLIC_API_URL` is set to the Railway backend URL, login goes **directly to the backend** (no Next.js proxy).
- **Dashboard** uses `getApiUrl()` then `${apiUrl}/api/auth/verify`. If `getApiUrl()` returns `''` (same origin), the request goes to the **same host** (Express + Next in one app), so `/api/auth/verify` is served by Express. If `NEXT_PUBLIC_API_URL` is set, both login and verify hit the backend URL.

So there is no inherent port mismatch; the important point is that **Login** and **Dashboard** (and other pages) should use the same base URL logic. They do when both use the same env and `getApiUrl()` on the client. Recommendation: use `getApiUrl()` in **Login.tsx** instead of duplicating `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` so one place controls the base URL and CORS is consistent.

---

## 6. Specific Lines to Fix (Summary)

- **Login crash (high priority)**  
  - `components/Login.tsx` 34: Ensure `data.user` is JSON-serializable.  
  - `server/routes/auth.js`: Return a **plain object** for `user` with `id: Number(user.id)`, and only string/number fields (no raw DB row).

- **Schema**  
  - `server/index.js`: Either add `full_name` (and optionally `created_at`, `last_login`) to the users table or remove their use everywhere.  
  - `server/routes/users.js` 30, 50, 70–71: Align with actual users schema.  
  - `server/routes/progress.js` 66, 74: Use only existing columns (e.g. `username` or add `full_name`).  
  - `server/routes/reports.js` 71: Use a field that exists (e.g. `username`) or add `full_name`.

- **Database wrapper**  
  - `server/config/database.js`: For `run`, support `RETURNING` and pass back id; expose `rowCount` as `changes` so `this.lastID` and `this.changes` work as expected.

- **Routes using lastID/changes**  
  - `server/routes/users.js` 81, 191, 327; `server/routes/courses.js` 54, 75; `server/routes/slides.js` 110; `server/routes/questions.js` 88, 171: Use the new wrapper contract (id from RETURNING, changes from rowCount).

- **SQLite-only SQL**  
  - All `INSERT OR IGNORE` / `INSERT OR REPLACE` in `server/scripts/` and any route: convert to `ON CONFLICT ... DO NOTHING` / `DO UPDATE`.

- **Booleans**  
  - `server/routes/reports.js`, `server/routes/progress.js`, `server/routes/slides.js`: Replace `completed = 1` with `completed = true` or `IS TRUE`.

- **Column names**  
  - Align `created_at` vs `"createdAt"` everywhere (schema + routes).

---

## 7. Recommendation Order

1. **Fix post-login crash:** In `server/routes/auth.js`, build a strict JSON-serializable `user` object (e.g. `id: Number(user.id)`, ...) and use it in both login and verify responses. Optionally wrap `localStorage.setItem('user', ...)` in a try/catch in Login and show a friendly error.  
2. **Fix users schema:** Add missing columns or remove references to `full_name`, `created_at`, `last_login` and align with one source of truth.  
3. **Fix db wrapper:** Implement `lastID` (via RETURNING) and `changes` (via rowCount) so all existing `db.run` callbacks work.  
4. **Replace SQLite-only SQL:** `INSERT OR IGNORE/REPLACE` → `ON CONFLICT`; boolean comparisons → `= true` / `IS TRUE`.  
5. **Unify API base URL:** Use `getApiUrl()` in Login.tsx and ensure env vars are set correctly on Railway.

No code has been changed in this audit. Awaiting your green light before applying any of the above changes.
