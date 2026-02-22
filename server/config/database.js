const { Pool } = require('pg');
require('dotenv').config();

// התחברות ל-Postgres של Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// פונקציה להחלפת סימני שאלה (?) של SQLite בסימני $ של Postgres
const formatSql = (sql) => {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
};

const db = {
  // פונקציה לשליפת שורה אחת (תואם db.get)
  get: (sql, params, callback) => {
    const pgSql = formatSql(sql);
    pool.query(pgSql, params, (err, res) => {
      if (callback) callback(err, res ? res.rows[0] : null);
    });
  },

  // פונקציה להרצת פקודות (תואם db.run)
  run: (sql, params, callback) => {
    const pgSql = formatSql(sql);
    // טיפול במקרה שאין params
    const actualParams = Array.isArray(params) ? params : [];
    const actualCallback = typeof params === 'function' ? params : callback;

    pool.query(pgSql, actualParams, (err, res) => {
      // PostgreSQL: lastID from RETURNING id (res.rows[0].id), changes from rowCount
      const lastID = (res && res.rows && res.rows[0] && res.rows[0].id != null)
        ? Number(res.rows[0].id)
        : null;
      const changes = res ? res.rowCount : 0;
      if (actualCallback) actualCallback.call({ lastID, changes }, err);
    });
  },

  // פונקציה לשליפת רשימה (תואם db.all)
  all: (sql, params, callback) => {
    const pgSql = formatSql(sql);
    const actualParams = Array.isArray(params) ? params : [];
    const actualCallback = typeof params === 'function' ? params : callback;

    pool.query(pgSql, actualParams, (err, res) => {
      if (actualCallback) actualCallback(err, res ? res.rows : []);
    });
  }
};

module.exports = db;
