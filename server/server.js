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
    
    // Auto-migrate: Add quality_checker column if it doesn't exist
    const alterSql = `ALTER TABLE grading_records ADD COLUMN quality_checker VARCHAR(255) DEFAULT 'Unknown'`;
    db.query(alterSql, (migErr) => {
        if (migErr && migErr.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ Column quality_checker already exists');
        } else if (migErr) {
            console.warn('⚠️ Migration note:', migErr.message);
        } else {
            console.log('✅ Added quality_checker column to grading_records');
        }
    });
});

const nodemailer = require('nodemailer');

async function sendDeactivationEmail(toEmail, username) {
    console.log(`[EMAIL] Attempting to send deactivation email to: ${toEmail}`);
    try {
        let transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: 'mockuser@ethereal.email',
                pass: 'mockpass'
            }
        });

        let info = await transporter.sendMail({
            from: '"Ceylon Leaf Tea Factory" <noreply@ceylonleaf.com>',
            to: toEmail,
            subject: "Your Ceylon Leaf Account has been Deactivated",
            text: `Hello ${username},\n\nYour account (${toEmail}) has been deactivated by the administrator.\nYou have been logged out and will not be able to log in until your account is activated again.\n\nBest regards,\nCeylon Leaf Team`,
            html: `<p>Hello <b>${username}</b>,</p><p>Your account (<b>${toEmail}</b>) has been deactivated by the administrator.</p><p>You have been logged out and will not be able to log in until your account is activated again.</p><p>Best regards,<br>Ceylon Leaf Team</p>`
        });
        console.log(`[EMAIL] Mock deactivation email sent successfully: ${info.messageId}`);
    } catch (err) {
        console.error("[EMAIL] Failed to send email via SMTP, logging to console instead:", err.message);
        console.log(`
=========================================
EMAIL LOG:
To: ${toEmail}
Subject: Your Ceylon Leaf Account has been Deactivated
Content:
Hello ${username},

Your account (${toEmail}) has been deactivated by the administrator.
You have been logged out and will not be able to log in until your account is activated again.
=========================================
`);
    }
}

// --- LOGIN ROUTE ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    // DEBUG: Check your terminal after clicking login
    console.log("Login attempt for:", [email], "with password:", [password]);

    // Query by email case-sensitively using BINARY for exact case matching
    const sql = "SELECT * FROM users WHERE BINARY email = BINARY ?";

    db.query(sql, [email ? email.trim() : ''], (err, results) => {
        if (err) {
            console.error("SQL Error:", err);
            return res.status(500).json({ message: "Server error" });
        }

        if (results.length === 0) {
            console.log("❌ No user found with email:", email);
            return res.status(401).json({ message: "Email not found. Please check your email address." });
        }

        // Email found, now check password
        if (results[0].password !== password) {
            console.log("❌ Incorrect password for email:", email);
            return res.status(401).json({ message: "Incorrect password. Please try again." });
        }

        // Password correct, now check account status
        if (results[0].account_status !== 'Active') {
            console.log("❌ Account is not active for email:", email);
            return res.status(403).json({ message: "Your account is not active. Please contact administrator." });
        }

        console.log("✅ Login successful! Role:", results[0].role);
        res.status(200).json({
            success: true,
            role: results[0].role,
            username: results[0].username
        });
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

    // 1. Check if Collector is active
    const checkCollectorSql = "SELECT account_status FROM users WHERE email = ? LIMIT 1";
    db.query(checkCollectorSql, [collector_email], (collErr, collRows) => {
        if (collErr) return res.status(500).json({ success: false, message: collErr.message });

        if (collRows.length > 0 && collRows[0].account_status === 'Deactive') {
            return res.status(403).json({ success: false, message: "Error: Your collector account is deactivated." });
        }

        // 2. Check if Supplier is active
        const checkSupplierSql = "SELECT account_status FROM Supplier WHERE sup_id = ? LIMIT 1";
        db.query(checkSupplierSql, [supplier_id], (supErr, supRows) => {
            if (supErr) return res.status(500).json({ success: false, message: supErr.message });

            if (supRows.length > 0 && supRows[0].account_status === 'Deactive') {
                return res.status(400).json({ success: false, message: "Error: Selected supplier is deactivated and cannot supply tea." });
            }

            // Force 0 if checkbox is false
            const finalAmount = (advance_requested == 1 || advance_requested === true) ? advance_amount : 0;

            const sql = `INSERT INTO tea_collections 
                         (collector_email, Collection_Date, Field_No, Supplier_ID, Kilos_Collected, Advance_Requested, Advance_Amount, Status) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`;

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

                if (advance_requested && parseFloat(finalAmount) > 0) {
                    const advSql = `INSERT INTO advance_requests (supplier_id, request_date, requested_amount, deduction_scheme, approval_status, notes) VALUES (?, ?, ?, ?, 'Pending', ?)`;
                    db.query(advSql, [supplier_id, collection_date, parseFloat(finalAmount), 'From Monthly Payment', 'Requested via tea collection entry'], (advErr) => {
                        if (advErr) {
                            console.error("❌ Advance Request SQL Error:", advErr.message);
                        }
                        sendResponse();
                    });
                } else {
                    sendResponse();
                }

                function sendResponse() {
                    console.log("-----------------------------------------");
                    console.log("✅ DATA SAVED TO DATABASE");
                    console.log(`👤 Collector: ${collector_email}`);
                    console.log(`🍃 Kilos:     ${kilos_collected}kg`);
                    console.log(`💰 Advance:   ${advance_requested ? 'YES' : 'NO'} (Rs. ${finalAmount})`);
                    console.log("-----------------------------------------");

                    res.status(200).json({ success: true, message: "Inserted ID: " + result.insertId });
                }
            });
        });
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
            MIN(p.superintendent_status) AS superintendent_status,
            MAX(p.superintendent_comment) AS superintendent_comment,
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
            MIN(p.superintendent_status) AS superintendent_status,
            MAX(p.superintendent_comment) AS superintendent_comment,
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
              AND approval_status = 'Approved'
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
    const { price_per_kg, payment_method } = req.body;

    let updateSql = '';
    let params = [];
    if (price_per_kg) {
        updateSql = `
            UPDATE supplier_payments p
            INNER JOIN grading_records g ON g.id = p.grading_record_id
            SET p.payment_status = 'Paid',
                p.paid_at = NOW(),
                p.price_per_kg = ?,
                p.superintendent_status = 'Pending',
                p.superintendent_comment = NULL
            WHERE p.supplier_id = ?
              AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
        `;
        params = [parseFloat(price_per_kg), supplierId, summaryMonth];
    } else {
        updateSql = `
            UPDATE supplier_payments p
            INNER JOIN grading_records g ON g.id = p.grading_record_id
            SET p.payment_status = 'Paid',
                p.paid_at = NOW(),
                p.superintendent_status = 'Pending',
                p.superintendent_comment = NULL
            WHERE p.supplier_id = ?
              AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
        `;
        params = [supplierId, summaryMonth];
    }

    db.query(updateSql, params, (err, result) => {
        if (err) {
            console.error('Pending supplier payment approval failed:', err.message);
            return res.status(500).json({ error: err.message });
        }

        // Retrieve gross amount & approved advances to calculate net payment
        const checkSql = `
            SELECT 
                (SELECT IFNULL(SUM(p.total_amount), 0) 
                 FROM supplier_payments p 
                 INNER JOIN grading_records g ON g.id = p.grading_record_id 
                 WHERE p.supplier_id = ? AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?) AS gross,
                (SELECT IFNULL(SUM(requested_amount), 0) 
                 FROM advance_requests 
                 WHERE supplier_id = ? AND DATE_FORMAT(request_date, '%Y-%m') = ? AND approval_status = 'Approved') AS adv
        `;
        db.query(checkSql, [supplierId, summaryMonth, supplierId, summaryMonth], (errQuery, resultsQuery) => {
            if (errQuery) {
                console.error("❌ Gross/Advance query failed:", errQuery.message);
                return res.status(500).json({ error: errQuery.message });
            }

            const gross = parseFloat(resultsQuery[0].gross);
            const adv = parseFloat(resultsQuery[0].adv);
            const netAmount = gross - adv;

            refreshMonthlySupplierSummary(supplierId, summaryMonth, (summaryErr) => {
                if (summaryErr) {
                    console.error("❌ Summary refresh error:", summaryErr.message);
                }

                const formattedMethod = payment_method === 'cash' ? 'Cash' : payment_method === 'bank' ? 'Bank Transfer' : 'Not Specified';
                const updateSummarySql = `
                    UPDATE monthly_supplier_leaf_summary
                    SET payout_status = 'Fully Paid',
                        payment_method = ?,
                        total_amount_earned = ?,
                        updated_at = NOW()
                    WHERE supplier_id = ? AND summary_month = ?
                `;
                db.query(updateSummarySql, [formattedMethod, netAmount, supplierId, summaryMonth], (sumErr) => {
                    if (sumErr) console.error('Failed to update summary status:', sumErr.message);
                    res.json({ success: true, supplier_id: supplierId, summary_month: summaryMonth, paidRows: result.affectedRows });
                });
            });
        });
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
              AND approval_status = 'Approved'
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
    const pricePerKg = req.body && req.body.price_per_kg ? req.body.price_per_kg : null;
    const selectSql = `SELECT supplier_id, summary_month FROM monthly_supplier_leaf_summary WHERE id = ? LIMIT 1`;

    db.query(selectSql, [summaryId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows || rows.length === 0) return res.status(404).json({ error: 'Summary not found' });

        const supplierId = rows[0].supplier_id;
        const summaryMonth = rows[0].summary_month;
        const formattedMethod = paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'bank' ? 'Bank Transfer' : 'Not Specified';

        let updatePaymentsSql = '';
        let updatePaymentsParams = [];
        if (pricePerKg) {
            updatePaymentsSql = `
                UPDATE supplier_payments p
                INNER JOIN grading_records g ON g.id = p.grading_record_id
                SET p.payment_status = 'Paid',
                    p.paid_at = NOW(),
                    p.price_per_kg = ?,
                    p.superintendent_status = 'Pending',
                    p.superintendent_comment = NULL
                WHERE p.supplier_id = ?
                  AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
            `;
            updatePaymentsParams = [parseFloat(pricePerKg), supplierId, summaryMonth];
        } else {
            updatePaymentsSql = `
                UPDATE supplier_payments p
                INNER JOIN grading_records g ON g.id = p.grading_record_id
                SET p.payment_status = 'Paid',
                    p.paid_at = NOW(),
                    p.superintendent_status = 'Pending',
                    p.superintendent_comment = NULL
                WHERE p.supplier_id = ?
                  AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
            `;
            updatePaymentsParams = [supplierId, summaryMonth];
        }

        db.query(updatePaymentsSql, updatePaymentsParams, (err3) => {
            if (err3) {
                console.error('Failed to update supplier_payments:', err3.message);
                return res.status(500).json({ error: 'Failed to update payments: ' + err3.message });
            }
            console.log(`✅ Updated supplier_payments for Supplier ${supplierId}: Status: Paid, paid_at: NOW()`);

            // Query gross amount & approved advances to calculate net payment
            const checkSql = `
                SELECT 
                    (SELECT IFNULL(SUM(p.total_amount), 0) 
                     FROM supplier_payments p 
                     INNER JOIN grading_records g ON g.id = p.grading_record_id 
                     WHERE p.supplier_id = ? AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?) AS gross,
                    (SELECT IFNULL(SUM(requested_amount), 0) 
                     FROM advance_requests 
                     WHERE supplier_id = ? AND DATE_FORMAT(request_date, '%Y-%m') = ? AND approval_status = 'Approved') AS adv
            `;
            db.query(checkSql, [supplierId, summaryMonth, supplierId, summaryMonth], (errQuery, resultsQuery) => {
                if (errQuery) return res.status(500).json({ error: errQuery.message });

                const gross = parseFloat(resultsQuery[0].gross);
                const adv = parseFloat(resultsQuery[0].adv);
                const netAmount = gross - adv;

                const updateSummarySql = `
                    UPDATE monthly_supplier_leaf_summary 
                    SET payout_status = 'Fully Paid', 
                        payment_method = ?, 
                        total_amount_earned = ?,
                        updated_at = NOW() 
                    WHERE id = ?
                `;

                db.query(updateSummarySql, [formattedMethod, netAmount, summaryId], (err2) => {
                    if (err2) {
                        console.error('Failed to update monthly_supplier_leaf_summary:', err2.message);
                        return res.status(500).json({ error: err2.message });
                    }
                    console.log(`✅ Updated monthly_supplier_leaf_summary ID ${summaryId}: Supplier ${supplierId}, Month ${summaryMonth}, Status: Fully Paid`);

                    refreshMonthlySupplierSummary(supplierId, summaryMonth, (refreshErr) => {
                        if (refreshErr) console.error('Failed to refresh summary:', refreshErr.message);
                        res.json({ success: true, supplier_id: supplierId, summary_month: summaryMonth, message: 'Payment approved: Both tables updated' });
                    });
                });
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

    const advSql = `SELECT request_date, requested_amount, deduction_scheme, approval_status, notes FROM advance_requests WHERE supplier_id = ? ORDER BY request_date DESC`;

    db.query(advSql, [supplierId], (err, advRows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(advRows || []);
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
                    (grading_record_id, supplier_id, net_weight, price_per_kg, total_amount, payment_status, paid_at)
                VALUES (?, ?, ?, ?, ?, 'Pending', NULL)
            `;

            db.query(sql, [gradingId, supplierId, cleanNetWeight, cleanPrice, totalAmount], (err, result) => {
                if (err) return callback(err);

                const paymentId = result.insertId;
                console.log(`✅ Created payment (Pending only) - ID: ${paymentId} for grading_record_id: ${gradingId} | Total Amount: ${totalAmount}`);
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
    `;

    db.query(totalsSql, [supplierId, summaryMonth], (totalsErr, rows) => {
        if (totalsErr) return callback(totalsErr);

        const totals = rows[0] || {};
        const grossAmountEarned = Number(totals.total_amount_earned) || 0;

        const values = [
            Number(totals.total_tea_leaves) || 0,
            Number(totals.total_moisture_deduction) || 0,
            Number(totals.total_net_weight) || 0
        ];

        const findSql = `
            SELECT id, payout_status
            FROM monthly_supplier_leaf_summary
            WHERE supplier_id = ? AND summary_month = ?
            LIMIT 1
        `;

        db.query(findSql, [supplierId, summaryMonth], (findErr, summaryRows) => {
            if (findErr) return callback(findErr);

            const isPaid = summaryRows && summaryRows.length > 0 && summaryRows[0].payout_status === 'Fully Paid';

            // Get approved advance total
            const advanceSql = `
                SELECT IFNULL(SUM(requested_amount), 0) AS total
                FROM advance_requests
                WHERE supplier_id = ?
                  AND DATE_FORMAT(request_date, '%Y-%m') = ?
                  AND approval_status = 'Approved'
            `;

            db.query(advanceSql, [supplierId, summaryMonth], (advErr, advRows) => {
                if (advErr) return callback(advErr);

                const approvedAdvances = Number(advRows[0].total) || 0;
                let totalAmountEarned = grossAmountEarned;
                if (isPaid) {
                    totalAmountEarned = grossAmountEarned - approvedAdvances;
                }

                if (summaryRows && summaryRows.length > 0) {
                    const updateSql = `
                        UPDATE monthly_supplier_leaf_summary
                        SET total_tea_leaves = ?,
                            total_moisture_deduction = ?,
                            total_net_weight = ?,
                            total_amount_earned = ?,
                            payout_status = ?,
                            updated_at = NOW()
                        WHERE id = ?
                    `;
                    const status = isPaid ? 'Fully Paid' : 'Unpaid';
                    return db.query(updateSql, [...values, totalAmountEarned, status, summaryRows[0].id], callback);
                }

                const insertSql = `
                    INSERT INTO monthly_supplier_leaf_summary
                        (supplier_id, summary_month, total_tea_leaves, total_moisture_deduction, total_net_weight, total_amount_earned, payout_status)
                    VALUES (?, ?, ?, ?, ?, ?, 'Unpaid')
                `;
                db.query(insertSql, [supplierId, summaryMonth, ...values, totalAmountEarned], callback);
            });
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
        grade,
        quality_checker
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
                (supplier_id, grading_date, field_no, weight, moisture_deduction, net_weight, grade, quality_checker) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [cleanedSupplierId, cleanDateOnly, field_no, parseFloat(weight) || 0, parseFloat(moisture_deduction) || 0, parseFloat(net_weight) || 0, grade, quality_checker || 'Unknown'];

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
// --- USER STATUS CHECK ROUTE ---
app.get('/api/user/status', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ error: "Email parameter is required" });
    }

    const sql = "SELECT account_status FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1";
    db.query(sql, [email.trim()], (err, results) => {
        if (err) {
            console.error("❌ SQL Error checking user status:", err.message);
            return res.status(500).json({ error: "Database query failure", details: err.message });
        }
        if (results.length > 0) {
            res.json({ account_status: results[0].account_status });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    });
});

// --- CHANGE PASSWORD ROUTE ---
app.post('/api/user/change-password', (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    if (!email || !oldPassword || !newPassword) {
        return res.status(400).json({ error: "Email, old password, and new password are required" });
    }

    console.log(`[Change Password] Email: ${email}`);

    // Use BINARY for case-sensitive email matching
    const checkSql = "SELECT password FROM users WHERE BINARY email = BINARY ? LIMIT 1";
    db.query(checkSql, [email], (err, results) => {
        if (err) {
            console.error("❌ SQL Error verifying password change:", err.message);
            return res.status(500).json({ error: "Database query failure" });
        }
        if (results.length === 0) {
            console.log(`❌ User not found with email: ${email}`);
            return res.status(404).json({ error: "User not found" });
        }

        // Case-sensitive password check
        if (results[0].password !== oldPassword) {
            console.log(`❌ Incorrect password for email: ${email}`);
            return res.status(400).json({ error: "Incorrect current password" });
        }

        // Use BINARY for case-sensitive email matching
        const updateSql = "UPDATE users SET password = ? WHERE BINARY email = BINARY ?";
        db.query(updateSql, [newPassword, email], (updateErr, result) => {
            if (updateErr) {
                console.error("❌ SQL Error updating password:", updateErr.message);
                return res.status(500).json({ error: "Database update failure" });
            }
            res.json({ success: true, message: "Password updated successfully" });
        });
    });
});

// --- CHANGE USERNAME ROUTE ---
app.post('/api/user/change-username', (req, res) => {
    const { email, username } = req.body;
    
    if (!email || !username) {
        return res.status(400).json({ message: "Email and username are required" });
    }

    if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
    }

    console.log(`[Change Username] Email: ${email}, Username: ${username}`);

    // Check if username already exists (excluding current user)
    const checkSql = "SELECT username FROM users WHERE username = ? AND BINARY email != BINARY ?";
    db.query(checkSql, [username, email], (err, results) => {
        if (err) {
            console.error("❌ SQL Error checking username:", err.message);
            return res.status(500).json({ message: "Database query failure" });
        }

        if (results.length > 0) {
            console.log("❌ Username already taken");
            return res.status(400).json({ message: "Username already taken" });
        }

        // Update username using BINARY for case-sensitive email match
        const updateSql = "UPDATE users SET username = ? WHERE BINARY email = BINARY ?";
        db.query(updateSql, [username, email], (updateErr, result) => {
            if (updateErr) {
                console.error("❌ SQL Error updating username:", updateErr.message);
                return res.status(500).json({ message: "Database update failure" });
            }

            if (result.affectedRows === 0) {
                console.log(`❌ User not found with email: ${email}`);
                return res.status(404).json({ message: "User not found" });
            }

            console.log(`✅ Username updated for ${email}: ${username}`);
            res.json({ success: true, message: "Username updated successfully" });
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
        SELECT username, email, phone_number, address, role, password 
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
                address: user.address || "No address on file",
                password: user.password
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

// --- ACCOUNTANT ADVANCE APIS ---

app.get('/api/advance-requests/pending', (req, res) => {
    const sql = `
        SELECT ar.*, s.name AS supplier_name 
        FROM advance_requests ar
        LEFT JOIN Supplier s ON s.sup_id = ar.supplier_id
        WHERE ar.approval_status = 'Pending'
        ORDER BY ar.request_date DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/advance-requests/:id/status', (req, res) => {
    const id = req.params.id;
    const { approval_status, notes } = req.body;
    const sql = `UPDATE advance_requests SET approval_status = ?, notes = ? WHERE id = ?`;
    db.query(sql, [approval_status, notes || null, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Advance request updated to ${approval_status}` });
    });
});

app.get('/api/supplier/:supplierId/advance-eligibility', (req, res) => {
    const supplierId = req.params.supplierId;

    // Rule 1: Check active consecutive 3 months (previous 3 months)
    const activeMonthsSql = `
        SELECT COUNT(DISTINCT DATE_FORMAT(grading_date, '%Y-%m')) AS count
        FROM grading_records
        WHERE supplier_id = ?
          AND grading_date >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 3 MONTH)
          AND grading_date < DATE_FORMAT(NOW(), '%Y-%m-01')
    `;

    db.query(activeMonthsSql, [supplierId], (err, rows1) => {
        if (err) return res.status(500).json({ error: err.message });

        const activeMonthsCount = rows1 && rows1[0] ? rows1[0].count : 0;
        const has3MonthsActive = activeMonthsCount >= 3;

        // Rule 2: Current month weight
        const curWeightSql = `
            SELECT IFNULL(SUM(weight), 0) AS weight
            FROM grading_records
            WHERE supplier_id = ?
              AND DATE_FORMAT(grading_date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
        `;

        db.query(curWeightSql, [supplierId], (err, rows2) => {
            if (err) return res.status(500).json({ error: err.message });

            const currentWeight = parseFloat(rows2 && rows2[0] ? rows2[0].weight : 0);

            // Rule 3: Previous month weight & payout
            const prevMonthSql = `
                SELECT IFNULL(SUM(g.weight), 0) AS weight, IFNULL(SUM(p.total_amount), 0) AS payout
                FROM supplier_payments p
                INNER JOIN grading_records g ON g.id = p.grading_record_id
                WHERE p.supplier_id = ?
                  AND DATE_FORMAT(g.grading_date, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')
            `;

            db.query(prevMonthSql, [supplierId], (err, rows3) => {
                if (err) return res.status(500).json({ error: err.message });

                const prevWeight = parseFloat(rows3 && rows3[0] ? rows3[0].weight : 0);
                const prevPayout = parseFloat(rows3 && rows3[0] ? rows3[0].payout : 0);

                const hasMinWeight = currentWeight >= (prevWeight * 0.5);
                let maxAdvanceAmount = hasMinWeight ? (prevPayout * 0.5) : 0;

                // Now query existing advances this month
                const currentMonthAdvanceSql = `
                    SELECT COUNT(*) AS count, IFNULL(SUM(requested_amount), 0) AS total_amount
                    FROM advance_requests
                    WHERE supplier_id = ?
                      AND DATE_FORMAT(request_date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
                      AND approval_status IN ('Approved', 'Pending')
                `;

                db.query(currentMonthAdvanceSql, [supplierId], (advErr, advRows) => {
                    if (advErr) return res.status(500).json({ error: advErr.message });

                    const existingCount = advRows && advRows[0] ? advRows[0].count : 0;
                    const existingTotal = advRows && advRows[0] ? parseFloat(advRows[0].total_amount) : 0;

                    let eligible = false;
                    let statusMessage = '';

                    if (!has3MonthsActive) {
                        statusMessage = `⚠️ Ineligible: Supplier has supplied leaves in only ${activeMonthsCount}/3 of the past consecutive months.`;
                        maxAdvanceAmount = 0;
                    } else if (!hasMinWeight) {
                        statusMessage = `⚠️ Ineligible: Current month weight (${currentWeight.toFixed(2)} kg) is less than half of last month (${prevWeight.toFixed(2)} kg).`;
                        maxAdvanceAmount = 0;
                    } else if (existingCount > 0) {
                        statusMessage = `⚠️ Ineligible: Supplier already requested/received an advance of Rs. ${existingTotal.toLocaleString()} this month.`;
                        maxAdvanceAmount = 0;
                    } else {
                        eligible = true;
                        statusMessage = `✅ Eligible: Current weight is ${currentWeight.toFixed(2)} kg (Min required: ${(prevWeight * 0.5).toFixed(2)} kg). Max advance: Rs. ${maxAdvanceAmount.toLocaleString()}`;
                    }

                    res.json({
                        supplierId,
                        has3MonthsActive,
                        activeMonthsCount,
                        currentWeight,
                        prevWeight,
                        prevPayout,
                        hasMinWeight,
                        maxAdvanceAmount,
                        eligible,
                        statusMessage,
                        hasExistingAdvance: existingCount > 0,
                        existingAdvanceAmount: existingTotal
                    });
                });
            });
        });
    });
});

// --- SUPERINTENDENT PAYMENT REVIEW APIS ---

app.get('/api/superintendent/payments', (req, res) => {
    const sql = `
        SELECT
            MIN(p.id) AS payment_id,
            p.supplier_id,
            DATE_FORMAT(g.grading_date, '%Y-%m') AS summary_month,
            IFNULL(SUM(g.weight), 0) AS total_tea_leaves,
            IFNULL(SUM(g.moisture_deduction), 0) AS total_moisture_deduction,
            IFNULL(SUM(p.net_weight), 0) AS total_net_weight,
            IFNULL(SUM(p.total_amount), 0) AS total_amount_earned,
            (SELECT IFNULL(SUM(requested_amount), 0) 
             FROM advance_requests 
             WHERE supplier_id = p.supplier_id 
               AND DATE_FORMAT(request_date, '%Y-%m') = DATE_FORMAT(MIN(g.grading_date), '%Y-%m') 
               AND approval_status = 'Approved') AS total_advance_deductions,
            MIN(p.superintendent_status) AS superintendent_status,
            MAX(p.superintendent_comment) AS superintendent_comment,
            s.name AS supplier_name,
            s.supplier_field,
            m.payment_method
        FROM supplier_payments p
        INNER JOIN grading_records g ON g.id = p.grading_record_id
        LEFT JOIN Supplier s ON s.sup_id = p.supplier_id
        LEFT JOIN monthly_supplier_leaf_summary m ON m.supplier_id = p.supplier_id AND m.summary_month = DATE_FORMAT(g.grading_date, '%Y-%m')
        WHERE p.payment_status = 'Paid'
        GROUP BY p.supplier_id, DATE_FORMAT(g.grading_date, '%Y-%m'), s.name, s.supplier_field, m.payment_method
        ORDER BY summary_month DESC, p.supplier_id ASC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/superintendent/payments/approve', (req, res) => {
    const { supplier_id, summary_month } = req.body;
    const sql = `
        UPDATE supplier_payments p
        INNER JOIN grading_records g ON g.id = p.grading_record_id
        SET p.superintendent_status = 'Approved',
            p.superintendent_comment = NULL
        WHERE p.supplier_id = ?
          AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
          AND p.payment_status = 'Paid'
    `;
    db.query(sql, [supplier_id, summary_month], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        const sumSql = `UPDATE monthly_supplier_leaf_summary SET payout_status = 'Fully Paid' WHERE supplier_id = ? AND summary_month = ?`;
        db.query(sumSql, [supplier_id, summary_month], (sumErr) => {
            if (sumErr) console.error(sumErr);
            res.json({ success: true, message: 'Monthly settlement approved by superintendent' });
        });
    });
});

app.post('/api/superintendent/payments/reject', (req, res) => {
    const { supplier_id, summary_month, comment } = req.body;
    const sql = `
        UPDATE supplier_payments p
        INNER JOIN grading_records g ON g.id = p.grading_record_id
        SET p.superintendent_status = 'Rejected',
            p.superintendent_comment = ?,
            p.payment_status = 'Pending'
        WHERE p.supplier_id = ?
          AND DATE_FORMAT(g.grading_date, '%Y-%m') = ?
          AND p.payment_status = 'Paid'
    `;
    db.query(sql, [comment, supplier_id, summary_month], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        const sumSql = `UPDATE monthly_supplier_leaf_summary SET payout_status = 'Unpaid' WHERE supplier_id = ? AND summary_month = ?`;
        db.query(sumSql, [supplier_id, summary_month], (sumErr) => {
            if (sumErr) console.error(sumErr);
            res.json({ success: true, message: 'Monthly settlement flagged and returned to accountant' });
        });
    });
});

// --- SUPERINTENDENT CRUD APIS ---

// SUPPLIERS
app.get('/api/superintendent/suppliers', (req, res) => {
    const sql = "SELECT * FROM Supplier ORDER BY sup_id ASC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/superintendent/suppliers', (req, res) => {
    const { sup_id, name, age, address_line1, address_line2, phone_number, bank_account_number, supplier_field, nic_number, bank_name, branch_location, account_status } = req.body;
    const finalStatus = account_status || 'Active';
    const sql = `
        INSERT INTO Supplier (sup_id, name, age, address_line1, address_line2, phone_number, bank_account_number, supplier_field, nic_number, bank_name, branch_location, account_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [sup_id, name, parseInt(age) || null, address_line1 || null, address_line2 || null, phone_number || null, bank_account_number || null, supplier_field || null, nic_number || null, bank_name || null, branch_location || null, finalStatus], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Supplier added successfully' });
    });
});

app.put('/api/superintendent/suppliers/:id', (req, res) => {
    const id = req.params.id;
    const { name, age, address_line1, address_line2, phone_number, bank_account_number, supplier_field, nic_number, bank_name, branch_location, account_status } = req.body;
    const sql = `
        UPDATE Supplier 
        SET name=?, age=?, address_line1=?, address_line2=?, phone_number=?, bank_account_number=?, supplier_field=?, nic_number=?, bank_name=?, branch_location=?, account_status=?
        WHERE sup_id=?
    `;
    db.query(sql, [name, parseInt(age) || null, address_line1 || null, address_line2 || null, phone_number || null, bank_account_number || null, supplier_field || null, nic_number || null, bank_name || null, branch_location || null, account_status || 'Active', id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Supplier updated successfully' });
    });
});

app.delete('/api/superintendent/suppliers/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM Supplier WHERE sup_id=?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Supplier removed successfully' });
    });
});

// USERS (Collector, Quality Officer, Accountant)
app.get('/api/superintendent/users', (req, res) => {
    const role = req.query.role;
    let sql = "SELECT username, email, nic_number, password, age, phone_number, address, role, account_status FROM users";
    const params = [];
    if (role) {
        const normalizedRole = role.toLowerCase().replace('_', ' ');
        if (normalizedRole === 'quality checker') {
            sql += " WHERE LOWER(role) IN ('quality_checker', 'quality checker')";
        } else {
            sql += " WHERE LOWER(role) = ?";
            params.push(role.toLowerCase());
        }
    }
    sql += " ORDER BY username ASC";
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/superintendent/users', (req, res) => {
    const { username, email, nic_number, password, age, phone_number, address, role, account_status } = req.body;
    const finalPassword = password || '123456';
    const finalStatus = account_status || 'Active';
    const sql = `
        INSERT INTO users (username, email, nic_number, password, age, phone_number, address, role, account_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [username, email, nic_number || null, finalPassword, parseInt(age) || null, phone_number || null, address || null, role, finalStatus], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        // If created as Deactive, send email
        if (finalStatus === 'Deactive') {
            sendDeactivationEmail(email, username).catch(mailErr => {
                console.error("Async sendDeactivationEmail error on creation:", mailErr);
            });
        }

        res.json({ success: true, message: 'User added successfully' });
    });
});

app.put('/api/superintendent/users/:email', (req, res) => {
    const email = req.params.email;
    const { username, nic_number, password, age, phone_number, address, role, account_status } = req.body;
    const finalStatus = account_status || 'Active';

    let sql = '';
    let params = [];
    if (password) {
        sql = `
            UPDATE users 
            SET username=?, nic_number=?, password=?, age=?, phone_number=?, address=?, role=?, account_status=?
            WHERE email=?
        `;
        params = [username, nic_number || null, password, parseInt(age) || null, phone_number || null, address || null, role, finalStatus, email];
    } else {
        sql = `
            UPDATE users 
            SET username=?, nic_number=?, age=?, phone_number=?, address=?, role=?, account_status=?
            WHERE email=?
        `;
        params = [username, nic_number || null, parseInt(age) || null, phone_number || null, address || null, role, finalStatus, email];
    }

    // Check old status before update to check if we are transitioning to 'Deactive'
    db.query("SELECT account_status, username FROM users WHERE email = ? LIMIT 1", [email], (checkErr, checkRows) => {
        const oldStatus = (checkRows && checkRows.length > 0) ? checkRows[0].account_status : 'Active';
        const displayUsername = (checkRows && checkRows.length > 0) ? checkRows[0].username : username;

        db.query(sql, params, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            // If transitioned to Deactive, send email
            if (finalStatus === 'Deactive' && oldStatus !== 'Deactive') {
                sendDeactivationEmail(email, displayUsername).catch(mailErr => {
                    console.error("Async sendDeactivationEmail error:", mailErr);
                });
            }

            res.json({ success: true, message: 'User updated successfully' });
        });
    });
});

app.delete('/api/superintendent/users/:email', (req, res) => {
    const email = req.params.email;
    const sql = "DELETE FROM users WHERE email=?";
    db.query(sql, [email], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'User removed successfully' });
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

// --- ACCOUNTANT DASHBOARD APIs ---

// Get dashboard statistics
app.get('/api/accountant/dashboard-stats', (req, res) => {
    try {
        // 1. Get Total Kilo of Tea (this month) from monthly_supplier_leaf_summary
        const totalKiloSql = `
            SELECT COALESCE(SUM(total_net_weight), 0) as total_kilo 
            FROM monthly_supplier_leaf_summary 
            WHERE summary_month = DATE_FORMAT(CURDATE(), '%Y-%m')
        `;

        db.query(totalKiloSql, (err1, kiloResults) => {
            if (err1) {
                console.error('❌ Error fetching total kilo:', err1.message);
                return res.status(500).json({ error: 'Failed to fetch total kilo' });
            }

            // 2. Get Total Payments (paid payments)
            const totalPaymentsSql = `
                SELECT COALESCE(SUM(total_amount), 0) as total_paid 
                FROM supplier_payments 
                WHERE payment_status = 'Paid'
            `;

            db.query(totalPaymentsSql, (err2, paidResults) => {
                if (err2) {
                    console.error('❌ Error fetching paid payments:', err2.message);
                    return res.status(500).json({ error: 'Failed to fetch paid payments' });
                }

                // 3. Get Pending Payments
                const pendingPaymentsSql = `
                    SELECT COALESCE(SUM(total_amount), 0) as pending_amount 
                    FROM supplier_payments 
                    WHERE payment_status = 'Pending'
                `;

                db.query(pendingPaymentsSql, (err3, pendingResults) => {
                    if (err3) {
                        console.error('❌ Error fetching pending payments:', err3.message);
                        return res.status(500).json({ error: 'Failed to fetch pending payments' });
                    }

                    // 4. Get Latest Price Per Kilo from tea_market_prices
                    const priceSql = `
                        SELECT price_per_kg 
                        FROM tea_market_prices 
                        ORDER BY price_date DESC 
                        LIMIT 1
                    `;

                    db.query(priceSql, (err4, priceResults) => {
                        if (err4) {
                            console.error('❌ Error fetching price per kilo:', err4.message);
                            return res.status(500).json({ error: 'Failed to fetch price per kilo' });
                        }

                        const totalKilo = kiloResults[0]?.total_kilo || 0;
                        const totalPaid = paidResults[0]?.total_paid || 0;
                        const pendingAmount = pendingResults[0]?.pending_amount || 0;
                        const pricePerKilo = priceResults[0]?.price_per_kg || 0;

                        console.log(`✅ Dashboard Stats: Kilo=${totalKilo}, Paid=${totalPaid}, Pending=${pendingAmount}, Price=${pricePerKilo}`);

                        res.json({
                            totalKilo: parseFloat(totalKilo),
                            totalPayments: parseFloat(totalPaid),
                            pendingPayments: parseFloat(pendingAmount),
                            pricePerKilo: parseFloat(pricePerKilo)
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('❌ Error in dashboard stats:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get payment distribution data (from monthly_supplier_leaf_summary and advance_requests)
app.get('/api/accountant/payment-distribution', (req, res) => {
    try {
        // Get payment method distribution from monthly_supplier_leaf_summary
        const sql = `
            SELECT 
                COALESCE(
                    CASE 
                        WHEN payment_method = 'Bank Transfer' THEN 'Bank Transfer'
                        WHEN payment_method = 'Cash' THEN 'Cash'
                        ELSE 'Not Specified'
                    END,
                    'Not Specified'
                ) as distribution_type,
                COUNT(*) as count,
                COALESCE(SUM(total_amount_earned), 0) as total_weight
            FROM monthly_supplier_leaf_summary
            GROUP BY distribution_type
        `;

        db.query(sql, (err, results) => {
            if (err) {
                console.error('❌ Error fetching payment distribution:', err.message);
                return res.status(500).json({ error: 'Failed to fetch payment distribution' });
            }

            console.log(`✅ Payment Distribution fetched: ${results.length} categories`);
            res.json(results);
        });
    } catch (error) {
        console.error('❌ Error in payment distribution:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get last 6 months payment data
app.get('/api/accountant/monthly-payments', (req, res) => {
    try {
        const sql = `
            SELECT 
                YEAR(created_at) as year,
                MONTH(created_at) as month_num,
                COALESCE(SUM(total_amount), 0) as total_payment
            FROM supplier_payments
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            AND payment_status = 'Paid'
            GROUP BY YEAR(created_at), MONTH(created_at)
            ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
        `;

        db.query(sql, (err, results) => {
            if (err) {
                console.error('❌ Error fetching monthly payments:', err.message);
                return res.status(500).json({ error: 'Failed to fetch monthly payments' });
            }

            console.log(`✅ Monthly Payments fetched: ${results.length} months`);
            
            // Create a map of month numbers to payment amounts
            const resultMap = {};
            results.forEach(row => {
                const monthKey = `${row.year}-${row.month_num}`;
                resultMap[monthKey] = row.total_payment;
            });
            
            // Format the results to ensure 6 months of data
            const last6Months = [];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const month = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
                const year = date.getFullYear();
                const monthKey = `${year}-${month}`;
                const monthName = monthNames[date.getMonth()];
                
                last6Months.push({
                    month: monthName,
                    payment: resultMap[monthKey] || 0
                });
            }

            res.json(last6Months);
        });
    } catch (error) {
        console.error('❌ Error in monthly payments:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- REPORT APIs ---

// Daily Green Leaf Collection Report
app.get('/api/reports/daily-leaf-collections', (req, res) => {
    try {
        const month = req.query.month; // Format: YYYY-MM
        let sql = `
            SELECT 
                DATE(tc.Collection_Date) as collection_date,
                tc.Supplier_ID as supplier_id,
                s.name as supplier_name,
                tc.Kilos_Collected as daily_leaf,
                COALESCE(g.moisture_deduction, 0) as moisture_deduction,
                COALESCE(g.net_weight, tc.Kilos_Collected - COALESCE(g.moisture_deduction, 0)) as net_weight,
                tc.collector_email as collected_by
            FROM tea_collections tc
            LEFT JOIN Supplier s ON s.sup_id = tc.Supplier_ID
            LEFT JOIN grading_records g ON UPPER(TRIM(g.supplier_id)) = UPPER(TRIM(tc.Supplier_ID)) 
                                          AND DATE(g.grading_date) = DATE(tc.Collection_Date)
        `;
        
        const params = [];
        if (month) {
            sql += ` WHERE DATE_FORMAT(tc.Collection_Date, '%Y-%m') = ?`;
            params.push(month);
        }
        
        sql += ` ORDER BY DATE(tc.Collection_Date) DESC, tc.Supplier_ID ASC`;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error('❌ Error fetching daily leaf collections:', err.message);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            console.log(`✅ Daily leaf collections fetched: ${results.length} records`);
            res.json(results || []);
        });
    } catch (error) {
        console.error('❌ Error in daily leaf collections:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Leaf Quality & Standard Report
app.get('/api/reports/leaf-quality', (req, res) => {
    try {
        const month = req.query.month; // Format: YYYY-MM
        let sql = `
            SELECT 
                DATE(g.created_at) as grading_date,
                DATE(g.grading_date) as collection_date,
                g.supplier_id,
                s.name as supplier_name,
                g.quality_checker as quality_checker,
                COALESCE(g.moisture_deduction, 0) as moisture_deduction,
                g.grade,
                CASE WHEN g.grade IN ('A', 'B') THEN 'Approved' ELSE 'Pending Review' END as status
            FROM grading_records g
            LEFT JOIN Supplier s ON s.sup_id = g.supplier_id
        `;
        
        const params = [];
        if (month) {
            sql += ` WHERE DATE_FORMAT(g.grading_date, '%Y-%m') = ?`;
            params.push(month);
        }
        
        sql += ` ORDER BY g.grading_date DESC, g.supplier_id ASC`;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error('❌ Error fetching leaf quality data:', err.message);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            console.log(`✅ Leaf quality data fetched: ${results.length} records`);
            res.json(results || []);
        });
    } catch (error) {
        console.error('❌ Error in leaf quality report:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Supplier Payment Report
app.get('/api/reports/supplier-payments', (req, res) => {
    try {
        const month = req.query.month; // Format: YYYY-MM
        let sql = `
            SELECT 
                DATE_FORMAT(m.summary_month, '%Y-%m') as month,
                m.supplier_id,
                s.name as supplier_name,
                COALESCE(m.total_net_weight, 0) as total_kilos,
                CASE WHEN EXISTS(SELECT 1 FROM advance_requests ar WHERE ar.supplier_id = m.supplier_id AND DATE_FORMAT(ar.request_date, '%Y-%m') = DATE_FORMAT(m.summary_month, '%Y-%m') AND ar.approval_status = 'Approved') THEN 'Yes' ELSE 'No' END as advance_payment,
                COALESCE((SELECT SUM(requested_amount) FROM advance_requests ar WHERE ar.supplier_id = m.supplier_id AND DATE_FORMAT(ar.request_date, '%Y-%m') = DATE_FORMAT(m.summary_month, '%Y-%m') AND ar.approval_status = 'Approved'), 0) as advance_value,
                COALESCE(m.total_amount_earned, 0) as total_payment,
                m.payout_status
            FROM monthly_supplier_leaf_summary m
            LEFT JOIN Supplier s ON s.sup_id = m.supplier_id
        `;
        
        const params = [];
        if (month) {
            sql += ` WHERE DATE_FORMAT(m.summary_month, '%Y-%m') = ?`;
            params.push(month);
        }
        
        sql += ` ORDER BY m.summary_month DESC, m.supplier_id ASC`;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error('❌ Error fetching supplier payments:', err.message);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            console.log(`✅ Supplier payment data fetched: ${results.length} records`);
            res.json(results || []);
        });
    } catch (error) {
        console.error('❌ Error in supplier payment report:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DEACTIVATE USER ACCOUNT AND SEND EMAIL
app.post('/api/admin/deactivate-user', (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Get user details first
        const getUserSql = 'SELECT email, password, role FROM users WHERE BINARY email = ?';
        db.query(getUserSql, [email], (err, results) => {
            if (err) {
                console.error('❌ Error fetching user:', err.message);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const user = results[0];
            const username = email.split('@')[0];

            // Try to add is_deactivated column if it doesn't exist
            const addColumnSql = `ALTER TABLE users ADD COLUMN is_deactivated BOOLEAN DEFAULT FALSE`;
            db.query(addColumnSql, (err) => {
                // Column might already exist, ignore error and proceed
                
                // Update user is_deactivated flag
                const updateSql = 'UPDATE users SET is_deactivated = TRUE WHERE BINARY email = ?';
                db.query(updateSql, [email], (err, updateResult) => {
                    if (err) {
                        console.error('❌ Error updating user deactivation status:', err.message);
                        return res.status(500).json({ success: false, message: 'Failed to deactivate user' });
                    }

                    // Send deactivation email
                    sendDeactivationEmail(email, username);

                    console.log(`✅ User account deactivated: ${email}`);
                    res.json({ 
                        success: true, 
                        message: `User ${email} has been deactivated and notification email sent` 
                    });
                });
            });
        });
    } catch (error) {
        console.error('❌ Error in deactivate user:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// --- SUPERINTENDENT DASHBOARD APIS ---

// Get Today's Tea Collection
app.get('/api/superintendent/dashboard/today-collection', (req, res) => {
    try {
        const sql = `
            SELECT COALESCE(SUM(g.net_weight), 0) as total_net_weight
            FROM grading_records g
            WHERE DATE(g.grading_date) = CURDATE()
        `;
        
        db.query(sql, (err, results) => {
            if (err) {
                console.error('❌ Error fetching today\'s collection:', err.message);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            
            const totalWeight = results[0]?.total_net_weight || 0;
            console.log(`✅ Today's collection: ${totalWeight} kg`);
            res.json({ total_net_weight: parseFloat(totalWeight) });
        });
    } catch (error) {
        console.error('❌ Error in today\'s collection:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Today's Price Per Kilo
app.get('/api/superintendent/dashboard/price-per-kilo', (req, res) => {
    try {
        const sql = `
            SELECT COALESCE(price_per_kg, 0) as price_per_kg
            FROM tea_market_prices
            ORDER BY price_date DESC
            LIMIT 1
        `;
        
        db.query(sql, (err, results) => {
            if (err) {
                console.error('❌ Error fetching price per kilo:', err.message);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            
            const pricePerKilo = results[0]?.price_per_kg || 0;
            console.log(`✅ Price per kilo: LKR ${pricePerKilo}`);
            res.json({ price_per_kg: parseFloat(pricePerKilo) });
        });
    } catch (error) {
        console.error('❌ Error in price per kilo:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Today's Payments Summary
app.get('/api/superintendent/dashboard/payments-today', (req, res) => {
    try {
        const sql = `
            SELECT 
                COALESCE(SUM(p.total_amount), 0) as total_payments
            FROM supplier_payments p
            WHERE p.payment_status = 'Paid' AND DATE(p.paid_at) = CURDATE()
        `;
        
        db.query(sql, (err, results) => {
            if (err) {
                console.error('❌ Error fetching payments:', err.message);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            
            const data = results[0] || {};
            console.log(`✅ Payments summary fetched`);
            res.json({
                total_payments: parseFloat(data.total_payments || 0)
            });
        });
    } catch (error) {
        console.error('❌ Error in payments summary:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Monthly Tea Collection Overview
app.get('/api/superintendent/dashboard/monthly-collection', (req, res) => {
    try {
        const month = req.query.month || new Date().toISOString().substring(0, 7); // Default to current month (YYYY-MM)
        
        const sql = `
            SELECT 
                DATE_FORMAT(g.grading_date, '%Y-%m-%d') as date,
                COALESCE(SUM(g.net_weight), 0) as daily_collection
            FROM grading_records g
            WHERE DATE_FORMAT(g.grading_date, '%Y-%m') = ?
            GROUP BY DATE_FORMAT(g.grading_date, '%Y-%m-%d')
            ORDER BY DATE_FORMAT(g.grading_date, '%Y-%m-%d') ASC
        `;
        
        db.query(sql, [month], (err, results) => {
            if (err) {
                console.error('❌ Error fetching monthly collection:', err.message);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            
            console.log(`✅ Monthly collection fetched for ${month}: ${results.length} days`);
            res.json(results || []);
        });
    } catch (error) {
        console.error('❌ Error in monthly collection:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Collection By Grade
app.get('/api/superintendent/dashboard/collection-by-grade', (req, res) => {
    try {
        const month = req.query.month || new Date().toISOString().substring(0, 7);
        
        const sql = `
            SELECT 
                g.grade,
                COALESCE(SUM(g.net_weight), 0) as total_weight,
                COUNT(*) as count
            FROM grading_records g
            WHERE DATE_FORMAT(g.grading_date, '%Y-%m') = ?
            GROUP BY g.grade
            ORDER BY g.grade ASC
        `;
        
        db.query(sql, [month], (err, results) => {
            if (err) {
                console.error('❌ Error fetching collection by grade:', err.message);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            
            console.log(`✅ Collection by grade fetched for ${month}: ${results.length} grades`);
            res.json(results || []);
        });
    } catch (error) {
        console.error('❌ Error in collection by grade:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Payment Trends
app.get('/api/superintendent/dashboard/payment-trends', (req, res) => {
    try {
        const month = req.query.month || new Date().toISOString().substring(0, 7);
        
        const sql = `
            SELECT 
                COALESCE(m.payment_method, 'Not Specified') as payment_method,
                COALESCE(m.payout_status, 'Unpaid') as status,
                COALESCE(SUM(m.total_amount_earned), 0) as total_amount,
                COUNT(*) as payment_count
            FROM monthly_supplier_leaf_summary m
            WHERE m.summary_month = ?
            GROUP BY m.payment_method, m.payout_status
            ORDER BY m.payment_method ASC
        `;
        
        db.query(sql, [month], (err, results) => {
            if (err) {
                console.error('❌ Error fetching payment trends:', err.message);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            
            // Format results for chart display
            const formattedResults = results.map(row => ({
                label: row.payment_method + ' - ' + row.status,
                payment_method: row.payment_method,
                status: row.status,
                total_amount: parseFloat(row.total_amount),
                payment_count: row.payment_count
            }));
            
            console.log(`✅ Payment trends fetched for ${month}: ${results.length} records`);
            res.json(formattedResults || []);
        });
    } catch (error) {
        console.error('❌ Error in payment trends:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on: http://localhost:${PORT}/page/login.html`);
});
