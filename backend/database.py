import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
from dotenv import load_dotenv
import uuid
from urllib.parse import urlparse, urlunparse

# Load environment variables
# Load .env first (base configuration), then .env.local (local overrides)
import os.path

env_loaded = []
if load_dotenv('.env.production'):
    env_loaded.append('.env.production')
if load_dotenv('.env.local', override=True):
    env_loaded.append('.env.local')

# Initialize logging first
logger = logging.getLogger(__name__)

# Log which environment files were loaded
if env_loaded:
    logger.info(f"Loaded environment files: {', '.join(env_loaded)}")
else:
    logger.info("No environment files found, using system environment variables")

# Environment detection
ENVIRONMENT = os.getenv("ENVIRONMENT", "local").lower()
logger.info(f"Environment mode: {ENVIRONMENT}")

def get_databricks_database_url():
    """Generate database URL using Databricks SDK for production deployments"""
    try:
        from databricks.sdk import WorkspaceClient
        
        # Get required environment variables for Databricks
        instance_name = os.getenv("DATABRICKS_INSTANCE_NAME")
        database_name = "databricks_postgres"
        user_name = os.getenv("DATABRICKS_USER_NAME")
        
        if not all([instance_name, database_name, user_name]):
            missing_vars = []
            if not instance_name: missing_vars.append("DATABRICKS_INSTANCE_NAME")
            if not database_name: missing_vars.append("DATABRICKS_DATABASE_NAME")
            if not user_name: missing_vars.append("DATABRICKS_USER_NAME")
            
            raise ValueError(f"Missing required Databricks environment variables: {', '.join(missing_vars)}")
        
        # Initialize Databricks WorkspaceClient (uses default authentication)
        logger.info("Initializing Databricks WorkspaceClient...")
        w = WorkspaceClient()
        
        # Get database instance details
        logger.info(f"Getting database instance details for: {instance_name}")
        instance = w.database.get_database_instance(name=instance_name)
        
        # Generate database credentials
        logger.info(f"Generating database credentials for instance: {instance_name}")
        cred = w.database.generate_database_credential(
            request_id=str(uuid.uuid4()), 
            instance_names=[instance_name]
        )
        
        # Construct PostgreSQL connection URL using the new pattern
        host = instance.read_write_dns
        password = cred.token
        port = 5432  # Default PostgreSQL port
        
        if not all([host, password]):
            raise ValueError("Incomplete database credentials received from Databricks")
        
        # Build connection URL with SSL requirement
        database_url = f"postgresql://{user_name}:{password}@{host}:{port}/{database_name}?sslmode=require"
        logger.info(f"Successfully generated database URL for host: {host}")
        
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

# Database Configuration
def get_database_url():
    """Get database URL based on environment"""
    if ENVIRONMENT == "production":
        return get_databricks_database_url()
    else:
        # Local development configuration
        return os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

# Cache database URL for local development (but regenerate for production each time)
_cached_database_url = None

def get_db_connection():
    """Get a database connection"""
    global _cached_database_url
    
    try:
        # For production, always generate fresh credentials to handle potential credential rotation
        # For local development, cache the URL to avoid unnecessary overhead
        if ENVIRONMENT == "production":
            database_url = get_database_url()
        else:
            if _cached_database_url is None:
                _cached_database_url = get_database_url()
            database_url = _cached_database_url
        
        logger.debug(f"Connecting to database in {ENVIRONMENT} environment")
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        logger.error(f"Database connection failed in {ENVIRONMENT} environment: {e}")
        # In production, try to clear any cached credentials and retry once
        if ENVIRONMENT == "production":
            logger.info("Retrying database connection with fresh credentials...")
            try:
                database_url = get_database_url()
                conn = psycopg2.connect(database_url)
                return conn
            except Exception as retry_error:
                logger.error(f"Database retry connection also failed: {retry_error}")
        
        raise HTTPException(status_code=500, detail="Database connection failed")

def test_db_connection():
    """Test database connection and return database version info"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
            logger.info(f"[SUCCESS] Connected to: {version}")
            return {"status": "success", "version": version, "environment": ENVIRONMENT}
    except Exception as e:
        logger.error(f"Database test connection failed: {e}")
        return {"status": "error", "message": str(e), "environment": ENVIRONMENT}
    finally:
        conn.close()

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
            
            # Create users table for authentication and authorization
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    username VARCHAR(255) PRIMARY KEY,
                    add_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
                    email VARCHAR(255),
                    full_name VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for efficient user queries
            cur.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_users_last_accessed ON users (last_accessed DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)")
            
            # Create trigger to auto-update users updated_at timestamp
            cur.execute("""
                CREATE OR REPLACE FUNCTION update_users_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            """)
            
            cur.execute("""
                DROP TRIGGER IF EXISTS update_users_updated_at ON users;
                CREATE TRIGGER update_users_updated_at
                    BEFORE UPDATE ON users
                    FOR EACH ROW
                    EXECUTE FUNCTION update_users_updated_at();
            """)
            
            # Create tour sessions table for tracking user progress
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tour_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tree_id UUID REFERENCES decision_trees(id) ON DELETE CASCADE,
                    user_id VARCHAR(255) NOT NULL,
                    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
                    date_started TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    date_completed TIMESTAMP,
                    current_step VARCHAR(255),
                    answers JSONB DEFAULT '{}',
                    recommendation JSONB,
                    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
                    session_state JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for efficient querying
            cur.execute("CREATE INDEX IF NOT EXISTS idx_tour_sessions_user_id ON tour_sessions (user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_tour_sessions_tree_id ON tour_sessions (tree_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_tour_sessions_status ON tour_sessions (status)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_tour_sessions_started ON tour_sessions (date_started DESC)")
            
            # Create trigger to auto-update updated_at timestamp
            cur.execute("""
                CREATE OR REPLACE FUNCTION update_tour_sessions_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            """)
            
            cur.execute("""
                DROP TRIGGER IF EXISTS update_tour_sessions_updated_at ON tour_sessions;
                CREATE TRIGGER update_tour_sessions_updated_at
                    BEFORE UPDATE ON tour_sessions
                    FOR EACH ROW
                    EXECUTE FUNCTION update_tour_sessions_updated_at();
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