const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'DAILY_COLLECTION_REPORT_2026-07-28T08-13-25-071Z.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== Sheet: ${sheetName} ===`);
  console.log(`Total rows: ${data.length}`);
  // Print first 20 rows
  for (let i = 0; i < Math.min(20, data.length); i++) {
    console.log(`Row ${i}: ${JSON.stringify(data[i])}`);
  }
}
