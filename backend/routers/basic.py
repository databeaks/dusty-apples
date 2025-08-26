import logging
from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)
router = APIRouter(tags=["basic"])

@router.get("/api/hello")
async def hello():
    logger.info("Accessed /api/hello")
    return {"message": "Hello from FastAPI!"}

@router.get("/api/health")
async def health_check():
    logger.info("Health check at /api/health")
    return {"status": "healthy"}

@router.get("/api/data")
async def get_data():
    logger.info("Data requested at /api/data")
    data = [{"x": x, "y": 2 ** x} for x in range(30)]
    return {
        "data": data,
        "title": "Hello world!",
        "x_title": "Apps",
        "y_title": "Fun with data"
    }

@router.get("/api/user")
async def get_user(request: Request):
    logger.info("User info requested at /api/user")
    user_email = request.headers.get("X-Forwarded-Email", "test@example.com")
    return {"email": user_email} 