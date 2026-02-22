/**
 * Standalone script: sync students from users.xlsx into the database.
 * Uses DATABASE_URL from .env (e.g. your Railway PostgreSQL).
 * Run from project root: node server/scripts/sync-users-from-excel.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = require('../config/database');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const fs = require('fs');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Add it to .env (e.g. your Railway Postgres URL).');
    process.exit(1);
  }

  const excelPath = path.join(__dirname, '../../users.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error('users.xlsx not found in project root.');
    console.error('Create it with: npm run create-excel');
    process.exit(1);
  }

  console.log('Reading users.xlsx...');
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length === 0) {
    console.error('File is empty or has no data.');
    process.exit(1);
  }

  const firstRow = data[0];
  if (!firstRow.hasOwnProperty('username') || !firstRow.hasOwnProperty('password')) {
    console.error('Excel must have columns: username and password');
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const username = String(row.username || '').trim();
    const password = String(row.password || '').trim();

    if (!username) {
      errors.push(`Row ${i + 2}: missing username`);
      continue;
    }
    if (!password) {
      errors.push(`Row ${i + 2}: missing password`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const lowerUsername = username.toLowerCase();

    await new Promise((resolve) => {
      db.get('SELECT id, username FROM users WHERE LOWER(TRIM(username)) = ?', [lowerUsername], (err, existingUser) => {
        if (err) {
          errors.push(`Row ${i + 2}: ${err.message}`);
          resolve();
          return;
        }
        if (existingUser) {
          const courseGroupId = row.course_group_id != null ? String(row.course_group_id).trim() : null;
          db.run('UPDATE users SET password = ?, course_group_id = ? WHERE id = ?', [hashedPassword, courseGroupId, existingUser.id], function(updateErr) {
            if (updateErr) {
              errors.push(`Row ${i + 2}: update failed - ${updateErr.message}`);
            } else {
              updated++;
              console.log(`Updated: ${existingUser.username}`);
            }
            resolve();
          });
        } else {
          const fullName = row.full_name != null ? String(row.full_name).trim() : username;
          const role = (row.role && String(row.role).trim().toLowerCase()) || 'student';
          const courseGroupId = row.course_group_id != null ? String(row.course_group_id).trim() : null;
          db.run(
            'INSERT INTO users (username, password, full_name, role, course_group_id) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, fullName, role, courseGroupId],
            function(insertErr) {
              if (insertErr) {
                const msg = insertErr.message || '';
                if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('UNIQUE')) {
                  errors.push(`Row ${i + 2}: username ${username} already exists`);
                } else {
                  errors.push(`Row ${i + 2}: ${msg}`);
                }
              } else {
                created++;
                console.log(`Created: ${username}`);
              }
              resolve();
            }
          );
        }
      });
    });
  }

  console.log('');
  console.log('Done. Created:', created, 'Updated:', updated);
  if (errors.length) {
    console.log('Errors:', errors.length);
    errors.forEach((e) => console.log('  -', e));
  }
  db.close(() => process.exit(0));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
