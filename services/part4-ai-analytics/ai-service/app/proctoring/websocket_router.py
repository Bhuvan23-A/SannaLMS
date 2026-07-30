import json
import logging
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from app.proctoring.vision import analyze_proctoring_frame

router = APIRouter(tags=["Real-Time Proctoring Microservice (WebSocket)"])

logger = logging.getLogger("lms.proctoring")

class FrameHTTPPayload(BaseModel):
    image_base64: str
    student_id: str = "STU_TEST"
    exam_id: str = "EXAM_DEMO"

@router.websocket("/ws/proctoring")
async def websocket_proctoring_stream(websocket: WebSocket):
    """
    Day 8 WebSocket Endpoint:
    Receives low-framerate video frames from client browser, routes them through
    OpenCV face and gaze detection, and streams real-time suspicion scores back to client.
    """
    await websocket.accept()
    logger.info("Client connected to proctoring WebSocket stream.")
    
    try:
        while True:
            # Receive message (JSON or raw string base64)
            data = await websocket.receive_text()
            
            try:
                payload = json.loads(data)
                frame_data = payload.get("frame", "")
                student_id = payload.get("student_id", "UNKNOWN")
                exam_id = payload.get("exam_id", "UNKNOWN")
            except Exception:
                frame_data = data
                student_id = "UNKNOWN"
                exam_id = "UNKNOWN"

            if not frame_data:
                await websocket.send_json({
                    "status": "error",
                    "message": "Empty frame payload",
                    "suspicious_activity_score": 0.0
                })
                continue

            # Route frame through vision analysis engine
            analysis_result = analyze_proctoring_frame(frame_data.encode('utf-8'))
            analysis_result["timestamp"] = datetime.utcnow().isoformat()
            analysis_result["student_id"] = student_id
            analysis_result["exam_id"] = exam_id
            
            # Send real-time JSON response back to browser client
            await websocket.send_json(analysis_result)

    except WebSocketDisconnect:
        logger.info("Client disconnected from proctoring WebSocket.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"status": "error", "detail": str(e)})
        except Exception:
            pass

@router.post("/api/proctoring/analyze-frame")
async def analyze_single_frame(payload: FrameHTTPPayload):
    """Day 8 HTTP Fallback Endpoint for single-frame proctoring evaluation."""
    try:
        result = analyze_proctoring_frame(payload.image_base64.encode('utf-8'))
        result["timestamp"] = datetime.utcnow().isoformat()
        result["student_id"] = payload.student_id
        result["exam_id"] = payload.exam_id
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Frame analysis failed: {str(e)}")
