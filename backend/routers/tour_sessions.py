from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import json
from backend.database import get_db_connection
from backend.routers.users import get_or_create_user, UserResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/tour-sessions",
    tags=["tour-sessions"]
)

def ensure_user_exists(request: Request) -> str:
    """Ensure user exists in database and return username"""
    from backend.routers.users import extract_user_info
    
    user_info = extract_user_info(request)
    username = user_info["username"]
    
    if not username or username == "anonymous":
        logger.warning("Anonymous user attempting to access tour sessions")
        return username  # Still allow anonymous users for demo purposes
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Try to get existing user
            cur.execute("SELECT username FROM users WHERE username = %s", (username,))
            user = cur.fetchone()
            
            if not user:
                # Create new user with default role 'user'
                cur.execute("""
                    INSERT INTO users (username, email, full_name, role)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (username) DO NOTHING
                """, (username, user_info["email"], user_info["full_name"], "user"))
                conn.commit()
                logger.info(f"Created new user: {username} with role 'user'")
            else:
                # Update last_accessed time
                cur.execute("""
                    UPDATE users 
                    SET last_accessed = CURRENT_TIMESTAMP 
                    WHERE username = %s
                """, (username,))
                conn.commit()
            
            return username
                
    except Exception as e:
        logger.error(f"Failed to ensure user exists: {e}")
        conn.rollback()
        return username  # Return username anyway to allow operation to continue
    finally:
        conn.close()

class TourSessionCreate(BaseModel):
    tree_id: str
    current_step: Optional[str] = None

class TourSessionUpdate(BaseModel):
    status: Optional[str] = None
    current_step: Optional[str] = None
    answers: Optional[Dict[str, Any]] = None
    recommendation: Optional[Dict[str, Any]] = None
    progress_percentage: Optional[int] = None
    session_state: Optional[Dict[str, Any]] = None

class TourSessionResponse(BaseModel):
    id: str
    tree_id: str
    user_id: str
    status: str
    date_started: str
    date_completed: Optional[str] = None
    current_step: Optional[str] = None
    answers: Dict[str, Any]
    recommendation: Optional[Dict[str, Any]] = None
    progress_percentage: int
    session_state: Dict[str, Any]
    tree_name: Optional[str] = None

@router.post("/", response_model=TourSessionResponse)
async def create_tour_session(session: TourSessionCreate, request: Request):
    """Create a new tour session"""
    # Ensure user exists in our database
    username = ensure_user_exists(request)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if tree exists
            cur.execute("SELECT name FROM decision_trees WHERE id = %s", (session.tree_id,))
            tree = cur.fetchone()
            if not tree:
                raise HTTPException(status_code=404, detail="Decision tree not found")
            
            # Create new session
            cur.execute("""
                INSERT INTO tour_sessions (tree_id, user_id, status, current_step)
                VALUES (%s, %s, %s, %s)
                RETURNING id, date_started
            """, (session.tree_id, username, 'in_progress', session.current_step))
            
            result = cur.fetchone()
            session_id, date_started = result
            
            conn.commit()
            
            return TourSessionResponse(
                id=str(session_id),
                tree_id=session.tree_id,
                user_id=username,
                status='in_progress',
                date_started=date_started.isoformat() + 'Z',
                current_step=session.current_step,
                answers={},
                progress_percentage=0,
                session_state={},
                tree_name=tree[0]
            )
            
    except Exception as e:
        logger.error(f"Failed to create tour session: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to create tour session")
    finally:
        conn.close()

@router.get("/my-sessions", response_model=List[TourSessionResponse])
async def get_my_tour_sessions(request: Request, limit: int = 10):
    """Get tour sessions for current authenticated user"""
    # Ensure user exists in our database and get username
    username = ensure_user_exists(request)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ts.id, ts.tree_id, ts.user_id, ts.status, ts.date_started,
                       ts.date_completed, ts.current_step, ts.answers, ts.recommendation,
                       ts.progress_percentage, ts.session_state, dt.name as tree_name
                FROM tour_sessions ts
                LEFT JOIN decision_trees dt ON ts.tree_id = dt.id
                WHERE ts.user_id = %s
                ORDER BY ts.date_started DESC
                LIMIT %s
            """, (username, limit))
            
            sessions = []
            for row in cur.fetchall():
                sessions.append(TourSessionResponse(
                    id=str(row[0]),
                    tree_id=str(row[1]),
                    user_id=row[2],
                    status=row[3],
                    date_started=row[4].isoformat() + 'Z',
                    date_completed=row[5].isoformat() + 'Z' if row[5] else None,
                    current_step=row[6],
                    answers=row[7] or {},
                    recommendation=row[8],
                    progress_percentage=row[9],
                    session_state=row[10] or {},
                    tree_name=row[11]
                ))
            
            return sessions
            
    except Exception as e:
        logger.error(f"Failed to get user tour sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get tour sessions")
    finally:
        conn.close()

@router.get("/{session_id}", response_model=TourSessionResponse)
async def get_tour_session(session_id: str):
    """Get a specific tour session by ID"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ts.id, ts.tree_id, ts.user_id, ts.status, ts.date_started,
                       ts.date_completed, ts.current_step, ts.answers, ts.recommendation,
                       ts.progress_percentage, ts.session_state, dt.name as tree_name
                FROM tour_sessions ts
                LEFT JOIN decision_trees dt ON ts.tree_id = dt.id
                WHERE ts.id = %s
            """, (session_id,))
            
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Tour session not found")
            
            return TourSessionResponse(
                id=str(row[0]),
                tree_id=str(row[1]),
                user_id=row[2],
                status=row[3],
                date_started=row[4].isoformat() + 'Z',
                date_completed=row[5].isoformat() + 'Z' if row[5] else None,
                current_step=row[6],
                answers=row[7] or {},
                recommendation=row[8],
                progress_percentage=row[9],
                session_state=row[10] or {},
                tree_name=row[11]
            )
            
    except Exception as e:
        logger.error(f"Failed to get tour session: {e}")
        raise HTTPException(status_code=500, detail="Failed to get tour session")
    finally:
        conn.close()

@router.put("/{session_id}", response_model=TourSessionResponse)
async def update_tour_session(session_id: str, update: TourSessionUpdate):
    """Update a tour session"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Build dynamic update query
            update_fields = []
            update_values = []
            
            if update.status is not None:
                update_fields.append("status = %s")
                update_values.append(update.status)
                
                # Auto-set date_completed if status is completed
                if update.status == 'completed':
                    update_fields.append("date_completed = CURRENT_TIMESTAMP")
            
            if update.current_step is not None:
                update_fields.append("current_step = %s")
                update_values.append(update.current_step)
            
            if update.answers is not None:
                update_fields.append("answers = %s")
                update_values.append(json.dumps(update.answers))
            
            if update.recommendation is not None:
                update_fields.append("recommendation = %s")
                update_values.append(json.dumps(update.recommendation))
            
            if update.progress_percentage is not None:
                update_fields.append("progress_percentage = %s")
                update_values.append(update.progress_percentage)
            
            if update.session_state is not None:
                update_fields.append("session_state = %s")
                update_values.append(json.dumps(update.session_state))
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            update_values.append(session_id)
            
            cur.execute(f"""
                UPDATE tour_sessions 
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, tree_id, user_id, status, date_started, date_completed,
                          current_step, answers, recommendation, progress_percentage, session_state
            """, update_values)
            
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Tour session not found")
            
            # Get tree name
            cur.execute("SELECT name FROM decision_trees WHERE id = %s", (row[1],))
            tree_name_result = cur.fetchone()
            tree_name = tree_name_result[0] if tree_name_result else None
            
            conn.commit()
            
            return TourSessionResponse(
                id=str(row[0]),
                tree_id=str(row[1]),
                user_id=row[2],
                status=row[3],
                date_started=row[4].isoformat() + 'Z',
                date_completed=row[5].isoformat() + 'Z' if row[5] else None,
                current_step=row[6],
                answers=row[7] or {},
                recommendation=row[8],
                progress_percentage=row[9],
                session_state=row[10] or {},
                tree_name=tree_name
            )
            
    except Exception as e:
        logger.error(f"Failed to update tour session: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update tour session")
    finally:
        conn.close()

@router.delete("/{session_id}")
async def delete_tour_session(session_id: str):
    """Delete a tour session"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tour_sessions WHERE id = %s RETURNING id", (session_id,))
            deleted = cur.fetchone()
            
            if not deleted:
                raise HTTPException(status_code=404, detail="Tour session not found")
            
            conn.commit()
            return {"message": "Tour session deleted successfully"}
            
    except Exception as e:
        logger.error(f"Failed to delete tour session: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete tour session")
    finally:
        conn.close()
