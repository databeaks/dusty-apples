import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Import our modules
from backend.database import init_database
from backend.routers import basic, decision_tree, decision_trees, tour_sessions, users

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

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

# Add CORS middleware directly to both apps
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

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_database()

# --- Static Files Setup ---
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build")
os.makedirs(static_dir, exist_ok=True)

# --- Catch-all for React Routes (exclude API paths) ---
@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    # Don't serve React for API paths
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    index_html = os.path.join(static_dir, "index.html")
    if os.path.exists(index_html):
        logger.info(f"Serving React frontend for path: /{full_path}")
        return FileResponse(index_html)
    logger.error("Frontend not built. index.html missing.")
    raise HTTPException(
        status_code=404,
        detail="Frontend not built. Please run 'npm run build' first."
    )

# Mount static files for built assets (CSS, JS, etc.)
app.mount("/static", StaticFiles(directory=static_dir, html=False), name="static")