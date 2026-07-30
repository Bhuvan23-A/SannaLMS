import asyncio
from app.db.database import seed_sample_data, db_manager, connect_to_mongo
from app.proctoring.lockdown import log_proctoring_violation, get_proctoring_violations, ProctoringViolationCreate

async def debug():
    await connect_to_mongo()
    await seed_sample_data()
    print("db_manager.use_in_memory:", db_manager.use_in_memory)
    print("db_manager.db:", db_manager.db)
    
    v = ProctoringViolationCreate(student_id="STU_101", exam_id="E1", event_type="tab_switch")
    res = await log_proctoring_violation(v)
    print("Log result:", res)
    
    if db_manager.db is not None:
        mongo_docs = await db_manager.db.proctoring_violations.find({}).to_list(100)
        print("Raw Mongo docs in proctoring_violations collection:", mongo_docs)
        
    print("In memory store violations:", db_manager.in_memory_store["proctoring_violations"])
    
    logs = await get_proctoring_violations(student_id="STU_101")
    print("Get violations result:", logs)

if __name__ == "__main__":
    asyncio.run(debug())
