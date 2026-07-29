# Daily Collection Report Analyzer

A premium, single-file web application for analyzing clinic Daily Collection Reports. Upload an Excel file and instantly get patient conversion analytics, interactive dashboards, and a downloadable 13-sheet Excel workbook.

## Features

- **📁 Upload**: Drag-and-drop or click to upload `.xlsx` files
- **📊 Dashboard**: Real-time metrics with animated cards and interactive charts
- **🔍 Filters**: Filter by date, doctor, agent, lead source, package, or status
- **🔎 Search**: Search patients by name and see all their services
- **📥 Export**: Download Excel (13 sheets), CSV, or PDF reports
- **⚙️ Admin Config**: Customize classification keywords (saved to localStorage)

## Quick Start

1. Open `index.html` in any modern browser (Chrome, Edge, Firefox)
2. Upload your Daily Collection Report (`.xlsx`)
3. Click **Generate Report**
4. Explore the dashboard, filter data, search patients
5. Download your analysis report

## Patient Classification & Consultation Pricing

- **Regular Consultation**: Fixed package price of **₹499**.
- **Women's Health Consultation**: Fixed package price of **₹1,500**.
- **Total Consultation Records**: **362** raw records in Excel (**360** unique consultation patients).

| Category | Consultation | Package | Single Session |
|----------|:-----------:|:-------:|:--------------:|
| Only Consultation | ✅ | ❌ | ❌ |
| Consultation + Package | ✅ | ✅ | ❌ |
| Consultation + Single Session | ✅ | ❌ | ✅ |
| Consultation + Package + SS | ✅ | ✅ | ✅ |
| Only Package | ❌ | ✅ | ❌ |
| Only Single Session | ❌ | ❌ | ✅ |
| Package + Single Session | ❌ | ✅ | ✅ |

## Conversion Formula

```
Conversion % = (Consultation+Package + Consultation+Package+SS) / Total Consultation Patients × 100
```

## Proportional Revenue Division (Advance Paid Formula)

When a patient makes a partial or advance payment for multiple packages/services, payment is allocated strictly using the **Advance Paid (Remaining Amount Paid)**:

$$\text{Allocated Advance Paid per Package} = \left(\frac{\text{Package Cost}}{\text{Sum of Non-Consultation Package Costs}}\right) \times \left( \text{Total Amount Paid} - \text{Consultation Fee} \right)$$

### Key Rules:
1. **Consultation Revenue**: Receives exact fixed fee (₹499 for regular, ₹1,500 for Women's Health).
2. **Advance Paid Allocation**: 100% of remaining advance paid is divided proportionally across package names.
3. The sum of per-package allocations equals the **Total Advance Paid** (not the package retail value).

### Example 1 (3 Packages with Advance Payment)
- **Package A**: ₹10,000 | **Package B**: ₹20,000 | **Package C**: ₹30,000 $\rightarrow$ **Sum of Package Costs** = ₹60,000
- **Advance Paid**: **₹24,000** (Not ₹60,000!)

**Allocated Advance Calculation:**
- **Package A Allocated Advance**: $(10,000 / 60,000) \times 24,000 = \text{₹4,000}$
- **Package B Allocated Advance**: $(20,000 / 60,000) \times 24,000 = \text{₹8,000}$
- **Package C Allocated Advance**: $(30,000 / 60,000) \times 24,000 = \text{₹12,000}$
- **Total Allocated Advance**: 4,000 + 8,000 + 12,000 = **₹24,000** (Matches Advance Paid!)

### Example 2 (Consultation + 2 Packages with Advance Payment)
- **Consultation Fee**: ₹499
- **Pain Management-12**: ₹18,000 (71.43%) | **Focused Shockwave-4**: ₹7,200 (28.57%) $\rightarrow$ **Sum of Package Costs** = ₹25,200
- **Total Amount Paid**: **₹20,200**

**Allocated Advance Calculation:**
- **Consultation Revenue**: **₹499**
- **Remaining Advance Paid**: 20,200 - 499 = **₹19,701**
- **Pain Management-12 Allocated Advance**: $19,701 \times 71.43\% = \text{₹14,072.14}$
- **Focused Shockwave-4 Allocated Advance**: $19,701 \times 28.57\% = \text{₹5,628.86}$
- **Total Package Advance**: 14,072.14 + 5,628.86 = **₹19,701** (Matches Remaining Advance Paid!)


## Excel Report (13 Sheets)

1. Dashboard Summary
2. Only Consultation
3. Consultation + Package
4. Consultation + Single Session
5. Consultation + Package + SS
6. Only Package
7. Only Single Session
8. Package + Single Session
9. Doctor Summary
10. Agent Summary
11. Lead Source Summary
12. Package Summary
13. Raw Patient Summary

## Configuration

Click the ⚙️ icon to customize:
- **Consultation Keywords**: Package names containing these are classified as consultation
- **Single Session Keywords**: Package names containing these are classified as single session
- Everything else is classified as a **Package**

Settings are saved in your browser's localStorage.

## Required Excel Columns

The app auto-detects these columns (flexible matching):
- Patient Name
- Package Name
- Consulting Doctor
- Agent Name
- Lead Source
- Payment Date
- Amount Paid
- Package Cost / Total Package Cost

## Tech Stack

- **HTML5 + CSS3 + Vanilla JavaScript** (single file, no build step)
- **SheetJS (xlsx)** — Parse uploaded Excel files
- **ExcelJS** — Generate formatted Excel workbooks
- **Chart.js** — Interactive charts
- **FileSaver.js** — Browser file downloads
- **jsPDF** — PDF export

All libraries loaded via CDN. No installation required.
