import json
import logging
from typing import List, Optional
import redis.asyncio as aioredis
from fastapi import APIRouter, HTTPException, Query
from app.config import settings
from app.db.database import db_manager
from app.db.schemas import LeaderboardEntry

router = APIRouter(prefix="/api/gamification", tags=["Redis Real-Time Leaderboard"])

logger = logging.getLogger("lms.leaderboard")

# Redis connection instance & In-Memory fallback cache
redis_client: Optional[aioredis.Redis] = None
in_memory_leaderboard: dict = {} # Key: student_id -> dict

async def get_redis_client():
    global redis_client
    if redis_client is None:
        try:
            redis_client = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True,
                socket_timeout=1.5
            )
            await redis_client.ping()
            logger.info("Connected to Redis for real-time leaderboard caching.")
        except Exception as e:
            logger.warning(f"Redis connection unavailable: {e}. Falling back to in-memory Sorted Set cache.")
            redis_client = False
    return redis_client if redis_client is not False else None

async def update_redis_leaderboard(student_id: str, student_name: str, batch_id: str, xp: int, level: int):
    """
    Day 12 Leaderboard Engine:
    Maintains real-time sorted leaderboard of students using Redis Sorted Sets (ZADD).
    Updates global ranking and batch-specific ranking without touching the primary database on reads.
    """
    r = await get_redis_client()
    
    meta_json = json.dumps({
        "student_id": student_id,
        "student_name": student_name,
        "batch_id": batch_id,
        "xp_points": xp,
        "level": level
    })
    
    if r:
        try:
            # 1. Update Global Sorted Set (ZADD)
            await r.zadd("leaderboard:global", {student_id: xp})
            # 2. Update Batch-Specific Sorted Set
            await r.zadd(f"leaderboard:batch:{batch_id}", {student_id: xp})
            # 3. Store Student Metadata Hash
            await r.set(f"student_meta:{student_id}", meta_json)
            return
        except Exception as e:
            logger.warning(f"Redis update error: {e}")
            
    # In-memory fallback
    in_memory_leaderboard[student_id] = {
        "student_id": student_id,
        "student_name": student_name,
        "batch_id": batch_id,
        "xp_points": xp,
        "level": level
    }

async def fetch_leaderboard_rankings(batch_id: Optional[str] = None, limit: int = 10) -> List[LeaderboardEntry]:
    """Retrieves real-time sorted rankings from Redis (ZREVRANGE) or in-memory cache."""
    r = await get_redis_client()
    entries = []
    
    if r:
        try:
            redis_key = f"leaderboard:batch:{batch_id}" if batch_id else "leaderboard:global"
            # ZREVRANGE to get top scores in descending order
            top_student_ids = await r.zrevrange(redis_key, 0, limit - 1, withscores=True)
            
            for rank_idx, (stu_id, score) in enumerate(top_student_ids, start=1):
                meta_str = await r.get(f"student_meta:{stu_id}")
                if meta_str:
                    meta = json.loads(meta_str)
                    name = meta.get("student_name", "Student")
                    lvl = meta.get("level", 1)
                else:
                    name = f"Student_{stu_id}"
                    lvl = (int(score) // 250) + 1
                    
                entries.append(LeaderboardEntry(
                    rank=rank_idx,
                    student_id=stu_id,
                    student_name=name,
                    xp_points=int(score),
                    level=lvl
                ))
            return entries
        except Exception as e:
            logger.warning(f"Redis fetch error: {e}")

    # Fallback to database / in-memory store if Redis is unpopulated
    source_students = []
    if not db_manager.use_in_memory and db_manager.db is not None:
        try:
            query = {"batch_id": batch_id} if batch_id else {}
            docs = await db_manager.db.students.find(query, {"_id": 0}).sort("xp_points", -1).limit(limit).to_list(limit)
            source_students = docs
        except Exception:
            source_students = list(in_memory_leaderboard.values())
    else:
        source_students = db_manager.in_memory_store["students"]
        if in_memory_leaderboard:
            # merge
            for item in in_memory_leaderboard.values():
                if not any(s["student_id"] == item["student_id"] for s in source_students):
                    source_students.append(item)

    if batch_id:
        source_students = [s for s in source_students if s.get("batch_id") == batch_id]
        
    source_students.sort(key=lambda s: s.get("xp_points", 0), reverse=True)
    
    for idx, s in enumerate(source_students[:limit], start=1):
        entries.append(LeaderboardEntry(
            rank=idx,
            student_id=s["student_id"],
            student_name=s.get("name", "Student"),
            xp_points=s.get("xp_points", 0),
            level=s.get("level", (s.get("xp_points", 0) // 250) + 1)
        ))
        
    return entries

@router.get("/leaderboard/global", response_model=List[LeaderboardEntry])
async def get_global_leaderboard(limit: int = Query(10, ge=1, le=100)):
    """Day 12 Endpoint: Retrieves global real-time student leaderboard backed by Redis."""
    try:
        return await fetch_leaderboard_rankings(batch_id=None, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Leaderboard fetch failed: {str(e)}")

@router.get("/leaderboard/batch/{batch_id}", response_model=List[LeaderboardEntry])
async def get_batch_leaderboard(batch_id: str, limit: int = Query(10, ge=1, le=100)):
    """Day 12 Endpoint: Retrieves batch-specific real-time leaderboard backed by Redis."""
    try:
        return await fetch_leaderboard_rankings(batch_id=batch_id, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch leaderboard fetch failed: {str(e)}")
