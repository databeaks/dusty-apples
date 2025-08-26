#!/usr/bin/env python3
"""
Database initialization script for the decision tree application.
Run this script to create the necessary database tables.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

def init_database():
    """Initialize database tables for decision tree"""
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        logger.info("Connected to database successfully")
        
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
            logger.info("Created decision_tree_nodes table")
            
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
            logger.info("Created decision_tree_edges table")
            
            # Insert some sample data
            cur.execute("""
                INSERT INTO decision_tree_nodes (node_id, type, position_x, position_y, data)
                VALUES 
                    ('start', 'custom', 100, 100, '{"title": "Start", "description": "Begin your decision process here"}'),
                    ('decision-1', 'custom', 300, 100, '{"title": "First Decision", "description": "What is your first question?"}'),
                    ('outcome-a', 'custom', 500, 50, '{"title": "Option A", "description": "First possible outcome"}'),
                    ('outcome-b', 'custom', 500, 150, '{"title": "Option B", "description": "Second possible outcome"}')
                ON CONFLICT (node_id) DO NOTHING
            """)
            
            cur.execute("""
                INSERT INTO decision_tree_edges (edge_id, source, target, label)
                VALUES 
                    ('edge-1', 'start', 'decision-1', 'Next'),
                    ('edge-2', 'decision-1', 'outcome-a', 'Yes'),
                    ('edge-3', 'decision-1', 'outcome-b', 'No')
                ON CONFLICT (edge_id) DO NOTHING
            """)
            
            conn.commit()
            logger.info("Database tables initialized successfully with sample data")
            
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    try:
        init_database()
        logger.info("Database initialization completed successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        exit(1) 