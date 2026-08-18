from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

# Day 1: Analytics Schemas
class AnalyticsAggregationResponse(BaseModel):
    total_records_processed: int
    grouped_analytics: List[Dict[str, Any]]
    generated_at: str

# Dynamic Data Management Schemas
class StudentCreate(BaseModel):
    student_id: str = Field(..., example="STU_106")
    name: str = Field(..., example="Kavya Nair")
    email: str = Field(..., example="kavya@example.com")
    batch_id: str = Field(default="BATCH_2026_A", example="BATCH_2026_A")
    tenant_id: str = Field(default="TENANT_ALPHA", example="TENANT_ALPHA")
    cgpa: float = Field(..., ge=0.0, le=10.0, example=8.5)
    branch: str = Field(..., example="Computer Science")
    attendance_percentage: float = Field(default=85.0, ge=0.0, le=100.0)
    average_quiz_score: float = Field(default=80.0, ge=0.0, le=100.0)
    days_since_last_login: int = Field(default=2, ge=0)
    xp_points: int = Field(default=500, ge=0)
    level: int = Field(default=3, ge=1)

class AttendanceRecordCreate(BaseModel):
    student_id: str
    batch_id: str = "BATCH_2026_A"
    tenant_id: str = "TENANT_ALPHA"
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    status: str = "present"
    attendance_pct: float = Field(..., ge=0.0, le=100.0)

class QuizScoreCreate(BaseModel):
    student_id: str
    batch_id: str = "BATCH_2026_A"
    tenant_id: str = "TENANT_ALPHA"
    quiz_id: str = "Q_CUSTOM"
    score: float = Field(..., ge=0.0, le=100.0)
    max_score: float = 100.0

class CourseCompletionCreate(BaseModel):
    student_id: str
    batch_id: str = "BATCH_2026_A"
    tenant_id: str = "TENANT_ALPHA"
    course_id: str = "C_PYTHON_101"
    completion_rate: float = Field(..., ge=0.0, le=1.0)


# Day 2: ML Model Schemas
class StudentRiskInput(BaseModel):
    days_since_last_login: int = Field(..., example=5)
    average_quiz_score: float = Field(..., example=78.5)
    attendance_percentage: float = Field(..., example=85.0)

class StudentRiskPrediction(BaseModel):
    dropout_risk: bool
    risk_probability: float
    risk_level: str  # "LOW", "MEDIUM", "HIGH"
    recommendation: str
    feature_contributions: Optional[Dict[str, float]] = None
    model_confidence: Optional[float] = None
    remediation_steps: Optional[List[str]] = None


# Day 4: Placement Schemas
class PlacementDriveCreate(BaseModel):
    drive_id: str
    company_name: str
    role_title: str
    job_description: str
    min_cgpa: float
    allowed_branches: List[str]
    application_deadline: str

class PlacementApplicationCreate(BaseModel):
    drive_id: str
    student_id: str
    student_name: str
    cgpa: float
    branch: str

class ATSScoreRequest(BaseModel):
    drive_id: str
    student_skills: List[str]
    student_summary: str

class ATSScoreResponse(BaseModel):
    drive_id: str
    ats_score_pct: float
    matched_skills: List[str]
    missing_skills: List[str]
    formatting_grade: str
    ats_recommendations: List[str]


# Day 5: Resume Builder Payload
class StudentProfileResume(BaseModel):
    name: str
    email: str
    phone: Optional[str] = "N/A"
    summary: Optional[str] = "Enthusiastic and results-driven student seeking technology placement opportunities."
    education: List[Dict[str, str]]
    skills: List[str]
    projects: List[Dict[str, str]]

# Day 6: Certificate Generation
class CertificateRequest(BaseModel):
    student_id: str
    student_name: str
    course_name: str
    completion_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))

# Day 9: Proctoring Violation Log
class ProctoringViolationCreate(BaseModel):
    student_id: str
    exam_id: str
    event_type: str  # "tab_switch", "window_blur", "copy_paste", "looking_away", "multiple_faces"
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    details: Optional[Dict[str, Any]] = None

# Day 10: RAG AI Tutor Query
class TutorQueryRequest(BaseModel):
    student_query: str
    course_context: str

class TutorQueryResponse(BaseModel):
    answer: str
    confidence_score: float
    context_chunks_used: int

class QuizGenRequest(BaseModel):
    course_context: str
    num_questions: int = Field(default=3, ge=1, le=5)

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_option_index: int
    explanation: str

class QuizGenResponse(BaseModel):
    questions: List[QuizQuestion]
    generated_at: str


# Day 11: Gamification Schemas
class AwardXPRequest(BaseModel):
    student_id: str
    action_type: str
    student_name: Optional[str] = None
    # Optional performance info — quiz XP scales with the score ratio so
    # better attempts earn more points than weak ones.
    score: Optional[float] = None
    max_score: Optional[float] = None

class StudentGamificationState(BaseModel):
    student_id: str
    xp_points: int
    level: int
    badges_unlocked: List[str]

# Day 12: Leaderboard Response
class LeaderboardEntry(BaseModel):
    rank: int
    student_id: str
    student_name: str
    xp_points: int
    level: int
