# 🏛️ Zenith Institute of Technology — Manual Testing Playbook

## 🌐 URLs & Logins
- **Admin Portal**: [https://admin.sannalms.sannainnovations.com](https://admin.sannalms.sannainnovations.com)
- **Student Portal**: [https://sannalms.sannainnovations.com](https://sannalms.sannainnovations.com)

| Role | Email / Username | Password | Purpose |
|---|---|---|---|
| **Super Admin** | `superadmin` | `Admin@123` | Platform oversight & tenant management |
| **College Admin** | `admin@zenith.edu` | `Test@1234` | College operations, promotions & curriculum |
| **Primary Trainer / Professor** | `zenith.ai.trainer@zenith.edu` | `Test@1234` | Course builder, assessments & batch certificates |
| **Teaching Assistant** | `zenith.ai.ta@zenith.edu` | `Test@1234` | Attendance & assignment grading |
| **Student 1 (Sem 1)** | `zn2026.ai.001@zenith.edu` | `Test@1234` | Taking quizzes, downloading materials, progress |
| **Student 2 (Sem 1)** | `zn2026.ai.002@zenith.edu` | `Test@1234` | Taking quizzes, attending sessions |
| **Student 3 (Sem 3)** | `zn2026.ai.003@zenith.edu` | `Test@1234` | Sem 3 cohort testing |

---

## 🎯 Step-by-Step Feature Test Matrix

### 1. 🎓 Batch Certificate Issuance (Dynamic Grade & CGPA Preview)
1. Log in to [Admin Portal](https://admin.sannalms.sannainnovations.com) as `admin@zenith.edu` (or `zenith.ai.trainer@zenith.edu`).
2. Navigate to **Certificates** (`/certificates`).
3. Click **`Batch Issue Certificates`**.
4. In the Course dropdown, select: **`Introduction to AI & Python`**.
5. **Notice**: The preview table instantly pulls the calculated grades from the Gradebook:
   - `Reyansh Kapoor` $\rightarrow$ **Grade A+**, **CGPA 3.95**
   - `Ananya Iyer` $\rightarrow$ **Grade A**, **CGPA 3.80**
6. Select students and click **`Issue Certificates for 2 Students`**.
7. Log in as `zn2026.ai.001@zenith.edu` on [Student Portal](https://sannalms.sannainnovations.com) to view the issued certificate and click the public verification link!

---

### 2. 📊 Downloadable Reports (CSV)
1. Log in to [Admin Portal](https://admin.sannalms.sannainnovations.com) as `admin@zenith.edu`.
2. Go to **Assessments $\rightarrow$ Gradebook** (`/assessments/gradebook`).
3. Select **`Introduction to AI & Python`**.
4. Click **`Export CSV`**. The file `gradebook-<id>.csv` will download immediately with student IDs, total marks, letter grades, and CGPA.
5. Go to **Assessments $\rightarrow$ Quizzes** (`/assessments/quizzes`) and click **`Export CSV`** on any quiz to download the submission and malpractice audit report!

---

### 3. 📂 Course Reference Materials (Download Stream)
1. Log in as `zn2026.ai.001@zenith.edu` on [Student Portal](https://sannalms.sannainnovations.com) (or Admin Portal).
2. Go to **Courses $\rightarrow$ Introduction to AI & Python $\rightarrow$ Resources**.
3. Click **Download** on `Zenith AI & NumPy Laboratory Handbook`. The PDF binary stream will download cleanly to your browser.

---

### 4. 👁️ Reference Material Visibility Scoping (`STAFF_ONLY` vs `ALL`)
1. While logged in as `zenith.ai.trainer@zenith.edu` (Trainer), navigate to **Introduction to AI & Python Resources**:
   - You will see BOTH:
     - `Zenith AI & NumPy Laboratory Handbook` (Badge: `ALL`)
     - `Confidential Faculty Grading Rubric & Solution Key` (Badge: `STAFF_ONLY`)
2. Log in as student `zn2026.ai.001@zenith.edu`:
   - The student **ONLY sees** the `ALL` handbook. The `STAFF_ONLY` solution key is strictly hidden!

---

### 5. 📱 Mobile Device Detection & Exam Proctoring
1. Log in as `zn2026.ai.001@zenith.edu` and open **Quizzes $\rightarrow$ Python & NumPy Mastery Quiz**.
2. If camera/screen detection or tab switching triggers during the exam, proctoring events (`MOBILE_DEVICE_DETECTED`, `TAB_SWITCH`) are recorded in the submission payload.
3. Log in as `zenith.ai.trainer@zenith.edu`, open the quiz submissions modal: you will see the full audit trail with violation count and auto-submission flags.

---

### 6. ⏱️ Assessment Scheduling (Active vs Expired vs Upcoming)
1. Open **Assessments $\rightarrow$ Quizzes**:
   - **`Python & NumPy Mastery Quiz`**: Open & active $\rightarrow$ Students can start and take the test.
   - **`Diagnostic Pre-Assessment (Closed)`**: Expired timeline $\rightarrow$ Clicking take/submit enforces `"This quiz has ended"`.
   - **`Midterm Examination (Scheduled Next Week)`**: Upcoming timeline $\rightarrow$ Shows scheduled opening date and blocks premature attempts.

---

### 7. 📈 Student Activity Tracking (Video & Topic Progress)
1. Log in as `zn2026.ai.001@zenith.edu` on the Student Portal.
2. Open **Course Viewer $\rightarrow$ Introduction to AI & Python**.
3. Mark Topic 1.1 as **Completed** and watch Topic 1.2 (video).
4. Notice the real-time progress bar updating dynamically (`66.7%` completion).

---

### 8. 📍 Attendance Auto-Detection (GPS, QR & Live Class)
1. Log in as `admin@zenith.edu` or `zenith.ai.trainer@zenith.edu` $\rightarrow$ **Attendance** (`/attendance`).
2. View the active session **`AI & Vector Computing Practical Lab`**:
   - Location: `Zenith Computing Center - Lab 402`
   - GPS Geofence: `12.9716, 77.5946` (Radius: `500m`)
   - Click **Display QR Code** for students to scan.
3. Student check-in via Live Class or mobile GPS will auto-verify coordinates against the 500m geofence radius.

---

### 9. 🎓 Semester Promotions (Sem 1 $\rightarrow$ Sem 2)
1. Log in as `admin@zenith.edu` $\rightarrow$ **Semesters** (`/semesters`).
2. Find **Semester 1 (B.Tech AI & Data Science)** and click **`🎓 Promote`**.
3. The promotion modal will display:
   - **Students to Promote**: 2 (`Reyansh Kapoor`, `Ananya Iyer`)
   - **Source Courses**: 3 (*Intro to AI*, *Calculus*, *Communication*)
   - **Target Courses**: 3 (*Machine Learning Foundations (Sem 2)*, *Discrete Math (Sem 2)*, *Technical Writing (Sem 2)*)
4. Click **Promote 2 students** to promote the cohort to Semester 2!
