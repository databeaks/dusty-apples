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
            
            # Check if is_root column exists, if not add it
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'decision_tree_nodes' 
                AND column_name = 'is_root'
            """)
            
            column_exists = cur.fetchone()
            
            if not column_exists:
                # Add is_root column if it doesn't exist
                cur.execute("ALTER TABLE decision_tree_nodes ADD COLUMN is_root BOOLEAN DEFAULT FALSE")
                
                # Add unique constraint to ensure only one root node per tree
                cur.execute("""
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_single_root_per_tree 
                    ON decision_tree_nodes (is_root) 
                    WHERE is_root = TRUE
                """)
            
            # Migrate existing data: set first tour step as root if no root exists
            cur.execute("""
                UPDATE decision_tree_nodes 
                SET is_root = TRUE 
                WHERE node_id IN (
                    SELECT DISTINCT n.node_id 
                    FROM decision_tree_nodes n 
                    LEFT JOIN decision_tree_edges e ON n.node_id = e.target 
                    WHERE n.type = 'tourStep' 
                    AND e.edge_id IS NULL 
                    AND NOT EXISTS (
                        SELECT 1 FROM decision_tree_nodes WHERE is_root = TRUE
                    )
                    LIMIT 1
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

def validate_root_node_constraints(node_data: dict, existing_nodes: list = None):
    """Ensure only one root node exists"""
    if node_data.get('is_root'):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Check if another root node already exists
                cur.execute("""
                    SELECT node_id FROM decision_tree_nodes 
                    WHERE is_root = TRUE AND node_id != %s
                """, (node_data.get('id', ''),))
                
                existing_root = cur.fetchone()
                if existing_root:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Only one root node allowed per decision tree. Current root: {existing_root[0]}"
                    )
        finally:
            conn.close() 