const XLSX = require('xlsx');
const path = require('path');

// Sample users data
const users = [
  { username: 'admin', password: 'admin123' },
  { username: 'student1', password: 'student123' },
  { username: 'instructor1', password: 'instructor123' }
];

// Create workbook
const workbook = XLSX.utils.book_new();

// Create worksheet from data
const worksheet = XLSX.utils.json_to_sheet(users);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

// Write file
const filePath = path.join(__dirname, '../../users.xlsx');
XLSX.writeFile(workbook, filePath);

console.log('✅ קובץ users.xlsx נוצר בהצלחה!');
console.log(`📁 מיקום: ${filePath}`);
console.log('');
console.log('הקובץ כולל את המשתמשים הבאים:');
users.forEach(user => {
  console.log(`  - ${user.username} / ${user.password}`);
});
console.log('');
console.log('ניתן לערוך את הקובץ ולהוסיף משתמשים נוספים.');



