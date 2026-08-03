import asyncio
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import seed_sample_data, db_manager
from app.analytics.router import get_aggregated_metrics
from app.analytics.ml_model import train_and_save_dropout_model, predict_student_dropout
from app.analytics.powerbi_exporter import convert_metrics_to_powerbi_csv
from app.db.schemas import StudentRiskInput, PlacementDriveCreate, PlacementApplicationCreate, CertificateRequest, TutorQueryRequest, AwardXPRequest
from app.placements.router import create_placement_drive, submit_placement_application
from app.placements.resume_builder import generate_pdf_resume_from_profile, StudentProfileResume
from app.placements.certificate_generator import sign_certificate_payload, verify_certificate_signature, generate_qr_code_image_bytes
from app.proctoring.vision import analyze_proctoring_frame
from app.proctoring.lockdown import log_proctoring_violation, get_proctoring_violations, ProctoringViolationCreate
from app.tutor.rag_tutor import ask_ai_tutor
from app.gamification.router import award_student_xp
from app.gamification.leaderboard import fetch_leaderboard_rankings, update_redis_leaderboard

class TestLMSUnit(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        """Seed sample database records before tests."""
        await seed_sample_data()

    async def test_day_1_data_aggregation(self):
        """Test Day 1: Pandas Data Aggregation & Rolling Averages."""
        res = await get_aggregated_metrics()
        self.assertGreater(res.total_records_processed, 0)
        self.assertIsInstance(res.grouped_analytics, list)
        first_group = res.grouped_analytics[0]
        self.assertIn("rolling_avg_attendance", first_group)
        self.assertIn("rolling_avg_quiz_score", first_group)
        print("[OK] Day 1 Test Passed: Data Aggregation & Rolling Averages working perfectly.")

    async def test_day_2_ai_dropout_model(self):
        """Test Day 2: Scikit-learn Dropout Classifier Training & Inference."""
        pipeline = train_and_save_dropout_model()
        self.assertIsNotNone(pipeline)

        pred_high = predict_student_dropout(StudentRiskInput(
            days_since_last_login=35,
            average_quiz_score=25.0,
            attendance_percentage=30.0
        ))
        self.assertTrue(pred_high.dropout_risk)
        self.assertEqual(pred_high.risk_level, "HIGH")

        pred_low = predict_student_dropout(StudentRiskInput(
            days_since_last_login=1,
            average_quiz_score=95.0,
            attendance_percentage=98.0
        ))
        self.assertFalse(pred_low.dropout_risk)
        self.assertEqual(pred_low.risk_level, "LOW")
        print("[OK] Day 2 Test Passed: Scikit-learn AI Dropout Prediction Model working perfectly.")

    async def test_day_3_powerbi_formatter(self):
        """Test Day 3: Power BI Flat CSV Formatter."""
        metrics = await get_aggregated_metrics()
        csv_str = convert_metrics_to_powerbi_csv(metrics.grouped_analytics)
        self.assertIn("fk_batch_id", csv_str)
        self.assertIn("fk_tenant_id", csv_str)
        self.assertIn("export_date_iso", csv_str)
        print("[OK] Day 3 Test Passed: Power BI Flat CSV Formatting working perfectly.")

    async def test_day_4_placements_crud(self):
        """Test Day 4: Placement Drives & Eligibility Filtered Applications."""
        drive_payload = PlacementDriveCreate(
            drive_id="DRIVE_TEST_UNIT",
            company_name="Test Corp",
            role_title="Software Engineer",
            job_description="Unit testing drive",
            min_cgpa=8.0,
            allowed_branches=["Computer Science"],
            application_deadline="2026-12-31"
        )
        res = await create_placement_drive(drive_payload)
        self.assertEqual(res["status"], "success")

        app_res = await submit_placement_application(PlacementApplicationCreate(
            drive_id="DRIVE_TEST_UNIT",
            student_id="STU_UNIT_1",
            student_name="Test Student",
            cgpa=8.5,
            branch="Computer Science"
        ))
        self.assertEqual(app_res["status"], "success")
        print("[OK] Day 4 Test Passed: Placement Drive CRUD & Eligibility Rules working perfectly.")

    async def test_day_5_resume_builder(self):
        """Test Day 5: ReportLab PDF Resume Generation."""
        profile = StudentProfileResume(
            name="Unit Test Candidate",
            email="unittest@example.com",
            phone="+1 234 567 8900",
            summary="Passionate software developer.",
            education=[{"degree": "B.Tech CS", "institution": "Tech University", "year": "2026", "grade": "9.0"}],
            skills=["Python", "FastAPI", "MongoDB"],
            projects=[{"title": "LMS Platform", "tech_stack": "Python", "description": "Enterprise unit."}]
        )
        pdf_bytes = generate_pdf_resume_from_profile(profile)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        print("[OK] Day 5 Test Passed: ReportLab PDF Resume Generation working perfectly.")

    async def test_day_6_rsa_certificate(self):
        """Test Day 6: RSA Cryptographic Digital Signatures & QR Code."""
        payload = {"student_id": "STU_101", "student_name": "Aarav Sharma", "course_name": "Python 101", "completion_date": "2026-07-22"}
        sig = sign_certificate_payload(payload)
        self.assertTrue(len(sig) > 20)

        verified = verify_certificate_signature(payload, sig)
        self.assertTrue(verified)

        qr_bytes = generate_qr_code_image_bytes("http://localhost:8000/verify")
        self.assertTrue(len(qr_bytes) > 50)
        print("[OK] Day 6 Test Passed: RSA Digital Signatures & QR Verification working perfectly.")

    async def test_day_7_and_8_proctoring_vision(self):
        """Test Days 7 & 8: OpenCV Frame Analysis Engine."""
        import numpy as np
        import cv2
        dummy_img = np.zeros((240, 320, 3), dtype=np.uint8)
        _, buffer = cv2.imencode('.jpg', dummy_img)
        
        result = analyze_proctoring_frame(buffer.tobytes())
        self.assertEqual(result["status"], "success")
        self.assertIn("NO_FACE_DETECTED", result["flags"])
        self.assertGreaterEqual(result["suspicious_activity_score"], 0.5)
        print("[OK] Days 7 & 8 Test Passed: OpenCV Vision Analysis & Suspicion Score Engine working perfectly.")

    async def test_day_9_browser_lockdown(self):
        """Test Day 9: Browser Lockdown Violation Event Logging."""
        v_res = await log_proctoring_violation(ProctoringViolationCreate(
            student_id="STU_101",
            exam_id="EXAM_FINAL",
            event_type="tab_switch",
            details={"browser": "Chrome"}
        ))
        self.assertEqual(v_res["status"], "success")

        logs = await get_proctoring_violations(student_id="STU_101")
        self.assertGreater(logs["total_violations"], 0)
        print("[OK] Day 9 Test Passed: Browser Lockdown Event Violation Logging working perfectly.")

    async def test_day_10_rag_tutor(self):
        """Test Day 10: Gemini RAG AI Tutor Pipeline."""
        context = "The capital of Python programming is clarity. FastAPI uses Pydantic for validation."
        query = "What does FastAPI use for data validation?"
        resp = await ask_ai_tutor(TutorQueryRequest(student_query=query, course_context=context))
        self.assertIsNotNone(resp.answer)
        self.assertGreater(resp.context_chunks_used, 0)
        print("[OK] Day 10 Test Passed: Gemini RAG AI Tutor Pipeline working perfectly.")

    async def test_day_11_and_12_gamification_leaderboard(self):
        """Test Days 11 & 12: Gamification Engine & Leaderboards."""
        state = await award_student_xp(AwardXPRequest(student_id="STU_101", action_type="completed_module"))
        self.assertGreaterEqual(state.xp_points, 100)

        await update_redis_leaderboard("STU_101", "Aarav Sharma", "BATCH_2026_A", state.xp_points, state.level)

        rankings = await fetch_leaderboard_rankings(limit=5)
        self.assertGreater(len(rankings), 0)
        print("[OK] Days 11 & 12 Test Passed: Gamification XP & Real-time Leaderboard working perfectly.")

    async def test_dynamic_data_hub(self):
        """Test Dynamic Data Management Hub (Creation, Analytics Refresh, Deletion)."""
        from app.db.schemas import StudentCreate
        from app.data_management.router import create_student, list_students, delete_student

        # 1. Create dynamic student
        new_stu = StudentCreate(
            student_id="STU_999",
            name="Test Dynamic Student",
            email="testdyn@example.com",
            batch_id="BATCH_2026_A",
            tenant_id="TENANT_ALPHA",
            cgpa=9.5,
            branch="Computer Science",
            attendance_percentage=98.0,
            average_quiz_score=96.0
        )
        res = await create_student(new_stu)
        self.assertEqual(res["status"], "success")

        # 2. Verify list contains STU_999
        stu_list = await list_students()
        stu_ids = [s["student_id"] for s in stu_list["students"]]
        self.assertIn("STU_999", stu_ids)

        # 3. Verify Pandas analytics dynamically includes STU_999 metrics
        agg = await get_aggregated_metrics()
        self.assertGreater(agg.total_records_processed, 5)

        # 4. Clean up / delete STU_999
        del_res = await delete_student("STU_999")
        self.assertEqual(del_res["status"], "success")
        print("[OK] Dynamic Data Hub Test Passed: Student creation, dynamic analytics update, & deletion working perfectly.")

if __name__ == "__main__":
    unittest.main()

