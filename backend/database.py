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
            # Create decision trees metadata table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS decision_trees (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    tags TEXT[] DEFAULT '{}',
                    created_by VARCHAR(255) DEFAULT 'System',
                    last_edited_by VARCHAR(255) DEFAULT 'System',
                    version INTEGER DEFAULT 1,
                    is_default_for_tour BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create decision tree nodes table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS decision_tree_nodes (
                    id SERIAL PRIMARY KEY,
                    node_id VARCHAR(255) NOT NULL,
                    tree_id UUID REFERENCES decision_trees(id) ON DELETE CASCADE,
                    type VARCHAR(50) NOT NULL,
                    position_x FLOAT NOT NULL,
                    position_y FLOAT NOT NULL,
                    data JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(tree_id, node_id)
                )
            """)
            
            # Create decision tree edges table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS decision_tree_edges (
                    id SERIAL PRIMARY KEY,
                    edge_id VARCHAR(255) NOT NULL,
                    tree_id UUID REFERENCES decision_trees(id) ON DELETE CASCADE,
                    source VARCHAR(255) NOT NULL,
                    target VARCHAR(255) NOT NULL,
                    source_handle VARCHAR(255),
                    target_handle VARCHAR(255),
                    label VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(tree_id, edge_id)
                )
            """)
            
            # Migration logic for existing data
            # Check if tree_id column exists in nodes table
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'decision_tree_nodes' 
                AND column_name = 'tree_id'
            """)
            tree_id_exists = cur.fetchone()
            
            # Check if is_root column exists
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'decision_tree_nodes' 
                AND column_name = 'is_root'
            """)
            is_root_exists = cur.fetchone()
            
            # If we're migrating from old schema
            if not tree_id_exists:
                # Create a default decision tree for existing data
                cur.execute("""
                    INSERT INTO decision_trees (name, description, created_by, last_edited_by)
                    VALUES ('Legacy Decision Tree', 'Migrated from previous version', 'System', 'System')
                    RETURNING id
                """)
                default_tree_id = cur.fetchone()[0]
                
                # Add tree_id column to nodes
                cur.execute("ALTER TABLE decision_tree_nodes ADD COLUMN tree_id UUID")
                cur.execute(f"UPDATE decision_tree_nodes SET tree_id = '{default_tree_id}'")
                cur.execute("ALTER TABLE decision_tree_nodes ALTER COLUMN tree_id SET NOT NULL")
                
                # Add tree_id column to edges
                cur.execute("ALTER TABLE decision_tree_edges ADD COLUMN tree_id UUID")
                cur.execute(f"UPDATE decision_tree_edges SET tree_id = '{default_tree_id}'")
                cur.execute("ALTER TABLE decision_tree_edges ALTER COLUMN tree_id SET NOT NULL")
                
                # Drop old foreign key constraints that depend on the old unique constraints
                cur.execute("ALTER TABLE decision_tree_edges DROP CONSTRAINT IF EXISTS decision_tree_edges_source_fkey")
                cur.execute("ALTER TABLE decision_tree_edges DROP CONSTRAINT IF EXISTS decision_tree_edges_target_fkey")
                
                # Drop old unique constraints (this will also drop the associated index)
                cur.execute("ALTER TABLE decision_tree_nodes DROP CONSTRAINT IF EXISTS decision_tree_nodes_node_id_key")
                cur.execute("ALTER TABLE decision_tree_edges DROP CONSTRAINT IF EXISTS decision_tree_edges_edge_id_key")
                
                # Create new unique constraints for the new tree-scoped structure
                cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_tree_node ON decision_tree_nodes (tree_id, node_id)")
                cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_edges_tree_edge ON decision_tree_edges (tree_id, edge_id)")
                
                # Add new foreign key constraints for tree relationships
                cur.execute("ALTER TABLE decision_tree_nodes ADD CONSTRAINT fk_nodes_tree FOREIGN KEY (tree_id) REFERENCES decision_trees(id) ON DELETE CASCADE")
                cur.execute("ALTER TABLE decision_tree_edges ADD CONSTRAINT fk_edges_tree FOREIGN KEY (tree_id) REFERENCES decision_trees(id) ON DELETE CASCADE")
            
            # Add is_root column if it doesn't exist
            if not is_root_exists:
                cur.execute("ALTER TABLE decision_tree_nodes ADD COLUMN is_root BOOLEAN DEFAULT FALSE")
                
            # Drop existing constraint if it exists with wrong definition
            cur.execute("DROP INDEX IF EXISTS idx_single_root_per_tree")
            
            # Add unique constraint to ensure only one root node per tree
            # This should only constrain when is_root = TRUE, allowing multiple FALSE values
            cur.execute("""
                CREATE UNIQUE INDEX idx_single_root_per_tree 
                ON decision_tree_nodes (tree_id) 
                WHERE is_root = TRUE
            """)
            
            # Migrate existing data: set first tour step as root if no root exists for each tree
            # Only do this if the is_root column was just added (migration scenario)
            if not is_root_exists:
                # Get all trees that don't have a root node yet
                cur.execute("""
                    SELECT DISTINCT n.tree_id 
                    FROM decision_tree_nodes n
                    WHERE n.tree_id NOT IN (
                        SELECT DISTINCT tree_id 
                        FROM decision_tree_nodes 
                        WHERE is_root = TRUE
                    )
                    AND EXISTS (
                        SELECT 1 FROM decision_tree_nodes 
                        WHERE tree_id = n.tree_id AND type = 'tourStep'
                    )
                """)
                trees_without_root = cur.fetchall()
                
                # For each tree without a root, set the first tour step as root
                for (tree_id,) in trees_without_root:
                    # Double-check that no root exists before setting one
                    cur.execute("""
                        SELECT COUNT(*) FROM decision_tree_nodes 
                        WHERE tree_id = %s AND is_root = TRUE
                    """, (tree_id,))
                    root_count = cur.fetchone()[0]
                    
                    if root_count == 0:
                        cur.execute("""
                            UPDATE decision_tree_nodes 
                            SET is_root = TRUE 
                            WHERE node_id = (
                                SELECT node_id 
                                FROM decision_tree_nodes n 
                                WHERE n.tree_id = %s 
                                AND n.type = 'tourStep'
                                ORDER BY n.created_at ASC 
                                LIMIT 1
                            )
                        """, (tree_id,))
            
            # Handle is_default_for_tour column migration
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'decision_trees' 
                AND column_name = 'is_default_for_tour'
            """)
            default_tour_exists = cur.fetchone()
            
            if not default_tour_exists:
                # Add is_default_for_tour column
                cur.execute("ALTER TABLE decision_trees ADD COLUMN is_default_for_tour BOOLEAN DEFAULT FALSE")
                
                # Set the first (oldest) decision tree as default for guided tour
                cur.execute("""
                    UPDATE decision_trees 
                    SET is_default_for_tour = TRUE 
                    WHERE id = (
                        SELECT id FROM decision_trees 
                        ORDER BY created_at ASC 
                        LIMIT 1
                    )
                """)
            
            # Add unique constraint to ensure only one default decision tree
            cur.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_single_default_tour_tree 
                ON decision_trees (is_default_for_tour) 
                WHERE is_default_for_tour = TRUE
            """)
            
            conn.commit()
            logger.info("Database tables initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database initialization failed")
    finally:
        conn.close()

def validate_root_node_constraints(node_data: dict, tree_id: str = None):
    """Ensure only one root node exists per tree"""
    if node_data.get('is_root') and tree_id:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Check if another root node already exists in this tree
                cur.execute("""
                    SELECT node_id FROM decision_tree_nodes 
                    WHERE tree_id = %s AND is_root = TRUE AND node_id != %s
                """, (tree_id, node_data.get('id', '')))
                
                existing_root = cur.fetchone()
                if existing_root:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Only one root node allowed per decision tree. Current root: {existing_root[0]}"
                    )
        finally:
            conn.close() 