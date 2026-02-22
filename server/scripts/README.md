# Scripts – PostgreSQL / Railway

These scripts use `DATABASE_URL` (from `.env` or your environment) and the shared `server/config/database.js` PostgreSQL pool.

## One-click: populate production (full First Aid course)

From the **project root**, with `DATABASE_URL` set (e.g. in Railway or in `.env`):

```bash
node server/scripts/add-full-content.js
```

Or via npm:

```bash
npm run add-full-content
```

**On Railway** (one-off run against your Railway Postgres):

```bash
railway run node server/scripts/add-full-content.js
```

Or: Railway Dashboard → your project → Variables (ensure `DATABASE_URL` is set) → run the same command in a shell that has `railway run` and is linked to the project.

**Prerequisites:** Tables must exist (run the app once so `initializeDatabase()` in `server/index.js` creates them). The script will create course 1 and modules if they are missing.

## Other scripts

- **init-db.js** – Admin user (admin/admin123), sample student (student1/student123), course 1, and 7 modules.  
  `node server/scripts/init-db.js` or `npm run init-db`
- **add-sample-content.js** – Small sample of slides and questions.  
  `node server/scripts/add-sample-content.js` or `npm run add-content`
- **create-users-excel.js** – Creates `users.xlsx` (no DB).  
  `node server/scripts/create-users-excel.js` or `npm run create-excel`
- **sync-users-from-excel.js** – Syncs students from `users.xlsx` into the DB (uses `.env` `DATABASE_URL`).  
  `node server/scripts/sync-users-from-excel.js` or `npm run sync-users`

All DB scripts require `DATABASE_URL` and use PostgreSQL syntax (`ON CONFLICT`, `RETURNING id`).
