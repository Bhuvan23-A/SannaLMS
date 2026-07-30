import pandas as pd
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.db.database import db_manager
from app.db.schemas import AnalyticsAggregationResponse

router = APIRouter(prefix="/api/analytics", tags=["Data Aggregation Engine"])

@router.get("/aggregated-metrics", response_model=AnalyticsAggregationResponse)
async def get_aggregated_metrics():
    """
    Day 1 Endpoint:
    Connects to database, pulls student attendance, quiz scores, and course completion rates using Pandas.
    Groups data by batch_id and tenant_id, calculates rolling averages, and returns aggregated JSON.
    """
    try:
        if not db_manager.use_in_memory and db_manager.db is not None:
            attendance_docs = await db_manager.db.attendance.find({}, {"_id": 0}).to_list(1000)
            quiz_docs = await db_manager.db.quiz_scores.find({}, {"_id": 0}).to_list(1000)
            completion_docs = await db_manager.db.course_completions.find({}, {"_id": 0}).to_list(1000)
        else:
            attendance_docs = db_manager.in_memory_store["attendance"]
            quiz_docs = db_manager.in_memory_store["quiz_scores"]
            completion_docs = db_manager.in_memory_store["course_completions"]

        if not attendance_docs or not quiz_docs or not completion_docs:
            raise HTTPException(status_code=404, detail="No analytics data found in database. Seed data first.")

        df_attendance = pd.DataFrame(attendance_docs)
        df_quizzes = pd.DataFrame(quiz_docs)
        df_completions = pd.DataFrame(completion_docs)

        merged_df = df_attendance.merge(
            df_quizzes, on=["student_id", "batch_id", "tenant_id"], how="inner"
        ).merge(
            df_completions, on=["student_id", "batch_id", "tenant_id"], how="inner"
        )

        merged_df["attendance_pct"] = pd.to_numeric(merged_df["attendance_pct"], errors="coerce")
        merged_df["score"] = pd.to_numeric(merged_df["score"], errors="coerce")
        merged_df["completion_rate"] = pd.to_numeric(merged_df["completion_rate"], errors="coerce")

        grouped = merged_df.groupby(["batch_id", "tenant_id"]).agg(
            avg_attendance=("attendance_pct", "mean"),
            avg_quiz_score=("score", "mean"),
            avg_completion_rate=("completion_rate", "mean"),
            student_count=("student_id", "nunique")
        ).reset_index()

        grouped = grouped.sort_values(by=["tenant_id", "batch_id"])

        grouped["rolling_avg_attendance"] = grouped.groupby("tenant_id")["avg_attendance"].transform(
            lambda x: x.rolling(window=2, min_periods=1).mean()
        )
        grouped["rolling_avg_quiz_score"] = grouped.groupby("tenant_id")["avg_quiz_score"].transform(
            lambda x: x.rolling(window=2, min_periods=1).mean()
        )
        grouped["rolling_avg_completion_rate"] = grouped.groupby("tenant_id")["avg_completion_rate"].transform(
            lambda x: x.rolling(window=2, min_periods=1).mean()
        )

        result_df = grouped.round({
            "avg_attendance": 2,
            "avg_quiz_score": 2,
            "avg_completion_rate": 4,
            "rolling_avg_attendance": 2,
            "rolling_avg_quiz_score": 2,
            "rolling_avg_completion_rate": 4
        })

        results = result_df.to_dict(orient="records")

        return AnalyticsAggregationResponse(
            total_records_processed=len(merged_df),
            grouped_analytics=results,
            generated_at=datetime.now(timezone.utc).isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data aggregation failed: {str(e)}")

@router.get("/high-risk-watchlist")
async def get_high_risk_watchlist():
    """
    Day 1 & 2 Watchlist Endpoint:
    Evaluates all active students through the Ensemble AI Dropout Predictor
    and compiles a real-time risk watchlist for academic intervention.
    """
    if not db_manager.use_in_memory and db_manager.db is not None:
        students = await db_manager.db.students.find({}, {"_id": 0}).to_list(100)
    else:
        students = db_manager.in_memory_store["students"]

    watchlist = []
    from app.analytics.ml_model import predict_student_dropout
    from app.db.schemas import StudentRiskInput

    for student in students:
        input_data = StudentRiskInput(
            days_since_last_login=student.get("days_since_last_login", 0),
            average_quiz_score=float(student.get("average_quiz_score", 70.0)),
            attendance_percentage=float(student.get("attendance_percentage", 75.0))
        )
        prediction = predict_student_dropout(input_data)
        
        watchlist.append({
            "student_id": student.get("student_id"),
            "student_name": student.get("name"),
            "batch_id": student.get("batch_id"),
            "dropout_risk": prediction.dropout_risk,
            "risk_probability": prediction.risk_probability,
            "risk_level": prediction.risk_level,
            "recommendation": prediction.recommendation,
            "remediation_steps": prediction.remediation_steps
        })

    # Sort descending by risk_probability
    watchlist.sort(key=lambda x: x["risk_probability"], reverse=True)
    return {
        "total_students_evaluated": len(watchlist),
        "high_risk_count": sum(1 for s in watchlist if s["risk_level"] == "HIGH"),
        "watchlist": watchlist
    }

