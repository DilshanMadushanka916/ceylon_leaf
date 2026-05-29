const mysql = require('mysql2');
const c = mysql.createConnection({
  host: 'localhost',
  user: 'root123',
  password: 'root123456',
  database: 'ceylon_leaf'
});
c.query(
  'SELECT username,email,phone_number,address,role FROM users WHERE email = ?',
  ['Dilshan@gmail.com'],
  (err, rows) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  }
);
