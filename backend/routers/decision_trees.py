import logging
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from backend.database import get_db_connection
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/decision-trees", tags=["decision-trees"])

@router.get("/")
async def list_decision_trees():
    """Get all decision trees with metadata"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT dt.*, 
                       COALESCE(node_counts.node_count, 0) as node_count,
                       COALESCE(edge_counts.edge_count, 0) as edge_count
                FROM decision_trees dt
                LEFT JOIN (
                    SELECT tree_id, COUNT(*) as node_count 
                    FROM decision_tree_nodes 
                    GROUP BY tree_id
                ) node_counts ON dt.id = node_counts.tree_id
                LEFT JOIN (
                    SELECT tree_id, COUNT(*) as edge_count 
                    FROM decision_tree_edges 
                    GROUP BY tree_id
                ) edge_counts ON dt.id = edge_counts.tree_id
                ORDER BY dt.updated_at DESC
            """)
            trees = cur.fetchall()
            
            # Convert to list of dictionaries with proper formatting
            result = []
            for tree in trees:
                result.append({
                    "id": str(tree["id"]),
                    "name": tree["name"],
                    "description": tree["description"],
                    "tags": tree["tags"] or [],
                    "created_by": tree["created_by"],
                    "last_edited_by": tree["last_edited_by"],
                    "version": tree["version"],
                    "is_default_for_tour": tree["is_default_for_tour"],
                    "created_at": tree["created_at"].isoformat() if tree["created_at"] else None,
                    "updated_at": tree["updated_at"].isoformat() if tree["updated_at"] else None,
                    "node_count": tree["node_count"],
                    "edge_count": tree["edge_count"]
                })
            
            return {"trees": result}
    except Exception as e:
        logger.error(f"Failed to list decision trees: {e}")
        raise HTTPException(status_code=500, detail="Failed to list decision trees")
    finally:
        conn.close()

@router.post("/")
async def create_decision_tree(request: Request):
    """Create a new decision tree"""
    try:
        body = await request.json()
        tree_id = str(uuid.uuid4())
        
        # Get current user from headers (same logic as /api/user endpoint)
        user_email = request.headers.get("X-Forwarded-Email", "test@example.com")
        logger.info(f"Creating decision tree for user: {user_email}")
        
        conn = get_db_connection()
        
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO decision_trees (id, name, description, tags, created_by, last_edited_by)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                tree_id,
                body.get("name", "Untitled Decision Tree"),
                body.get("description", ""),
                body.get("tags", []),
                user_email,  # Use actual user email
                user_email   # Use actual user email
            ))
            
            conn.commit()
            return {"id": tree_id, "message": "Decision tree created successfully"}
    except Exception as e:
        logger.error(f"Failed to create decision tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to create decision tree")
    finally:
        conn.close()

# Specific routes MUST come before parameterized routes
@router.get("/test")
async def test_route():
    """Test route to verify this router is working"""
    try:
        logger.info("Test route called successfully")
        return {"message": "Decision trees router is working", "router": "decision_trees"}
    except Exception as e:
        logger.error(f"Test route failed: {e}")
        raise

@router.get("/default-for-tour")
async def get_default_tour_tree():
    """Get the decision tree that is currently set as default for guided tours"""
    try:
        logger.info("Getting default tour tree...")
        conn = get_db_connection()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            logger.info("Executing query for default tour tree")
            cur.execute("SELECT * FROM decision_trees WHERE is_default_for_tour = TRUE LIMIT 1")
            tree = cur.fetchone()
            logger.info(f"Query result: {tree is not None}")
            
            if not tree:
                logger.warning("No default tour tree found")
                return {"default_tree": None, "message": "No default tour tree set"}
            
            logger.info(f"Found default tree: {tree['name']}")
            return {
                "default_tree": {
                    "id": str(tree["id"]),
                    "name": tree["name"],
                    "description": tree["description"],
                    "tags": tree["tags"] or [],
                    "created_by": tree["created_by"],
                    "last_edited_by": tree["last_edited_by"],
                    "version": tree["version"],
                    "is_default_for_tour": True,
                    "created_at": tree["created_at"].isoformat() if tree["created_at"] else None,
                    "updated_at": tree["updated_at"].isoformat() if tree["updated_at"] else None
                }
            }
    except Exception as e:
        logger.error(f"Failed to get default tour tree: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception details: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get default tour tree: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()

@router.get("/{tree_id}")
async def get_decision_tree(tree_id: str):
    """Get a specific decision tree with nodes and edges"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get tree metadata
            cur.execute("SELECT * FROM decision_trees WHERE id = %s", (tree_id,))
            tree = cur.fetchone()
            
            if not tree:
                raise HTTPException(status_code=404, detail="Decision tree not found")
            
            # Get nodes
            cur.execute("SELECT * FROM decision_tree_nodes WHERE tree_id = %s ORDER BY created_at", (tree_id,))
            nodes = cur.fetchall()
            
            # Get edges
            cur.execute("SELECT * FROM decision_tree_edges WHERE tree_id = %s ORDER BY created_at", (tree_id,))
            edges = cur.fetchall()
            
            # Convert to ReactFlow format
            reactflow_nodes = []
            for node in nodes:
                node_data = dict(node["data"]) if node["data"] else {}
                if node["is_root"]:
                    node_data["isRoot"] = True
                    
                reactflow_nodes.append({
                    "id": node["node_id"],
                    "type": node["type"],
                    "position": {
                        "x": node["position_x"],
                        "y": node["position_y"]
                    },
                    "data": node_data,
                    "isRoot": node["is_root"]
                })
            
            reactflow_edges = []
            for edge in edges:
                reactflow_edges.append({
                    "id": edge["edge_id"],
                    "source": edge["source"],
                    "target": edge["target"],
                    "sourceHandle": edge["source_handle"],
                    "targetHandle": edge["target_handle"],
                    "label": edge["label"]
                })
            
            return {
                "tree": {
                    "id": str(tree["id"]),
                    "name": tree["name"],
                    "description": tree["description"],
                    "tags": tree["tags"] or [],
                    "created_by": tree["created_by"],
                    "last_edited_by": tree["last_edited_by"],
                    "version": tree["version"],
                    "is_default_for_tour": tree["is_default_for_tour"],
                    "created_at": tree["created_at"].isoformat() if tree["created_at"] else None,
                    "updated_at": tree["updated_at"].isoformat() if tree["updated_at"] else None
                },
                "nodes": reactflow_nodes,
                "edges": reactflow_edges
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get decision tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to get decision tree")
    finally:
        conn.close()

@router.put("/{tree_id}")
async def update_decision_tree(tree_id: str, request: Request):
    """Update decision tree metadata"""
    try:
        body = await request.json()
        
        # Get current user from headers
        user_email = request.headers.get("X-Forwarded-Email", "test@example.com")
        logger.info(f"Updating decision tree {tree_id} by user: {user_email}")
        
        conn = get_db_connection()
        
        with conn.cursor() as cur:
            # Check if tree exists
            cur.execute("SELECT id FROM decision_trees WHERE id = %s", (tree_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Decision tree not found")
            
            # Build update query dynamically based on provided fields
            update_fields = []
            values = []
            
            if "name" in body:
                update_fields.append("name = %s")
                values.append(body["name"])
            
            if "description" in body:
                update_fields.append("description = %s")
                values.append(body["description"])
                
            if "tags" in body:
                update_fields.append("tags = %s")
                values.append(body["tags"])
            
            if "version" in body:
                update_fields.append("version = %s")
                values.append(body["version"])
                
            # Always update last_edited_by and updated_at
            update_fields.append("last_edited_by = %s")
            values.append(user_email)
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(tree_id)
            
            if update_fields:
                query = f"UPDATE decision_trees SET {', '.join(update_fields)} WHERE id = %s"
                cur.execute(query, values)
                conn.commit()
            
            return {"message": "Decision tree updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update decision tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to update decision tree")
    finally:
        conn.close()

@router.delete("/{tree_id}")
async def delete_decision_tree(tree_id: str):
    """Delete a decision tree and all its nodes/edges"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM decision_trees WHERE id = %s", (tree_id,))
            
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Decision tree not found")
            
            conn.commit()
            return {"message": "Decision tree deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete decision tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete decision tree")
    finally:
        conn.close()

@router.post("/{tree_id}/duplicate")
async def duplicate_decision_tree(tree_id: str, request: Request):
    """Duplicate a decision tree with all its nodes and edges"""
    try:
        body = await request.json()
        new_tree_id = str(uuid.uuid4())
        
        # Get current user from headers
        user_email = request.headers.get("X-Forwarded-Email", "test@example.com")
        logger.info(f"Duplicating decision tree {tree_id} by user: {user_email}")
        
        conn = get_db_connection()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get original tree
            cur.execute("SELECT * FROM decision_trees WHERE id = %s", (tree_id,))
            original_tree = cur.fetchone()
            
            if not original_tree:
                raise HTTPException(status_code=404, detail="Original decision tree not found")
            
            # Create new tree with current user as creator
            new_name = body.get("name", f"{original_tree['name']} (Copy)")
            cur.execute("""
                INSERT INTO decision_trees (id, name, description, tags, created_by, last_edited_by, version)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                new_tree_id,
                new_name,
                original_tree["description"],
                original_tree["tags"],
                user_email,  # Current user becomes creator of the duplicate
                user_email,  # Current user is also the last editor
                1  # Reset version to 1 for duplicate
            ))
            
            # Get original nodes
            cur.execute("SELECT * FROM decision_tree_nodes WHERE tree_id = %s", (tree_id,))
            original_nodes = cur.fetchall()
            
            # Create mapping for node IDs (in case of conflicts)
            node_id_mapping = {}
            for node in original_nodes:
                original_node_id = node["node_id"]
                new_node_id = f"{original_node_id}-{new_tree_id[:8]}"  # Add tree prefix to avoid conflicts
                node_id_mapping[original_node_id] = new_node_id
                
                cur.execute("""
                    INSERT INTO decision_tree_nodes (node_id, tree_id, type, position_x, position_y, data, is_root)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    new_node_id,
                    new_tree_id,
                    node["type"],
                    node["position_x"],
                    node["position_y"],
                    node["data"],
                    node["is_root"]
                ))
            
            # Get original edges and update with new node IDs
            cur.execute("SELECT * FROM decision_tree_edges WHERE tree_id = %s", (tree_id,))
            original_edges = cur.fetchall()
            
            for edge in original_edges:
                original_edge_id = edge["edge_id"]
                new_edge_id = f"{original_edge_id}-{new_tree_id[:8]}"
                new_source = node_id_mapping.get(edge["source"], edge["source"])
                new_target = node_id_mapping.get(edge["target"], edge["target"])
                
                cur.execute("""
                    INSERT INTO decision_tree_edges (edge_id, tree_id, source, target, source_handle, target_handle, label)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    new_edge_id,
                    new_tree_id,
                    new_source,
                    new_target,
                    edge["source_handle"],
                    edge["target_handle"],
                    edge["label"]
                ))
            
            conn.commit()
            return {
                "id": new_tree_id,
                "message": "Decision tree duplicated successfully",
                "original_id": tree_id
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to duplicate decision tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to duplicate decision tree")
    finally:
        conn.close()

@router.get("/{tree_id}/export")
async def export_decision_tree(tree_id: str):
    """Export decision tree as JSON"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get tree metadata
            cur.execute("SELECT * FROM decision_trees WHERE id = %s", (tree_id,))
            tree = cur.fetchone()
            
            if not tree:
                raise HTTPException(status_code=404, detail="Decision tree not found")
            
            # Get nodes and edges
            cur.execute("SELECT * FROM decision_tree_nodes WHERE tree_id = %s ORDER BY created_at", (tree_id,))
            nodes = cur.fetchall()
            
            cur.execute("SELECT * FROM decision_tree_edges WHERE tree_id = %s ORDER BY created_at", (tree_id,))
            edges = cur.fetchall()
            
            # Format for export
            export_data = {
                "metadata": {
                    "id": str(tree["id"]),
                    "name": tree["name"],
                    "description": tree["description"],
                    "tags": tree["tags"] or [],
                    "created_by": tree["created_by"],
                    "last_edited_by": tree["last_edited_by"],
                    "version": tree["version"],
                    "created_at": tree["created_at"].isoformat() if tree["created_at"] else None,
                    "updated_at": tree["updated_at"].isoformat() if tree["updated_at"] else None,
                    "exported_at": datetime.utcnow().isoformat()
                },
                "nodes": [dict(node) for node in nodes],
                "edges": [dict(edge) for edge in edges]
            }
            
            return export_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export decision tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to export decision tree")
    finally:
        conn.close()

@router.post("/{tree_id}/set-default-for-tour")
async def set_default_tour_tree(tree_id: str):
    """Set a decision tree as the default for guided tours"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if tree exists
            cur.execute("SELECT id, name FROM decision_trees WHERE id = %s", (tree_id,))
            tree = cur.fetchone()
            
            if not tree:
                raise HTTPException(status_code=404, detail="Decision tree not found")
            
            # Unset all other trees as default (due to unique constraint, this should be automatic, 
            # but let's be explicit)
            cur.execute("UPDATE decision_trees SET is_default_for_tour = FALSE WHERE is_default_for_tour = TRUE")
            
            # Set the specified tree as default
            cur.execute("UPDATE decision_trees SET is_default_for_tour = TRUE WHERE id = %s", (tree_id,))
            
            conn.commit()
            return {
                "message": f"Decision tree '{tree[1]}' set as default for guided tours",
                "tree_id": tree_id
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to set default tour tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to set default tour tree")
    finally:
        conn.close()
