const XLSX = require('xlsx');

const wb = XLSX.readFile('DAILY_COLLECTION_REPORT_2026-07-30T06-20-15-267Z.xlsx');
const sheet = wb.Sheets['CART_PACKAGE_FINANCIAL_REPORT'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Row 0:', data[0]);
console.log('Row 1:', data[1]);

for (let i = 2; i < data.length; i++) {
  const rowStr = JSON.stringify(data[i]);
  if (rowStr.toLowerCase().includes('bhavna')) {
    console.log(`Row ${i}:`, data[i]);
  }
}
