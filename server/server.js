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





//GRADING ROUTES

// 1. SMART LOOKUP: Strictly modified to search ONLY for TODAY's weight records
app.get('/api/collection-lookup/:supplierId', (req, res) => {
    const targetId = req.params.supplierId.trim().toLowerCase();
    
    if (!targetId) {
        return res.status(400).json({ error: "Supplier ID is required" });
    }

    // Lookup sequence step A: Search for weight records in tea_collections ONLY for today
    const collectionSql = `
        SELECT Field_No, Kilos_Collected 
        FROM tea_collections 
        WHERE LOWER(Supplier_ID) = ? 
          AND DATE(collection_date) = CURDATE()
        ORDER BY collection_time DESC 
        LIMIT 1
    `;

    db.query(collectionSql, [targetId], (err, collectionRows) => {
        if (err) {
            console.error("❌ SQL Error inside tea_collections:", err.message);
            return res.status(500).json({ error: "Database error reading collection data" });
        }

        // If a collection record exists for today, return it directly
        if (collectionRows.length > 0) {
            console.log(`[Lookup] Found live raw weight metrics for today: ${targetId}`);
            return res.json({
                foundToday: true,
                field_no: collectionRows[0].Field_No,
                weight: collectionRows[0].Kilos_Collected
            });
        } 

        // Lookup sequence step B: If no collection today, check if supplier profile exists at all
        console.log(`[Lookup] No active collections found for ${targetId} today. Checking master profile register...`);
        
        const supplierSql = `
            SELECT supplier_field 
            FROM supplier 
            WHERE LOWER(sup_id) = ? 
            LIMIT 1
        `;

        db.query(supplierSql, [targetId], (err, supplierRows) => {
            if (err) {
                console.error("❌ SQL Error inside supplier fallback table:", err.message);
                return res.status(500).json({ error: "Database profile fallback error" });
            }

            if (supplierRows.length > 0) {
                console.log(`[Lookup] Profile found, but no tea dropped off today for: ${targetId}`);
                return res.json({
                    foundToday: false, // Flag telling frontend to alert "No collection today"
                    field_no: supplierRows[0].supplier_field,
                    weight: 0.00 
                });
            } else {
                console.log(`[Lookup] 404 - Supplier ID: '${targetId}' completely missing from all records.`);
                return res.status(404).json({ error: "Supplier not found anywhere" });
            }
        });
    });
});

// 2. SAVE GRADING RECORD: Strictly locks down inserts to today's date only
app.post('/api/grading', (req, res) => {
    const { 
        supplier_id, 
        grading_date, 
        field_no, 
        weight, 
        moisture_deduction, 
        net_weight, 
        grade 
    } = req.body;

    // Secure Server-side Date Validation check
    const todayLocal = new Date().toLocaleDateString('en-CA'); // Outputs strict YYYY-MM-DD template format
    
    if (grading_date !== todayLocal) {
        console.warn(`[Security Alert] Rejected attempt to save data for an invalid date: ${grading_date}`);
        return res.status(400).json({ 
            success: false, 
            message: "Validation Failure: You can only save tea grading records for today's date!" 
        });
    }

    const finalMoisture = parseFloat(moisture_deduction) || 0;
    const finalWeight = parseFloat(weight) || 0;
    const finalNet = parseFloat(net_weight) || (finalWeight - finalMoisture);

    const sql = `INSERT INTO grading_records 
                (supplier_id, grading_date, field_no, weight, moisture_deduction, net_weight, grade) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        supplier_id.trim().toUpperCase(),
        grading_date, 
        field_no, 
        finalWeight, 
        finalMoisture, 
        finalNet, 
        grade
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ SQL Grading Insert Crash:", err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
        console.log(`✅ GRADING RECORD SAVED: Supplier ${supplier_id} received Grade [${grade}]`);
        res.status(200).json({ success: true, message: "Grading record successfully saved!" });
    });
});

// 3. READ RECENT GRADED HISTORIES: Filtered to show only records matching today's operations
app.get('/api/grading-records', (req, res) => {
    const sql = "SELECT * FROM grading_records WHERE DATE(grading_date) = CURDATE() ORDER BY created_at DESC LIMIT 5";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ SQL Error pulling history logs:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});






app.get('/api/user/profile', (req, res) => {
    // Explicit safety headers just in case
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const email = req.query.email;
    
    if (!email) {
        console.warn("⚠️ [Profile API] Rejected: Missing email parameter query.");
        return res.status(400).json({ error: "Email parameter is required" });
    }

    console.log(`🔍 [Profile API] Processing database request for email: "${email.trim()}"`);

    // Direct case-insensitive lookup using TRIM and LOWER to safely match 'Shanaka@gmail.com'
    const sql = `
        SELECT username, email, phone_number, address, role 
        FROM users 
        WHERE TRIM(LOWER(email)) = TRIM(LOWER(?)) 
        LIMIT 1
    `;
    
    db.query(sql, [email.trim()], (err, results) => {
        if (err) {
            console.error("❌ SQL Error inside users table profile read:", err.message);
            return res.status(500).json({ error: "Database query failure", details: err.message });
        }

        if (results.length > 0) {
            const user = results[0];
            console.log(`✅ [Profile API] Record matched and found for: ${user.email}`);
            
            // Send fields cleanly back matching the precise ID targets in your script
            return res.json({
                username: user.username,
                role: (user.role || 'Collector').toUpperCase(), // Formats 'Qulity Checker' to 'QULITY CHECKER' for CSS badges
                email: user.email,
                phone_number: user.phone_number || "Not provided",
                address: user.address || "No address on file"
            });
        } else {
            console.warn(`🔍 [Profile API] 404 - Email "${email.trim()}" not found in MySQL database.`);
            return res.status(404).json({ error: "User record not found in system database maps." });
        }
    });
});