import io
import pandas as pd
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.analytics.router import get_aggregated_metrics

router = APIRouter(prefix="/api/analytics", tags=["Power BI Data Formatter"])

def convert_metrics_to_powerbi_csv(records: list) -> str:
    """
    Day 3 Utility Function:
    Formats aggregated JSON metrics into a flat, denormalized CSV structure
    specifically optimized for direct import into Power BI.
    - Standardizes date formats to ISO 8601 (YYYY-MM-DD)
    - Explicitly maps foreign keys (fk_batch_id, fk_tenant_id)
    """
    if not records:
        return "fk_batch_id,fk_tenant_id,avg_attendance_pct,avg_quiz_score_pct,avg_course_completion_pct,rolling_avg_attendance_pct,rolling_avg_quiz_score_pct,rolling_avg_completion_pct,export_date_iso\n"
    
    df = pd.DataFrame(records)
    
    df = df.rename(columns={
        "batch_id": "fk_batch_id",
        "tenant_id": "fk_tenant_id",
        "avg_attendance": "avg_attendance_pct",
        "avg_quiz_score": "avg_quiz_score_pct",
        "avg_completion_rate": "avg_course_completion_pct",
        "rolling_avg_attendance": "rolling_avg_attendance_pct",
        "rolling_avg_quiz_score": "rolling_avg_quiz_score_pct",
        "rolling_avg_completion_rate": "rolling_avg_completion_pct"
    })
    
    current_iso_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    df["export_date_iso"] = current_iso_date
    
    df["fk_batch_id"] = df["fk_batch_id"].astype(str).str.strip()
    df["fk_tenant_id"] = df["fk_tenant_id"].astype(str).str.strip()
    
    power_bi_columns = [
        "fk_tenant_id",
        "fk_batch_id",
        "avg_attendance_pct",
        "avg_quiz_score_pct",
        "avg_course_completion_pct",
        "rolling_avg_attendance_pct",
        "rolling_avg_quiz_score_pct",
        "rolling_avg_completion_pct",
        "export_date_iso"
    ]
    
    existing_cols = [col for col in power_bi_columns if col in df.columns]
    df_powerbi = df[existing_cols]
    
    csv_buffer = io.StringIO()
    df_powerbi.to_csv(csv_buffer, index=False)
    return csv_buffer.getvalue()

@router.get("/export-powerbi-csv")
async def export_powerbi_csv():
    """
    Day 3 Endpoint:
    Triggers Day 1 aggregation, formats JSON into Power BI denormalized CSV,
    and returns it as a downloadable CSV stream.
    """
    try:
        agg_response = await get_aggregated_metrics()
        csv_data = convert_metrics_to_powerbi_csv(agg_response.grouped_analytics)
        
        filename = f"powerbi_lms_analytics_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Power BI CSV export failed: {str(e)}")
