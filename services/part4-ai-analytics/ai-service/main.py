import uvicorn
from app.main import app

@app.get("/health", tags=["System Utility"])
def health_check():
    return {
        "service": "ai-service",
        "status": "UP",
        "part": "Part 4: AI Integration, Analytics & Placements"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
