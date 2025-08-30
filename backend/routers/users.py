from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging
from backend.database import get_db_connection, get_db_connection_for_user

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
    
    # Generate full name from username by splitting on period and capitalizing
    if username and username != "anonymous":
        name_parts = username.split('.')
        full_name = ' '.join(part.capitalize() for part in name_parts if part)
    else:
        full_name = ""
    
    return {
        "username": username,
        "email": email,
        "full_name": full_name
    }

async def get_or_create_user(request: Request) -> UserResponse:
    """Middleware function to get or create user based on request headers"""
    user_info = extract_user_info(request)
    username = user_info["username"]
    email = user_info["email"]
    
    if not email:
        raise HTTPException(status_code=401, detail="User authentication required")
    
    try:
        with get_db_connection_for_user(username) as conn:
            with conn.cursor() as cur:
                # Try to get existing user by email
                cur.execute("""
                    SELECT username, add_date, last_accessed, role, company_role, email, full_name
                    FROM users WHERE email = %s
                """, (email,))
                
                user = cur.fetchone()
                
                if user:
                    # Update last_accessed time
                    cur.execute("""
                        UPDATE users 
                        SET last_accessed = CURRENT_TIMESTAMP 
                        WHERE email = %s
                    """, (email,))
                    conn.commit()
                    
                    return UserResponse(
                        username=user['username'],
                        add_date=user['add_date'].isoformat() + 'Z',
                        last_accessed=datetime.now().isoformat() + 'Z',
                        role=user['role'],
                        company_role=user['company_role'],
                        email=user['email'],
                        full_name=user['full_name']
                    )
                else:
                    # Create new user with default role 'user'
                    cur.execute("""
                        INSERT INTO users (username, email, full_name, role, company_role)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING username, add_date, last_accessed, role, company_role, email, full_name
                    """, (username, user_info["email"], user_info["full_name"], "user", None))
                    
                    new_user = cur.fetchone()
                    conn.commit()
                    
                    logger.info(f"Created new user: {username} with role 'user'")
                    
                    return UserResponse(
                        username=new_user['username'],
                        add_date=new_user['add_date'].isoformat() + 'Z',
                        last_accessed=new_user['last_accessed'].isoformat() + 'Z',
                        role=new_user['role'],
                        company_role=new_user['company_role'],
                        email=new_user['email'],
                        full_name=new_user['full_name']
                    )
                    
    except Exception as e:
        logger.error(f"Failed to get or create user: {e}")
        raise HTTPException(status_code=500, detail="User authentication failed")

@router.get("/me", response_model=UserResponse)
async def get_current_user(request: Request):
    """Get current authenticated user"""
    logger.info("=== GET /api/users/me endpoint called ===")
    
    # Log request headers for debugging
    logger.info(f"Request headers: {dict(request.headers)}")
    
    try:
        # Extract user info from request headers
        logger.info("Attempting to extract user info from request headers...")
        user_info = extract_user_info(request)
        logger.info(f"Extracted user_info: {user_info}")
        
        username = user_info["username"]
        email = user_info["email"]
        logger.info(f"Extracted username: '{username}', email: '{email}'")
        
        if not email:
            logger.info("Email is empty, returning demo user")
            # For demo/test environments, return a demo user
            return UserResponse(
                username="anonymous",
                add_date=datetime.now().isoformat() + 'Z',
                last_accessed=datetime.now().isoformat() + 'Z',
                role="user",
                email="anonymous@example.com",
                full_name="Anonymous User"
            )
        
        # Log database connection attempt
        logger.info(f"Attempting to get database connection for user: {username}")
        
        with get_db_connection_for_user(username) as conn:
            with conn.cursor() as cur:
                logger.info("Database cursor created successfully")
                
                # Try to get existing user by email
                logger.info(f"Executing SELECT query for email: {email}")
                cur.execute("""
                    SELECT username, add_date, last_accessed, role, company_role, email, full_name
                    FROM users WHERE email = %s
                """, (email,))
                
                user = cur.fetchone()
                logger.info(f"SELECT query result: {user is not None}")
                
                if user:
                    logger.info(f"Found existing user: {user['username']}, role: {user['role']}")
                    
                    # Update last_accessed time
                    logger.info("Updating last_accessed timestamp...")
                    try:
                        cur.execute("""
                            UPDATE users 
                            SET last_accessed = CURRENT_TIMESTAMP 
                            WHERE email = %s
                        """, (email,))
                        conn.commit()
                        logger.info("Successfully updated last_accessed timestamp")
                    except Exception as update_error:
                        logger.error(f"Failed to update last_accessed: {update_error}")
                        # Don't fail the entire request for this
                    
                    logger.info("Creating UserResponse for existing user")
                    return UserResponse(
                        username=user['username'],
                        add_date=user['add_date'].isoformat() + 'Z',
                        last_accessed=datetime.now().isoformat() + 'Z',
                        role=user['role'],
                        company_role=user['company_role'],
                        email=user['email'],
                        full_name=user['full_name']
                    )
                else:
                    logger.info(f"User not found, creating new user: {username}")
                    logger.info(f"New user data - email: {user_info.get('email')}, full_name: {user_info.get('full_name')}")
                    
                    # Create new user with default role 'user'
                    cur.execute("""
                        INSERT INTO users (username, email, full_name, role, company_role)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING username, add_date, last_accessed, role, company_role, email, full_name
                    """, (username, user_info["email"], user_info["full_name"], "user", None))
                    
                    new_user = cur.fetchone()
                    if not new_user:
                        logger.error("INSERT query returned no results")
                        raise HTTPException(status_code=500, detail="Failed to create user - no data returned")
                    
                    logger.info(f"INSERT query successful, new user data: {new_user}")
                    
                    conn.commit()
                    logger.info("Database commit successful")
                    
                    logger.info(f"Successfully created new user: {username} with role 'user'")
                    
                    return UserResponse(
                        username=new_user['username'],
                        add_date=new_user['add_date'].isoformat() + 'Z',
                        last_accessed=new_user['last_accessed'].isoformat() + 'Z',
                        role=new_user['role'],
                        company_role=new_user['company_role'],
                        email=new_user['email'],
                        full_name=new_user['full_name']
                    )
                    
    except HTTPException:
        # Re-raise HTTP exceptions without modification
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error args: {e.args}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get user information: {str(e)}")

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
                        username=row['username'],
                        add_date=row['add_date'].isoformat() + 'Z',
                        last_accessed=row['last_accessed'].isoformat() + 'Z',
                        role=row['role'],
                        company_role=row['company_role'],
                        email=row['email'],
                        full_name=row['full_name']
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
            
            if update_request.company_role is not None:
                update_fields.append("company_role = %s")
                update_values.append(update_request.company_role)
            
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
                username=updated_user['username'],
                add_date=updated_user['add_date'].isoformat() + 'Z',
                last_accessed=updated_user['last_accessed'].isoformat() + 'Z',
                role=updated_user['role'],
                company_role=updated_user['company_role'],
                email=updated_user['email'],
                full_name=updated_user['full_name']
            )
                
    except Exception as e:
        logger.error(f"Failed to update user: {e}")
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
        raise HTTPException(status_code=500, detail="Failed to delete user")
    finally:
        conn.close()

@router.get("/test-db-connection")
async def test_database_connection(request: Request):
    """Test endpoint to verify database connection is working with new shared credential approach"""
    try:
        current_user = await get_or_create_user(request)
        
        with get_db_connection_for_user(current_user.username) as conn:
            with conn.cursor() as cur:
                # Simple test query
                cur.execute("SELECT COUNT(*) as user_count FROM users")
                result = cur.fetchone()
                
                if result is None:
                    return {"status": "error", "message": "Query returned None"}
                
                # Test cursor type
                cursor_type = "dict" if hasattr(result, 'keys') else "tuple"
                user_count = result['user_count'] if cursor_type == "dict" else result[0]
                
                # Get credential stats
                from backend.database import get_credential_stats
                credential_stats = get_credential_stats()
                
                return {
                    "status": "success",
                    "message": "Database connection working correctly",
                    "user_count": user_count,
                    "current_user": current_user.username,
                    "cursor_type": cursor_type,
                    "credential_stats": credential_stats
                }
            
    except Exception as e:
        logger.error(f"Test endpoint error: {e}")
        return {
            "status": "error",
            "message": f"Test failed: {str(e)}",
            "error_type": type(e).__name__
        }
