from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.db.database import db_manager
from app.db.schemas import AwardXPRequest, StudentGamificationState

router = APIRouter(prefix="/api/gamification", tags=["Gamification Microservice"])

XP_ACTION_RULES = {
    "completed_module": 100,
    "perfect_attendance": 150,
    "quiz_ace": 200,
    "daily_login": 25,
    "forum_helpful_answer": 50
}

BADGE_THRESHOLDS = [
    {"name": "Novice Scholar", "required_xp": 250, "description": "Earned 250 XP in LMS activities."},
    {"name": "Consistent Achiever", "required_xp": 500, "description": "Earned 500 XP in learning modules."},
    {"name": "Master Innovator", "required_xp": 1000, "description": "Reached 1,000 XP milestone."},
    {"name": "Grandmaster Learner", "required_xp": 2000, "description": "Reached elite status with 2,000+ XP."}
]

def calculate_level_from_xp(xp: int) -> int:
    """Level formula: 1 + (xp // 250)"""
    return (xp // 250) + 1

def evaluate_unlocked_badges(xp: int) -> List[str]:
    unlocked = []
    for badge in BADGE_THRESHOLDS:
        if xp >= badge["required_xp"]:
            unlocked.append(badge["name"])
    return unlocked

@router.post("/award-xp", response_model=StudentGamificationState)
async def award_student_xp(request: AwardXPRequest):
    """
    Day 11 Endpoint:
    Awards XP points for specific student actions (e.g. 'completed_module', 'perfect_attendance'),
    calculates updated level, unlocks predefined badges when thresholds are met, and updates DB.
    """
    xp_to_add = XP_ACTION_RULES.get(request.action_type)
    if xp_to_add is None:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action type '{request.action_type}'. Allowed actions: {list(XP_ACTION_RULES.keys())}"
        )

    # Fetch current student gamification state
    current_xp = 0
    student_name = "Student"
    batch_id = "BATCH_2026_A"

    if not db_manager.use_in_memory and db_manager.db is not None:
        student_doc = await db_manager.db.students.find_one({"student_id": request.student_id})
        if student_doc:
            current_xp = student_doc.get("xp_points", 0)
            student_name = student_doc.get("name", "Student")
            batch_id = student_doc.get("batch_id", "BATCH_2026_A")
            
        new_xp = current_xp + xp_to_add
        new_level = calculate_level_from_xp(new_xp)
        unlocked_badges = evaluate_unlocked_badges(new_xp)
        
        await db_manager.db.students.update_one(
            {"student_id": request.student_id},
            {"$set": {
                "xp_points": new_xp,
                "level": new_level,
                "badges": unlocked_badges
            }},
            upsert=True
        )
    else:
        found = False
        for s in db_manager.in_memory_store["students"]:
            if s["student_id"] == request.student_id:
                current_xp = s.get("xp_points", 0)
                student_name = s.get("name", "Student")
                batch_id = s.get("batch_id", "BATCH_2026_A")
                new_xp = current_xp + xp_to_add
                new_level = calculate_level_from_xp(new_xp)
                unlocked_badges = evaluate_unlocked_badges(new_xp)
                s["xp_points"] = new_xp
                s["level"] = new_level
                s["badges"] = unlocked_badges
                found = True
                break
        if not found:
            new_xp = xp_to_add
            new_level = calculate_level_from_xp(new_xp)
            unlocked_badges = evaluate_unlocked_badges(new_xp)
            db_manager.in_memory_store["students"].append({
                "student_id": request.student_id,
                "name": student_name,
                "batch_id": batch_id,
                "xp_points": new_xp,
                "level": new_level,
                "badges": unlocked_badges
            })

    # Update Redis Leaderboard Cache asynchronously
    try:
        from app.gamification.leaderboard import update_redis_leaderboard
        await update_redis_leaderboard(request.student_id, student_name, batch_id, new_xp, new_level)
    except Exception:
        pass

    return StudentGamificationState(
        student_id=request.student_id,
        xp_points=new_xp,
        level=new_level,
        badges_unlocked=unlocked_badges
    )

@router.get("/student/{student_id}", response_model=StudentGamificationState)
async def get_student_gamification_profile(student_id: str):
    """Day 11 Endpoint: Retrieve a student's current XP points, level, and unlocked badges."""
    xp = 0
    badges = []
    
    if not db_manager.use_in_memory and db_manager.db is not None:
        doc = await db_manager.db.students.find_one({"student_id": student_id})
        if doc:
            xp = doc.get("xp_points", 0)
            badges = doc.get("badges", evaluate_unlocked_badges(xp))
    else:
        for s in db_manager.in_memory_store["students"]:
            if s["student_id"] == student_id:
                xp = s.get("xp_points", 0)
                badges = s.get("badges", evaluate_unlocked_badges(xp))
                break
                
    level = calculate_level_from_xp(xp)
    return StudentGamificationState(
        student_id=student_id,
        xp_points=xp,
        level=level,
        badges_unlocked=badges
    )

@router.get("/badges/catalog")
async def get_badge_catalog():
    """Returns the full gamification badge catalog and threshold requirements."""
    return {
        "total_badges": len(BADGE_THRESHOLDS),
        "badges": BADGE_THRESHOLDS,
        "action_xp_rules": XP_ACTION_RULES
    }

