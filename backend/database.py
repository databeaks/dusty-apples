import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv('.env.local')

logger = logging.getLogger(__name__)

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

def get_db_connection():
    """Get a database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

def init_database():
    """Initialize database tables for decision tree"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Create decision tree nodes table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS decision_tree_nodes (
                    id SERIAL PRIMARY KEY,
                    node_id VARCHAR(255) UNIQUE NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    position_x FLOAT NOT NULL,
                    position_y FLOAT NOT NULL,
                    data JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create decision tree edges table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS decision_tree_edges (
                    id SERIAL PRIMARY KEY,
                    edge_id VARCHAR(255) UNIQUE NOT NULL,
                    source VARCHAR(255) NOT NULL,
                    target VARCHAR(255) NOT NULL,
                    source_handle VARCHAR(255),
                    target_handle VARCHAR(255),
                    label VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source) REFERENCES decision_tree_nodes(node_id) ON DELETE CASCADE,
                    FOREIGN KEY (target) REFERENCES decision_tree_nodes(node_id) ON DELETE CASCADE
                )
            """)
            
            conn.commit()
            logger.info("Database tables initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database initialization failed")
    finally:
        conn.close() 