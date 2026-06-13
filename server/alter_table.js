const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root123',
    password: 'root123456',
    database: 'ceylon_leaf'
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL database.');

    // Check if columns already exist
    db.query("SHOW COLUMNS FROM supplier_payments", (err, rows) => {
        if (err) {
            console.error('❌ Failed to get columns:', err.message);
            db.end();
            process.exit(1);
        }

        const columns = rows.map(r => r.Field);
        const hasStatus = columns.includes('superintendent_status');
        const hasComment = columns.includes('superintendent_comment');

        if (hasStatus && hasComment) {
            console.log('✅ Columns superintendent_status and superintendent_comment already exist.');
            db.end();
            process.exit(0);
        }

        let alterQuery = "ALTER TABLE supplier_payments ";
        const additions = [];
        if (!hasStatus) {
            additions.push("ADD COLUMN superintendent_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'");
        }
        if (!hasComment) {
            additions.push("ADD COLUMN superintendent_comment TEXT DEFAULT NULL");
        }

        alterQuery += additions.join(', ');

        db.query(alterQuery, (alterErr) => {
            if (alterErr) {
                console.error('❌ Alter table failed:', alterErr.message);
                db.end();
                process.exit(1);
            }
            console.log('✅ Alter table succeeded: Columns added to supplier_payments.');
            db.end();
            process.exit(0);
        });
    });
});
