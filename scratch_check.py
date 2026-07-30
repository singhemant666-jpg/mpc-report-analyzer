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

# Simulate cumulative single session allocation for Yogesh Amarnani:
yogesh_rows = [r for r in rows if 'YOGESH' in r['patient'].upper() and 'AMARNANI' in r['patient'].upper()]

# Sort dates
yogesh_rows.sort(key=lambda x: x['date'])

# Cumulative allocations per SS item name
ss_cumulative = {}

date_groups = {}
for r in yogesh_rows:
    d_key = r['date'].split()[0]
    if d_key not in date_groups: date_groups[d_key] = []
    date_groups[d_key].append(r)

results = []

for d_key, d_rows in date_groups.items():
    d_paid = sum(r['amt'] for r in d_rows)
    rem = d_paid
    
    # Step 1: Consult
    for r in d_rows:
        if r['pkg'].lower() == 'consultation':
            cr_alloc = min(499, rem)
            rem -= cr_alloc
            results.append((d_key, 'Consultation', cr_alloc))
            
    # Step 2: SS
    for r in d_rows:
        lower = r['pkg'].lower()
        if 'insole' in lower or 'robotic' in lower:
            price = 2360 if 'insole' in lower else 2000
            name = r['pkg']
            already_alloc = ss_cumulative.get(name, 0.0)
            needed = max(0.0, price - already_alloc)
            alloc = min(needed, rem)
            rem -= alloc
            ss_cumulative[name] = already_alloc + alloc
            results.append((d_key, name, alloc))
            
    # Step 3: Package
    for r in d_rows:
        lower = r['pkg'].lower()
        if 'pain management' in lower:
            alloc = rem
            rem = 0
            results.append((d_key, r['pkg'], alloc))

print("Allocations per row:")
for res in results:
    print(f"  Date={res[0]}, Service='{res[1]}', Allocated=Rs. {res[2]:,.2f}")

totals = {}
for res in results:
    totals[res[1]] = totals.get(res[1], 0.0) + res[2]

print("\nFinal Aggregated Revenue per Service:")
for name, rev in totals.items():
    print(f"  {name}: Rs. {rev:,.2f}")
