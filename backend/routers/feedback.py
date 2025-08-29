from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
import logging
from backend.database import get_db_connection
from backend.routers.users import get_or_create_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/feedback",
    tags=["feedback"]
)

# Pydantic Models
FeedbackCategory = Literal["bug", "feature_request", "tour_suggestion", "other"]
FeedbackStatus = Literal["open", "in_progress", "resolved", "closed"]
UserRole = Literal["user", "admin"]

class FeedbackResponse(BaseModel):
    id: str
    username: str
    date_submitted: str
    category: FeedbackCategory
    user_role: UserRole
    role: Optional[str] = None  # Optional role field 
    comment: str
    status: FeedbackStatus
    created_at: str
    updated_at: str

class FeedbackCreateRequest(BaseModel):
    category: FeedbackCategory
    role: Optional[str] = None  # Optional role field
    comment: str

class FeedbackUpdateRequest(BaseModel):
    status: Optional[FeedbackStatus] = None
    role: Optional[str] = None
    comment: Optional[str] = None

class FeedbackListResponse(BaseModel):
    feedback: List[FeedbackResponse]
    total: int

class FeedbackStatsResponse(BaseModel):
    total: int
    by_category: dict
    by_status: dict
    by_role: dict

def format_feedback_response(row) -> FeedbackResponse:
    """Convert database row to FeedbackResponse"""
    return FeedbackResponse(
        id=str(row[0]),
        username=row[1],
        date_submitted=row[2].isoformat() + 'Z',
        category=row[3],
        user_role=row[4],
        role=row[5],  # Optional role
        comment=row[6],
        status=row[7],
        created_at=row[8].isoformat() + 'Z',
        updated_at=row[9].isoformat() + 'Z'
    )

@router.post("/", response_model=FeedbackResponse)
async def submit_feedback(
    feedback_request: FeedbackCreateRequest,
    request: Request
):
    """Submit new feedback"""
    # Get current user info
    current_user = await get_or_create_user(request)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO feedback (username, category, user_role, role, comment)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, username, date_submitted, category, user_role, role, comment, status, created_at, updated_at
            """, (
                current_user.username,
                feedback_request.category,
                current_user.role,
                feedback_request.role,
                feedback_request.comment
            ))
            
            new_feedback = cur.fetchone()
            
            # If user provided a role, update their user profile with it
            if feedback_request.role:
                cur.execute("""
                    UPDATE users 
                    SET company_role = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE username = %s
                """, (feedback_request.role, current_user.username))
                logger.info(f"Updated company role for {current_user.username}: {feedback_request.role}")
            
            conn.commit()
            
            logger.info(f"New feedback submitted by {current_user.username}: {feedback_request.category}")
            
            return format_feedback_response(new_feedback)
            
    except Exception as e:
        logger.error(f"Failed to submit feedback: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
    finally:
        conn.close()

@router.get("/", response_model=FeedbackListResponse)
async def get_feedback_list(
    request: Request,
    category: Optional[FeedbackCategory] = None,
    status: Optional[FeedbackStatus] = None,
    username: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0)
):
    """Get feedback list with optional filters (admin only for all feedback, users see their own)"""
    # Get current user info
    current_user = await get_or_create_user(request)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Build query with filters
            where_conditions = []
            params = []
            
            # Users can only see their own feedback unless they're admin
            if current_user.role != "admin":
                where_conditions.append("username = %s")
                params.append(current_user.username)
            else:
                # Admin can filter by username if specified
                if username:
                    where_conditions.append("username = %s")
                    params.append(username)
            
            if category:
                where_conditions.append("category = %s")
                params.append(category)
            
            if status:
                where_conditions.append("status = %s")
                params.append(status)
            
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            # Get total count
            count_query = f"SELECT COUNT(*) FROM feedback {where_clause}"
            cur.execute(count_query, params)
            total = cur.fetchone()[0]
            
            # Get feedback list
            params.extend([limit, offset])
            list_query = f"""
                SELECT id, username, date_submitted, category, user_role, role, comment, status, created_at, updated_at
                FROM feedback 
                {where_clause}
                ORDER BY date_submitted DESC
                LIMIT %s OFFSET %s
            """
            cur.execute(list_query, params)
            
            feedback_list = []
            for row in cur.fetchall():
                feedback_list.append(format_feedback_response(row))
            
            return FeedbackListResponse(feedback=feedback_list, total=total)
            
    except Exception as e:
        logger.error(f"Failed to get feedback list: {e}")
        raise HTTPException(status_code=500, detail="Failed to get feedback list")
    finally:
        conn.close()

@router.get("/stats", response_model=FeedbackStatsResponse)
async def get_feedback_stats(request: Request):
    """Get feedback statistics (admin only)"""
    # Get current user info
    current_user = await get_or_create_user(request)
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get total count
            cur.execute("SELECT COUNT(*) FROM feedback")
            total = cur.fetchone()[0]
            
            # Get stats by category
            cur.execute("""
                SELECT category, COUNT(*) 
                FROM feedback 
                GROUP BY category
            """)
            by_category = {row[0]: row[1] for row in cur.fetchall()}
            
            # Get stats by status
            cur.execute("""
                SELECT status, COUNT(*) 
                FROM feedback 
                GROUP BY status
            """)
            by_status = {row[0]: row[1] for row in cur.fetchall()}
            
            # Get stats by user_role
            cur.execute("""
                SELECT user_role, COUNT(*) 
                FROM feedback 
                GROUP BY user_role
            """)
            by_role = {row[0]: row[1] for row in cur.fetchall()}
            
            return FeedbackStatsResponse(
                total=total,
                by_category=by_category,
                by_status=by_status,
                by_role=by_role
            )
            
    except Exception as e:
        logger.error(f"Failed to get feedback stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get feedback stats")
    finally:
        conn.close()

@router.get("/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback_by_id(
    feedback_id: str,
    request: Request
):
    """Get specific feedback by ID"""
    # Get current user info
    current_user = await get_or_create_user(request)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Users can only see their own feedback unless they're admin
            if current_user.role == "admin":
                cur.execute("""
                    SELECT id, username, date_submitted, category, user_role, role, comment, status, created_at, updated_at
                    FROM feedback 
                    WHERE id = %s
                """, (feedback_id,))
            else:
                cur.execute("""
                    SELECT id, username, date_submitted, category, user_role, role, comment, status, created_at, updated_at
                    FROM feedback 
                    WHERE id = %s AND username = %s
                """, (feedback_id, current_user.username))
            
            feedback = cur.fetchone()
            
            if not feedback:
                raise HTTPException(status_code=404, detail="Feedback not found")
            
            return format_feedback_response(feedback)
            
    except Exception as e:
        logger.error(f"Failed to get feedback by ID: {e}")
        raise HTTPException(status_code=500, detail="Failed to get feedback")
    finally:
        conn.close()

@router.put("/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback(
    feedback_id: str,
    update_request: FeedbackUpdateRequest,
    request: Request
):
    """Update feedback (users can update their own comments and role, admins can update status and any feedback)"""
    # Get current user info
    current_user = await get_or_create_user(request)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if feedback exists and get ownership info
            cur.execute("""
                SELECT id, username, category, user_role, role, comment, status
                FROM feedback WHERE id = %s
            """, (feedback_id,))
            
            existing_feedback = cur.fetchone()
            if not existing_feedback:
                raise HTTPException(status_code=404, detail="Feedback not found")
            
            feedback_owner = existing_feedback[1]
            
            # Build dynamic update query
            update_fields = []
            update_values = []
            
            # Users can update their own comments and role
            if update_request.comment is not None:
                if current_user.role != "admin" and current_user.username != feedback_owner:
                    raise HTTPException(status_code=403, detail="Can only edit your own feedback comments")
                update_fields.append("comment = %s")
                update_values.append(update_request.comment)
            
            if update_request.role is not None:
                if current_user.role != "admin" and current_user.username != feedback_owner:
                    raise HTTPException(status_code=403, detail="Can only edit your own feedback role")
                update_fields.append("role = %s")
                update_values.append(update_request.role)
            
            # Only admins can change status
            if update_request.status is not None:
                if current_user.role != "admin":
                    raise HTTPException(status_code=403, detail="Only admins can change feedback status")
                update_fields.append("status = %s")
                update_values.append(update_request.status)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            update_values.append(feedback_id)
            
            cur.execute(f"""
                UPDATE feedback 
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, username, date_submitted, category, user_role, role, comment, status, created_at, updated_at
            """, update_values)
            
            updated_feedback = cur.fetchone()
            conn.commit()
            
            logger.info(f"Feedback {feedback_id} updated by {current_user.username}")
            
            return format_feedback_response(updated_feedback)
            
    except Exception as e:
        logger.error(f"Failed to update feedback: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update feedback")
    finally:
        conn.close()

@router.delete("/{feedback_id}")
async def delete_feedback(
    feedback_id: str,
    request: Request
):
    """Delete feedback (admin only)"""
    # Get current user info
    current_user = await get_or_create_user(request)
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM feedback WHERE id = %s RETURNING id", (feedback_id,))
            deleted = cur.fetchone()
            
            if not deleted:
                raise HTTPException(status_code=404, detail="Feedback not found")
            
            conn.commit()
            logger.info(f"Feedback {feedback_id} deleted by {current_user.username}")
            return {"message": f"Feedback {feedback_id} deleted successfully"}
            
    except Exception as e:
        logger.error(f"Failed to delete feedback: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete feedback")
    finally:
        conn.close()
