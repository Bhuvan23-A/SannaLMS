# SannaLMS User Guide (customer-facing)

A complete, screenshot-based user guide for **students, trainers, college admins, and super admins** — ready to share with customers so they can test the platform themselves.

## Files

| File | What it is |
|---|---|
| `SannaLMS-User-Guide.html` | **The guide** — single self-contained file (all screenshots embedded). Open in any browser; also printable to PDF. |
| `SannaLMS-User-Guide.pdf` | The same guide as a PDF (A4), ready to email. |
| `screenshots/` | Original full-resolution PNG screenshots (70 pages). |
| `screenshots-opt/` | Optimized JPEGs embedded into the HTML/PDF. |

## How to regenerate (optional)

```bash
npm install puppeteer-core          # once
node capture.js                     # capture all admin + student screenshots from the live site
node optimize.js                    # compress PNGs -> JPEGs
node build-guide.js                 # rebuild SannaLMS-User-Guide.html
node make-pdf.js                    # rebuild SannaLMS-User-Guide.pdf
```

The capture script uses the live demo environment (`sannalms.sannainnovations.com`) with the demo accounts
(all passwords `Test@1234`):

- Super Admin: `test_superadmin`
- College Admin: `test_collegeadmin`
- Primary Trainer: `test_trainer`
- Teaching Assistant: `test_assistant`
- Student: `test_student`

> ⚠️ Screenshots contain live demo data (Green Valley University). If you show this to a
> customer, consider re-capturing against a clean demo tenant.

All five demo accounts are active against the live server and scoped to **Green Valley University**
(`test_superadmin` is platform-wide; the other four are college-scoped). The `test_trainer`/`test_assistant`
accounts are assigned as trainer/TA on Programming Fundamentals & Data Structures, and `test_student` is
enrolled in Data Structures, Programming Fundamentals & Linear Algebra — so every role has real data to
click through.
