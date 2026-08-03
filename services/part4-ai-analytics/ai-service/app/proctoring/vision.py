import cv2
import numpy as np
import base64
import logging
from typing import Dict, Any

logger = logging.getLogger("lms.vision")

# Initialize OpenCV Haar Cascade Classifiers with safe attribute checks
face_cascade = None
eye_cascade = None

try:
    if hasattr(cv2, 'CascadeClassifier') and hasattr(cv2, 'data'):
        face_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        eye_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
        face_cascade = cv2.CascadeClassifier(face_path)
        eye_cascade = cv2.CascadeClassifier(eye_path)
except Exception as e:
        logger.warning(f"Could not load OpenCV CascadeClassifier: {e}")

def decode_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Decodes raw or base64 image bytes to OpenCV BGR image matrix."""
    try:
        if image_bytes.startswith(b'data:image') or b'base64,' in image_bytes:
            header, encoded = image_bytes.split(b'base64,')
            image_bytes = base64.b64decode(encoded)
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Image decoding error: {e}")
        return None

def analyze_proctoring_frame(image_bytes: bytes) -> Dict[str, Any]:
    """
    Day 7 AI Vision Core Engine:
    Processes webcam frame and performs:
    1. Zero face detection (Student left desk)
    2. Multiple face detection (Unauthorized person present)
    3. Gaze direction estimation (Looking away from exam screen)
    4. Calculates real-time suspicion score (0.0 to 1.0)
    """
    img = decode_image_from_bytes(image_bytes)
    if img is None:
        return {
            "status": "error",
            "message": "Invalid image frame data",
            "face_count": 0,
            "suspicious_activity_score": 0.5,
            "flags": ["INVALID_FRAME"]
        }

    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
    except Exception:
        gray = img
        height, width = img.shape[:2]

    face_count = 0
    faces = []

    # Safe Cascade Detection
    if face_cascade is not None and hasattr(face_cascade, 'detectMultiScale') and not face_cascade.empty():
        try:
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(40, 40)
            )
            face_count = len(faces)
        except Exception as e:
            logger.warning(f"Face detection cascade failed: {e}")
            face_count = 0

    flags = []
    suspicion_score = 0.0
    gaze_direction = "CENTER"

    if face_count == 0:
        flags.append("NO_FACE_DETECTED")
        suspicion_score += 0.85
    elif face_count > 1:
        flags.append("MULTIPLE_FACES_DETECTED")
        suspicion_score += 0.95
    else:
        # Exactly 1 face present -> Analyze gaze direction
        (x, y, w, h) = faces[0]
        face_center_x = x + (w / 2)
        frame_center_x = width / 2
        
        if face_center_x < frame_center_x - (width * 0.18):
            gaze_direction = "LOOKING_LEFT"
            flags.append("LOOKING_AWAY_LEFT")
            suspicion_score += 0.40
        elif face_center_x > frame_center_x + (width * 0.18):
            gaze_direction = "LOOKING_RIGHT"
            flags.append("LOOKING_AWAY_RIGHT")
            suspicion_score += 0.40

    suspicion_score = round(min(1.0, max(0.0, suspicion_score)), 2)

    return {
        "status": "success",
        "face_count": face_count,
        "estimated_gaze": gaze_direction,
        "suspicious_activity_score": suspicion_score,
        "is_suspicious": suspicion_score >= 0.5,
        "flags": flags
    }
