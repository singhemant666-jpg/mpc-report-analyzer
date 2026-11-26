// ============================================================
// MPC CLINIC - LIVE MYSQL DATABASE API SERVER
// ============================================================
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MySQL Connection Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mpc_clinic',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  dateStrings: true // Return dates as strings (YYYY-MM-DD) to prevent timezone shifts
};

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// ────────────────────────────────────────────────────────────
// SMART COLUMN MATCHER
// Automatically matches whatever column naming convention is in MySQL
// (e.g., patient_name, Patient Name, patientName, patient, etc.)
// ────────────────────────────────────────────────────────────
function mapColumnsToExpected(columns) {
  const findCol = (...patterns) => {
    return columns.find(c => {
      const colNorm = c.toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some(p => {
        const patNorm = p.toLowerCase().replace(/[^a-z0-9]/g, '');
        return colNorm === patNorm || colNorm.includes(patNorm);
      });
    });
  };

  return {
    patientName:      findCol('patient_name', 'patientname', 'patient', 'name', 'client_name'),
    patientId:        findCol('patient_id', 'patientid', 'mrn', 'id'),
    packageName:      findCol('package_name', 'packagename', 'package', 'service_name', 'service'),
    doctor:           findCol('consulting_doctor', 'consultingdoctor', 'doctor', 'doctor_name', 'physician'),
    agent:            findCol('agent_name', 'agentname', 'agent', 'counsellor', 'counselor'),
    leadSource:       findCol('lead_source', 'leadsource', 'source', 'lead_type'),
    paymentDate:      findCol('payment_date', 'paymentdate', 'invoice_date', 'date', 'created_at'),
    packageCost:      findCol('package_cost', 'packagecost', 'cost', 'fee'),
    amountPaid:       findCol('amount_paid', 'amountpaid', 'paid', 'amount', 'collection'),
    totalPackageCost: findCol('total_cost_of_package', 'total_package_cost', 'totalpackagecost', 'total_cost', 'total_amount'),
    outstanding:      findCol('outstanding_amount', 'outstandingamount', 'outstanding', 'balance', 'due_amount'),
    paymentMode:      findCol('payment_mode', 'paymentmode', 'mode', 'method', 'payment_method'),
    invoiceNo:        findCol('invoice_no', 'invoiceno', 'invoice_number', 'bill_no', 'invoice'),
    noOfSessions:     findCol('no_of_sessions', 'noofsessions', 'total_sessions', 'sessions'),
    noOfUsedSessions: findCol('no_of_used_sessions', 'used_sessions', 'sessions_used', 'used'),
    noOfPendingSessions: findCol('no_of_pending_sessions', 'pending_sessions', 'sessions_pending', 'pending'),
    userplanId:       findCol('userplan_id', 'userplanid', 'plan_id'),
    cartId:           findCol('cart_id', 'cartid'),
    paylogId:         findCol('paylog_id', 'paylogid')
  };
}

// ────────────────────────────────────────────────────────────
// 1. HEALTH & CONNECTION TEST ENDPOINT
// ────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    dbConfig: {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      table: process.env.DB_TABLE || 'daily_collections'
    }
  });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const p = getPool();
    const [rows] = await p.query('SELECT 1 + 1 AS solution, NOW() as server_time');
    
    // Check tables in DB
    const [tables] = await p.query('SHOW TABLES');
    const tableKey = Object.keys(tables[0] || {})[0];
    const tableList = tables.map(t => t[tableKey]);

    res.json({
      success: true,
      message: 'Successfully connected to MySQL database!',
      serverTime: rows[0].server_time,
      database: dbConfig.database,
      availableTables: tableList
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: err.code,
      hint: 'Verify your DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in .env file.'
    });
  }
});

// ────────────────────────────────────────────────────────────
// 2. MAIN ENDPOINT: FETCH DAILY COLLECTIONS FOR index.html
// ────────────────────────────────────────────────────────────
app.get('/api/collections', async (req, res) => {
  try {
    const p = getPool();
    const tableName = req.query.table || process.env.DB_TABLE || 'daily_collections';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const limit = parseInt(req.query.limit, 10) || 50000;

    // 1. Inspect table columns
    const [colDefs] = await p.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = colDefs.map(c => c.Field);
    const colMap = mapColumnsToExpected(existingCols);

    if (!colMap.patientName) {
      return res.status(400).json({
        success: false,
        error: `Could not find a patient name column in table "${tableName}". Existing columns: ${existingCols.join(', ')}`
      });
    }

    // 2. Build SELECT expression
    const selectParts = [];
    for (const [key, col] of Object.entries(colMap)) {
      if (col) {
        selectParts.push(`\`${col}\` AS \`${key}\``);
      } else {
        selectParts.push(`NULL AS \`${key}\``);
      }
    }

    let sql = `SELECT ${selectParts.join(', ')} FROM \`${tableName}\``;
    const params = [];
    const conditions = [];

    // Date filtering if available
    if (colMap.paymentDate) {
      if (startDate) {
        conditions.push(`\`${colMap.paymentDate}\` >= ?`);
        params.push(startDate);
      }
      if (endDate) {
        conditions.push(`\`${colMap.paymentDate}\` <= ?`);
        params.push(endDate);
      }
      if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(' AND ');
      }
      sql += ` ORDER BY \`${colMap.paymentDate}\` DESC`;
    }

    sql += ` LIMIT ?`;
    params.push(limit);

    const [rows] = await p.query(sql, params);

    // Normalize values
    const normalizedRows = rows.map(r => ({
      patientName:      r.patientName ? String(r.patientName).trim() : '',
      patientId:        r.patientId ? String(r.patientId).trim() : '',
      packageName:      r.packageName ? String(r.packageName).trim() : '',
      doctor:           r.doctor ? String(r.doctor).trim() : '',
      agent:            r.agent ? String(r.agent).trim() : '',
      leadSource:       r.leadSource ? String(r.leadSource).trim() : '',
      paymentDate:      r.paymentDate || '',
      packageCost:      parseFloat(r.packageCost) || 0,
      amountPaid:       parseFloat(r.amountPaid) || 0,
      totalPackageCost: parseFloat(r.totalPackageCost) || 0,
      outstanding:      parseFloat(r.outstanding) || 0,
      paymentMode:      r.paymentMode ? String(r.paymentMode).trim() : '',
      invoiceNo:        r.invoiceNo ? String(r.invoiceNo).trim() : '',
      noOfSessions:     parseInt(r.noOfSessions, 10) || 0,
      noOfUsedSessions: parseInt(r.noOfUsedSessions, 10) || 0,
      noOfPendingSessions: parseInt(r.noOfPendingSessions, 10) || 0,
      userplanId:       r.userplanId ? String(r.userplanId).trim() : '',
      cartId:           r.cartId ? String(r.cartId).trim() : ''
    }));

    res.json({
      success: true,
      count: normalizedRows.length,
      table: tableName,
      dateRange: { startDate: startDate || 'All', endDate: endDate || 'All' },
      rows: normalizedRows
    });

  } catch (err) {
    console.error('MySQL Error in /api/collections:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }
});

// ────────────────────────────────────────────────────────────
// 3. MPC CLOUD API AUTOMATIC AUTHENTICATION & PROXY
// Auto-logs into MPC Global API using credentials when token expires
// ────────────────────────────────────────────────────────────
let cachedMpcToken = process.env.MPC_API_TOKEN || null;
let tokenExpiresAt = 0;

async function getActiveMpcToken(forceRefresh = false) {
  if (!forceRefresh && cachedMpcToken && Date.now() < tokenExpiresAt) {
    return cachedMpcToken;
  }

  const email = process.env.MPC_EMAIL || 'analytics@mypainclinicglobal.com';
  const pass = process.env.MPC_PASSWORD || 'mpc@mpc12345';

  if (!email || !pass) {
    return cachedMpcToken || process.env.MPC_API_TOKEN;
  }

  try {
    console.log(`🔐 Authenticating with MPC Global Cloud API as ${email}...`);
    const res = await fetch('https://api.mypainclinicglobal.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass })
    });

    const json = await res.json();
    if (json.status === 'success' && json.data && json.data.token) {
      cachedMpcToken = json.data.token;
      // Cache token for 6 hours
      tokenExpiresAt = Date.now() + (6 * 3600 * 1000);
      console.log('✅ Successfully authenticated! Acquired active Bearer token.');
      return cachedMpcToken;
    } else {
      console.error('❌ MPC login failed:', json.message || json);
      return cachedMpcToken;
    }
  } catch (err) {
    console.error('❌ MPC login network error:', err.message);
    return cachedMpcToken;
  }
}

// Endpoint to retrieve active token for frontend client
app.get('/api/mpc-token', async (req, res) => {
  try {
    const token = await getActiveMpcToken(req.query.refresh === '1');
    if (token) {
      res.json({ success: true, token });
    } else {
      res.status(500).json({ success: false, message: 'Could not obtain active token' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Proxy endpoint with automatic re-authentication retry
app.get('/api/mpc-cloud', async (req, res) => {
  try {
    let token = req.headers.authorization || await getActiveMpcToken();
    const { startDate, endDate, branchId, doctorId } = req.query;

    const buildUrl = () => {
      const url = new URL('https://api.mypainclinicglobal.com/api/reports/daily-collection');
      if (startDate) url.searchParams.set('startDate', startDate);
      if (endDate) url.searchParams.set('endDate', endDate);
      if (branchId && branchId.trim()) url.searchParams.set('branchId', branchId.trim());
      if (doctorId && doctorId.trim()) url.searchParams.set('doctorId', doctorId.trim());
      return url.toString();
    };

    const makeRequest = async (authTok) => {
      const headers = { 'Accept': 'application/json' };
      if (authTok) {
        headers['Authorization'] = authTok.startsWith('Bearer ') ? authTok : `Bearer ${authTok}`;
      }
      const response = await fetch(buildUrl(), { headers });
      const json = await response.json();
      return { status: response.status, json };
    };

    let result = await makeRequest(token);

    // If token was logged out or expired, auto-refresh and retry once
    const isAuthError = result.status === 401 || (result.json && (result.json.code === 401 || result.json.status === 'failed' || result.json.message === 'Token is logged out'));
    if (isAuthError) {
      console.log('⚠️ Token expired/logged out. Auto-refreshing session...');
      token = await getActiveMpcToken(true);
      if (token) {
        result = await makeRequest(token);
      }
    }

    res.status(result.status).json(result.json);
  } catch (err) {
    console.error('Error in /api/mpc-cloud proxy:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Page Routes
app.get('/only-consultation', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'only_consultation.html'));
});
app.get('/consultations', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'only_consultation.html'));
});

// ────────────────────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────────────────────
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 MPC Live MySQL API Server running!`);
  console.log(`   URL: http://localhost:${PORT}/api/collections`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Test DB: http://localhost:${PORT}/api/test-db`);
  console.log(`======================================================\n`);
});

