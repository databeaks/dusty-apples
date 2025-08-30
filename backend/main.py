import os
import logging
import time
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Import our modules
from backend.database import init_database, shutdown_database_connections
from backend.routers import basic, decision_tree, decision_trees, tour_sessions, users, feedback

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# --- Request Logging Middleware ---
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate a unique request ID for tracking
        import uuid
        request_id = str(uuid.uuid4())[:8]
        
        # Log request start
        start_time = time.time()
        logger.info(f"[{request_id}] {request.method} {request.url} - Request started")
        
        # Log request headers (excluding sensitive ones)
        safe_headers = {k: v for k, v in request.headers.items() 
                      if k.lower() not in ['authorization', 'cookie', 'x-api-key']}
        logger.info(f"[{request_id}] Request headers: {safe_headers}")
        
        # Log client info
        client_host = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
        logger.info(f"[{request_id}] Client: {client_host}")
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log response
            logger.info(f"[{request_id}] {request.method} {request.url} - {response.status_code} - {duration:.3f}s")
            
            # Log warning for slow requests
            if duration > 5.0:
                logger.warning(f"[{request_id}] Slow request: {duration:.3f}s for {request.method} {request.url}")
            
            return response
            
        except Exception as e:
            # Calculate duration for failed requests
            duration = time.time() - start_time
            
            # Log error details
            logger.error(f"[{request_id}] {request.method} {request.url} - ERROR after {duration:.3f}s: {str(e)}")
            logger.error(f"[{request_id}] Exception type: {type(e).__name__}")
            
            # Log full traceback for debugging
            import traceback
            logger.error(f"[{request_id}] Full traceback: {traceback.format_exc()}")
            
            # Re-raise the exception to maintain FastAPI's error handling
            raise

app = FastAPI(title="Simple FastAPI + React App")

# --- CORS Configuration ---
# Configure CORS for development and Databricks Apps
origins = [
    "http://localhost:3000",  # Local development
    "http://127.0.0.1:3000",
    "https://*.cloud.databricks.com",  # Databricks Apps domains
    "https://*.databricks.com",
    "wss://*.cloud.databricks.com",
    "wss://*.databricks.com"
]

# Add request logging middleware first (outermost)
app.add_middleware(RequestLoggingMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Routers ---
app.include_router(basic.router)
app.include_router(decision_tree.router)
app.include_router(decision_trees.router)
app.include_router(tour_sessions.router)
app.include_router(users.router)
app.include_router(feedback.router)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    logger.info("=== Application startup initiated ===")
    try:
        logger.info("Initializing database...")
        init_database()
        logger.info("Database initialization completed successfully")
        logger.info("=== Application startup completed successfully ===")
    except Exception as e:
        logger.error(f"=== Application startup FAILED ===")
        logger.error(f"Database initialization failed: {e}")
        logger.error(f"Startup error type: {type(e).__name__}")
        import traceback
        logger.error(f"Startup error traceback: {traceback.format_exc()}")
        # Re-raise to prevent the app from starting with a broken database
        raise

# Cleanup database connections on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("=== Application shutdown initiated ===")
    try:
        logger.info("Shutting down database connections...")
        shutdown_database_connections()
        logger.info("Database connections shut down successfully")
        logger.info("=== Application shutdown completed ===")
    except Exception as e:
        logger.error(f"Error during application shutdown: {e}")
        logger.error(f"Shutdown error type: {type(e).__name__}")
        # Don't re-raise on shutdown as the app is already stopping

# --- Static Files Setup ---
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build")
os.makedirs(static_dir, exist_ok=True)

app.mount("/", StaticFiles(directory=static_dir, html=True), name="build")

# --- Catch-all for React Routes ---
@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    index_html = os.path.join(static_dir, "index.html")
    if os.path.exists(index_html):
        logger.info(f"Serving React frontend for path: /{full_path}")
        return FileResponse(index_html)
    logger.error("Frontend not built. index.html missing.")
    raise HTTPException(
        status_code=404,
        detail="Frontend not built. Please run 'npm run build' first."
    )