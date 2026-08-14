// ============================================================
// GOOGLE APPS SCRIPT: Auto-Timestamp for ATT Columns
// ============================================================
// 
// HOW TO INSTALL:
// 1. Open your Google Sheet
// 2. Go to Extensions → Apps Script
// 3. PASTE this code into a NEW file (click + next to Files)
//    Name the file: "AttTimestamps"
// 4. Click Save (Ctrl+S)
// 5. The onEdit trigger runs automatically - no setup needed!
//
// WHAT IT DOES:
// - When anyone types/edits in ATTEMPT 1, ATT 2, or ATT 3 columns,
//   it automatically records the current timestamp in a corresponding
//   ATT1_TIME, ATT2_TIME, or ATT3_TIME column.
// - Works across ALL sheets (Form-1, Form-2, Form-3, etc.)
// ============================================================

function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();
    
    // Skip header row
    if (row <= 1) return;
    
    // Get headers from row 1
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Find ATT column indices (1-based)
    let att1Col = -1, att2Col = -1, att3Col = -1;
    let att1TimeCol = -1, att2TimeCol = -1, att3TimeCol = -1;
    
    headers.forEach((h, idx) => {
      const header = String(h).trim().toUpperCase();
      if (header === 'ATTEMPT 1') att1Col = idx + 1;
      if (header === 'ATT 2') att2Col = idx + 1;
      if (header === 'ATT 3') att3Col = idx + 1;
      if (header === 'ATT1_TIME') att1TimeCol = idx + 1;
      if (header === 'ATT2_TIME') att2TimeCol = idx + 1;
      if (header === 'ATT3_TIME') att3TimeCol = idx + 1;
    });
    
    // If timestamp columns don't exist yet, create them
    const lastCol = sheet.getLastColumn();
    
    if (att1TimeCol === -1) {
      att1TimeCol = lastCol + 1;
      sheet.getRange(1, att1TimeCol).setValue('ATT1_TIME');
    }
    if (att2TimeCol === -1) {
      att2TimeCol = lastCol + 2;
      sheet.getRange(1, att2TimeCol).setValue('ATT2_TIME');
    }
    if (att3TimeCol === -1) {
      att3TimeCol = lastCol + 3;
      sheet.getRange(1, att3TimeCol).setValue('ATT3_TIME');
    }
    
    // Record timestamp when ATT column is edited
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
    
    if (col === att1Col) {
      const newValue = String(e.value || '').trim();
      if (newValue !== '') {
        sheet.getRange(row, att1TimeCol).setValue(timestamp);
      }
    } else if (col === att2Col) {
      const newValue = String(e.value || '').trim();
      if (newValue !== '') {
        sheet.getRange(row, att2TimeCol).setValue(timestamp);
      }
    } else if (col === att3Col) {
      const newValue = String(e.value || '').trim();
      if (newValue !== '') {
        sheet.getRange(row, att3TimeCol).setValue(timestamp);
      }
    }
    
  } catch (err) {
    // Silently fail - don't disrupt user's work
    console.log('ATT Timestamp error: ' + err.message);
  }
}
