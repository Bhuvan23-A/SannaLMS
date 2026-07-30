import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from fastapi import APIRouter, HTTPException
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from app.db.schemas import StudentRiskInput, StudentRiskPrediction

router = APIRouter(prefix="/api/analytics", tags=["Advanced AI Dropout Prediction Model"])

MODEL_DIR = os.path.join(os.path.dirname(__file__), "weights")
MODEL_PATH = os.path.join(MODEL_DIR, "dropout_classifier.joblib")

def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """
    Advanced Feature Engineering Pipeline:
    - Calculates engagement_score combining quiz & attendance.
    - Calculates inactivity_ratio normalized over 30 days.
    - Computes risk_interaction_index for high-precision prediction.
    """
    df = df.copy()
    df["engagement_score"] = (df["attendance_percentage"] * 0.55) + (df["average_quiz_score"] * 0.45)
    df["inactivity_ratio"] = df["days_since_last_login"] / 30.0
    df["risk_interaction_index"] = df["inactivity_ratio"] * (100.0 - df["engagement_score"])
    return df

def generate_synthetic_training_data(n_samples: int = 1500) -> pd.DataFrame:
    """Generates realistic synthetic student learning data for robust ensemble model training."""
    np.random.seed(42)
    
    days_since_login = np.random.uniform(0, 45, n_samples)
    attendance = np.random.uniform(25, 100, n_samples)
    quiz_scores = np.random.uniform(15, 100, n_samples)
    
    # Ground Truth Labeling Formula
    risk_metric = (days_since_login / 45.0) * 0.45 + ((100.0 - attendance) / 75.0) * 0.30 + ((100.0 - quiz_scores) / 85.0) * 0.25
    dropout_label = (risk_metric >= 0.45).astype(int)
    
    df = pd.DataFrame({
        "days_since_last_login": days_since_login,
        "attendance_percentage": attendance,
        "average_quiz_score": quiz_scores,
        "dropout": dropout_label
    })
    
    return feature_engineering(df)

def train_and_save_dropout_model() -> Tuple[Pipeline, Dict[str, float]]:
    """
    Day 2 Advanced Model Training Loop:
    - Feature engineering pipeline
    - Ensemble Voting Classifier (Random Forest + Gradient Boosting)
    - Feature importance evaluation
    - Saves model weights to disk
    """
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    df = generate_synthetic_training_data(n_samples=1500)
    feature_cols = ["days_since_last_login", "average_quiz_score", "attendance_percentage", "engagement_score", "inactivity_ratio", "risk_interaction_index"]
    
    X = df[feature_cols]
    y = df["dropout"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    rf_clf = RandomForestClassifier(n_estimators=120, max_depth=6, random_state=42)
    gb_clf = GradientBoostingClassifier(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    
    ensemble = VotingClassifier(
        estimators=[("rf", rf_clf), ("gb", gb_clf)],
        voting="soft"
    )
    
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", ensemble)
    ])
    
    pipeline.fit(X_train, y_train)
    
    # Train standalone RF to capture feature importances for explainable AI
    rf_clf.fit(X_train, y_train)
    importances = dict(zip(feature_cols, [round(float(imp), 4) for imp in rf_clf.feature_importances_]))
    
    joblib.dump({"pipeline": pipeline, "feature_importances": importances}, MODEL_PATH)
    return pipeline, importances

def get_or_load_model() -> Tuple[Pipeline, Dict[str, float]]:
    if os.path.exists(MODEL_PATH):
        try:
            artifact = joblib.load(MODEL_PATH)
            if isinstance(artifact, dict) and "pipeline" in artifact:
                return artifact["pipeline"], artifact.get("feature_importances", {})
            return artifact, {}
        except Exception:
            return train_and_save_dropout_model()
    else:
        return train_and_save_dropout_model()

model_pipeline, cached_feature_importances = get_or_load_model()

@router.post("/train-dropout-model")
def retrain_model():
    """Trigger advanced ensemble model training loop and save fresh weights."""
    try:
        global model_pipeline, cached_feature_importances
        model_pipeline, cached_feature_importances = train_and_save_dropout_model()
        return {
            "status": "success",
            "message": "Advanced Ensemble AI Dropout Model (RandomForest + GradientBoosting) successfully retrained.",
            "feature_importances": cached_feature_importances,
            "weights_file": MODEL_PATH
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")

@router.post("/predict-dropout", response_model=StudentRiskPrediction)
def predict_student_dropout(data: StudentRiskInput):
    """
    Day 2 Advanced Inference Endpoint with Explainable AI (XAI):
    Predicts student dropout risk, confidence probability, feature contribution breakdown, and actionable remediation steps.
    """
    global model_pipeline, cached_feature_importances
    try:
        raw_df = pd.DataFrame([{
            "days_since_last_login": data.days_since_last_login,
            "average_quiz_score": data.average_quiz_score,
            "attendance_percentage": data.attendance_percentage
        }])
        
        engineered_df = feature_engineering(raw_df)
        feature_cols = ["days_since_last_login", "average_quiz_score", "attendance_percentage", "engagement_score", "inactivity_ratio", "risk_interaction_index"]
        
        try:
            prob = float(model_pipeline.predict_proba(engineered_df[feature_cols])[0][1])
        except Exception:
            # Retrain model if cached weights have mismatched features
            model_pipeline, cached_feature_importances = train_and_save_dropout_model()
            prob = float(model_pipeline.predict_proba(engineered_df[feature_cols])[0][1])
            
        is_dropout = bool(prob >= 0.5)
        
        contributions = {
            "days_inactive_impact": round(min(1.0, data.days_since_last_login / 30.0), 2),
            "quiz_deficiency_impact": round(max(0.0, (100.0 - data.average_quiz_score) / 100.0), 2),
            "attendance_deficiency_impact": round(max(0.0, (100.0 - data.attendance_percentage) / 100.0), 2)
        }
        
        remediation_steps = []
        if data.days_since_last_login > 7:
            remediation_steps.append(f"Send automated re-engagement notification email & SMS (Inactive for {data.days_since_last_login} days).")
        if data.average_quiz_score < 60.0:
            remediation_steps.append(f"Assign personalized foundational tutoring modules (Current Quiz Avg: {data.average_quiz_score}%).")
        if data.attendance_percentage < 75.0:
            remediation_steps.append(f"Schedule 1-on-1 counselor check-in (Attendance: {data.attendance_percentage}%).")
        if not remediation_steps:
            remediation_steps.append("Student is performing optimally. Continue regular course pacing.")
            
        if prob < 0.35:
            risk_level = "LOW"
            recommendation = "Student is well engaged with strong academic standing. Continue current learning path."
        elif prob < 0.65:
            risk_level = "MEDIUM"
            recommendation = "Moderate risk detected. Initiate proactive academic support and quiz remediation."
        else:
            risk_level = "HIGH"
            recommendation = "URGENT: High risk of student dropout! Immediate mentor intervention required."
            
        return StudentRiskPrediction(
            dropout_risk=is_dropout,
            risk_probability=round(prob, 4),
            risk_level=risk_level,
            recommendation=recommendation,
            feature_contributions=contributions,
            model_confidence=round(abs(prob - 0.5) * 2.0, 2),
            remediation_steps=remediation_steps
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

