const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// --- MIDDLEWARE (The order matters!) ---
app.use(cors());
app.use(express.json()); // Parses JSON bodies
app.use(express.urlencoded({ extended: true })); // Parses form-encoded bodies

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));

// --- DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root123',         // Ensure this is your actual DB username
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

app.get('/api/test-api', (req, res) => {
    res.json({ ok: true, message: 'Test API route is active' });
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

    // Force 0 if checkbox is false
    const finalAmount = (advance_requested == 1 || advance_requested === true) ? advance_amount : 0;

    // Updated column names to use PascalCase matching the database schema used in GET requests
    const sql = `INSERT INTO tea_collections 
                 (collector_email, Collection_Date, Field_No, Supplier_ID, Kilos_Collected, Advance_Requested, Advance_Amount) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        collector_email,
        collection_date, 
        field_no, 
        supplier_id, 
        kilos_collected, 
        advance_requested ? 1 : 0, 
        finalAmount 
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ SQL Error:", err.message);
            return res.status(500).json({ success: false, message: err.message });
        }

        console.log("-----------------------------------------");
        console.log("✅ DATA SAVED TO DATABASE");
        console.log(`👤 Collector: ${collector_email}`);
        console.log(`🍃 Kilos:     ${kilos_collected}kg`);
        console.log(`💰 Advance:   ${advance_requested ? 'YES' : 'NO'} (Rs. ${finalAmount})`);
        console.log("-----------------------------------------");

        res.status(200).json({ success: true, message: "Inserted ID: " + result.insertId });
    });
});

// --- GET RECORDS ROUTE (UNIFIED) ---
app.get('/api/records', (req, res) => {
    console.log("Fetching records from database..."); 
    const sql = "SELECT * FROM tea_collections";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database Query Error:", err);
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length > 0) {
            console.log("Data being sent to frontend sample row:", results[0]); 
        }
        res.json(results);
    });
});

// --- GET SUPPLIER FIELD ROUTE ---
app.get('/api/supplier-field/:id', (req, res) => {
    const supplierId = req.params.id;
    const sql = "SELECT supplier_field FROM Supplier WHERE sup_id = ?"; 

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

// --- SEARCH SUPPLIERS ROUTE ---
// --- SUPPLIERS SEARCH ---
app.get('/api/suppliers-search', (req, res) => {
    const query = req.query.q || '';
    const sql = `
        SELECT sup_id, name as supplier_name, supplier_field, account_status 
        FROM Supplier 
        WHERE sup_id LIKE ? OR name LIKE ? 
        ORDER BY sup_id ASC
    `;
    const searchTerm = `%${query}%`;
    
    db.query(sql, [searchTerm, searchTerm], (err, results) => {
        if (err) {
            console.error("❌ Search Error:", err.message);
            return res.status(500).json({ error: "Search failed" });
        }
        console.log(`📊 Suppliers API: Query="${query}" | Returned ${results.length} suppliers`);
        res.json(results);
    });
});

// --- LIST ALL SUPPLIERS (for debugging) ---
app.get('/api/suppliers-all', (req, res) => {
    const sql = `SELECT COUNT(*) as total FROM Supplier`;
    db.query(sql, (err, countResult) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const totalCount = countResult[0].total;
        
        const sql2 = `SELECT sup_id, name as supplier_name, supplier_field, account_status FROM Supplier ORDER BY name ASC`;
        db.query(sql2, (err2, results) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            console.log(`✅ Suppliers-All API: Total in DB=${totalCount} | Returned ${results.length} suppliers`);
            res.json({
                totalInDatabase: totalCount,
                returnedCount: results.length,
                data: results
            });
        });
    });
});

// --- LIST ALL SUPPLIERS ---
app.get('/api/suppliers', (req, res) => {
    const sql = `SELECT sup_id, name, supplier_field, account_status FROM Supplier ORDER BY name ASC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- MONTHLY PAYMENT SUMMARIES ---
app.get('/api/pending-supplier-payments', (req, res) => {
    const supplierId = req.query.supplier_id;
    const conditions = [`p.payment_status = 'Pending'`];
    const params = [];

    if (supplierId) {
        conditions.push(`p.supplier_id = ?`);
        params.push(supplierId);
    }

    const sql = `
        SELECT
            MIN(p.id) AS payment_id,
            p.supplier_id,
            DATE_FORMAT(g.grading_date, '%Y-%m') AS summary_month,
            IFNULL(SUM(g.weight), 0) AS total_tea_leaves,
            IFNULL(SUM(g.moisture_deduction), 0) AS total_moisture_deduction,
            IFNULL(SUM(p.net_weight), 0) AS total_net_weight,
            IFNULL(SUM(p.total_amount), 0) AS total_amount_earned,
            'Pending' AS payout_status,
            MAX(p.created_at) AS updated_at,
            s.name AS supplier_name,
            s.supplier_field
        FROM supplier_payments p
        LEFT JOIN grading_records g ON g.id = p.grading_record_id
        LEFT JOIN Supplier s ON s.sup_id = p.supplier_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY p.supplier_id, DATE_FORMAT(g.grading_date, '%Y-%m'), s.name, s.supplier_field
        ORDER BY summary_month DESC, p.supplier_id ASC
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Pending supplier payments query failed:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get('/api/pending-supplier-payments/:supplierId/:summaryMonth', (req, res) => {
    const supplierId = req.params.supplierId;
    const summaryMonth = req.params.summaryMonth;
    const sql = `
        SELECT
            p.supplier_id,
            DATE_FORMAT(g.grading_date, '%Y-%m') AS summary_month,
            IFNULL(SUM(g.weight), 0) AS total_tea_leaves,
            IFNULL(SUM(g.moisture_deduction), 0) AS total_moisture_deduction,
            IFNULL(SUM(p.net_weight), 0) AS total_net_weight,
            IFNULL(SUM(p.total_amount), 0) AS total_amount_earned,
            IFNULL(MAX(p.price_per_kg), 0) AS price_per_kg,
            'Pending' AS payout_status,
            s.name AS supplier_name,
            s.supplier_field,
            s.phone_number,
            s.bank_name,
            s.bank_account_number,
            s.branch_location
        FROM supplier_payments p
        LEFT JOIN grading_records g ON g.id = p.grading_record_id
        LEFT JOIN Supplier s ON s.sup_id = p.supplier_id
        WHERE p.supplier_id = ?
          AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
          AND p.payment_status = 'Pending'
        GROUP BY p.supplier_id, DATE_FORMAT(g.grading_date, '%Y-%m'), s.name, s.supplier_field, s.phone_number, s.bank_name, s.bank_account_number, s.branch_location
        LIMIT 1
    `;

    db.query(sql, [supplierId, summaryMonth], (err, results) => {
        if (err) {
            console.error('Pending supplier payment detail query failed:', err.message);
            return res.status(500).json({ error: err.message });
        }
        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'Pending supplier payment not found' });
        }

        const paymentData = results[0];

        // Get advance deductions for this supplier in this month
        const advanceSql = `
            SELECT IFNULL(SUM(requested_amount), 0) AS advance_total
            FROM advance_requests
            WHERE supplier_id = ?
              AND DATE_FORMAT(request_date, '%Y-%m') = ?
        `;

        db.query(advanceSql, [supplierId, summaryMonth], (advErr, advRows) => {
            if (advErr && advErr.code !== 'ER_NO_SUCH_TABLE' && advErr.errno !== 1146) {
                console.error('Advance deduction query error:', advErr.message);
                paymentData.requested_advance_deductions = '0.00';
            } else {
                paymentData.requested_advance_deductions = Number((advRows && advRows[0] && advRows[0].advance_total) || 0).toFixed(2);
            }
            res.json(paymentData);
        });
    });
});

app.post('/api/pending-supplier-payments/:supplierId/:summaryMonth/pay', (req, res) => {
    const supplierId = req.params.supplierId;
    const summaryMonth = req.params.summaryMonth;
    const updateSql = `
        UPDATE supplier_payments p
        INNER JOIN grading_records g ON g.id = p.grading_record_id
        SET p.payment_status = 'Paid',
            p.paid_at = NOW()
        WHERE p.supplier_id = ?
          AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
          AND p.payment_status = 'Pending'
    `;

    db.query(updateSql, [supplierId, summaryMonth], (err, result) => {
        if (err) {
            console.error('Pending supplier payment approval failed:', err.message);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No pending supplier payments found to approve' });
        }
        res.json({ success: true, supplier_id: supplierId, summary_month: summaryMonth, paidRows: result.affectedRows });
    });
});

app.get('/api/monthly-payment-summaries', (req, res) => {
    const supplierId = req.query.supplier_id;
    const conditions = [`m.payout_status IN ('Unpaid', 'Partially Paid')`];
    const params = [];

    if (supplierId) {
        conditions.push(`m.supplier_id = ?`);
        params.push(supplierId);
    }

    const sql = `
        SELECT m.id, m.supplier_id, m.summary_month, m.total_tea_leaves, m.total_moisture_deduction, m.total_net_weight, m.total_amount_earned, m.payout_status, m.updated_at,
               s.name AS supplier_name, s.supplier_field
        FROM monthly_supplier_leaf_summary m
        LEFT JOIN Supplier s ON s.sup_id = m.supplier_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY m.summary_month DESC, m.supplier_id ASC
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Monthly summary query failed:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get('/api/monthly-payment-summaries/:id', (req, res) => {
    const summaryId = req.params.id;
    const sql = `
        SELECT m.id, m.supplier_id, m.summary_month, m.total_tea_leaves, m.total_moisture_deduction, m.total_net_weight, m.total_amount_earned, m.payout_status, m.payment_method, m.updated_at,
               s.name AS supplier_name, s.supplier_field, s.phone_number, s.bank_name, s.bank_account_number, s.branch_location
        FROM monthly_supplier_leaf_summary m
        LEFT JOIN Supplier s ON s.sup_id = m.supplier_id
        WHERE m.id = ?
        LIMIT 1
    `;

    db.query(sql, [summaryId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results || results.length === 0) return res.status(404).json({ error: 'Summary not found' });

        const summary = results[0];
        const monthKey = summary.summary_month;
        const supplierId = summary.supplier_id;

        const advanceSql = `
            SELECT IFNULL(SUM(requested_amount), 0) AS advance_total
            FROM advance_requests
            WHERE supplier_id = ?
              AND DATE_FORMAT(request_date, '%Y-%m') = ?
        `;

        db.query(advanceSql, [supplierId, monthKey], (err2, advRows) => {
            if (err2) {
                if (err2.code === 'ER_NO_SUCH_TABLE' || err2.errno === 1146) {
                    summary.total_tea_leaves = Number(summary.total_tea_leaves || 0).toFixed(2);
                    summary.total_moisture_deduction = Number(summary.total_moisture_deduction || 0).toFixed(2);
                    summary.total_net_weight = Number(summary.total_net_weight || 0).toFixed(2);
                    summary.total_amount_earned = Number(summary.total_amount_earned || 0).toFixed(2);
                    summary.requested_advance_deductions = '0.00';
                    return res.json(summary);
                }
                return res.status(500).json({ error: err2.message });
            }

            summary.total_tea_leaves = Number(summary.total_tea_leaves || 0).toFixed(2);
            summary.total_moisture_deduction = Number(summary.total_moisture_deduction || 0).toFixed(2);
            summary.total_net_weight = Number(summary.total_net_weight || 0).toFixed(2);
            summary.total_amount_earned = Number(summary.total_amount_earned || 0).toFixed(2);
            summary.requested_advance_deductions = Number((advRows[0] && advRows[0].advance_total) || 0).toFixed(2);
            res.json(summary);
        });
    });
});

app.post('/api/monthly-payment-summaries/:id/pay', (req, res) => {
    const summaryId = req.params.id;
    const paymentMethod = req.body && req.body.payment_method ? req.body.payment_method : null;
    const selectSql = `SELECT supplier_id, summary_month FROM monthly_supplier_leaf_summary WHERE id = ? LIMIT 1`;

    db.query(selectSql, [summaryId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows || rows.length === 0) return res.status(404).json({ error: 'Summary not found' });

        const supplierId = rows[0].supplier_id;
        const summaryMonth = rows[0].summary_month;
        const formattedMethod = paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'bank' ? 'Bank Transfer' : null;
        
        const updateSummarySql = formattedMethod
            ? `UPDATE monthly_supplier_leaf_summary SET payout_status = 'Fully Paid', payment_method = ?, updated_at = NOW() WHERE id = ?`
            : `UPDATE monthly_supplier_leaf_summary SET payout_status = 'Fully Paid', updated_at = NOW() WHERE id = ?`;
        
        const updateSummaryParams = formattedMethod ? [formattedMethod, summaryId] : [summaryId];
        const updatePaymentsSql = `
            UPDATE supplier_payments p
            INNER JOIN grading_records g ON g.id = p.grading_record_id
            SET p.payment_status = 'Paid',
                p.paid_at = NOW()
            WHERE p.supplier_id = ?
              AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
              AND p.payment_status <> 'Paid'
        `;

        db.query(updateSummarySql, updateSummaryParams, (err2) => {
            if (err2) {
                console.error('Failed to update monthly_supplier_leaf_summary:', err2.message);
                return res.status(500).json({ error: err2.message });
            }
            console.log(`✅ Updated monthly_supplier_leaf_summary ID ${summaryId}: Supplier ${supplierId}, Month ${summaryMonth}, Status: Fully Paid`);

            db.query(updatePaymentsSql, [supplierId, summaryMonth], (err3) => {
                if (err3) {
                    console.error('Failed to update supplier_payments:', err3.message);
                    return res.status(500).json({ error: 'Summary updated but failed to update payments: ' + err3.message });
                }
                console.log(`✅ Updated supplier_payments for Supplier ${supplierId}: Status: Paid, paid_at: NOW()`);
                res.json({ success: true, supplier_id: supplierId, summary_month: summaryMonth, message: 'Payment approved: Both tables updated' });
            });
        });
    });
});

// --- SUPPLIER DETAILS ---
app.get('/api/supplier/:id', (req, res) => {
    const supplierId = req.params.id;
    const sql = `SELECT sup_id, name, age, address_line1, address_line2, phone_number, bank_account_number, supplier_field, nic_number, bank_name, branch_location, account_status
                 FROM Supplier WHERE sup_id = ? LIMIT 1`;

    db.query(sql, [supplierId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results || results.length === 0) return res.status(404).json({ error: 'Supplier not found' });
        res.json(results[0]);
    });
});

// --- COLLECTIONS FOR SUPPLIER WITH GRADING METRICS ---
app.get('/api/collections/:supplierId', (req, res) => {
    const supplierId = req.params.supplierId;
    const sql = `SELECT t.Collection_Date, t.Field_No, t.Kilos_Collected,
                        IFNULL(g.moisture_deduction, 0) AS moisture_deduction,
                        IFNULL(g.net_weight, t.Kilos_Collected - IFNULL(g.moisture_deduction, 0)) AS net_weight,
                        t.Advance_Requested, t.Advance_Amount, t.collection_time, t.Status,
                        p.payment_status AS payment_status, p.total_amount AS payment_amount
                 FROM tea_collections t
                 LEFT JOIN grading_records g
                   ON LOWER(t.Supplier_ID) = LOWER(g.supplier_id)
                  AND DATE(t.Collection_Date) = DATE(g.grading_date)
                 LEFT JOIN supplier_payments p
                   ON p.grading_record_id = g.id
                 WHERE t.Supplier_ID = ?
                 ORDER BY t.Collection_Date DESC, t.collection_time DESC`;
    db.query(sql, [supplierId], (err, results) => {
        if (err) {
            console.error('COLLECTIONS DEBUG SQL ERROR', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('COLLECTIONS DEBUG', supplierId, results.length, Object.keys(results[0] || {}).join(', '));
        res.json(results);
    });
});

// --- PAYMENT-BACKED DAILY COLLECTION LOG FOR SUPPLIER DETAIL ---
app.get('/api/supplier/:supplierId/payment-collections', (req, res) => {
    const supplierId = req.params.supplierId;
    const sql = `
        SELECT
            p.id AS payment_id,
            p.grading_record_id,
            p.supplier_id,
            COALESCE(DATE(g.grading_date), DATE(p.created_at)) AS Collection_Date,
            g.field_no AS Field_No,
            IFNULL(g.weight, 0) AS Kilos_Collected,
            IFNULL(g.moisture_deduction, 0) AS moisture_deduction,
            p.net_weight,
            p.price_per_kg,
            p.total_amount AS payment_amount,
            p.payment_status,
            p.paid_at,
            p.created_at AS payment_created_at
        FROM supplier_payments p
        INNER JOIN grading_records g
          ON g.id = p.grading_record_id
        WHERE UPPER(TRIM(p.supplier_id)) = UPPER(TRIM(?))
        ORDER BY g.grading_date DESC, p.created_at DESC
    `;

    db.query(sql, [supplierId], (err, results) => {
        if (err) {
            console.error('PAYMENT COLLECTIONS SQL ERROR', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('PAYMENT COLLECTIONS fetched:', supplierId, 'rows:', results.length);
        res.json(results || []);
    });
});

// --- ADVANCE REQUESTS HISTORY ---
app.get('/api/supplier/:id/advances', (req, res) => {
    const supplierId = req.params.id;

    const advSql = `SELECT request_date, requested_amount, deduction_scheme, approval_status FROM advance_requests WHERE supplier_id = ?`;
    const colSql = `SELECT Collection_Date AS request_date, Advance_Amount AS requested_amount, 'From Collection' AS deduction_scheme, 
                           CASE WHEN Advance_Amount>0 THEN 'Recorded' ELSE 'None' END AS approval_status
                    FROM tea_collections WHERE Supplier_ID = ? AND Advance_Requested = 1`;

    db.query(advSql, [supplierId], (err, advRows) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query(colSql, [supplierId], (err2, colRows) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const merged = [];
            if (advRows && advRows.length) {
                advRows.forEach(r => merged.push({ request_date: r.request_date, requested_amount: r.requested_amount, deduction_scheme: r.deduction_scheme, approval_status: r.approval_status }));
            }
            if (colRows && colRows.length) {
                colRows.forEach(r => merged.push({ request_date: r.request_date, requested_amount: r.requested_amount, deduction_scheme: r.deduction_scheme, approval_status: r.approval_status }));
            }

            merged.sort((a, b) => new Date(b.request_date) - new Date(a.request_date));
            res.json(merged);
        });
    });
});

// --- CREATE ADVANCE REQUEST ---
app.post('/api/advance-request', (req, res) => {
    const { supplier_id, request_date, requested_amount, deduction_scheme, approval_status } = req.body;
    if (!supplier_id || !requested_amount) return res.status(400).json({ error: 'supplier_id and requested_amount are required' });

    const sql = `INSERT INTO advance_requests (supplier_id, request_date, requested_amount, deduction_scheme, approval_status) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [supplier_id, request_date || new Date(), requested_amount, deduction_scheme || '', approval_status || 'Pending'], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, insertId: result.insertId });
    });
});

// --- SMART LOOKUP FOR GRADING ---
app.get('/api/collection-lookup/:supplierId', (req, res) => {
    const targetId = req.params.supplierId.trim().toLowerCase();
    const collectionDate = req.query.date || new Date().toISOString().split('T')[0];
    
    if (!targetId) {
        return res.status(400).json({ error: "Supplier ID is required" });
    }

    const collectionSql = `
        SELECT Field_No, Kilos_Collected 
        FROM tea_collections 
        WHERE LOWER(Supplier_ID) = ? 
          AND DATE(Collection_Date) = DATE(?)
        ORDER BY collection_time DESC 
        LIMIT 1
    `;

    db.query(collectionSql, [targetId, collectionDate], (err, collectionRows) => {
        if (err) {
            console.error("❌ SQL Error inside tea_collections:", err.message);
            return res.status(500).json({ error: "Database error reading collection data" });
        }

        if (collectionRows.length > 0) {
            console.log(`[Lookup] Found raw weight metrics for ${collectionDate}: ${targetId}`);
            return res.json({
                foundToday: true,
                field_no: collectionRows[0].Field_No,
                weight: collectionRows[0].Kilos_Collected
            });
        } 

        console.log(`[Lookup] No active collections found for ${targetId} on ${collectionDate}. Checking master profile register...`);
        
        const supplierSql = `
            SELECT supplier_field 
            FROM Supplier 
            WHERE LOWER(sup_id) = ? 
            LIMIT 1
        `;

        db.query(supplierSql, [targetId], (err, supplierRows) => {
            if (err) {
                console.error("❌ SQL Error inside supplier fallback table:", err.message);
                return res.status(500).json({ error: "Database profile fallback error" });
            }

            if (supplierRows.length > 0) {
                console.log(`[Lookup] Profile found, but no tea dropped off on ${collectionDate} for: ${targetId}`);
                return res.json({
                    foundToday: false, 
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

// --- UNIFIED GRADING RECORDS HISTORY (RESOLVED COLLISION) ---
app.get('/api/grading-records', (req, res) => {
    // Returns recent 5 rows for dashboard context while showcasing terminal transparency
    const sql = "SELECT * FROM grading_records ORDER BY created_at DESC LIMIT 5";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ SQL Error pulling history logs:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("📊 Graded rows sent to frontend:", results); 
        res.json(results);
    });
});

function getLatestTeaPrice(callback) {
    const sql = `SELECT price_per_kg FROM tea_market_prices ORDER BY price_date DESC LIMIT 1`;

    db.query(sql, (err, rows) => {
        if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146) {
                return callback(null, 225);
            }
            return callback(err);
        }

        const price = rows && rows.length > 0 ? Number(rows[0].price_per_kg) : 225;
        callback(null, price || 225);
    });
}

function createSupplierPayment(gradingId, supplierId, netWeight, callback) {
    // Check if payment already exists for this grading record
    const checkSql = `SELECT id FROM supplier_payments WHERE grading_record_id = ? LIMIT 1`;
    
    db.query(checkSql, [gradingId], (checkErr, existingPayments) => {
        if (checkErr) return callback(checkErr);
        
        // If payment already exists, don't create another one
        if (existingPayments && existingPayments.length > 0) {
            console.log(`⚠️  Payment already exists for grading_record_id ${gradingId}, skipping duplicate creation`);
            return callback(null, { paymentId: existingPayments[0].id, pricePerKg: 245, totalAmount: 0 });
        }
        
        getLatestTeaPrice((priceErr, pricePerKg) => {
            if (priceErr) return callback(priceErr);

            const cleanNetWeight = Number(netWeight) || 0;
            const cleanPrice = Number(pricePerKg) || 225;
            const totalAmount = cleanNetWeight * cleanPrice;
            const sql = `
                INSERT INTO supplier_payments
                    (grading_record_id, supplier_id, net_weight, price_per_kg, payment_status, paid_at)
                VALUES (?, ?, ?, ?, 'Pending', NULL)
            `;

            db.query(sql, [gradingId, supplierId, cleanNetWeight, cleanPrice], (err, result) => {
                if (err) return callback(err);

                const paymentId = result.insertId;
                console.log(`✅ Created payment (Pending only) - ID: ${paymentId} for grading_record_id: ${gradingId}`);
                callback(null, { paymentId, pricePerKg: cleanPrice, totalAmount });
            });
        });
    });
}

function refreshMonthlySupplierSummary(supplierId, summaryMonth, callback) {
    const totalsSql = `
        SELECT
            IFNULL(SUM(g.weight), 0) AS total_tea_leaves,
            IFNULL(SUM(g.moisture_deduction), 0) AS total_moisture_deduction,
            IFNULL(SUM(p.net_weight), 0) AS total_net_weight,
            IFNULL(SUM(p.total_amount), 0) AS total_amount_earned
        FROM supplier_payments p
        LEFT JOIN grading_records g ON g.id = p.grading_record_id
        WHERE UPPER(TRIM(p.supplier_id)) = UPPER(TRIM(?))
          AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
          AND p.payment_status <> 'Paid'
    `;

    db.query(totalsSql, [supplierId, summaryMonth], (totalsErr, rows) => {
        if (totalsErr) return callback(totalsErr);

        const totals = rows[0] || {};
        const values = [
            Number(totals.total_tea_leaves) || 0,
            Number(totals.total_moisture_deduction) || 0,
            Number(totals.total_net_weight) || 0,
            Number(totals.total_amount_earned) || 0
        ];

        const findSql = `
            SELECT id
            FROM monthly_supplier_leaf_summary
            WHERE supplier_id = ? AND summary_month = ?
            LIMIT 1
        `;

        db.query(findSql, [supplierId, summaryMonth], (findErr, summaryRows) => {
            if (findErr) return callback(findErr);

            if (summaryRows && summaryRows.length > 0) {
                const updateSql = `
                    UPDATE monthly_supplier_leaf_summary
                    SET total_tea_leaves = ?,
                        total_moisture_deduction = ?,
                        total_net_weight = ?,
                        total_amount_earned = ?,
                        payout_status = 'Unpaid',
                        updated_at = NOW()
                    WHERE id = ?
                `;
                return db.query(updateSql, [...values, summaryRows[0].id], callback);
            }

            const insertSql = `
                INSERT INTO monthly_supplier_leaf_summary
                    (supplier_id, summary_month, total_tea_leaves, total_moisture_deduction, total_net_weight, total_amount_earned, payout_status)
                VALUES (?, ?, ?, ?, ?, ?, 'Unpaid')
            `;
            db.query(insertSql, [supplierId, summaryMonth, ...values], callback);
        });
    });
}

// --- SAVE GRADING RECORD (DIAGNOSTIC VERSION) ---
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

    // 1. Log exactly what the frontend is sending
    console.log("\n=============================================");
    console.log("📥 RECEIVED FROM FRONTEND:");
    console.log(`   Supplier ID : "${supplier_id}"`);
    console.log(`   Grading Date: "${grading_date}"`);
    console.log("=============================================");

    if (!supplier_id || !grading_date) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const cleanDateOnly = grading_date.split('T')[0];
    const cleanedSupplierId = supplier_id.trim().toUpperCase();

    // First, let's insert the grading record as usual
    const sql = `INSERT INTO grading_records 
                (supplier_id, grading_date, field_no, weight, moisture_deduction, net_weight, grade) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const values = [cleanedSupplierId, cleanDateOnly, field_no, parseFloat(weight)||0, parseFloat(moisture_deduction)||0, parseFloat(net_weight)||0, grade];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ SQL Grading Insert Failed:", err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
        
        console.log(`✅ Grading row created in database.`);
        console.log(`   Grading Record ID: ${result.insertId}`);
        const gradingRecordId = result.insertId;
        const cleanNetWeight = parseFloat(net_weight) || 0;
        const summaryMonth = cleanDateOnly.slice(0, 7);

        // 2. RUN DIAGNOSTIC: Print what actually exists in tea_collections for this date
        const checkSql = `SELECT Supplier_ID, Collection_Date, Status FROM tea_collections WHERE DATE(Collection_Date) = ?`;
        
        db.query(checkSql, [cleanDateOnly], (cErr, cRows) => {
            console.log(`\n🔍 DB DIAGNOSTIC FOR DATE [${cleanDateOnly}]:`);
            if (cRows && cRows.length > 0) {
                console.log(`   Found ${cRows.length} total collections on this day:`);
                cRows.forEach(row => {
                    console.log(`   -> Supplier in DB: "${row.Supplier_ID}" | Status: "${row.Status}"`);
                });
            } else {
                console.log(`   ❌ ZERO collection records found in the database for date: "${cleanDateOnly}"`);
            }

            // 3. ATTEMPT UPDATE
            const updateSql = `
                UPDATE tea_collections
                SET Status = 'Checked'
                WHERE UPPER(TRIM(Supplier_ID)) = UPPER(TRIM(?))
                  AND DATE(Collection_Date) = ?
            `;

            db.query(updateSql, [cleanedSupplierId, cleanDateOnly], (uErr, uRes) => {
                if (uErr) {
                    console.error("\n❌ Update Query Error:", uErr.message);
                    return res.status(500).json({ success: false, message: uErr.message });
                } else {
                    console.log(`\n📊 UPDATE RESULT: ${uRes.affectedRows} row(s) updated.`);
                    if (uRes.affectedRows === 0) {
                        console.log("❌ CRITICAL: No rows matched! Check if the Supplier ID strings or Dates match perfectly above.");
                    }
                }
                console.log("=============================================\n");

                createSupplierPayment(gradingRecordId, cleanedSupplierId, cleanNetWeight, (paymentErr, paymentInfo) => {
                    if (paymentErr) {
                        console.error("Supplier payment insert failed:", paymentErr.message);
                        return res.status(500).json({ success: false, message: paymentErr.message });
                    }

                    refreshMonthlySupplierSummary(cleanedSupplierId, summaryMonth, (summaryErr) => {
                        if (summaryErr) {
                            console.error("Monthly supplier summary refresh failed:", summaryErr.message);
                            return res.status(500).json({ success: false, message: summaryErr.message });
                        }

                        return res.status(200).json({
                            success: true,
                            message: "Processed",
                            updatedRows: uRes.affectedRows,
                            gradingRecordId,
                            paymentId: paymentInfo.paymentId,
                            paymentStatus: 'Pending',
                            pricePerKg: paymentInfo.pricePerKg,
                            totalAmount: paymentInfo.totalAmount
                        });
                    });
                });
            });
        });
    });
});

app.put('/api/collection-status/update', (req, res) => {
    const { supplier_id, collection_date, field_no, status } = req.body;

    if (!supplier_id || !collection_date || !status) {
        return res.status(400).json({ success: false, message: "supplier_id, collection_date, and status are required." });
    }

    const cleanSupplierId = supplier_id.trim().toUpperCase();
    const cleanDateOnly = collection_date.split('T')[0];
    const cleanStatus = String(status).trim().toLowerCase() === 'checked' ? 'Checked' : status;

    let updateSql = `
        UPDATE tea_collections
        SET Status = ?
        WHERE UPPER(TRIM(Supplier_ID)) = UPPER(TRIM(?))
          AND DATE(Collection_Date) = DATE(?)
    `;
    const params = [cleanStatus, cleanSupplierId, cleanDateOnly];

    if (field_no) {
        updateSql += ` AND UPPER(TRIM(Field_No)) = UPPER(TRIM(?))`;
        params.push(field_no);
    }

    db.query(updateSql, params, (err, result) => {
        if (err) {
            console.error("Collection status update failed:", err.message);
            return res.status(500).json({ success: false, message: err.message });
        }

        res.json({
            success: result.affectedRows > 0,
            updatedRows: result.affectedRows,
            message: result.affectedRows > 0 ? "Collection status updated." : "No matching collection found to update."
        });
    });
});
// --- USER PROFILE ROUTE ---
app.get('/api/user/profile', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ error: "Email parameter is required" });
    }

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
            return res.json({
                username: user.username,
                role: (user.role || 'Collector').toUpperCase(), 
                email: user.email,
                phone_number: user.phone_number || "Not provided",
                address: user.address || "No address on file"
            });
        } else {
            return res.status(404).json({ error: "User record not found in system database maps." });
        }
    });
});

// --- MARKET PRICE TREND ROUTE ---
app.get('/api/price-trend', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const sqlQuery = `SELECT price_date, price_per_kg FROM tea_market_prices ORDER BY price_date ASC`;

    db.query(sqlQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        const monthsArray = results.map(row => {
            const dateObj = new Date(row.price_date);
            return dateObj.toLocaleString('en-US', { month: 'short' });
        });
        const pricesArray = results.map(row => parseFloat(row.price_per_kg));

        res.json({
            success: true,
            labels: monthsArray,
            data: pricesArray
        });
    });
});

// --- DASHBOARD WEEKLY TREND ROUTE ---
app.get('/api/dashboard/weekly-trends', (req, res) => {
    const query = `
        SELECT 
            YEARWEEK(grading_date, 1) AS year_week,
            CONCAT('W', WEEK(grading_date, 1)) AS week_name,
            SUM(net_weight) AS total_weight
        FROM grading_records
        WHERE grading_date >= DATE_SUB(CURDATE(), INTERVAL 6 WEEK)
        GROUP BY year_week, week_name
        ORDER BY year_week ASC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch weekly metrics' });
        }
        res.json(results);
    });
});

// --- DASHBOARD MONTHLY QUALITY DISTRIBUTION ---
app.get('/api/dashboard/quality-distribution', (req, res) => {
    const query = `
        SELECT 
            DATE_FORMAT(grading_date, '%b') AS month_name,
            SUM(CASE WHEN grade = 'A' THEN net_weight ELSE 0 END) AS grade_a,
            SUM(CASE WHEN grade = 'B' THEN net_weight ELSE 0 END) AS grade_b,
            SUM(CASE WHEN grade = 'C' THEN net_weight ELSE 0 END) AS grade_c
        FROM grading_records
        WHERE grading_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(grading_date, '%Y-%m'), DATE_FORMAT(grading_date, '%b')
        ORDER BY DATE_FORMAT(grading_date, '%Y-%m') ASC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch quality metrics' });
        }
        res.json(results);
    });
});

// --- DASHBOARD DAILY COLLECTION TREND ROUTE ---
app.get('/api/dashboard/daily-trends', (req, res) => {
    const query = `
        SELECT 
            DATE_FORMAT(g.created_at, '%h:%i %p') AS hour_mark, 
            g.net_weight AS current_weight,
            g.supplier_id,
            g.created_at AS grading_time,
            g.grade
        FROM grading_records g
        WHERE DATE(g.created_at) = CURDATE()
        ORDER BY g.created_at ASC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch daily metrics' });
        }
        res.json(results);
    });
});

// --- SINGLE RECORD DETAILS BY ID ---
app.get('/api/records/:id', (req, res) => {
    const recordId = req.params.id;
    const sql = `
        SELECT tc.*, s.name AS supplier_name
        FROM tea_collections tc
        LEFT JOIN Supplier s ON LOWER(s.sup_id) = LOWER(tc.Supplier_ID)
        WHERE tc.id = ?
        LIMIT 1
    `;

    db.query(sql, [recordId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results || results.length === 0) return res.status(404).json({ error: 'Record not found' });

        const collection = results[0];
        const gradingSql = `SELECT * FROM grading_records WHERE LOWER(supplier_id) = LOWER(?) AND DATE(grading_date) = DATE(?) ORDER BY created_at DESC LIMIT 1`;

        db.query(gradingSql, [collection.Supplier_ID, collection.collection_date], (gErr, gResults) => {
            if (gErr) return res.status(500).json({ error: gErr.message });
            const grading = (gResults && gResults.length > 0) ? gResults[0] : null;
            res.json({ collection, grading });
        });
    });
});

// --- ROUTE LIST DEBUG LOG ---
if (app._router && app._router.stack) {
    const routeList = app._router.stack
        .filter(layer => layer.route && layer.route.path)
        .map(layer => {
            const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
            return `${methods} ${layer.route.path}`;
        });
    console.log('🧭 Registered routes:', routeList.join(' | '));
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on: http://localhost:${PORT}/page/login.html`);
});
