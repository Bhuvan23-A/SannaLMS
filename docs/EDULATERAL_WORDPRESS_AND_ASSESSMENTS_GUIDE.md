# SannaLMS & Multi-Site Operations Manual

## 1. WordPress Deployment & Site Migration: `edulateral.com`

### Container Architecture & Host Details
* **Server IP**: `195.35.21.204` (Hostinger Mumbai KVM 4)
* **Directory on Server**: `/var/www/sites/edulateral/`
* **Internal Port**: `8095` (Mapped to host `http://127.0.0.1:8095`)
* **Database**: MariaDB 10.11 (`edulateral-mariadb`)
  * Database Name: `edulateral_wp`
  * Database User: `edulateral_user`
  * Database Password: `EduWP_SecurePass_2026!`
  * Root Password: `EduDB_RootPass_2026!`
* **Backup Location**: `/var/www/sites/edulateral/wp_data/wp-content/ai1wm-backups/edulateral_backup.wpress` (1.68 GB)
* **Upload Limits Configured**: `upload_max_filesize = 2048M`, `post_max_size = 2048M`, `memory_limit = 512M`

### Domain & DNS Settings
* **Domain**: `edulateral.com` & `www.edulateral.com`
* **DNS A-Record**:
  * `@` $\rightarrow$ `195.35.21.204`
  * `www` $\rightarrow$ `195.35.21.204`
* **Nginx Configuration**: `/etc/nginx/sites-available/edulateral.com` (Proxies incoming traffic to `http://127.0.0.1:8095`)
* **SSL Certificate**: Run `certbot --nginx -d edulateral.com -d www.edulateral.com` once DNS propagates.

### 1-Click Restore Steps
1. Navigate to `http://195.35.21.204:8095` (or `https://edulateral.com`).
2. Complete the initial language/title setup.
3. In WP Dashboard: Go to **All-in-One WP Migration $\rightarrow$ Backups**.
4. Click **`Restore`** on `edulateral_backup.wpress (1.68 GB)`.

---

## 2. Assessment Management: Targeting Specific Students for a Batch

When creating or editing a quiz/assessment:
1. In the **Create / Edit Quiz** form (`/assessments/quizzes`), locate **"Assign To"**:
   * **All Enrolled Students**: Assigns the test to the entire class roster for that course.
   * **Specific Students (Individual Targeting)**:
     * Checkboxes appear with every student enrolled in the course roster.
     * Select individual students (e.g. students who need a makeup test or specific section members).
2. Students who are assigned the test will see it under their **Assessments / Quizzes** tab in the Student Portal (`sannalms.sannainnovations.com`); unassigned students will not see it.

---

## 3. Course Reference Materials Management

### For Trainers / Admins (Uploading Files)
1. Go to **Courses** (`/courses`) $\rightarrow$ Click on the course.
2. Under the **Reference Materials (Resources)** section:
   * Click **`Upload Resource`**.
   * Enter a **Title** (e.g. *Lab Handbook 2026*).
   * Choose the file (PDF, PPT, DOCX, ZIP).
   * Select **Visibility**:
     * `ALL`: Visible and downloadable by both students and instructors.
     * `STUDENT_ONLY`: Learning materials for students.
     * `STAFF_ONLY`: Faculty-only documents (e.g. *Grading Rubrics, Solution Keys*) — **strictly hidden from students**.

### For Students (Accessing Files)
1. Log in to [Student Portal](https://sannalms.sannainnovations.com) $\rightarrow$ Open **My Courses**.
2. In the Course Player, scroll to the **"Course Reference Materials & Documents"** panel.
3. Click the **`Download PDF`** button to download directly with Bearer token authentication.

---

## 4. Question Bank Import (Excel, CSV, and PDF)

### Importing via Excel / CSV
1. Go to **Assessments $\rightarrow$ Questions** (`/assessments/questions`).
2. Click **`📥 CSV/Excel Template`** to download the pre-formatted spreadsheet template.
3. Fill in your questions in Excel / Google Sheets with columns:
   * `Question`, `Type` (MCQ / ESSAY / TRUE_FALSE), `Marks`, `Option A`, `Option B`, `Option C`, `Option D`, `Correct Option`, `Explanation`.
4. Click **`📊 Import Excel/CSV`** and select your file. All questions are parsed and batch-inserted instantly into your college/course question bank.

### Importing via PDF
1. In the same Question Bank page, click **`📄 Import PDF`**.
2. Select your exam question paper PDF. The parser extracts numbered questions, options, and marks into the Question Bank.

---

## 5. Editing Existing Quizzes / Assessments

1. Go to **Assessments $\rightarrow$ Quizzes** (`/assessments/quizzes`).
2. On any quiz card, click the **`✏️ Edit`** button.
3. The form pre-fills with the existing title, description, time limit, scheduled start/end dates, questions, and assigned student list.
4. Make your modifications (add/remove questions, update times, change targeting) and click **`Save Changes`**.
5. The changes update in real-time across the API and student portal without deleting existing submissions.
