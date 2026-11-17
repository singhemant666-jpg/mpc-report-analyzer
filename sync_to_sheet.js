// ==============================================================================
// MPC Global - Direct Whitelisted Sync to Google Sheet
// ==============================================================================
// Since MPC API whitelists this machine's IP, this script fetches the live
// Only Consultation patients and pushes them directly to your Google Sheet!
//
// Usage:
// node sync_to_sheet.js [GoogleWebAppUrl] [startDate] [endDate]
// ==============================================================================

const fs = require('fs');

async function syncToSheet(webAppUrl, startDate, endDate) {
  if (!webAppUrl) {
    console.error('❌ Please provide your Google Sheet Web App URL.');
    console.log('To get this URL:');
    console.log('1. In Google Sheets, open Extensions -> Apps Script');
    console.log('2. Click Deploy -> New deployment');
    console.log('3. Select type: Web app');
    console.log('4. Execute as: Me, Who has access: Anyone');
    console.log('5. Copy the Web App URL and run:');
    console.log('   node sync_to_sheet.js <URL>\n');
    return;
  }

  // 1. Determine dates
  if (!startDate || !endDate) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    startDate = fmt(yesterday);
    endDate = fmt(today);
  }

  console.log(`[MPC] Authenticating from whitelisted local IP...`);
  const loginRes = await fetch('https://api.mypainclinicglobal.com/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: 'analytics@mypainclinicglobal.com', pass: 'mpc@mpc12345' })
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data && loginJson.data.token;
  if (!token) {
    console.error('❌ Login failed:', loginJson);
    return;
  }

  console.log(`[MPC] Fetching collection records from ${startDate} to ${endDate}...`);
  const reportRes = await fetch(`https://api.mypainclinicglobal.com/api/reports/daily-collection?startDate=${startDate}&endDate=${endDate}`, {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
  });
  const reportJson = await reportRes.json();
  const rawRows = reportJson.data && reportJson.data.rows ? reportJson.data.rows : [];
  console.log(`[MPC] Found ${rawRows.length} total collection records.`);

  // 2. Filter for Only Consultation
  const pMap = {};
  for (const r of rawRows) {
    const name = (r.patient_name || '').trim();
    if (!name) continue;
    const norm = name.toLowerCase().replace(/\s+/g, ' ');
    if (!pMap[norm]) {
      pMap[norm] = {
        name,
        doctor: r.consulting_doctor || '',
        date: r.payment_date || '',
        hasConsult: false,
        hasPkg: false
      };
    }
    const pkg = (r.package_name || '').toLowerCase();
    if (pkg.includes('consult')) pMap[norm].hasConsult = true;
    else if (pkg) pMap[norm].hasPkg = true;
  }

  const cleanDoc = (doc) => {
    if (!doc) return 'Dr Gladys';
    let d = String(doc).replace(/Consulting/gi, '').replace(/\./g, '').trim();
    if (/Gladys/i.test(d)) return 'Dr Gladys';
    if (/Vidh?isha/i.test(d)) return 'Dr Vidisha';
    if (/Chinmay/i.test(d)) return 'Dr Chinmay';
    if (/Krishna/i.test(d)) return 'Dr Krishna';
    return d;
  };

  const toProper = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const onlyConsult = Object.values(pMap).filter(p => p.hasConsult && !p.hasPkg);
  console.log(`[MPC] Identified ${onlyConsult.length} Only Consultation patients.`);

  const rows = onlyConsult.map(p => {
    let dateStr = '';
    if (p.date) {
      const d = new Date(p.date);
      if (!isNaN(d.getTime())) {
        dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      }
    }
    return {
      date: dateStr,
      name: toProper(p.name),
      doctor: cleanDoc(p.doctor)
    };
  });

  // 3. Post to Google Sheet Web App
  console.log(`[MPC] Pushing ${rows.length} rows to Google Sheet...`);
  const postRes = await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows })
  });
  const postJson = await postRes.json();
  console.log('✅ Google Sheet sync result:', postJson);
}

const args = process.argv.slice(2);
syncToSheet(args[0], args[1], args[2]);
