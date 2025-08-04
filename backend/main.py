import os
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Simple FastAPI + React App")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js development server
        "http://127.0.0.1:3000",  # Alternative localhost format
        "https://localhost:3000", # HTTPS variant
        "https://127.0.0.1:3000", # HTTPS alternative
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# --- API Routes ---
@app.get("/api/hello")
async def hello():
    logger.info("Accessed /api/hello")
    return {"message": "Hello from FastAPI!"}

@app.get("/api/health")
async def health_check():
    logger.info("Health check at /api/health")
    return {"status": "healthy"}

@app.get("/api/data")
async def get_data():
    logger.info("Data requested at /api/data")
    data = [{"x": x, "y": 2 ** x} for x in range(30)]
    return {
        "data": data,
        "title": "Hello world!",
        "x_title": "Apps",
        "y_title": "Fun with data"
    }

@app.get("/api/user")
async def get_user(request: Request):
    logger.info("User info requested at /api/user")
    user_email = request.headers.get("X-Forwarded-Email", "test@example.com")
    return {"email": user_email}

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