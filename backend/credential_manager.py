import os
import time
import threading
import logging
import uuid
from typing import Dict, Optional, Tuple
from dataclasses import dataclass
from contextlib import contextmanager
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException

logger = logging.getLogger(__name__)

@dataclass
class CachedCredential:
    """Represents a cached database credential"""
    connection_url: str
    created_at: float
    expires_at: float
    user_id: str
    request_id: str

class SharedCredentialManager:
    """Manages a single shared database credential with caching and rotation"""
    
    def __init__(self, ttl_minutes: int = 30):
        self.cached_credential: Optional[CachedCredential] = None
        self.ttl = ttl_minutes * 60  # Convert to seconds
        self.lock = threading.RLock()
        
        # Get Databricks configuration
        self.instance_name = os.getenv("DATABRICKS_INSTANCE_NAME")
        self.database_name = "databricks_postgres"
        self.user_name = os.getenv("DATABRICKS_USER_NAME")
        
        logger.info(f"Initialized shared credential manager with {ttl_minutes}min TTL")
    
    def _is_credential_expired(self) -> bool:
        """Check if cached credential is expired"""
        if self.cached_credential is None:
            return True
        
        current_time = time.time()
        return current_time >= self.cached_credential.expires_at
    
    def _generate_databricks_credential(self) -> str:
        """Generate fresh database credentials using Databricks SDK"""
        try:
            from databricks.sdk import WorkspaceClient
            
            if not all([self.instance_name, self.user_name]):
                missing_vars = []
                if not self.instance_name: missing_vars.append("DATABRICKS_INSTANCE_NAME")
                if not self.user_name: missing_vars.append("DATABRICKS_USER_NAME")
                raise ValueError(f"Missing required Databricks environment variables: {', '.join(missing_vars)}")
            
            # Initialize Databricks WorkspaceClient
            logger.debug("Generating new Databricks credentials...")
            w = WorkspaceClient()
            
            # Get database instance details
            instance = w.database.get_database_instance(name=self.instance_name)
            
            # Generate database credentials
            request_id = str(uuid.uuid4())
            cred = w.database.generate_database_credential(
                request_id=request_id, 
                instance_names=[self.instance_name]
            )
            
            # Construct PostgreSQL connection URL
            host = instance.read_write_dns
            password = cred.token
            port = 5432  # Default PostgreSQL port
            
            if not all([host, password]):
                raise ValueError("Incomplete database credentials received from Databricks")
            
            # Build connection URL with SSL requirement
            database_url = f"postgresql://{self.user_name}:{password}@{host}:{port}/{self.database_name}?sslmode=require"
            logger.debug(f"Successfully generated database URL for host: {host}")
            
            return database_url
                
        except ImportError:
            logger.error("Databricks SDK not installed. Install with: pip install databricks-sdk")
            raise HTTPException(
                status_code=500, 
                detail="Databricks SDK not installed. Required for production database access."
            )
        except Exception as e:
            logger.error(f"Failed to generate Databricks database credentials: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate database credentials: {str(e)}"
            )
    
    def get_credentials(self) -> str:
        """Get cached shared credentials or generate new ones if needed"""
        current_time = time.time()
        
        with self.lock:
            # Check if we have valid cached credentials
            if not self._is_credential_expired():
                logger.debug("Using cached shared credentials")
                return self.cached_credential.connection_url
            
            # Generate new credentials
            logger.info("Generating fresh shared credentials")
            connection_url = self._generate_databricks_credential()
            request_id = str(uuid.uuid4())
            
            # Cache the new credentials
            self.cached_credential = CachedCredential(
                connection_url=connection_url,
                created_at=current_time,
                expires_at=current_time + self.ttl,
                user_id="shared",  # Use "shared" as identifier
                request_id=request_id
            )
            
            logger.info(f"Cached new shared credentials (expires in {self.ttl/60:.1f} minutes)")
            return connection_url
    
    def invalidate_credentials(self, user_id: str = None) -> bool:
        """Manually invalidate shared credentials"""
        with self.lock:
            if self.cached_credential is not None:
                self.cached_credential = None
                logger.info("Invalidated shared credentials")
                return True
            return False
    
    def get_stats(self) -> Dict:
        """Get statistics about cached shared credential"""
        with self.lock:
            is_active = not self._is_credential_expired()
            
            return {
                "credential_cached": self.cached_credential is not None,
                "credential_active": is_active,
                "ttl_minutes": self.ttl / 60,
                "expires_at": self.cached_credential.expires_at if self.cached_credential else None,
                "created_at": self.cached_credential.created_at if self.cached_credential else None
            }

class SharedConnectionPool:
    """Manages a single shared connection pool with credential rotation"""
    
    def __init__(self, credential_manager: SharedCredentialManager, 
                 min_connections: int = 1, max_connections: int = 5):
        self.credential_manager = credential_manager
        self.pool: Optional[psycopg2.pool.AbstractConnectionPool] = None
        self.pool_created_time: Optional[float] = None
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.lock = threading.RLock()
        
        logger.info(f"Initialized shared connection pool (min={min_connections}, max={max_connections})")
    
    def _create_shared_pool(self) -> psycopg2.pool.AbstractConnectionPool:
        """Create a new shared connection pool"""
        try:
            connection_url = self.credential_manager.get_credentials()
            
            logger.debug("Creating shared connection pool")
            new_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=self.min_connections,
                maxconn=self.max_connections,
                dsn=connection_url,
                cursor_factory=RealDictCursor
            )
            
            self.pool = new_pool
            self.pool_created_time = time.time()
            
            logger.info("Created shared connection pool")
            return new_pool
            
        except Exception as e:
            logger.error(f"Failed to create shared connection pool: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create database connection pool: {str(e)}")
    
    def _should_recreate_pool(self) -> bool:
        """Check if pool should be recreated due to credential expiration"""
        if self.pool is None or self.pool_created_time is None:
            return True
        
        # Check if credentials might have expired (with some buffer)
        pool_age = time.time() - self.pool_created_time
        credential_ttl = self.credential_manager.ttl
        
        # Recreate pool if it's older than 90% of credential TTL
        return pool_age >= (credential_ttl * 0.9)
    
    @contextmanager
    def get_connection(self, user_id: str = None):
        """Get a database connection from the shared pool (context manager)"""
        connection = None
        
        try:
            with self.lock:
                # Check if we need to create or recreate the pool
                if self._should_recreate_pool():
                    # Close existing pool if it exists
                    if self.pool is not None:
                        try:
                            self.pool.closeall()
                            logger.debug("Closed old shared connection pool")
                        except Exception as e:
                            logger.warning(f"Error closing old shared pool: {e}")
                        
                        self.pool = None
                        self.pool_created_time = None
                    
                    # Create new pool
                    self._create_shared_pool()
                
                pool_instance = self.pool
            
            # Get connection from pool (outside the lock to avoid blocking)
            connection = pool_instance.getconn()
            
            if connection is None:
                raise HTTPException(status_code=500, detail="Failed to get connection from shared pool")
            
            logger.debug("Retrieved connection from shared pool")
            yield connection
            
        except Exception as e:
            logger.error(f"Shared database connection error: {e}")
            
            # Try to invalidate credentials and retry once
            if "authentication" in str(e).lower() or "credential" in str(e).lower():
                logger.info("Invalidating shared credentials due to auth error")
                self.credential_manager.invalidate_credentials()
                
                with self.lock:
                    if self.pool is not None:
                        try:
                            self.pool.closeall()
                        except Exception:
                            pass
                        self.pool = None
                        self.pool_created_time = None
            
            raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
            
        finally:
            # Return connection to pool
            if connection is not None:
                try:
                    with self.lock:
                        if self.pool is not None:
                            self.pool.putconn(connection)
                            logger.debug("Returned connection to shared pool")
                except Exception as e:
                    logger.warning(f"Error returning connection to shared pool: {e}")
    
    def close_shared_pool(self):
        """Close shared connection pool (for shutdown)"""
        with self.lock:
            if self.pool is not None:
                try:
                    self.pool.closeall()
                    logger.info("Closed shared connection pool")
                except Exception as e:
                    logger.warning(f"Error closing shared pool: {e}")
                
                self.pool = None
                self.pool_created_time = None
    
    def get_stats(self) -> Dict:
        """Get statistics about shared connection pool"""
        with self.lock:
            return {
                "pool_exists": self.pool is not None,
                "pool_created_time": self.pool_created_time,
                "min_connections": self.min_connections,
                "max_connections": self.max_connections
            }

# Global instances
_shared_credential_manager: Optional[SharedCredentialManager] = None
_shared_connection_pool: Optional[SharedConnectionPool] = None

def get_shared_credential_manager() -> SharedCredentialManager:
    """Get the global shared credential manager instance"""
    global _shared_credential_manager
    if _shared_credential_manager is None:
        # Configure TTL based on environment
        ttl_minutes = int(os.getenv("DB_CREDENTIAL_TTL_MINUTES", "30"))
        _shared_credential_manager = SharedCredentialManager(ttl_minutes=ttl_minutes)
    return _shared_credential_manager

def get_shared_connection_pool() -> SharedConnectionPool:
    """Get the global shared connection pool instance"""
    global _shared_connection_pool
    if _shared_connection_pool is None:
        min_conn = int(os.getenv("DB_POOL_MIN_CONNECTIONS", "1"))
        max_conn = int(os.getenv("DB_POOL_MAX_CONNECTIONS", "5"))
        _shared_connection_pool = SharedConnectionPool(
            credential_manager=get_shared_credential_manager(),
            min_connections=min_conn,
            max_connections=max_conn
        )
    return _shared_connection_pool

def shutdown_pools():
    """Shutdown shared connection pool (call on app shutdown)"""
    global _shared_connection_pool
    if _shared_connection_pool is not None:
        _shared_connection_pool.close_shared_pool()
        _shared_connection_pool = None
        logger.info("Shared connection pool shut down")
