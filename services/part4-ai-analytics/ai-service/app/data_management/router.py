from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from app.db.database import db_manager, seed_sample_data
from app.db.schemas import (
    StudentCreate, AttendanceRecordCreate, QuizScoreCreate,
    CourseCompletionCreate
)

router = APIRouter(prefix="/api/data", tags=["Dynamic Data Management Hub"])

@router.post("/students", status_code=201)
async def create_student(student: StudentCreate):
    """
    Dynamically register a new student record into the system.
    Automatically generates matching initial attendance, quiz score, and completion records
    to ensure instant end-to-end integration with Pandas Analytics & ML models.
    """
    student_dict = student.model_dump()
    student_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    student_id = student.student_id

    # Create matching relational records for Pandas aggregations
    attendance_entry = {
        "student_id": student_id,
        "batch_id": student.batch_id,
        "tenant_id": student.tenant_id,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "status": "present" if student.attendance_percentage >= 75.0 else "absent",
        "attendance_pct": student.attendance_percentage
    }
    quiz_entry = {
        "student_id": student_id,
        "batch_id": student.batch_id,
        "tenant_id": student.tenant_id,
        "quiz_id": "Q1",
        "score": student.average_quiz_score,
        "max_score": 100.0
    }
    completion_entry = {
        "student_id": student_id,
        "batch_id": student.batch_id,
        "tenant_id": student.tenant_id,
        "course_id": "C_PYTHON_101",
        "completion_rate": round(student.attendance_percentage / 100.0, 2)
    }

    if not db_manager.use_in_memory and db_manager.db is not None:
        existing = await db_manager.db.students.find_one({"student_id": student_id})
        if existing:
            raise HTTPException(status_code=400, detail=f"Student with ID '{student_id}' already exists.")
        
        await db_manager.db.students.insert_one(student_dict)
        await db_manager.db.attendance.insert_one(attendance_entry)
        await db_manager.db.quiz_scores.insert_one(quiz_entry)
        await db_manager.db.course_completions.insert_one(completion_entry)
    else:
        for s in db_manager.in_memory_store["students"]:
            if s["student_id"] == student_id:
                raise HTTPException(status_code=400, detail=f"Student with ID '{student_id}' already exists.")
        
        db_manager.in_memory_store["students"].append(student_dict)
        db_manager.in_memory_store["attendance"].append(attendance_entry)
        db_manager.in_memory_store["quiz_scores"].append(quiz_entry)
        db_manager.in_memory_store["course_completions"].append(completion_entry)

    return {
        "status": "success",
        "message": f"Student '{student.name}' ({student_id}) dynamically added.",
        "student": student_dict
    }

@router.get("/students")
async def list_students(
    batch_id: Optional[str] = None,
    branch: Optional[str] = None
):
    """Retrieves all registered dynamic student records."""
    if not db_manager.use_in_memory and db_manager.db is not None:
        query = {}
        if batch_id:
            query["batch_id"] = batch_id
        if branch:
            query["branch"] = branch
        students = await db_manager.db.students.find(query, {"_id": 0}).to_list(500)
    else:
        students = db_manager.in_memory_store["students"]
        if batch_id:
            students = [s for s in students if s.get("batch_id") == batch_id]
        if branch:
            students = [s for s in students if s.get("branch") == branch]

    return {"total": len(students), "students": students}

@router.delete("/students/{student_id}")
async def delete_student(student_id: str):
    """Deletes a student record and associated metrics."""
    if not db_manager.use_in_memory and db_manager.db is not None:
        res = await db_manager.db.students.delete_one({"student_id": student_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Student ID '{student_id}' not found.")
        await db_manager.db.attendance.delete_many({"student_id": student_id})
        await db_manager.db.quiz_scores.delete_many({"student_id": student_id})
        await db_manager.db.course_completions.delete_many({"student_id": student_id})
    else:
        original_count = len(db_manager.in_memory_store["students"])
        db_manager.in_memory_store["students"] = [s for s in db_manager.in_memory_store["students"] if s["student_id"] != student_id]
        if len(db_manager.in_memory_store["students"]) == original_count:
            raise HTTPException(status_code=404, detail=f"Student ID '{student_id}' not found.")
        
        db_manager.in_memory_store["attendance"] = [a for a in db_manager.in_memory_store["attendance"] if a["student_id"] != student_id]
        db_manager.in_memory_store["quiz_scores"] = [q for q in db_manager.in_memory_store["quiz_scores"] if q["student_id"] != student_id]
        db_manager.in_memory_store["course_completions"] = [c for c in db_manager.in_memory_store["course_completions"] if c["student_id"] != student_id]

    return {"status": "success", "message": f"Student '{student_id}' deleted successfully."}

@router.post("/attendance", status_code=201)
async def log_attendance_entry(record: AttendanceRecordCreate):
    """Dynamically log an attendance entry for a student."""
    entry = record.model_dump()
    if not db_manager.use_in_memory and db_manager.db is not None:
        await db_manager.db.attendance.insert_one(entry)
    else:
        db_manager.in_memory_store["attendance"].append(entry)
    return {"status": "success", "message": "Attendance record added successfully.", "entry": entry}

@router.post("/quiz-scores", status_code=201)
async def log_quiz_score_entry(record: QuizScoreCreate):
    """Dynamically log a quiz score entry for a student."""
    entry = record.model_dump()
    if not db_manager.use_in_memory and db_manager.db is not None:
        await db_manager.db.quiz_scores.insert_one(entry)
    else:
        db_manager.in_memory_store["quiz_scores"].append(entry)
    return {"status": "success", "message": "Quiz score record added successfully.", "entry": entry}

@router.post("/course-completions", status_code=201)
async def log_course_completion_entry(record: CourseCompletionCreate):
    """Dynamically log a course completion rate for a student."""
    entry = record.model_dump()
    if not db_manager.use_in_memory and db_manager.db is not None:
        await db_manager.db.course_completions.insert_one(entry)
    else:
        db_manager.in_memory_store["course_completions"].append(entry)
    return {"status": "success", "message": "Course completion record added successfully.", "entry": entry}

@router.post("/reset")
async def reset_dataset():
    """Resets the dataset to standard baseline sample data."""
    await seed_sample_data()
    return {"status": "success", "message": "Database reset to baseline sample dataset."}
