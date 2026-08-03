from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from app.db.database import db_manager
from app.db.schemas import PlacementDriveCreate, PlacementApplicationCreate, ATSScoreRequest


router = APIRouter(prefix="/api/placements", tags=["Placement Drive System"])

def unwrap_param(val):
    """Unwraps FastAPI Query default objects if function is invoked directly in Python."""
    if val is None or hasattr(val, 'default'):
        return None
    return val

@router.post("/drives", status_code=201)
async def create_placement_drive(drive: PlacementDriveCreate):
    """Day 4 Endpoint: Post a new company job drive with eligibility constraints."""
    drive_dict = drive.model_dump()
    drive_dict["created_at"] = datetime.now(timezone.utc).isoformat()

    if not db_manager.use_in_memory and db_manager.db is not None:
        existing = await db_manager.db.placement_drives.find_one({"drive_id": drive.drive_id})
        if existing:
            raise HTTPException(status_code=400, detail=f"Placement drive '{drive.drive_id}' already exists.")
        await db_manager.db.placement_drives.insert_one(drive_dict)
    else:
        for d in db_manager.in_memory_store["placement_drives"]:
            if d["drive_id"] == drive.drive_id:
                raise HTTPException(status_code=400, detail=f"Placement drive '{drive.drive_id}' already exists.")
        db_manager.in_memory_store["placement_drives"].append(drive_dict)

    return {"status": "success", "message": "Placement drive successfully created.", "drive_id": drive.drive_id}

@router.get("/drives")
async def list_placement_drives(
    student_cgpa: Optional[float] = Query(None, description="Filter drives eligible for this CGPA"),
    student_branch: Optional[str] = Query(None, description="Filter drives eligible for this branch")
):
    """Day 4 Endpoint: Retrieve list of job drives with optional eligibility filtering."""
    student_cgpa = unwrap_param(student_cgpa)
    student_branch = unwrap_param(student_branch)

    if not db_manager.use_in_memory and db_manager.db is not None:
        drives = await db_manager.db.placement_drives.find({}, {"_id": 0}).to_list(100)
    else:
        drives = db_manager.in_memory_store["placement_drives"]

    filtered_drives = []
    for d in drives:
        eligible = True
        if student_cgpa is not None and student_cgpa < d.get("min_cgpa", 0.0):
            eligible = False
        if student_branch is not None and student_branch not in d.get("allowed_branches", []):
            eligible = False
        
        drive_data = dict(d)
        drive_data["is_eligible_for_query"] = eligible
        filtered_drives.append(drive_data)

    return {"total_drives": len(filtered_drives), "drives": filtered_drives}

@router.post("/applications", status_code=201)
async def submit_placement_application(app_data: PlacementApplicationCreate):
    """
    Day 4 Endpoint: Student submits job application.
    Validates eligibility against minimum CGPA and allowed branches before saving.
    """
    target_drive = None
    if not db_manager.use_in_memory and db_manager.db is not None:
        target_drive = await db_manager.db.placement_drives.find_one({"drive_id": app_data.drive_id}, {"_id": 0})
    else:
        for d in db_manager.in_memory_store["placement_drives"]:
            if d["drive_id"] == app_data.drive_id:
                target_drive = d
                break

    if not target_drive:
        raise HTTPException(status_code=404, detail=f"Placement Drive ID '{app_data.drive_id}' not found.")

    if app_data.cgpa < target_drive["min_cgpa"]:
        raise HTTPException(
            status_code=400,
            detail=f"Ineligible: CGPA {app_data.cgpa} is below required minimum of {target_drive['min_cgpa']}"
        )
    if app_data.branch not in target_drive["allowed_branches"]:
        raise HTTPException(
            status_code=400,
            detail=f"Ineligible: Branch '{app_data.branch}' is not in allowed branches {target_drive['allowed_branches']}"
        )

    application_record = app_data.model_dump()
    application_record["applied_at"] = datetime.now(timezone.utc).isoformat()
    application_record["status"] = "Submitted"

    if not db_manager.use_in_memory and db_manager.db is not None:
        existing_app = await db_manager.db.placement_applications.find_one({
            "drive_id": app_data.drive_id,
            "student_id": app_data.student_id
        })
        if existing_app:
            raise HTTPException(status_code=400, detail="Student has already applied to this placement drive.")
        await db_manager.db.placement_applications.insert_one(application_record)
    else:
        for app in db_manager.in_memory_store["placement_applications"]:
            if app["drive_id"] == app_data.drive_id and app["student_id"] == app_data.student_id:
                raise HTTPException(status_code=400, detail="Student has already applied to this placement drive.")
        db_manager.in_memory_store["placement_applications"].append(application_record)

    return {
        "status": "success",
        "message": f"Application successfully submitted for {target_drive['company_name']} - {target_drive['role_title']}",
        "application": application_record
    }

@router.get("/applications")
async def list_placement_applications(drive_id: Optional[str] = None):
    """List all submitted placement applications."""
    drive_id = unwrap_param(drive_id)
    if not db_manager.use_in_memory and db_manager.db is not None:
        query = {"drive_id": drive_id} if drive_id else {}
        apps = await db_manager.db.placement_applications.find(query, {"_id": 0}).to_list(200)
    else:
        apps = [
            a for a in db_manager.in_memory_store["placement_applications"]
            if not drive_id or a["drive_id"] == drive_id
        ]

    return {"total_applications": len(apps), "applications": apps}

@router.post("/ats-score")
async def calculate_ats_resume_score(request: ATSScoreRequest):
    """
    Day 4 ATS Resume Matcher & Scorer Endpoint:
    Compares candidate's skills and summary against company drive requirements
    and returns an ATS match percentage, keyword breakdown, and suggestions.
    """
    from app.db.schemas import ATSScoreRequest, ATSScoreResponse
    
    target_drive = None
    if not db_manager.use_in_memory and db_manager.db is not None:
        target_drive = await db_manager.db.placement_drives.find_one({"drive_id": request.drive_id}, {"_id": 0})
    else:
        for d in db_manager.in_memory_store["placement_drives"]:
            if d["drive_id"] == request.drive_id:
                target_drive = d
                break
                
    req_skills = ["Python", "FastAPI", "MongoDB", "Scikit-Learn", "Redis", "Docker"]
    if target_drive:
        desc = target_drive.get("job_description", "") + " " + target_drive.get("role_title", "")
        # Extract skills from description
        for keyword in ["Machine Learning", "OpenCV", "Pandas", "React", "PostgreSQL", "SQL"]:
            if keyword.lower() in desc.lower():
                req_skills.append(keyword)

    user_skills_set = set(s.strip().lower() for s in request.student_skills)
    matched = [s for s in req_skills if s.lower() in user_skills_set or any(s.lower() in skill for skill in user_skills_set)]
    missing = [s for s in req_skills if s not in matched]

    match_ratio = len(matched) / max(1, len(req_skills))
    ats_score = round(min(98.0, max(45.0, match_ratio * 100.0)), 1)
    
    recommendations = []
    if missing:
        recommendations.append(f"Add projects highlighting skills: {', '.join(missing[:3])}.")
    if len(request.student_summary) < 50:
        recommendations.append("Expand professional summary section to include quantitative project impacts.")
    if not recommendations:
        recommendations.append("Excellent ATS resume alignment! Ready for company recruiter submission.")

    return ATSScoreResponse(
        drive_id=request.drive_id,
        ats_score_pct=ats_score,
        matched_skills=matched,
        missing_skills=missing,
        formatting_grade="A+" if ats_score > 80 else "B+",
        ats_recommendations=recommendations
    )

@router.delete("/drives/{drive_id}")
async def delete_placement_drive(drive_id: str):
    """Delete a dynamic placement drive."""
    if not db_manager.use_in_memory and db_manager.db is not None:
        res = await db_manager.db.placement_drives.delete_one({"drive_id": drive_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Placement drive '{drive_id}' not found.")
        await db_manager.db.placement_applications.delete_many({"drive_id": drive_id})
    else:
        orig = len(db_manager.in_memory_store["placement_drives"])
        db_manager.in_memory_store["placement_drives"] = [
            d for d in db_manager.in_memory_store["placement_drives"] if d["drive_id"] != drive_id
        ]
        if len(db_manager.in_memory_store["placement_drives"]) == orig:
            raise HTTPException(status_code=404, detail=f"Placement drive '{drive_id}' not found.")
        db_manager.in_memory_store["placement_applications"] = [
            a for a in db_manager.in_memory_store["placement_applications"] if a["drive_id"] != drive_id
        ]
    return {"status": "success", "message": f"Placement drive '{drive_id}' deleted."}


