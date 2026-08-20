# Technical Context & Complete Logic Blueprint: Daily Collection Report Analyzer (`index.html`)

---

## 📌 1. Executive Architecture & UI System

`index.html` is a high-performance Single-Page Application (SPA) designed for **My Pain Clinic (MPC)** to analyze clinical collection data, compute patient conversion journeys, calculate doctor performance incentives, conduct automated data integrity audits, and export multi-sheet Excel workbooks.

### Tech Stack & Core Dependencies
| Technology / Library | Version | Purpose |
|---|---|---|
| **Inter Typography** | Google Fonts | Primary UI font system |
| **SheetJS (`xlsx.full.min.js`)** | `0.18.5` | Client-side parsing of uploaded `.xlsx` / `.xls` binary files |
| **ExcelJS (`exceljs.min.js`)** | `4.4.0` | Building formatted multi-tab Excel workbooks with custom styles, headers, and totals |
| **Chart.js (`chart.umd.min.js`)** | `4.4.0` | Rendering interactive Doughnut, Bar, Horizontal Bar, and Dual-Axis Line charts |
| **FileSaver.js (`FileSaver.min.js`)** | `2.0.5` | Blob download management for client-side generated files |
| **jsPDF & AutoTable** | `2.5.1` / `3.8.1` | Generating PDF executive summaries |
| **AI Audit Engine (Gemini / Groq)** | REST API | Executive narrative insights and interactive Q&A |

### Theme System (Dark / Light Mode)
Theme state is managed dynamically via the `data-theme` attribute on the `<html>` element (`light` or `dark`). CSS Custom Variables define backgrounds, borders, glassmorphic cards, text colors, and chart color defaults.

---

## 🔄 2. Complete Application Lifecycle & Workflow Architecture

```mermaid
flowchart TD
    A[Page Initialization: DOMContentLoaded] --> B[loadConfig & initTheme]
    B --> C{Data Source Input}
    C -->|Excel Upload| D[parseExcel - SheetJS Binary Reader]
    C -->|Live API Sync| E[fetchLiveCollectionData - REST Endpoint]
    D --> F[detectColumns - Dynamic Header Pattern Matching]
    E --> F
    F --> G[Row Normalization - parseDate, parseNumber, cleanLeadSource]
    G --> H[groupPatients - Pass 1: Raw Patient Grouping]
    H --> I[groupPatients - Pass 2: Chronological Per-Date Allocation & Contract Propagation]
    I --> J[groupPatients - Pass 3: Package Stage, Renewal & EMR Scaling]
    J --> K[computeMetrics - Overall KPIs & Doctor Incentive Leaderboard]
    K --> L[renderDashboard - KPIs, Cards, Charts, Tables]
    L --> M[runDataIntegrityAudit - 11 Automated Math Integrity Checks]
    M --> N[renderAuditResults - AI Watchdog Bar]
```

### Lifecycle Execution Steps:
1. **Initialization (`DOMContentLoaded`)**:
   - `loadConfig()`: Loads user-configured keywords from `localStorage` (key: `mpc_report_config`), falling back to default consultation and single session keywords.
   - `initTheme()`: Sets theme based on `localStorage` (key: `mpc_theme`, default `light`).
2. **File Ingestion (`parseExcel`)**:
   - Reads ArrayBuffer from dropped/selected file via `FileReader`.
   - Uses SheetJS to inspect sheet 0.
   - **Header Auto-Discovery**: Scans top 10 rows for the first row containing $\ge 3$ non-empty cells to use as the header row.
3. **Column Detection (`detectColumns`)**:
   - Matches header column labels against regex patterns in `COLUMN_PATTERNS`.
4. **Data Normalization & Classification**:
   - Parses dates (`parseDate`), numbers (`parseNumber`), and lead sources (`cleanLeadSource`).
   - Classifies each row into `consultation`, `single_session`, or `package` via `classifyService`.
5. **Multi-Pass Patient Grouping (`groupPatients`)**:
   - Runs 3 distinct passes to group raw rows, allocate advance payments, track package renewal sequences, and determine patient statuses.
6. **KPI & Leaderboard Computation (`computeMetrics`)**:
   - Computes overall clinical metrics, Doctor Leaderboard, Agent performance, Lead Source efficiency, and time-series trends.
7. **UI Rendering (`renderDashboard`)**:
   - Populates metric cards, status category cards, Doctor Leaderboard, 9-tab patient data tables, 7 Chart.js charts, and analytics summaries.
8. **Automated Audit (`runDataIntegrityAudit`)**:
   - Executes 11 mathematical audit algorithms and renders pass/warning/error badges on the AI Watchdog bar.

---

## 🔍 3. Data Parsing & Normalization Specification

### 3.1 Column Pattern Matcher (`COLUMN_PATTERNS` & `detectColumns`)
The system dynamically maps EMR column headers using regular expressions:

```javascript
const COLUMN_PATTERNS = {
  patientName:      [/patient\s*name/i, /patient/i, /^name$/i],
  patientId:        [/patient\s*id/i, /pat.*id/i, /^id$/i],
  packageName:      [/package\s*name/i, /package/i, /service/i],
  doctor:           [/consult.*doctor/i, /doctor/i, /^dr$/i, /physician/i],
  agent:            [/agent\s*name/i, /agent/i, /counsellor/i, /counselor/i],
  leadSource:       [/lead\s*source/i, /source/i],
  paymentDate:      [/payment\s*date/i, /date/i, /created\s*at/i],
  packageCost:      [/package\s*cost/i],
  amountPaid:       [/amount\s*paid/i, /amount/i, /paid/i, /collection/i],
  totalPackageCost: [/total\s*package\s*cost/i, /total\s*cost/i, /total\s*amount/i],
  paymentMode:      [/payment\s*mode/i, /mode/i, /payment\s*method/i],
  invoiceNo:        [/invoice\s*no/i, /invoice\s*number/i, /bill\s*no/i, /invoice/i],
  userplanId:       [/userplan\s*id/i, /user\s*plan\s*id/i, /plan\s*id/i],
  cartId:           [/cart\s*id/i]
};
```

### 3.2 Date Parsing Engine (`parseDate`)
- Accepts `Date` objects, ISO strings (`YYYY-MM-DDTHH:mm:ss`), Indian date strings (`DD-MM-YYYY`, `DD/MM/YYYY`), and hyphenated/slashed variations.
- Correctly parses 4-digit years vs 2-digit years and extracts hours, minutes, and seconds.

### 3.3 Lead Source Cleaner (`cleanLeadSource`)
- Sanitizes lead source text and extracts platform names from embedded Facebook/Instagram ad JSON payloads (e.g. `{"publisher_platform":"instagram", ...}`).
- Standardizes platforms to: `Instagram`, `Facebook`, `Google`, `YouTube`, `WhatsApp`, `Digital Ad`, or raw headline/campaign strings.

---

## 🏷️ 4. Service Classification & Master Price Registry

### 4.1 Master Services Price Registry (`SERVICES_MASTER_PRICE_LIST`)
Contains 28 official clinical services with keywords, single-session price, and package cost per session:

| Service Name | Key Search Keywords | Single Session Price | Package Price/Session |
|---|---|---|---|
| **Consultation** | `consultation`, `consult` | ₹499 | ₹499 |
| **Women's Health Consultation** | `women's health consultation` | ₹1,500 | ₹1,500 |
| **Foot Insoles** | `foot insole`, `insoles` | ₹2,360 | ₹2,360 |
| **Home Visit** | `home visit` | ₹2,500 | ₹2,500 |
| **Online Consultation** | `online consultation` | ₹2,000 | ₹2,000 |
| **HBOT (Soft Shell)** | `hbot soft`, `soft shell` | ₹2,000 | ₹1,500 |
| **HBOT (Hard Shell)** | `hbot hard`, `hard shell` | ₹2,000 | ₹1,500 |
| **EMS Training** | `ems`, `ems training` | ₹1,800 | ₹1,500 |
| **Focused Shockwave Therapy** | `focused shockwave` | ₹2,000 | ₹1,800 |
| **Ice Bath** | `ice bath` | ₹2,000 | ₹1,500 |
| **Couple Ice Bath** | `couple ice bath` | ₹2,500 | ₹2,500 |
| **Cryotherapy** | `cryotherapy`, `cryo` | ₹2,500 | ₹2,250 |
| **Basic Physiotherapy (BMSK)**| `bmsk`, `basic physio` | ₹1,000 | ₹800 |
| **Advance Physio (AMSK)** | `amsk`, `advance physio` | ₹1,800 | ₹1,500 |
| **Robotic Spine Aligner** | `robotic spine`, `aligner` | ₹2,000 | ₹1,800 |
| **Spine Decompression** | `spine decompression` | ₹1,800 | ₹1,500 |
| **Pilates** | `pilates` | ₹1,000 | ₹800 |
| **Prism** | `prism` | ₹500 | ₹500 |

### 4.2 Classification Logic (`classifyService`)

Every row is evaluated in order through 6 rules:

```javascript
function classifyService(packageName, amountPaid, totalPackageCost) {
  if (!packageName) return 'unknown';
  const lower = packageName.toLowerCase().trim();

  // Rule 0: Foot Insoles product -> single_session
  if (lower.includes('foot insole') || lower.includes('insole')) return 'single_session';

  // Rule 1: Multi-session package pattern (e.g. -3, -4, -6, -12) -> package
  if (/[-_\s]([2-9]|\d{2,})\b/.test(lower) && !lower.includes('ss')) return 'package';

  // Rule 2: Single session explicit tags (-ss, ss-1, single session) -> single_session
  if (lower.includes('-ss') || lower.includes('ss-1') || lower.includes('single session')) return 'single_session';

  // Rule 3: Default Top Up / NA with ₹499 or ₹1500 amount -> consultation; else package
  if (lower === 'default top up' || lower === 'n/a' || lower === '') {
    const amt = Math.round(amountPaid || 0);
    const cost = Math.round(totalPackageCost || 0);
    if (amt === 499 || amt === 1500 || cost === 499 || cost === 1500) return 'consultation';
    return 'package';
  }

  // Rule 4: Consultation Keywords Check
  for (const kw of config.consultationKeywords) {
    if (lower.includes(kw.toLowerCase())) return 'consultation';
  }

  // Rule 5: Single Session Keywords Check
  for (const kw of config.singleSessionKeywords) {
    if (lower.includes(kw.toLowerCase())) return 'single_session';
  }

  // Default fallback
  return 'package';
}
```

---

## 🧮 5. Deep-Dive Multi-Pass Patient Grouping & Allocation Algorithm (`groupPatients`)

### 5.1 Pass 1: Raw Row Grouping
Groups raw invoice records into a dictionary keyed by `patientId` (or `patientName`). Tracks global patient flags (`hasConsultation`, `hasPackage`, `hasSingleSession`, sets of `doctors`, `agents`, `leadSources`).

---

### 5.2 Pass 2: Chronological Per-Date Allocation & Contract Propagation

#### **1. Contract Cost & Metadata Propagation**
- **Date Contract Propagation (`totalPackageCost` / Col 7)**: If a patient has multiple package rows on the same payment date, and one row has an explicit `totalPackageCost` (Col 7), that contract total is propagated to all package rows for that date.
- **Invoice Number & Payment Mode Propagation**: Propagates `invoiceNo` and `paymentMode` across package rows within the same cart/transaction.

#### **2. Per-Date Revenue Allocation Steps**
For each payment date `dateKey`:

- **Step 1: Consultation Allocation**:
  Deducts exact consultation fee (₹499 or ₹1,500) from `dateTotalPaid`:
  $$\text{Consultation Allocated} = \min(\text{Consultation Fee}, \text{Date Total Paid})$$
  $$\text{Remaining Date Paid} = \text{Date Total Paid} - \text{Consultation Allocated}$$

- **Step 2: Single Session Allocation**:
  Deducts single-session price from `Remaining Date Paid`:
  $$\text{Single Session Allocated} = \min(\text{Single Session Price}, \text{Remaining Date Paid})$$
  $$\text{Remaining Date Paid} = \text{Remaining Date Paid} - \text{Single Session Allocated}$$

- **Step 3: Package Advance Payment Allocation**:
  Allocates `Remaining Date Paid` to treatment packages:
  - **Zero-Paid Bundle Rows Case**: If any package row has `amountPaid == 0`, distribute `Remaining Date Paid` **proportionally** based on sticker `packageCost`:
    $$\text{Proportional Paid}_i = \left( \frac{\text{Package Cost}_i}{\sum \text{Package Cost}} \right) \times \text{Remaining Date Paid}$$
  - **Explicit Amount Paid Case**: Allocate `min(amountPaid, dateRemaining)`.

- **Step 4: Multi-Package Quantity Factor (`dateQtyFactor`)**:
  If invoice package contract total $\ge 1.95 \times$ sticker total, `dateQtyFactor = Math.round(invoicePackageTotal / stickerTotal)`.

#### **3. Category-Based Renewal & Installment Identification Algorithm**
Sorts all package rows chronologically ascending:
- Maintains running `categoryCostSum[cat]` and `categoryPaidSum[cat]` per package category (`Pain Management`, `Wellness`, `Robotic Spine`, `BMSK`).
- **Installment Payment Condition**:
  If $\text{categoryPaidSum}[cat] < \text{categoryCostSum}[cat] - 0.01$:
  - Row is marked as an **installment payment** (`isInstallment = true`).
  - Keeps the `purchaseId` and `isRenewal` flag of the active purchase.
- **New Purchase / Renewal Condition**:
  Else:
  - Row is a new package purchase (`isInstallment = false`).
  - If patient has consultation (`p.hasConsultation`), purchase date is after 1st package date, AND package category matches initial category $\Rightarrow$ Tagged as **Renewal** (`isRenewal = true`).

---

### 5.3 Pass 3: Aggregation, EMR Bundle Scaling, & Final Status

#### **1. EMR Bundle Total Scaling**
If EMR bundle total (`bundleTotalFromExcel` / Col 7) is less than the sum of sticker package costs (`stickerTotal`):
$$\text{bundleScaleFactor} = \frac{\text{bundleTotalFromExcel}}{\text{stickerTotal}}$$
$$\text{Effective Package Value} = \text{Package Cost} \times \text{bundleScaleFactor}$$

#### **2. Total Package Value Calculation**
$$\text{totalPackageValue} = \text{initialBundleVal} + \text{renewalBundleVal}$$

#### **3. Patient Status Determination Matrix (`determineStatus`)**

| Consultation? | Package? | Single Session? | Final Status Label |
|:---:|:---:|:---:|---|
| Yes | Yes | Yes | `Consultation + Package + Single Session` |
| Yes | Yes | No | `Consultation + Package` |
| Yes | No | Yes | `Consultation + Single Session` |
| Yes | No | No | `Only Consultation` |
| No | Yes | Yes | `Package + Single Session` |
| No | Yes | No | `Only Package` |
| No | No | Yes | `Only Single Session` |

---

## 🏆 6. Metrics & Doctor Incentive Leaderboard Logic (`computeMetrics`)

### 6.1 Revenue & Patient Metrics
- **Total Patients**: Total unique patient count.
- **Consultation Patients**: Patients with `hasConsultation == true`.
- **Conversion Rate %**:
  $$\text{Conversion Rate \%} = \frac{\text{Converted Patients (Consult + Pkg)}}{\text{Total Consultation Patients}} \times 100$$
- **Revenue Categories**: `totalRevenue`, `consultationRevenue`, `packageRevenue`, `ssRevenue`, `renewalTotalRevenue`.

### 6.2 Doctor Incentive Ranking & Pain Management Conversion Algorithm
To prevent double-counting renewals, **ONLY initial package conversions (1st package after consult)** count toward Doctor Incentive rankings:

- **Doctor Consultations**: Patients who consulted with Doctor X (`p.hasConsultation == true`).
- **Doctor Converted Patients**: Consulted patients who purchased an **Initial Treatment Package** (`!isRenewal`).
- **Pain Management Converted Patients**: Converted patients whose initial package was a **Pain Management Package** (e.g. PM-12, PM-6).
- **Doctor Pain Management Conversion Rate %**:
  $$\text{Doctor PM Conv \%} = \min\left(100, \frac{\text{Pain Mgmt Converted Patients}}{\text{Doctor Consultations}} \times 100\right)$$

#### Doctor Ranking & Badge System:
Doctors are sorted by `painMgmtCount` descending, then `painMgmtRevenue` descending:
- **Rank 1**: `🥇 1st` $\rightarrow$ Badge: `⭐ Top Converter` (`badge-emerald`)
- **Rank 2 & 3**: `🥈 2nd`, `🥉 3rd` $\rightarrow$ Badge: `🔥 High Performer` (`badge-purple`)
- **Rank 4+**: `#N` $\rightarrow$ Badge: `👍 Contributor` (`badge-cyan`)

---

## 🛡️ 7. AI Watchdog Data Integrity Audit Engine (`runDataIntegrityAudit`)

The watchdog executes 11 mathematical audit algorithms to ensure 100% data integrity:

```mermaid
flowchart LR
    A[Run Audit] --> B1[1. Revenue Match]
    A --> B2[2. Consult Allocation]
    A --> B3[3. Package Allocation]
    A --> B4[4. SS Allocation]
    A --> B5[5. Zero/Negative Payments]
    A --> B6[6. Unmapped Services]
    A --> B7[7. Overpayment Check]
    A --> B8[8. Duplicate Names]
    A --> B9[9. Status Sum Match]
    A --> B10[10. Renewal Sequence]
    A --> B11[11. Ordinal Sequence]
```

### Audit Specifications:
1. **Total Revenue Verification**:
   Validates if $| \text{totalPaid} - (\text{consultationRev} + \text{packageRev} + \text{ssRev}) | < 0.01$.
2. **Consultation Revenue Audit**:
   Ensures consultation revenue matches expected fee sum.
3. **Package Revenue Audit**:
   Verifies treatment package proportional allocations.
4. **Single Session Revenue Audit**:
   Verifies standalone session allocations.
5. **Zero / Negative Payment Check**:
   Identifies collection rows where `amountPaid <= 0`.
6. **Unmapped Service Classification Check**:
   Flags packages returning `classifyService == 'unknown'`.
7. **Package Value Overpayment Check**:
   Flags records where `proportionalPaid > packageCost * 1.5`.
8. **Duplicate Patient Name Detection**:
   Identifies potential duplicate patient records via normalized names (`trim().toLowerCase()`).
9. **Status Count Sum Verification**:
   Verifies $\sum \text{statusCounts} == \text{totalPatients}$.
10. **Renewal Sequence Audit**:
    Flags patients with `isRenewal == true` but no initial package record.
11. **Package Renewal Ordinal Sequence Audit**:
    Validates package ordinal sequences (e.g. 1st $\to$ 2nd $\to$ 3rd) to ensure installment splitting did not cause ordinal jumps.

---

## ⚡ 8. Live Database Connection & Duplication Blueprint

To replace manual Excel uploading with a live API feed (Google Apps Script Web App, Supabase, Vercel Serverless API, or PostgreSQL Endpoint), add this function:

```javascript
const LIVE_COLLECTION_API_URL = 'YOUR_LIVE_DATABASE_API_URL_HERE';

async function fetchLiveCollectionData() {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  if (loadingOverlay) loadingOverlay.classList.add('show');
  if (loadingText) loadingText.textContent = 'Syncing Live Collection Database...';

  try {
    const response = await fetch(LIVE_COLLECTION_API_URL, { cache: 'no-store' });
    const json = await response.json();
    const rows = Array.isArray(json) ? json : (json.data || []);

    if (rows.length === 0) {
      throw new Error('No records returned from live database API');
    }

    const sampleKeys = Object.keys(rows[0]);
    columnMap = detectColumns(sampleKeys);

    rawRows = rows.map(r => ({
      patientName:      String(r.patientName || r['Patient Name'] || r.patient_name || '').trim(),
      patientId:        String(r.patientId || r['Patient ID'] || r.patient_id || '').trim(),
      packageName:      String(r.packageName || r['Package Name'] || r.package_name || r.service || '').trim(),
      doctor:           String(r.doctor || r['Consulting Doctor'] || r.doctor_name || '').trim(),
      agent:            String(r.agent || r['Agent Name'] || r.agent_name || '').trim(),
      leadSource:       cleanLeadSource(r.leadSource || r['Lead Source'] || r.source),
      paymentDate:      parseDate(r.paymentDate || r['Payment Date'] || r.created_at || r.date),
      packageCost:      parseNumber(r.packageCost || r['Package Cost']),
      amountPaid:       parseNumber(r.amountPaid || r['Amount Paid'] || r.amount),
      totalPackageCost: parseNumber(r.totalPackageCost || r['Total Package Cost']),
      paymentMode:      String(r.paymentMode || r['Payment Mode'] || '').trim(),
      invoiceNo:        String(r.invoiceNo || r['Invoice No'] || '').trim(),
      userplanId:       String(r.userplanId || r['Userplan ID'] || '').trim(),
      cartId:           String(r.cartId || r['Cart ID'] || '').trim()
    })).filter(r => r.patientName !== '');

    allPatients = groupPatients(rawRows);
    filteredPatients = allPatients;
    currentMetrics = computeMetrics(filteredPatients);

    populateFilters();
    renderDashboard(currentMetrics, filteredPatients);

    const auditResults = runDataIntegrityAudit(currentMetrics, filteredPatients);
    renderAuditResults(auditResults);

    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('dash-file-name').textContent = 'Live Database Sync';
    document.getElementById('dash-row-count').textContent = `${rawRows.length} collection records`;

    showToast(`Live database connected: ${rawRows.length} records loaded`, 'success');

  } catch (err) {
    console.error('Error fetching live collection data:', err);
    showToast('Failed to load live database: ' + err.message, 'error');
  } finally {
    if (loadingOverlay) loadingOverlay.classList.remove('show');
  }
}
```

---

## 🎯 9. Summary of Repository Modules

* **`index.html`**: Daily Collection Report Analyzer & Conversion Intelligence Dashboard.
* **`calling_analyzer.html`**: Master Calling Operations & Lead Dialing Intelligence Dashboard.
* **`appointment_analyzer.html`**: Patient Appointment Schedule & Attendance Analyzer.
* **`api/leads.js`**: Vercel Serverless Proxy endpoint for CORS-free Google Apps Script database fetching.
* **`context.md`**: Complete technical documentation & logic blueprint specification.
