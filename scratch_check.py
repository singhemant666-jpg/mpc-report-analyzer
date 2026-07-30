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
            'r_idx': r_idx,
            'patient': p_name,
            'pkg': pkg_name,
            'cost': cost,
            'total_cost': total_cost,
            'amt': amt
        })

master_prices = [
    {'name': 'Home Visit', 'keywords': ['home visit'], 'ss': 2500, 'pkg_rate': 2500},
    {'name': 'Online Consultation', 'keywords': ['online consultation', 'online consult'], 'ss': 2000, 'pkg_rate': 2000},
    {'name': 'Prism', 'keywords': ['prism'], 'ss': 500, 'pkg_rate': 500},
    {'name': 'HBOT (Soft Shell)', 'keywords': ['hbot (soft shell)', 'hbot soft', 'soft shell'], 'ss': 2000, 'pkg_rate': 1500},
    {'name': 'HBOT (Hard Shell)', 'keywords': ['hbot (hard shell)', 'hbot hard', 'hard shell', 'hbot'], 'ss': 2000, 'pkg_rate': 1500},
    {'name': 'EMS Training', 'keywords': ['ems', 'ems training'], 'ss': 1800, 'pkg_rate': 1500},
    {'name': 'Couple Ice Bath', 'keywords': ['couple ice bath'], 'ss': 2500, 'pkg_rate': 2500},
    {'name': 'Ice Bath', 'keywords': ['ice bath'], 'ss': 2000, 'pkg_rate': 1500},
    {'name': 'Women\'s Health Consultation', 'keywords': ['women\'s health consultation', 'womens health consultation', 'women health consultation'], 'ss': 1500, 'pkg_rate': 1500},
    {'name': 'Focused Shockwave Therapy', 'keywords': ['focused shockwave', 'shockwave'], 'ss': 2000, 'pkg_rate': 1800},
    {'name': 'Women\'s Health Therapy', 'keywords': ['women\'s health therapy', 'womens health therapy', 'women health therapy', 'women\'s health', 'womens health'], 'ss': 1800, 'pkg_rate': 1500},
    {'name': 'Consultation', 'keywords': ['consultation', 'pain management consultation'], 'ss': 499, 'pkg_rate': 499},
    {'name': 'Foot Insoles', 'keywords': ['foot insole', 'foot insoles', 'foot in soles', 'insole', 'insoles'], 'ss': 2360, 'pkg_rate': 2360},
    {'name': 'Pilates', 'keywords': ['pilates'], 'ss': 1000, 'pkg_rate': 800},
    {'name': 'Pelvic Chair', 'keywords': ['pelvic chair', 'pelvic'], 'ss': 1800, 'pkg_rate': 1500},
    {'name': 'Gait Analysis', 'keywords': ['gait analysis', 'gait'], 'ss': 2500, 'pkg_rate': 2500},
    {'name': 'Cardio Coach', 'keywords': ['cardio coach', 'cardio'], 'ss': 2500, 'pkg_rate': 2500},
    {'name': 'Cryotherapy', 'keywords': ['cryotherapy', 'cryo'], 'ss': 2500, 'pkg_rate': 2250},
    {'name': 'Red Light Therapy', 'keywords': ['red light', 'red light therapy'], 'ss': 2000, 'pkg_rate': 1500},
    {'name': 'Basic Physiotherapy (BMSK)', 'keywords': ['bmsk', 'basic bmsk', 'basic physio', 'basic physiotherapy'], 'ss': 1000, 'pkg_rate': 800},
    {'name': 'Spine Decompression', 'keywords': ['spine decompression', 'decompression'], 'ss': 1800, 'pkg_rate': 1500},
    {'name': 'Robotic Spine Aligner', 'keywords': ['robotic spine', 'robotic spine aligner', 'aligner'], 'ss': 2000, 'pkg_rate': 1800},
    {'name': 'Acoustic Wave Therapy', 'keywords': ['acoustic wave', 'acoustic wave therapy'], 'ss': 1800, 'pkg_rate': 1500},
    {'name': 'Deep Tissue Thermotherapy', 'keywords': ['deep tissue', 'thermotherapy'], 'ss': 1800, 'pkg_rate': 1500},
    {'name': 'High Intensity Laser', 'keywords': ['high intensity laser', 'hil laser'], 'ss': 1800, 'pkg_rate': 1500},
    {'name': 'Magneto Laser', 'keywords': ['magneto', 'magneto laser'], 'ss': 1800, 'pkg_rate': 1500},
    {'name': 'THOR Laser', 'keywords': ['thor laser', 'thor'], 'ss': 1800, 'pkg_rate': 1500}
]

def get_master_ss_price(pkg_name, default_cost):
    if not pkg_name: return default_cost or 1800
    lower = pkg_name.lower().strip()
    for item in master_prices:
        for kw in item['keywords']:
            if kw in lower:
                return item['ss']
    return default_cost or 1800

# Sample check across raw package names
unique_pkgs = set(r['pkg'] for r in rows if r['pkg'])
print(f"Total Unique Package Names in Sheet: {len(unique_pkgs)}")

print("\nSample Package Price Mapping:")
for pkg in sorted(list(unique_pkgs))[:25]:
    price = get_master_ss_price(pkg, 0)
    print(f"  '{pkg}' -> Single Session Price: Rs. {price:,}")
