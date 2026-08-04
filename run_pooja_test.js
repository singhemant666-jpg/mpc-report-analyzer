const fs = require('fs');
const XLSX = require('xlsx');

let html = fs.readFileSync('index.html', 'utf8');
// Prevent cleanup of _rawRows
html = html.replace(/delete\s+p\._rawRows;/g, '// delete p._rawRows;');

const mocks = `
const XLSX = require('xlsx');
const window = {
  location: { search: '' }
};
const document = {
  getElementById: () => ({ addEventListener: () => {} }),
  addEventListener: () => {}
};
const Chart = class {};
`;

const testBlock = `
const workbook = XLSX.readFile('DAILY_COLLECTION_REPORT_2026-07-30T06-20-15-267Z.xlsx', { cellDates: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const rows = [];
const colMap = {};
const header = data[2];
header.forEach((h, idx) => {
  if (h) colMap[h.trim()] = idx;
});

for (let i = 3; i < data.length; i++) {
  const r = data[i];
  if (!r || r.length === 0) continue;
  const pName = r[colMap['Patient Name']];
  if (!pName) continue;
  
  rows.push({
    patientName:    pName,
    patientId:      r[colMap['Patient ID']],
    packageName:    r[colMap['Package Name']],
    doctor:         r[colMap['Consulting Doctor']],
    agent:          r[colMap['Agent Name']],
    leadSource:     cleanLeadSource(r[colMap['Lead Source']]),
    paymentDate:    parseDate(r[colMap['Payment Date']]),
    packageCost:    parseNumber(r[colMap['Package Cost']]),
    amountPaid:     parseNumber(r[colMap['Amount Paid']]),
    totalPackageCost: parseNumber(r[colMap['Total Cost of Package']])
  });
}

const patients = groupPatients(rows);
const p = patients['POOJA BHANDARY'];
console.log('=== POOJA BHANDARY RAW ROWS AFTER PASS 2 ===');
console.log(JSON.stringify(p._rawRows, null, 2));
console.log('=== POOJA BHANDARY SERVICES ===');
console.log(JSON.stringify(p.services, null, 2));
`;

const lastScriptStart = html.lastIndexOf('<script>');
const lastScriptEnd = html.lastIndexOf('</script>');
const actualCode = html.substring(lastScriptStart + 8, lastScriptEnd);

fs.writeFileSync('temp_run.js', mocks + actualCode + testBlock);
try {
  const output = require('child_process').execSync('node temp_run.js', { encoding: 'utf8' });
  console.log(output);
} catch (e) {
  console.error(e.message);
} finally {
  if (fs.existsSync('temp_run.js')) fs.unlinkSync('temp_run.js');
}
