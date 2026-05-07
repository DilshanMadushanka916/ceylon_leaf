const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

// --- MIDDLEWARE (The order matters!) ---
app.use(cors());
app.use(express.json()); // Parses JSON bodies
app.use(express.urlencoded({ extended: true })); // Parses form-encoded bodies

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));

// --- DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root123',      // Ensure this is your actual DB username
    password: 'root123456',  // Ensure this is your actual DB password
    database: 'ceylon_leaf'
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL database.');
});

// --- LOGIN ROUTE ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    // DEBUG: Check your terminal after clicking login
    console.log("Login attempt for:", [email], "with password:", [password],"..........");
    
    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error("SQL Error:", err);
            return res.status(500).json({ message: "Server error" });
        }

        if (results.length > 0) {
            console.log("✅ Match found! Role:", results[0].role);
            res.status(200).json({
                success: true,
                role: results[0].role
            });
        } else {
            console.log("❌ No match for this email/password combo.");
            res.status(401).json({ message: "Invalid credentials" });
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}/page/login.html`);
});