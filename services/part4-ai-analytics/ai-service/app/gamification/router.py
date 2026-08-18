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


def xp_for_action(action_type: str, score: float = None, max_score: float = None) -> int:
    """
    XP awarded for an action. For quizzes the base XP scales with performance:
    a student who aces the quiz gets the full base XP, a student who scores
    half gets half the XP — so effort and mastery are rewarded proportionally
    instead of every attempt paying out the same flat amount.
    """
    base = XP_ACTION_RULES.get(action_type)
    if base is None:
        return 0
    if action_type != "quiz_ace":
        return base
    # No score info (older clients): keep the flat base XP.
    if score is None or max_score is None or max_score <= 0:
        return base
    ratio = max(0.0, min(1.0, float(score) / float(max_score)))
    return max(1, round(base * ratio))

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
    if request.action_type not in XP_ACTION_RULES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action type '{request.action_type}'. Allowed actions: {list(XP_ACTION_RULES.keys())}"
        )
    xp_to_add = xp_for_action(request.action_type, request.score, request.max_score)

    # Fetch current student gamification state
    current_xp = 0
    student_name = request.student_name or "Student"
    batch_id = "BATCH_2026_A"

    if not db_manager.use_in_memory and db_manager.db is not None:
        student_doc = await db_manager.db.students.find_one({"student_id": request.student_id})
        if student_doc:
            current_xp = student_doc.get("xp_points", 0)
            student_name = request.student_name or student_doc.get("name", "Student")
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
                student_name = request.student_name or s.get("name", "Student")
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
                "name": request.student_name or student_name,
                "batch_id": batch_id,
                "xp_points": new_xp,
                "level": new_level,
                "badges": unlocked_badges
            })

    # Update Redis Leaderboard Cache asynchronously
    try:
        from app.gamification.leaderboard import get_redis_client, update_redis_leaderboard
        r = await get_redis_client()
        if r:
            # Redis is the source of truth for totals — it survives restarts.
            # Read the existing total from Redis BEFORE computing the new one so
            # accumulated XP is never lost/overwritten on a fresh container.
            redis_xp = await r.zscore("leaderboard:global", request.student_id)
            if redis_xp is not None:
                current_xp = max(current_xp, int(redis_xp))
                new_xp = current_xp + xp_to_add
                new_level = calculate_level_from_xp(new_xp)
                unlocked_badges = evaluate_unlocked_badges(new_xp)
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
    """
    Retrieve a student's current XP points, level, and unlocked badges.
    Redis is the source of truth for totals (it survives restarts and every
    award writes to it), so it is checked FIRST — otherwise a student who
    earned XP could show 0 here while the leaderboard shows their real total
    (Mongo sometimes lags behind). Mongo / the in-memory store are the fallback.
    """
    xp = 0
    badges = []
    name = None

    try:
        from app.gamification.leaderboard import get_redis_client
        r = await get_redis_client()
        if r:
            redis_xp = await r.zscore("leaderboard:global", student_id)
            if redis_xp is not None:
                xp = int(redis_xp)
            meta_raw = await r.get(f"student_meta:{student_id}")
            if meta_raw:
                try:
                    import json as _json
                    meta = _json.loads(meta_raw)
                    name = meta.get("student_name")
                except Exception:
                    pass
    except Exception:
        pass

    if xp == 0:
        if not db_manager.use_in_memory and db_manager.db is not None:
            doc = await db_manager.db.students.find_one({"student_id": student_id})
            if doc:
                xp = doc.get("xp_points", 0)
                badges = doc.get("badges", evaluate_unlocked_badges(xp))
                name = doc.get("name")
        else:
            for s in db_manager.in_memory_store["students"]:
                if s["student_id"] == student_id:
                    xp = s.get("xp_points", 0)
                    badges = s.get("badges", evaluate_unlocked_badges(xp))
                    name = s.get("name")
                    break

    level = calculate_level_from_xp(xp)
    if not badges:
        badges = evaluate_unlocked_badges(xp)
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

