
function parseDateRobust(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  if (!str) return null;

  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  const parts = str.split(/[\sT]+/);
  const datePart = parts[0];
  const timePart = parts[1] || '00:00:00';
  
  const dParts = datePart.split(/[-/]/);
  if (dParts.length === 3) {
    let year, month, day;
    if (dParts[0].length === 4) {
      year = parseInt(dParts[0], 10);
      month = parseInt(dParts[1], 10) - 1;
      day = parseInt(dParts[2], 10);
    } else {
      day = parseInt(dParts[0], 10);
      month = parseInt(dParts[1], 10) - 1;
      year = parseInt(dParts[2], 10);
    }
    const tParts = timePart.split(':');
    const hours = parseInt(tParts[0] || 0, 10);
    const mins = parseInt(tParts[1] || 0, 10);
    const secs = parseInt(tParts[2] || 0, 10);
    d = new Date(year, month, day, hours, mins, secs);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function getRowDateStr(r) {
  if (!r || !r.paymentDate) return '';
  const d = parseDateRobust(r.paymentDate);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

console.log('29/07/2026 13:31:46 ->', getRowDateStr({ paymentDate: '29/07/2026 13:31:46' }));
console.log('29-07-2026 13:31:46 ->', getRowDateStr({ paymentDate: '29-07-2026 13:31:46' }));
console.log('2026-07-29 13:31:46 ->', getRowDateStr({ paymentDate: '2026-07-29 13:31:46' }));
