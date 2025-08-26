import logging
import json
from fastapi import APIRouter, HTTPException, Request
from backend.database import get_db_connection
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/decision-tree", tags=["decision-tree"])

@router.get("/")
async def get_decision_tree():
    """Get the complete decision tree (nodes and edges)"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get nodes
            cur.execute("SELECT * FROM decision_tree_nodes ORDER BY created_at")
            nodes = cur.fetchall()
            
            # Get edges
            cur.execute("SELECT * FROM decision_tree_edges ORDER BY created_at")
            edges = cur.fetchall()
            
            # Convert to ReactFlow format
            reactflow_nodes = []
            for node in nodes:
                reactflow_nodes.append({
                    "id": node["node_id"],
                    "type": node["type"],
                    "position": {
                        "x": node["position_x"],
                        "y": node["position_y"]
                    },
                    "data": node["data"]
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
                "nodes": reactflow_nodes,
                "edges": reactflow_edges
            }
    except Exception as e:
        logger.error(f"Failed to get decision tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to get decision tree")
    finally:
        conn.close()

@router.get("")
async def get_decision_tree_no_slash():
    """Get the complete decision tree (nodes and edges) - handles requests without trailing slash"""
    return await get_decision_tree()

@router.post("/nodes")
async def create_node(request: Request):
    """Create a new decision tree node"""
    try:
        body = await request.json()
        conn = get_db_connection()
        
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO decision_tree_nodes (node_id, type, position_x, position_y, data)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                body["id"],
                body["type"],
                body["position"]["x"],
                body["position"]["y"],
                json.dumps(body["data"])
            ))
            
            conn.commit()
            return {"message": "Node created successfully", "id": body["id"]}
    except Exception as e:
        logger.error(f"Failed to create node: {e}")
        raise HTTPException(status_code=500, detail="Failed to create node")
    finally:
        conn.close()

@router.put("/nodes/{node_id}")
async def update_node(node_id: str, request: Request):
    """Update an existing decision tree node"""
    try:
        body = await request.json()
        conn = get_db_connection()
        
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE decision_tree_nodes 
                SET position_x = %s, position_y = %s, data = %s, updated_at = CURRENT_TIMESTAMP
                WHERE node_id = %s
            """, (
                body["position"]["x"],
                body["position"]["y"],
                json.dumps(body["data"]),
                node_id
            ))
            
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Node not found")
            
            conn.commit()
            return {"message": "Node updated successfully"}
    except Exception as e:
        logger.error(f"Failed to update node: {e}")
        raise HTTPException(status_code=500, detail="Failed to update node")
    finally:
        conn.close()

@router.delete("/nodes/{node_id}")
async def delete_node(node_id: str):
    """Delete a decision tree node (edges will be deleted automatically due to CASCADE)"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM decision_tree_nodes WHERE node_id = %s", (node_id,))
            
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Node not found")
            
            conn.commit()
            return {"message": "Node deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete node: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete node")
    finally:
        conn.close()

@router.post("/edges")
async def create_edge(request: Request):
    """Create a new decision tree edge"""
    try:
        body = await request.json()
        conn = get_db_connection()
        
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO decision_tree_edges (edge_id, source, target, source_handle, target_handle, label)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                body["id"],
                body["source"],
                body["target"],
                body.get("sourceHandle"),
                body.get("targetHandle"),
                body.get("label")
            ))
            
            conn.commit()
            return {"message": "Edge created successfully", "id": body["id"]}
    except Exception as e:
        logger.error(f"Failed to create edge: {e}")
        raise HTTPException(status_code=500, detail="Failed to create edge")
    finally:
        conn.close()

@router.delete("/edges/{edge_id}")
async def delete_edge(edge_id: str):
    """Delete a decision tree edge"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM decision_tree_edges WHERE edge_id = %s", (edge_id,))
            
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Edge not found")
            
            conn.commit()
            return {"message": "Edge deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete edge: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete edge")
    finally:
        conn.close() 