import logging
import asyncio
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import MongoClient
from app.config import settings

logger = logging.getLogger("lms.db")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    
    in_memory_store: dict = {
        "students": [],
        "attendance": [],
        "quiz_scores": [],
        "course_completions": [],
        "placement_drives": [],
        "placement_applications": [],
        "proctoring_violations": [],
        "gamification": [],
        "badges": []
    }
    use_in_memory: bool = False

db_manager = Database()

async def connect_to_mongo():
    """Establish async MongoDB connection or fall back gracefully to in-memory store."""
    try:
        db_manager.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=2000
        )
        await db_manager.client.admin.command('ping')
        db_manager.db = db_manager.client[settings.DATABASE_NAME]
        db_manager.use_in_memory = False
        logger.info(f"Connected successfully to MongoDB database: '{settings.DATABASE_NAME}'")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. Falling back to in-memory collection store for seamless execution.")
        db_manager.use_in_memory = True
        db_manager.db = None

async def close_mongo_connection():
    if db_manager.client:
        db_manager.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    return db_manager.db

async def seed_sample_data():
    """Seeds rich sample data for analytics, placements, gamification, and students."""
    sample_students = [
        {"student_id": "STU_101", "name": "Aarav Sharma", "email": "aarav@example.com", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_ALPHA", "cgpa": 8.8, "branch": "Computer Science", "days_since_last_login": 1, "attendance_percentage": 92.5, "average_quiz_score": 88.0, "xp_points": 1450, "level": 4},
        {"student_id": "STU_102", "name": "Diya Patel", "email": "diya@example.com", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_ALPHA", "cgpa": 9.2, "branch": "Computer Science", "days_since_last_login": 0, "attendance_percentage": 96.0, "average_quiz_score": 94.5, "xp_points": 2100, "level": 6},
        {"student_id": "STU_103", "name": "Rohan Verma", "email": "rohan@example.com", "batch_id": "BATCH_2026_B", "tenant_id": "TENANT_ALPHA", "cgpa": 6.5, "branch": "Information Technology", "days_since_last_login": 14, "attendance_percentage": 55.0, "average_quiz_score": 48.0, "xp_points": 320, "level": 1},
        {"student_id": "STU_104", "name": "Ananya Sen", "email": "ananya@example.com", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_BETA", "cgpa": 7.9, "branch": "Electronics", "days_since_last_login": 3, "attendance_percentage": 82.0, "average_quiz_score": 75.0, "xp_points": 980, "level": 3},
        {"student_id": "STU_105", "name": "Vikram Singh", "email": "vikram@example.com", "batch_id": "BATCH_2026_B", "tenant_id": "TENANT_BETA", "cgpa": 5.8, "branch": "Mechanical", "days_since_last_login": 25, "attendance_percentage": 42.0, "average_quiz_score": 40.0, "xp_points": 150, "level": 1}
    ]
    
    sample_attendance = [
        {"student_id": "STU_101", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_ALPHA", "date": "2026-07-01", "status": "present", "attendance_pct": 92.5},
        {"student_id": "STU_102", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_ALPHA", "date": "2026-07-01", "status": "present", "attendance_pct": 96.0},
        {"student_id": "STU_103", "batch_id": "BATCH_2026_B", "tenant_id": "TENANT_ALPHA", "date": "2026-07-01", "status": "absent", "attendance_pct": 55.0},
        {"student_id": "STU_104", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_BETA", "date": "2026-07-01", "status": "present", "attendance_pct": 82.0},
        {"student_id": "STU_105", "batch_id": "BATCH_2026_B", "tenant_id": "TENANT_BETA", "date": "2026-07-01", "status": "absent", "attendance_pct": 42.0}
    ]
    
    sample_quizzes = [
        {"student_id": "STU_101", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_ALPHA", "quiz_id": "Q1", "score": 90, "max_score": 100},
        {"student_id": "STU_102", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_ALPHA", "quiz_id": "Q1", "score": 98, "max_score": 100},
        {"student_id": "STU_103", "batch_id": "BATCH_2026_B", "tenant_id": "TENANT_ALPHA", "quiz_id": "Q1", "score": 45, "max_score": 100},
        {"student_id": "STU_104", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_BETA", "quiz_id": "Q1", "score": 76, "max_score": 100},
        {"student_id": "STU_105", "batch_id": "BATCH_2026_B", "tenant_id": "TENANT_BETA", "quiz_id": "Q1", "score": 38, "max_score": 100}
    ]
    
    sample_completions = [
        {"student_id": "STU_101", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_ALPHA", "course_id": "C_PYTHON_101", "completion_rate": 0.95},
        {"student_id": "STU_102", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_ALPHA", "course_id": "C_PYTHON_101", "completion_rate": 1.00},
        {"student_id": "STU_103", "batch_id": "BATCH_2026_B", "tenant_id": "TENANT_ALPHA", "course_id": "C_PYTHON_101", "completion_rate": 0.30},
        {"student_id": "STU_104", "batch_id": "BATCH_2026_A", "tenant_id": "TENANT_BETA", "course_id": "C_PYTHON_101", "completion_rate": 0.85},
        {"student_id": "STU_105", "batch_id": "BATCH_2026_B", "tenant_id": "TENANT_BETA", "course_id": "C_PYTHON_101", "completion_rate": 0.20}
    ]
    
    sample_drives = [
        {
            "drive_id": "DRIVE_2026_TECH",
            "company_name": "Google DeepMind Systems",
            "role_title": "AI Backend Engineer",
            "job_description": "Building scalable LMS microservices, vector search, and real-time vision pipelines.",
            "min_cgpa": 7.5,
            "allowed_branches": ["Computer Science", "Information Technology"],
            "application_deadline": "2026-12-31"
        },
        {
            "drive_id": "DRIVE_2026_DATA",
            "company_name": "Antigravity Analytics",
            "role_title": "Data Scientist",
            "job_description": "Building predictive ML models and Power BI business intelligence dashboards.",
            "min_cgpa": 7.0,
            "allowed_branches": ["Computer Science", "Information Technology", "Electronics"],
            "application_deadline": "2026-12-31"
        }
    ]

    # Reset in-memory store
    db_manager.in_memory_store["students"] = sample_students
    db_manager.in_memory_store["attendance"] = sample_attendance
    db_manager.in_memory_store["quiz_scores"] = sample_quizzes
    db_manager.in_memory_store["course_completions"] = sample_completions
    db_manager.in_memory_store["placement_drives"] = sample_drives
    db_manager.in_memory_store["placement_applications"] = []
    db_manager.in_memory_store["proctoring_violations"] = []

    if not db_manager.use_in_memory and db_manager.db is not None:
        try:
            await db_manager.db.students.delete_many({})
            await db_manager.db.students.insert_many(sample_students)
            
            await db_manager.db.attendance.delete_many({})
            await db_manager.db.attendance.insert_many(sample_attendance)
            
            await db_manager.db.quiz_scores.delete_many({})
            await db_manager.db.quiz_scores.insert_many(sample_quizzes)
            
            await db_manager.db.course_completions.delete_many({})
            await db_manager.db.course_completions.insert_many(sample_completions)
            
            await db_manager.db.placement_drives.delete_many({})
            await db_manager.db.placement_drives.insert_many(sample_drives)

            await db_manager.db.placement_applications.delete_many({})
            await db_manager.db.proctoring_violations.delete_many({})
            logger.info("Successfully seeded MongoDB with fresh sample records.")
            return
        except Exception as e:
            logger.warning(f"Error seeding MongoDB: {e}. Using in-memory store.")

    logger.info("Successfully seeded in-memory database store with sample records.")
