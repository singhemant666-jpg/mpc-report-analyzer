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
    try: cost = float(row[7])
    except: cost = 0.0
    rows.append({
        'r_idx': r_idx,
        'patient': p_name,
        'doctor': str(row[2]).strip() if row[2] is not None else '',
        'pkg': pkg_name,
        'amt': amt,
        'cost': cost
    })

# Check matching patients for doctor 'Dr. Gladys Swamy Consulting'
gladys_patients = set(r['patient'] for r in rows if r['doctor'] == 'Dr. Gladys Swamy Consulting')

for name in ['MANJUSHA S TULLU', 'RAVINDERPAL SINGH']:
    print(f"Is '{name}' in Gladys patients set? {name in gladys_patients}")
