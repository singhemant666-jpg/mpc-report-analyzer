// ============================================================
// IMPORT DAILY COLLECTION EXCEL TO MYSQL DATABASE
// ============================================================
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mpc_clinic',
  waitForConnections: true,
  connectionLimit: 5
};

const tableName = process.env.DB_TABLE || 'daily_collections';

async function main() {
  console.log(`Connecting to MySQL database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}...`);
  
  // Connect without DB first to ensure database exists
  const rootConn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password
  });

  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  console.log(`✅ Database "${dbConfig.database}" is ready.`);
  await rootConn.end();

  const conn = await mysql.createConnection(dbConfig);

  // Create table if not exists
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`payment_date\` VARCHAR(50),
      \`patient_name\` VARCHAR(255) NOT NULL,
      \`consulting_doctor\` VARCHAR(255),
      \`lead_source\` VARCHAR(255),
      \`agent_name\` VARCHAR(255),
      \`package_name\` VARCHAR(255),
      \`package_cost\` DECIMAL(12,2) DEFAULT 0,
      \`total_package_cost\` DECIMAL(12,2) DEFAULT 0,
      \`amount_paid\` DECIMAL(12,2) DEFAULT 0,
      \`outstanding_amount\` DECIMAL(12,2) DEFAULT 0,
      \`payment_mode\` VARCHAR(100),
      \`invoice_no\` VARCHAR(100),
      \`no_of_sessions\` INT DEFAULT 0,
      \`no_of_used_sessions\` INT DEFAULT 0,
      \`no_of_pending_sessions\` INT DEFAULT 0,
      \`userplan_id\` VARCHAR(50),
      \`cart_id\` VARCHAR(50),
      \`paylog_id\` VARCHAR(50),
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_patient_name (\`patient_name\`),
      INDEX idx_payment_date (\`payment_date\`),
      INDEX idx_consulting_doctor (\`consulting_doctor\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await conn.query(createTableSQL);
  console.log(`✅ Table "${tableName}" is ready.`);

  // Find an Excel file to import
  const files = fs.readdirSync(__dirname);
  const excelFile = files.find(f => f.startsWith('DAILY_COLLECTION_REPORT_') && f.endsWith('.xlsx')) ||
                    files.find(f => f.endsWith('.xlsx'));

  if (!excelFile) {
    console.log('No Excel report found to import.');
    await conn.end();
    return;
  }

  console.log(`Reading Excel file "${excelFile}"...`);
  const wb = xlsx.readFile(path.join(__dirname, excelFile), { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find header row (row with Patient Name)
  let hIdx = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const row = raw[i].map(c => String(c).toLowerCase());
    if (row.some(c => c.includes('patient') || c.includes('name'))) {
      hIdx = i;
      break;
    }
  }

  if (hIdx === -1) {
    console.error('Could not find header row in Excel file.');
    await conn.end();
    return;
  }

  const hdrs = raw[hIdx].map(c => String(c).trim().toLowerCase());
  const col = (name) => hdrs.findIndex(h => h.includes(name.toLowerCase()));

  const cDate = col('date');
  const cName = col('patient');
  const cDoc = col('doctor');
  const cLead = col('source');
  const cAgent = col('agent');
  const cPkg = col('package name') >= 0 ? col('package name') : col('package');
  const cPkgCost = col('package cost');
  const cTotCost = col('total cost') >= 0 ? col('total cost') : col('total package');
  const cPaid = col('paid') >= 0 ? col('paid') : col('amount');
  const cOutstanding = col('outstanding');
  const cMode = col('mode');
  const cInvoice = col('invoice');
  const cSessions = col('no. of sessions');
  const cUsed = col('used sessions');
  const cPending = col('pending sessions');
  const cUserplan = col('userplan');
  const cCart = col('cart');
  const cPaylog = col('paylog');

  console.log(`Found headers on row ${hIdx + 1}. Total raw rows: ${raw.length - hIdx - 1}`);

  let inserted = 0;
  const insertSQL = `
    INSERT INTO \`${tableName}\` 
    (payment_date, patient_name, consulting_doctor, lead_source, agent_name, package_name,
     package_cost, total_package_cost, amount_paid, outstanding_amount, payment_mode, invoice_no,
     no_of_sessions, no_of_used_sessions, no_of_pending_sessions, userplan_id, cart_id, paylog_id)
    VALUES ?
  `;

  const batch = [];
  for (let i = hIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    const name = String(r[cName] || '').trim();
    if (!name) continue;

    let dateVal = r[cDate];
    let dateStr = '';
    if (dateVal instanceof Date) {
      dateStr = dateVal.toISOString().slice(0, 10);
    } else {
      dateStr = String(dateVal || '').trim().slice(0, 10);
    }

    const parseNum = (v) => parseFloat(String(v || '0').replace(/[^0-9.-]/g, '')) || 0;
    const parseIntVal = (v) => parseInt(String(v || '0').replace(/[^0-9.-]/g, ''), 10) || 0;

    batch.push([
      dateStr,
      name,
      String(r[cDoc] || '').trim(),
      String(r[cLead] || '').trim(),
      String(r[cAgent] || '').trim(),
      String(r[cPkg] || '').trim(),
      parseNum(r[cPkgCost]),
      parseNum(r[cTotCost]),
      parseNum(r[cPaid]),
      parseNum(r[cOutstanding]),
      String(r[cMode] || '').trim(),
      String(r[cInvoice] || '').trim(),
      parseIntVal(r[cSessions]),
      parseIntVal(r[cUsed]),
      parseIntVal(r[cPending]),
      String(r[cUserplan] || '').trim(),
      String(r[cCart] || '').trim(),
      String(r[cPaylog] || '').trim()
    ]);

    if (batch.length >= 500) {
      await conn.query(insertSQL, [batch]);
      inserted += batch.length;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await conn.query(insertSQL, [batch]);
    inserted += batch.length;
  }

  console.log(`🎉 Done! Successfully inserted ${inserted} records into MySQL table "${tableName}".`);
  await conn.end();
}

main().catch(err => {
  console.error('Import Error:', err);
  process.exit(1);
});

