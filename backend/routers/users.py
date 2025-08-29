from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging
from backend.database import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/users",
    tags=["users"]
)

class UserResponse(BaseModel):
    username: str
    add_date: str
    last_accessed: str
    role: str
    company_role: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None

class UserCreateRequest(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "user"

class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    company_role: Optional[str] = None

def extract_user_info(request: Request) -> dict:
    """Extract user information from request headers (External authentication)"""
    # Get email from the X-Forwarded-Email header (as shown in the /api/user endpoint)
    email = request.headers.get("X-Forwarded-Email", "test@example.com")
    
    # Extract username from email (part before @)
    username = email.split('@')[0] if email and '@' in email else "anonymous"
    
    # Try to get additional user info from headers if available
    full_name = request.headers.get("X-Forwarded-User", "") or request.headers.get("X-User-Name", "")
    
    return {
        "username": username,
        "email": email,
        "full_name": full_name
    }

async def get_or_create_user(request: Request) -> UserResponse:
    """Middleware function to get or create user based on request headers"""
    user_info = extract_user_info(request)
    username = user_info["username"]
    
    if not username or username == "anonymous":
        raise HTTPException(status_code=401, detail="User authentication required")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Try to get existing user
            cur.execute("""
                SELECT username, add_date, last_accessed, role, company_role, email, full_name
                FROM users WHERE username = %s
            """, (username,))
            
            user = cur.fetchone()
            
            if user:
                # Update last_accessed time
                cur.execute("""
                    UPDATE users 
                    SET last_accessed = CURRENT_TIMESTAMP 
                    WHERE username = %s
                """, (username,))
                conn.commit()
                
                return UserResponse(
                    username=user[0],
                    add_date=user[1].isoformat() + 'Z',
                    last_accessed=datetime.now().isoformat() + 'Z',
                    role=user[3],
                    company_role=user[4],
                    email=user[5],
                    full_name=user[6]
                )
            else:
                # Create new user with default role 'user'
                cur.execute("""
                    INSERT INTO users (username, email, full_name, role, company_role)
                    VALUES (%s, %s, %s, %s)
                    RETURNING username, add_date, last_accessed, role, company_role, email, full_name
                """, (username, user_info["email"], user_info["full_name"], "user", None))
                
                new_user = cur.fetchone()
                conn.commit()
                
                logger.info(f"Created new user: {username} with role 'user'")
                
                return UserResponse(
                    username=new_user[0],
                    add_date=new_user[1].isoformat() + 'Z',
                    last_accessed=new_user[2].isoformat() + 'Z',
                    role=new_user[3],
                    company_role=new_user[4],
                    email=new_user[5],
                    full_name=new_user[6]
                )
                
    except Exception as e:
        logger.error(f"Failed to get or create user: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="User authentication failed")
    finally:
        conn.close()

@router.get("/me", response_model=UserResponse)
async def get_current_user(request: Request):
    """Get current authenticated user"""
    user_info = extract_user_info(request)
    username = user_info["username"]
    
    if not username or username == "anonymous":
        # For demo/test environments, return a demo user
        return UserResponse(
            username="anonymous",
            add_date=datetime.now().isoformat() + 'Z',
            last_accessed=datetime.now().isoformat() + 'Z',
            role="user",
            email=user_info.get("email"),
            full_name="Anonymous User"
        )
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Try to get existing user
            cur.execute("""
                SELECT username, add_date, last_accessed, role, company_role, email, full_name
                FROM users WHERE username = %s
            """, (username,))
            
            user = cur.fetchone()
            
            if user:
                # Update last_accessed time
                cur.execute("""
                    UPDATE users 
                    SET last_accessed = CURRENT_TIMESTAMP 
                    WHERE username = %s
                """, (username,))
                conn.commit()
                
                return UserResponse(
                    username=user[0],
                    add_date=user[1].isoformat() + 'Z',
                    last_accessed=datetime.now().isoformat() + 'Z',
                    role=user[3],
                    company_role=user[4],
                    email=user[5],
                    full_name=user[6]
                )
            else:
                # Create new user with default role 'user'
                cur.execute("""
                    INSERT INTO users (username, email, full_name, role, company_role)
                    VALUES (%s, %s, %s, %s)
                    RETURNING username, add_date, last_accessed, role, company_role, email, full_name
                """, (username, user_info["email"], user_info["full_name"], "user", None))
                
                new_user = cur.fetchone()
                conn.commit()
                
                logger.info(f"Created new user: {username} with role 'user'")
                
                return UserResponse(
                    username=new_user[0],
                    add_date=new_user[1].isoformat() + 'Z',
                    last_accessed=new_user[2].isoformat() + 'Z',
                    role=new_user[3],
                    company_role=new_user[4],
                    email=new_user[5],
                    full_name=new_user[6]
                )
                
    except Exception as e:
        logger.error(f"Failed to get current user: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to get user information")
    finally:
        conn.close()

@router.get("/", response_model=List[UserResponse])
async def get_all_users(request: Request):
    """Get all users (admin only)"""
    # Get current user for authorization
    current_user = await get_or_create_user(request)
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT username, add_date, last_accessed, role, company_role, email, full_name
                FROM users 
                ORDER BY add_date DESC
            """)
            
            users = []
            for row in cur.fetchall():
                users.append(UserResponse(
                    username=row[0],
                    add_date=row[1].isoformat() + 'Z',
                    last_accessed=row[2].isoformat() + 'Z',
                    role=row[3],
                    company_role=row[4],
                    email=row[5],
                    full_name=row[6]
                ))
            
            return users
            
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        raise HTTPException(status_code=500, detail="Failed to get users")
    finally:
        conn.close()

@router.put("/{username}", response_model=UserResponse)
async def update_user(
    username: str, 
    update_request: UserUpdateRequest,
    request: Request
):
    """Update user information (admin only or own profile)"""
    # Get current user for authorization
    current_user = await get_or_create_user(request)
    
    # Users can update their own profile, admins can update any profile
    if current_user.role != "admin" and current_user.username != username:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if user exists
            cur.execute("SELECT username FROM users WHERE username = %s", (username,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")
            
            # Build dynamic update query
            update_fields = []
            update_values = []
            
            if update_request.email is not None:
                update_fields.append("email = %s")
                update_values.append(update_request.email)
            
            if update_request.full_name is not None:
                update_fields.append("full_name = %s")
                update_values.append(update_request.full_name)
            
            # Only admins can change roles
            if update_request.role is not None:
                if current_user.role != "admin":
                    raise HTTPException(status_code=403, detail="Only admins can change user roles")
                update_fields.append("role = %s")
                update_values.append(update_request.role)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            update_values.append(username)
            
            cur.execute(f"""
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE username = %s
                RETURNING username, add_date, last_accessed, role, company_role, email, full_name
            """, update_values)
            
            updated_user = cur.fetchone()
            conn.commit()
            
            return UserResponse(
                username=updated_user[0],
                add_date=updated_user[1].isoformat() + 'Z',
                last_accessed=updated_user[2].isoformat() + 'Z',
                role=updated_user[3],
                company_role=updated_user[4],
                email=updated_user[5],
                full_name=updated_user[6]
            )
            
    except Exception as e:
        logger.error(f"Failed to update user: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update user")
    finally:
        conn.close()

@router.delete("/{username}")
async def delete_user(
    username: str,
    request: Request
):
    """Delete user (admin only, cannot delete self)"""
    # Get current user for authorization
    current_user = await get_or_create_user(request)
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if current_user.username == username:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE username = %s RETURNING username", (username,))
            deleted = cur.fetchone()
            
            if not deleted:
                raise HTTPException(status_code=404, detail="User not found")
            
            conn.commit()
            return {"message": f"User {username} deleted successfully"}
            
    except Exception as e:
        logger.error(f"Failed to delete user: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete user")
    finally:
        conn.close()
