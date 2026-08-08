import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse

from app.config import settings
from app.security import SecurityHeadersMiddleware, RateLimitMiddleware, get_security_audit_report
from app.db.database import connect_to_mongo, close_mongo_connection, seed_sample_data
from app.analytics.router import router as analytics_router
from app.analytics.ml_model import router as ml_model_router
from app.analytics.powerbi_exporter import router as powerbi_router
from app.placements.router import router as placements_router
from app.placements.resume_builder import router as resume_router
from app.placements.certificate_generator import router as cert_router
from app.proctoring.vision import analyze_proctoring_frame
from app.proctoring.websocket_router import router as proctoring_ws_router
from app.proctoring.lockdown import router as lockdown_router
from app.tutor.rag_tutor import router as tutor_router
from app.gamification.router import router as gamification_router
from app.gamification.leaderboard import router as leaderboard_router
from app.data_management.router import router as data_management_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("lms.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: Connects to MongoDB, seeds initial dataset, closes connections."""
    logger.info("Initializing Enterprise LMS Unit Microservices...")
    await connect_to_mongo()
    await seed_sample_data()
    from app.gamification.leaderboard import seed_redis_leaderboard
    await seed_redis_leaderboard()
    yield
    await close_mongo_connection()
    logger.info("LMS Microservices shutdown complete.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-Ready Enterprise LMS Unit with Analytics, ML Risk Prediction, Power BI Export, Placement CRUD, Resume Builder, Cryptographic Certificates, AI Proctoring Vision Stream, Gemini RAG Tutor, and Redis Leaderboards.",
    version="1.0.0",
    lifespan=lifespan
)

# Security Middleware & OWASP Protection
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS Middleware for client integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach Routers for Days 1 to 12 & Dynamic Data Hub
app.include_router(analytics_router)     # Day 1: Data Aggregation
app.include_router(ml_model_router)      # Day 2: AI Dropout Classifier
app.include_router(powerbi_router)       # Day 3: Power BI CSV Exporter
app.include_router(placements_router)    # Day 4: Placement Drive CRUD
app.include_router(resume_router)        # Day 5: ReportLab Resume Builder
app.include_router(cert_router)          # Day 6: Cryptographic Certificate & QR
app.include_router(proctoring_ws_router) # Days 7 & 8: OpenCV Vision & WebSocket Stream
app.include_router(lockdown_router)      # Day 9: Browser Lockdown Violation Logger
app.include_router(tutor_router)         # Day 10: RAG Gemini AI Tutor
app.include_router(gamification_router)  # Day 11: Gamification Microservice
app.include_router(leaderboard_router)   # Day 12: Redis Leaderboard Layer
app.include_router(data_management_router) # Dynamic Data Hub


# Static files for Lockdown JS and Demo Portal UI
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    """Serves the interactive LMS Unit Showcase Portal."""
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(
            index_file,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return HTMLResponse("<h1>Enterprise LMS Unit API is Running. Access Swagger docs at <a href='/docs'>/docs</a></h1>")


@app.post("/api/seed", tags=["System Utility"])
async def trigger_reseed():
    """Utility endpoint to re-seed database with fresh test data."""
    await seed_sample_data()
    return {"status": "success", "message": "Database successfully re-seeded with fresh sample data."}

@app.get("/api/security/status", tags=["System Security"])
async def security_status():
    """Returns system security compliance, rate-limiting, and cryptographic audit report."""
    return get_security_audit_report()

