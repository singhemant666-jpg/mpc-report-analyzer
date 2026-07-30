import openpyxl

file_path = r'c:\Users\DELL\Documents\report of mpc\DAILY_COLLECTION_REPORT_2026-07-30T06-20-15-267Z.xlsx'
wb = openpyxl.load_workbook(file_path)
ws = wb.active

header_row_idx = 3
pkg_idx = 5
amt_idx = 8
cost_idx = 7
patient_idx = 1

consult_records = []
total_rev = 0

for r_idx, row in enumerate(ws.iter_rows(min_row=header_row_idx+1, values_only=True), start=header_row_idx+1):
    p_name = str(row[patient_idx]).strip() if row[patient_idx] is not None else ''
    pkg_name = str(row[pkg_idx]).strip() if row[pkg_idx] is not None else ''
    try: amt = float(row[amt_idx])
    except: amt = 0.0
    try: cost = float(row[cost_idx])
    except: cost = 0.0
    
    lower = pkg_name.lower()
    is_consult = False
    
    if lower in ['default top up', 'default topup', 'n/a', 'na', '']:
        if round(amt) in [499, 1500] or round(cost) in [499, 1500]:
            is_consult = True
    elif 'consult' in lower or 'consultation' in lower:
        is_consult = True

    if is_consult:
        rev = 1500 if 'women' in lower or round(amt) == 1500 or round(cost) == 1500 else 499
        consult_records.append((r_idx, p_name, pkg_name, amt, cost, rev))
        total_rev += rev

print(f"Total Consultation Records: {len(consult_records)}")
print(f"Total Consultation Revenue: Rs. {total_rev:,.2f}")

print("\nRows matching Consultation:")
for r in consult_records:
    if r[2] in ['N/A', 'Default Top Up', 'na', 'n/a']:
        print(f"Row {r[0]}: Patient='{r[1]}', Pkg='{r[2]}', Amt={r[3]}, Cost={r[4]}")
