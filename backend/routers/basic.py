import logging
from fastapi import APIRouter, Request
from backend.database import test_db_connection, get_credential_stats

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

@router.get("/api/db-test")
async def database_test():
    """Test database connection and return connection info"""
    logger.info("Database test requested at /api/db-test")
    db_status = test_db_connection()
    credential_stats = get_credential_stats()
    return {
        "database": db_status,
        "credential_management": credential_stats
    }

@router.get("/api/env-info")
async def environment_info():
    """Return environment configuration info (without secrets)"""
    import os
    from backend.database import ENVIRONMENT
    
    logger.info("Environment info requested at /api/env-info")
    
    # Safe environment info (no secrets)
    info = {
        "environment": ENVIRONMENT,
        "databricks_instance_name": os.getenv("DATABRICKS_INSTANCE_NAME", "not_set"),
        "databricks_user_name": os.getenv("DATABRICKS_USER_NAME", "not_set"),
        "database_url_set": bool(os.getenv("DATABASE_URL")),
        "databricks_host_set": bool(os.getenv("DATABRICKS_HOST")),
        "databricks_token_set": bool(os.getenv("DATABRICKS_TOKEN")),
    }
    
    return info 