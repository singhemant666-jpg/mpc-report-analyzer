# Verify the bundle scaling logic matches expected values

# T A MAHAMOOD
pm10 = 15000
wr5 = 7500
rsa3 = 5400
sticker_total = pm10 + wr5 + rsa3  # 27900
bundle_total = 25800  # from Excel col7

scale = bundle_total / sticker_total
print(f"=== T A MAHAMOOD ===")
print(f"Sticker Total: {sticker_total}")
print(f"Bundle Total (EMR): {bundle_total}")
print(f"Scale Factor: {scale:.6f}")
print(f"PM-10 effective: {round(pm10 * scale * 100) / 100}")
print(f"W&R-5 effective: {round(wr5 * scale * 100) / 100}")
print(f"RSA-3 effective: {round(rsa3 * scale * 100) / 100}")
pkg_value = round(pm10 * scale * 100) / 100 + round(wr5 * scale * 100) / 100 + round(rsa3 * scale * 100) / 100
print(f"Total PKG VALUE: {pkg_value}")
print()

# YOGESH AMARNANI
pm3 = 4500
fi = 2360   # single session (from master price list, but Excel col6 says 2000 for Foot Insoles)
rsa_ss = 2000  # single session
# Let's check - for Yogesh, col7 = 8860, individual costs: PM-3=4500, FI=2000(col6), RSA=2000(col6)
# But getSingleSessionPrice returns 2360 for foot insoles from master list
# In Pass 1, for single_session type: pkgPrice = getSingleSessionPrice(pkgName, row.packageCost)
# getSingleSessionPrice('Foot Insoles', 2000) -> matches 'foot insole' keyword -> returns 2360
# But col6 says 2000!

# Wait - let me re-check. The master price says SS=2360 for Foot Insoles
# But the Excel col6 says Package Cost = 2000 for Foot Insoles
# getSingleSessionPrice first checks keywords, returns 2360 regardless of defaultCost
# So the app uses 2360 for Foot Insoles SS price

# And col7 = 8860 for Yogesh
# sticker = 4500 + 2360 + 2000 = 8860
# bundle = 8860
# Since bundle == sticker, no discount. scale = 1.0. Correct!

yogesh_pm3 = 4500
yogesh_fi = 2360  # from master price list
yogesh_rsa = 2000
yogesh_sticker = yogesh_pm3 + yogesh_fi + yogesh_rsa
yogesh_bundle = 8860

print(f"=== YOGESH AMARNANI ===")
print(f"Sticker Total: {yogesh_sticker}")
print(f"Bundle Total (EMR): {yogesh_bundle}")
print(f"Has discount? {yogesh_bundle < yogesh_sticker}")
print(f"PKG VALUE: {yogesh_bundle}")
print()

# But wait - Foot Insoles col6=2000 but master says SS=2360
# So sticker = 4500 + 2360 + 2000 = 8860 which matches bundle total
# BUT the col6 value of 2000 is different from master 2360
# The master says 2360 is the correct single session price
# And col7=8860 = 4500 + 2360 + 2000 which means EMR used 2360 for foot insoles SS pricing
# Wait no, 4500+2000+2000=8500, not 8860. 
# 8860 - 4500 = 4360. 4360 - 2000 = 2360. So yes, EMR uses 2360 for foot insoles!

print(f"Verification: 4500 + 2360 + 2000 = {4500+2360+2000}")
print(f"This equals col7 8860? {4500+2360+2000 == 8860}")
