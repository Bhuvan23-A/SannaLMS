from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from app.db.database import db_manager
from app.db.schemas import ProctoringViolationCreate

router = APIRouter(prefix="/api/proctoring", tags=["Browser Lockdown & Violation Logger"])

def unwrap_param(val):
    """Unwraps FastAPI Query default objects if function is invoked directly in Python."""
    if val is None or hasattr(val, 'default'):
        return None
    return val

@router.post("/violations", status_code=201)
async def log_proctoring_violation(violation: ProctoringViolationCreate):
    """
    Day 9 Endpoint:
    Receives real-time browser lockdown violation events (tab switch, window focus loss, copy-paste)
    from injected JS snippet and logs them directly to MongoDB.
    """
    record = violation.model_dump()
    if not record.get("timestamp"):
        record["timestamp"] = datetime.now(timezone.utc).isoformat()
    record["severity"] = "HIGH" if record["event_type"] in ["tab_switch", "multiple_faces"] else "MEDIUM"

    clean_record = dict(record)

    if not db_manager.use_in_memory and db_manager.db is not None:
        try:
            await db_manager.db.proctoring_violations.insert_one(dict(record))
        except Exception:
            pass
    
    db_manager.in_memory_store["proctoring_violations"].append(clean_record)

    return {
        "status": "success",
        "message": f"Violation '{violation.event_type}' logged successfully.",
        "event_type": violation.event_type,
        "logged_at": record["timestamp"]
    }

@router.get("/violations")
async def get_proctoring_violations(
    student_id: Optional[str] = Query(None),
    exam_id: Optional[str] = Query(None)
):
    """Retrieves all logged proctoring violation events for review."""
    student_id = unwrap_param(student_id)
    exam_id = unwrap_param(exam_id)

    query = {}
    if student_id:
        query["student_id"] = student_id
    if exam_id:
        query["exam_id"] = exam_id

    logs = []
    if not db_manager.use_in_memory and db_manager.db is not None:
        try:
            logs = await db_manager.db.proctoring_violations.find(query, {"_id": 0}).to_list(500)
        except Exception:
            logs = []

    in_mem_logs = [
        dict(log) for log in db_manager.in_memory_store["proctoring_violations"]
        if (not student_id or log.get("student_id") == student_id) and
           (not exam_id or log.get("exam_id") == exam_id)
    ]

    for item in in_mem_logs:
        item.pop("_id", None)

    all_logs = list(logs)
    for item in in_mem_logs:
        if item not in all_logs:
            all_logs.append(item)

    return {
        "total_violations": len(all_logs),
        "violations": all_logs
    }

@router.get("/exam-summary/{exam_id}")
async def get_exam_proctoring_summary(exam_id: str):
    """
    Day 7-9 Comprehensive Proctoring Audit & Summary Endpoint:
    Calculates overall exam integrity score, violation severity breakdown, and official proctoring status decision.
    """
    res = await get_proctoring_violations(exam_id=exam_id)
    violations = res["violations"]
    
    total = len(violations)
    high_sev = sum(1 for v in violations if v.get("severity") == "HIGH" or v.get("event_type") in ["tab_switch", "multiple_faces"])
    med_sev = total - high_sev
    
    # Calculate integrity score out of 100%
    deductions = (high_sev * 20) + (med_sev * 5)
    integrity_score = max(0, 100 - deductions)
    
    if integrity_score >= 85:
        decision = "PASS"
        recommendation = "Exam completed cleanly with minimal or no infractions."
    elif integrity_score >= 50:
        decision = "MANUAL_REVIEW_REQUIRED"
        recommendation = "Moderate infractions detected. Human proctor review required before score release."
    else:
        decision = "FLAGGED_FOR_DISQUALIFICATION"
        recommendation = "SEVERE INFRACTIONS: Automatic disqualification recommended due to excessive tab switching / blur."

    return {
        "exam_id": exam_id,
        "total_violations_logged": total,
        "high_severity_count": high_sev,
        "medium_severity_count": med_sev,
        "integrity_score": integrity_score,
        "official_proctoring_decision": decision,
        "recommendation": recommendation,
        "audit_timestamp": datetime.now(timezone.utc).isoformat()
    }

