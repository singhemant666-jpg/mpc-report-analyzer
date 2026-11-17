// ===================================================================================
// MPC GLOBAL - ONLY CONSULTATION LIVE CONVERSION SYNC & AUTO-TIMESTAMP SCRIPT
// ===================================================================================
//
// PURPOSE:
// 1. Automatically pulls "Only Consultation" patients (patients who came for consultation
//    and did NOT buy a package) from MPC Live API directly into this Google Sheet every day.
// 2. Populates: Date (DD-MM-YYYY), Pt Name, Consulting Doctor, Package Offered (blank).
// 3. Leaves Attempt 1, Attempt 2, Attempt 3, and Remarks blank for the telecalling team.
// 4. PREVENTS DUPLICATES: Checks existing patient names so no row is ever duplicated or overwritten.
// 5. AUTO-TIMESTAMPS: Automatically records timestamps when telecallers fill Attempt 1, 2, or 3.
// 6. DAILY SCHEDULE: Runs every morning automatically at 8:00 AM.
//
// ===================================================================================
// 🛠️ HOW TO INSTALL IN YOUR GOOGLE SHEET:
// ===================================================================================
// 1. In your Google Sheet ("Only Consultation Conversion"), click:
//    Extensions → Apps Script
// 2. Delete any existing code, and PASTE this entire script.
// 3. Click the Save icon (💾 or Ctrl+S).
// 4. Click the Run button with function "onOpen" selected, or simply refresh your Google Sheet.
// 5. You will see a new menu at the top: "⚡ MPC Automation".
//    - Click: ⚡ MPC Automation → 🔄 Sync Only Consultation Patients Now
//    - Click: ⚡ MPC Automation → ⏰ Setup Daily Auto-Sync (8:00 AM)
// ===================================================================================

const MPC_CONFIG = {
  loginUrl: 'https://api.mypainclinicglobal.com/api/login',
  reportsUrl: 'https://api.mypainclinicglobal.com/api/reports/daily-collection',
  email: 'analytics@mypainclinicglobal.com',
  pass: 'mpc@mpc12345',
  defaultSyncDaysBack: 1 // 1 = Yesterday & Today (captures yesterday's consultations for next-day calling)
};

// ── Custom Menu in Google Sheets ───────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚡ MPC Automation')
    .addItem('🔄 Sync Only Consultation Patients (Yesterday & Today)', 'syncOnlyConsultationPatients')
    .addItem('📅 Sync Custom Date Range...', 'promptSyncCustomDateRange')
    .addSeparator()
    .addItem('⏰ Setup Daily Auto-Sync (Runs Every Morning 8 AM)', 'setupDailyTrigger')
    .addToUi();
}

// ── Daily Trigger Setup ───────────────────────────────────────────────────────
function setupDailyTrigger() {
  // Clear any old triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncOnlyConsultationPatients') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create new trigger: runs every day at 8:00 AM (Asia/Kolkata)
  ScriptApp.newTrigger('syncOnlyConsultationPatients')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .inTimezone('Asia/Kolkata')
    .create();

  SpreadsheetApp.getUi().alert('✅ Success!\n\nDaily Auto-Sync is now active. It will run every morning at 8:00 AM and automatically add new Only Consultation patients to this sheet.');
}

// ── Main Sync Function ────────────────────────────────────────────────────────
function syncOnlyConsultationPatients(startDateStr, endDateStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Calculate date range if not provided (default: yesterday to today)
  if (!startDateStr || !endDateStr) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - MPC_CONFIG.defaultSyncDaysBack);

    startDateStr = Utilities.formatDate(yesterday, 'Asia/Kolkata', 'yyyy-MM-dd');
    endDateStr = Utilities.formatDate(today, 'Asia/Kolkata', 'yyyy-MM-dd');
  }

  Logger.log(`[MPC] Fetching live data from ${startDateStr} to ${endDateStr}...`);

  // 1. Authenticate with MPC API
  const token = getMpcAuthToken();
  if (!token) {
    SpreadsheetApp.getUi().alert('❌ Could not authenticate with MPC API. Please check your credentials.');
    return;
  }

  // 2. Fetch raw collection rows
  const rawRows = fetchDailyCollectionReport(token, startDateStr, endDateStr);
  if (!rawRows || rawRows.length === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast(`No collection records found for ${startDateStr} to ${endDateStr}`, 'MPC Sync', 4);
    return;
  }

  // 3. Filter for "Only Consultation" Patients
  // Patient who had a consultation on these dates and did NOT buy any package
  const patientGroups = {};
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const name = String(r.patient_name || r.patientName || '').trim();
    if (!name) continue;

    const normKey = name.toLowerCase().replace(/\s+/g, ' ');
    if (!patientGroups[normKey]) {
      patientGroups[normKey] = {
        name: name,
        doctor: r.consulting_doctor || r.doctor || '',
        paymentDate: r.payment_date || r.paymentDate || '',
        hasConsultation: false,
        hasPackage: false
      };
    }

    const pkgName = String(r.package_name || r.packageName || '').toLowerCase();
    const isConsult = pkgName.includes('consult');
    const isSS = pkgName.includes('single session') || pkgName.includes('per session');
    const isPkg = !isConsult && !isSS && pkgName.length > 0;

    if (isConsult) {
      patientGroups[normKey].hasConsultation = true;
      // Preserve consultation doctor and payment date
      if (r.consulting_doctor) patientGroups[normKey].doctor = r.consulting_doctor;
      if (r.payment_date) patientGroups[normKey].paymentDate = r.payment_date;
    }
    if (isPkg) {
      patientGroups[normKey].hasPackage = true;
    }
  }

  // Identify patients who only had a consultation (no package conversion)
  const onlyConsultPatients = Object.values(patientGroups).filter(p => p.hasConsultation && !p.hasPackage);

  if (onlyConsultPatients.length === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast('No new Only Consultation patients found in this period.', 'MPC Sync', 4);
    return;
  }

  // 4. Read Existing Patient Names from Sheet (Column B) to Prevent Duplicates
  const lastRow = sheet.getLastRow();
  const existingNames = new Set();
  
  if (lastRow > 1) {
    // Read Column B (Pt Name) from row 2 to lastRow
    const nameColValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (let i = 0; i < nameColValues.length; i++) {
      const existingName = String(nameColValues[i][0] || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (existingName) existingNames.add(existingName);
    }
  }

  // 5. Prepare New Rows to Append
  const rowsToAdd = [];
  for (let i = 0; i < onlyConsultPatients.length; i++) {
    const p = onlyConsultPatients[i];
    const normKey = p.name.toLowerCase().replace(/\s+/g, ' ');
    
    // Skip if patient already exists in the sheet
    if (existingNames.has(normKey)) {
      continue;
    }

    // Format Date: DD-MM-YYYY (e.g. 17-11-2026)
    let formattedDate = '';
    if (p.paymentDate) {
      const d = new Date(p.paymentDate);
      if (!isNaN(d.getTime())) {
        formattedDate = Utilities.formatDate(d, 'Asia/Kolkata', 'dd-MM-yyyy');
      }
    }
    if (!formattedDate) {
      formattedDate = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MM-yyyy');
    }

    const cleanName = formatProperName(p.name);
    const cleanDoc = cleanDoctorName(p.doctor);

    // Columns: A: Date, B: Pt Name, C: Consulting Doctor, D: Package Offered, E: Attempt 1, F: Attempt 2, G: Attempt 3, H: Remarks
    rowsToAdd.push([
      formattedDate,
      cleanName,
      cleanDoc,
      '', // Package Offered (left for telecalling / consultation notes)
      '', // Attempt 1
      '', // Attempt 2
      '', // Attempt 3
      ''  // Remarks
    ]);

    existingNames.add(normKey); // prevent dupes within the same batch
  }

  // 6. Append New Rows
  if (rowsToAdd.length > 0) {
    const targetStartRow = lastRow + 1;
    sheet.getRange(targetStartRow, 1, rowsToAdd.length, 8).setValues(rowsToAdd);
    
    // Style new rows cleanly
    sheet.getRange(targetStartRow, 1, rowsToAdd.length, 8)
      .setFontFamily('Arial')
      .setFontSize(10)
      .setVerticalAlignment('middle');

    sheet.getRange(targetStartRow, 1, rowsToAdd.length, 1).setHorizontalAlignment('center'); // Date
    sheet.getRange(targetStartRow, 2, rowsToAdd.length, 2).setHorizontalAlignment('left');   // Name, Doctor

    SpreadsheetApp.getActiveSpreadsheet().toast(`✅ Successfully added ${rowsToAdd.length} new Only Consultation patients!`, 'MPC Sync', 5);
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast('All Only Consultation patients are already in the sheet. No duplicates added.', 'MPC Sync', 4);
  }
}

// ── Manual Custom Date Range Sync ─────────────────────────────────────────────
function promptSyncCustomDateRange() {
  const ui = SpreadsheetApp.getUi();
  const resp1 = ui.prompt('Sync Custom Date Range', 'Enter Start Date (YYYY-MM-DD):', ui.ButtonSet.OK_CANCEL);
  if (resp1.getSelectedButton() !== ui.Button.OK) return;
  const startDate = resp1.getResponseText().trim();

  const resp2 = ui.prompt('Sync Custom Date Range', 'Enter End Date (YYYY-MM-DD):', ui.ButtonSet.OK_CANCEL);
  if (resp2.getSelectedButton() !== ui.Button.OK) return;
  const endDate = resp2.getResponseText().trim();

  if (!startDate || !endDate) {
    ui.alert('Please enter valid dates in YYYY-MM-DD format.');
    return;
  }

  syncOnlyConsultationPatients(startDate, endDate);
}

// ── API Authentication ────────────────────────────────────────────────────────
function getMpcAuthToken() {
  try {
    const payload = {
      email: MPC_CONFIG.email,
      pass: MPC_CONFIG.pass
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    const res = UrlFetchApp.fetch(MPC_CONFIG.loginUrl, options);
    const json = JSON.parse(res.getContentText());
    if (json && json.data && json.data.token) {
      return json.data.token;
    }
  } catch (e) {
    Logger.log('Auth error: ' + e.message);
  }
  return null;
}

// ── API Fetch ─────────────────────────────────────────────────────────────────
function fetchDailyCollectionReport(token, startDate, endDate) {
  try {
    const url = `${MPC_CONFIG.reportsUrl}?startDate=${startDate}&endDate=${endDate}`;
    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };
    const res = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(res.getContentText());
    if (json && json.data && Array.isArray(json.data.rows)) {
      return json.data.rows;
    }
    if (json && Array.isArray(json.data)) {
      return json.data;
    }
    if (Array.isArray(json)) {
      return json;
    }
  } catch (e) {
    Logger.log('Fetch error: ' + e.message);
  }
  return [];
}

// ── Helper: Clean Doctor Names ────────────────────────────────────────────────
function cleanDoctorName(doc) {
  if (!doc) return 'Dr Gladys';
  let d = doc.replace(/Consulting/gi, '').replace(/\./g, '').trim();
  if (/Gladys/i.test(d)) return 'Dr Gladys';
  if (/Vidh?isha/i.test(d)) return 'Dr Vidisha';
  if (/Chinmay/i.test(d)) return 'Dr Chinmay';
  if (/Krishna/i.test(d)) return 'Dr Krishna';
  return d;
}

// ── Helper: Format Proper Case Name ───────────────────────────────────────────
function formatProperName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Auto-Timestamp on Edit for Attempt Columns ────────────────────────────────
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();
    
    // Skip header row
    if (row <= 1) return;
    
    // Get headers from row 1
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    let att1Col = -1, att2Col = -1, att3Col = -1;
    let att1TimeCol = -1, att2TimeCol = -1, att3TimeCol = -1;
    
    headers.forEach((h, idx) => {
      const header = String(h).trim().toUpperCase();
      if (header === 'ATTEMPT 1') att1Col = idx + 1;
      if (header === 'ATTEMPT 2' || header === 'ATT 2') att2Col = idx + 1;
      if (header === 'ATTEMPT 3' || header === 'ATT 3') att3Col = idx + 1;
      if (header === 'ATT1_TIME') att1TimeCol = idx + 1;
      if (header === 'ATT2_TIME') att2TimeCol = idx + 1;
      if (header === 'ATT3_TIME') att3TimeCol = idx + 1;
    });
    
    // If timestamp columns don't exist yet, create them at the end
    const lastCol = sheet.getLastColumn();
    if (att1TimeCol === -1 && att1Col !== -1) {
      att1TimeCol = lastCol + 1;
      sheet.getRange(1, att1TimeCol).setValue('ATT1_TIME');
    }
    if (att2TimeCol === -1 && att2Col !== -1) {
      att2TimeCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, att2TimeCol).setValue('ATT2_TIME');
    }
    if (att3TimeCol === -1 && att3Col !== -1) {
      att3TimeCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, att3TimeCol).setValue('ATT3_TIME');
    }
    
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
    const newValue = String(e.value || range.getValue() || '').trim();
    
    if (col === att1Col && newValue !== '' && att1TimeCol !== -1) {
      sheet.getRange(row, att1TimeCol).setValue(timestamp);
    } else if (col === att2Col && newValue !== '' && att2TimeCol !== -1) {
      sheet.getRange(row, att2TimeCol).setValue(timestamp);
    } else if (col === att3Col && newValue !== '' && att3TimeCol !== -1) {
      sheet.getRange(row, att3TimeCol).setValue(timestamp);
    }
  } catch (err) {
    Logger.log('ATT Timestamp error: ' + err.message);
  }
}
