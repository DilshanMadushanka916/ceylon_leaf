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
    console.log("Login attempt for:", [email], "with password:", [password]);
    
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






// --- TEA COLLECTION ROUTE ---
app.post('/api/collect', (req, res) => {
    const { 
        collection_date, 
        field_no, 
        supplier_id, 
        kilos_collected, 
        advance_requested, 
        advance_amount,
        collector_email 
    } = req.body;

    // --- FIX 1: Force 0 if checkbox is false ---
    const finalAmount = (advance_requested == 1 || advance_requested === true) ? advance_amount : 0;

    const sql = `INSERT INTO tea_collections 
                 (collector_email, collection_date, field_no, supplier_id, kilos_collected, advance_requested, advance_amount) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    // --- FIX 2: CREATE THE MISSING 'values' ARRAY ---
    const values = [
        collector_email ,
        collection_date, 
        field_no, 
        supplier_id, 
        kilos_collected, 
        advance_requested ? 1 : 0, 
        finalAmount 
    ];

    // Now db.query can actually find the 'values' variable
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ SQL Error:", err.message);
            return res.status(500).json({ success: false, message: err.message });
        }

        // --- SHOW IN TERMINAL ---
        console.log("-----------------------------------------");
        console.log("✅ DATA SAVED TO DATABASE");
        console.log(`👤 Collector: ${collector_email}`);
        console.log(`🍃 Kilos:     ${kilos_collected}kg`);
        console.log(`💰 Advance:   ${advance_requested ? 'YES' : 'NO'} (Rs. ${finalAmount})`);
        console.log("-----------------------------------------");

        res.status(200).json({ success: true, message: "Inserted ID: " + result.insertId });
    });
});


app.get('/api/records', (req, res) => {
    // Add a log here to see if the browser is actually hitting this route
    console.log("Fetching records from database..."); 

    const sql = "SELECT * FROM tea_collections";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database Query Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});





// --- GET SUPPLIER FIELD ROUTE (CORRECTED) ---
app.get('/api/supplier-field/:id', (req, res) => {
    const supplierId = req.params.id;
    
    // Updated to use 'sup_id' and 'supplier' table
    const sql = "SELECT supplier_field FROM supplier WHERE sup_id = ?"; 

    db.query(sql, [supplierId], (err, results) => {
        if (err) {
            console.error("❌ Database Error:", err.message);
            return res.status(500).json({ error: "Database error" });
        }
        
        if (results.length > 0) {
            console.log(`✅ Found field ${results[0].supplier_field} for Supplier ${supplierId}`);
            res.json({ field_no: results[0].supplier_field });
        } else {
            console.log(`⚠️ No supplier found with sup_id: ${supplierId}`);
            res.status(404).json({ message: "Supplier not found" });
        }
    });
});




app.get('/api/records', (req, res) => {
    const sql = "SELECT * FROM tea_collections";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database Query Error:", err);
            return res.status(500).json({ error: err.message });
        }
        
        // ADD THIS LOG: It will show you the exact column names in your terminal
        console.log("Data being sent to frontend:", results[0]); 
        
        res.json(results);
    });
});




app.get('/api/user/profile', async (req, res) => {
    // 1. Check if user is authenticated (using sessions as an example)
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Unauthorized access" });
    }

    try {
        // 2. Fetch the logged-in user's specific data from MySQL
        const userId = req.session.userId; // e.g., identifying by email or primary key ID
        const [rows] = await pool.execute(
            'SELECT username, email, phone_number, address, role FROM users WHERE email = ?', 
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // 3. Send the single user object back to the frontend
        res.json(rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error occurred" });
    }
});


