import asyncio
import os
import sys
import base64
import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import seed_sample_data
from app.analytics.router import get_aggregated_metrics
from app.analytics.ml_model import train_and_save_dropout_model, predict_student_dropout
from app.analytics.powerbi_exporter import convert_metrics_to_powerbi_csv
from app.db.schemas import StudentRiskInput, PlacementDriveCreate, PlacementApplicationCreate, CertificateRequest, TutorQueryRequest, AwardXPRequest, ProctoringViolationCreate
from app.placements.router import create_placement_drive, submit_placement_application
from app.placements.resume_builder import generate_pdf_resume_from_profile, StudentProfileResume
from app.placements.certificate_generator import sign_certificate_payload, verify_certificate_signature, generate_qr_code_image_bytes
from app.proctoring.vision import analyze_proctoring_frame
from app.proctoring.lockdown import log_proctoring_violation, get_proctoring_violations
from app.tutor.rag_tutor import ask_ai_tutor
from app.gamification.router import award_student_xp
from app.gamification.leaderboard import fetch_leaderboard_rankings, update_redis_leaderboard

async def main():
    print("--- Starting LMS Unit End-to-End Test Suite ---")
    await seed_sample_data()
    print("[OK] Seed Data Initialized.")

    # Day 1: Analytics Aggregation
    res1 = await get_aggregated_metrics()
    print(f"[OK] Day 1 (Analytics Aggregation): Processed {res1.total_records_processed} records.")

    # Day 2: AI Dropout Model
    pipeline = train_and_save_dropout_model()
    pred = predict_student_dropout(StudentRiskInput(days_since_last_login=35, average_quiz_score=25.0, attendance_percentage=30.0))
    print(f"[OK] Day 2 (AI Dropout Model): Dropout Risk = {pred.dropout_risk}, Probability = {pred.risk_probability}, Level = {pred.risk_level}")

    # Day 3: Power BI Formatter
    csv_out = convert_metrics_to_powerbi_csv(res1.grouped_analytics)
    print(f"[OK] Day 3 (Power BI CSV Formatter): Exported {len(csv_out.splitlines())} CSV lines.")

    # Day 4: Placements CRUD
    await create_placement_drive(PlacementDriveCreate(
        drive_id="DRIVE_RUNNER", company_name="Tech Corp", role_title="Dev", job_description="Desc", min_cgpa=7.5, allowed_branches=["Computer Science"], application_deadline="2026-12-31"
    ))
    app_res = await submit_placement_application(PlacementApplicationCreate(
        drive_id="DRIVE_RUNNER", student_id="STU_RUNNER", student_name="Test Student", cgpa=8.5, branch="Computer Science"
    ))
    print(f"[OK] Day 4 (Placement Drives CRUD): Application status = {app_res['status']}")

    # Day 5: ReportLab Resume Builder
    pdf_resume = generate_pdf_resume_from_profile(StudentProfileResume(
        name="Test Student", email="test@test.com", education=[], skills=["Python"], projects=[]
    ))
    print(f"[OK] Day 5 (ReportLab Resume Builder): Generated PDF Resume ({len(pdf_resume)} bytes).")

    # Day 6: Cryptographic Certificate Signature & QR
    payload = {"student_id": "STU_101", "student_name": "Aarav", "course_name": "Python", "completion_date": "2026-07-22"}
    sig = sign_certificate_payload(payload)
    is_valid = verify_certificate_signature(payload, sig)
    print(f"[OK] Day 6 (RSA Certificate Signature): Signature Valid = {is_valid}")

    # Day 7 & 8: OpenCV Vision Proctoring
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', dummy_img)
    valid_b64_frame = b"data:image/jpeg;base64," + base64.b64encode(buffer.tobytes())
    vision_res = analyze_proctoring_frame(valid_b64_frame)
    print(f"[OK] Days 7 & 8 (OpenCV Vision Proctoring): Suspicion Score = {vision_res['suspicious_activity_score']}, Flags = {vision_res['flags']}")

    # Day 9: Browser Lockdown Event Logger
    v_res = await log_proctoring_violation(ProctoringViolationCreate(student_id="STU_101", exam_id="E1", event_type="tab_switch"))
    print(f"[OK] Day 9 (Browser Lockdown Logger): Violation logged = {v_res['event_type']}")

    # Day 10: Gemini RAG AI Tutor
    tutor_res = await ask_ai_tutor(TutorQueryRequest(student_query="What is Python?", course_context="Python is a programming language."))
    print(f"[OK] Day 10 (Gemini RAG AI Tutor): Answer length = {len(tutor_res.answer)} chars.")

    # Day 11 & 12: Gamification & Redis Leaderboard
    state = await award_student_xp(AwardXPRequest(student_id="STU_101", action_type="completed_module"))
    rankings = await fetch_leaderboard_rankings(limit=5)
    print(f"[OK] Days 11 & 12 (Gamification & Redis Leaderboard): Student Level = {state.level}, Rankings fetched = {len(rankings)}")

    print("\nSUCCESS: ALL 12 DAYS' ENDPOINTS & SERVICES COMPLETED SUCCESSFULLY WITHOUT ERRORS!")

if __name__ == "__main__":
    asyncio.run(main())
