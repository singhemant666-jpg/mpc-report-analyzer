import openpyxl

file_path = r'c:\Users\DELL\Documents\report of mpc\DAILY_COLLECTION_REPORT_2026-07-30T06-20-15-267Z.xlsx'
wb = openpyxl.load_workbook(file_path)
ws = wb.active

header_row_idx = 3

rows = []
for r_idx, row in enumerate(ws.iter_rows(min_row=header_row_idx+1, values_only=True), start=header_row_idx+1):
    p_name = str(row[1]).strip() if row[1] is not None else ''
    pkg_name = str(row[5]).strip() if row[5] is not None else ''
    try: amt = float(row[8])
    except: amt = 0.0
    try: cost = float(row[6])
    except: cost = 0.0
    try: total_cost = float(row[7])
    except: total_cost = 0.0
    
    if p_name:
        rows.append({
            'patient': p_name,
            'date': str(row[0]),
            'pkg': pkg_name,
            'cost': cost,
            'total_cost': total_cost,
            'amt': amt
        })

print(f"Total rows: {len(rows)}")

# Check across ALL patients for potential single session duplicates
patient_groups = {}
for r in rows:
    p = r['patient']
    if p not in patient_groups: patient_groups[p] = []
    patient_groups[p].append(r)

print(f"Total Unique Patients: {len(patient_groups)}")

anomalies = []
for p, p_rows in patient_groups.items():
    # check if patient has multi-date installment rows with single sessions
    ss_rows = [r for r in p_rows if 'insole' in r['pkg'].lower() or 'robotic' in r['pkg'].lower() or 'shockwave' in r['pkg'].lower()]
    dates = set(r['date'].split()[0] for r in ss_rows)
    if len(ss_rows) > 1 and len(dates) > 1:
        anomalies.append((p, len(ss_rows), len(dates)))

print(f"Patients with multi-date single session installment rows: {len(anomalies)}")
for a in anomalies[:10]:
    print(f"  Patient: '{a[0]}', SS rows count: {a[1]}, Unique dates: {a[2]}")
