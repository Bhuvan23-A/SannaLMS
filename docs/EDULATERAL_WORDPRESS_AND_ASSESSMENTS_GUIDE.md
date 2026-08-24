# SannaLMS & Multi-Site Operations Manual

## 1. Dedicated Reference Materials & Documents Section (`/resources`)

### Navigation & Access
* Located in the main sidebar under **`📎 Reference Materials`** (`/resources`).
* Available to **Super Admins**, **College Admins**, **Primary Trainers**, **Teaching Assistants**, and **Students**.

### Features:
1. **Course & Subject Filtering**: Select your College and Course from the picker to view all attached documents.
2. **File Types Supported**: PDF, PowerPoint (`.ppt`, `.pptx`), Word (`.doc`, `.docx`), Excel/CSV (`.xls`, `.xlsx`, `.csv`), Archives (`.zip`, `.rar`), and Images.
3. **Audience & Visibility Controls**:
   * `🌐 All (Staff & Students)`: Publicly viewable and downloadable by everyone enrolled.
   * `🎓 Students Only`: Dedicated learning handouts and study guides.
   * `🔒 Faculty Only (Staff)`: Hidden from students; reserved for faculty rubrics and solution keys.
4. **1-Click Download**: Direct token-authenticated download.

---

## 2. Assessment Management: Targeting Specific Students & Batches (`/assessments/quizzes` & `/assessments/assignments`)

When creating or editing a quiz or assignment:
1. Under **"Assign To"**, choose **`Specific Batch / Semester / Students`**.
2. **Interactive Hierarchy Filters**:
   * **Department**: (e.g. *Computer Science and Engineering*)
   * **Branch**: (e.g. *Artificial Intelligence & Machine Learning*)
   * **Semester / Batch**: Filter by **Semester 1, Semester 2, Semester 3 ... Semester 8**
   * **Section**: Filter by *Section A, Section B*, etc.
   * **Search Box**: Instant lookup by student name or email.
3. **1-Click Batch Selection**:
   * Click **`✓ Select All Filtered (X students)`** to immediately assign the entire batch/semester!
   * Click **`✕ Deselect Filtered`** to reset.
   * Live counter shows total students selected (e.g. `👥 Selected: 45 students`).

---

## 3. Question Bank & Quiz Question Export (Excel / CSV & PDF)

### Exporting Questions to Excel / CSV
1. **From Question Bank** (`/assessments/questions`):
   * Click **`📊 Export Questions (CSV)`** at the top toolbar to download all questions as a spreadsheet (`Question, Type, Marks, Option A-D, Correct Option, Explanation`).
2. **From Any Specific Quiz** (`/assessments/quizzes`):
   * Click **`📊 Export Questions (CSV)`** on any quiz card to download only the questions included in that quiz.
3. **Exporting Quiz Submissions**:
   * Click **`Export Submissions (CSV)`** to download student test marks, completion times, and integrity/tab-switch violation flags.

### Importing Questions (Excel, CSV, and PDF)
* **`📥 CSV/Excel Template`**: Download pre-formatted spreadsheet template.
* **`📊 Import Excel/CSV`**: Upload filled spreadsheet to batch-insert questions.
* **`📄 Import PDF`**: Auto-extract questions from question paper PDFs.

---

## 4. Editing Assessments & Timing Changes

1. **Quizzes & Tests** (`/assessments/quizzes`):
   * Every quiz card features a **`✏️ Edit`** button.
   * Modifies: **Title, Description, Duration (mins), Start Time (Opens At), End Time (Closes At), Question Associations, and Batch/Student Targeting**.
2. **Assignments** (`/assessments/assignments`):
   * Every assignment card features a **`✏️ Edit`** button.
   * Modifies: **Title, Description, Due Date/Time, Max Marks, and Assigned Students**.
3. **Question Bank** (`/assessments/questions`):
   * Every question card features a **`✏️ Edit`** button.
   * Modifies: **Title, Options, Correct Answer, Explanation, Marks, and Diagrams**.

---

## 5. WordPress Deployment & Site Migration: `edulateral.com`

* **Server IP**: `195.35.21.204` (Hostinger Mumbai)
* **Directory on Server**: `/var/www/sites/edulateral/`
* **Internal Port**: `8095` (Mapped to host `http://127.0.0.1:8095`)
* **Database**: MariaDB 10.11 (`edulateral-mariadb`)
* **Backup File**: `/var/www/sites/edulateral/wp_data/wp-content/ai1wm-backups/edulateral_backup.wpress` (1.68 GB)
* **DNS Setting Required**:
  - In **GoDaddy / Hostinger Domains**: Set A-record `@` $\rightarrow$ `195.35.21.204` and `www` $\rightarrow$ `195.35.21.204`. (Remove default parking A & AAAA records).
