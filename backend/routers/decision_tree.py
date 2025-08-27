import logging
import json
from fastapi import APIRouter, HTTPException, Request
from backend.database import get_db_connection, validate_root_node_constraints
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/decision-tree", tags=["decision-tree"])

@router.get("/")
async def get_decision_tree():
    """Get the complete decision tree (nodes and edges) - Uses default tour tree for backward compatibility"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Find the default tour tree or fall back to the first available tree
            cur.execute("SELECT id FROM decision_trees WHERE is_default_for_tour = TRUE LIMIT 1")
            default_tree = cur.fetchone()
            
            if not default_tree:
                # Fallback: use the first available tree
                cur.execute("SELECT id FROM decision_trees ORDER BY created_at LIMIT 1")
                default_tree = cur.fetchone()
            
            if not default_tree:
                # No trees available
                return {"nodes": [], "edges": []}
            
            tree_id = default_tree["id"]
            
            # Get nodes for the specific tree
            cur.execute("SELECT * FROM decision_tree_nodes WHERE tree_id = %s ORDER BY created_at", (tree_id,))
            nodes = cur.fetchall()
            
            # Get edges for the specific tree
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
async def create_node(request: Request, tree_id: str = None):
    """Create a new decision tree node"""
    try:
        body = await request.json()
        
        conn = get_db_connection()
        
        with conn.cursor() as cur:
            # Use provided tree_id, or fall back to default tree selection
            if tree_id:
                # Verify the tree exists
                cur.execute("SELECT id FROM decision_trees WHERE id = %s", (tree_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail=f"Decision tree {tree_id} not found")
                target_tree_id = tree_id
            else:
                # Original logic: find the default tour tree or fall back to the first available tree
                cur.execute("SELECT id FROM decision_trees WHERE is_default_for_tour = TRUE LIMIT 1")
                default_tree = cur.fetchone()
                
                if not default_tree:
                    # Fallback: use the first available tree
                    cur.execute("SELECT id FROM decision_trees ORDER BY created_at LIMIT 1")
                    default_tree = cur.fetchone()
                
                if not default_tree:
                    raise HTTPException(status_code=400, detail="No decision trees available. Please create a decision tree first.")
                
                target_tree_id = default_tree[0]
            
            # Validate root node constraints for the specific tree
            if body.get("isRoot") or (body.get("data", {}).get("isRoot")):
                validate_root_node_constraints({"is_root": True, "id": body["id"]}, target_tree_id)
            
            is_root = body.get("isRoot", False) or body.get("data", {}).get("isRoot", False)
            cur.execute("""
                INSERT INTO decision_tree_nodes (node_id, tree_id, type, position_x, position_y, data, is_root)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                body["id"],
                target_tree_id,
                body["type"],
                body["position"]["x"],
                body["position"]["y"],
                json.dumps(body["data"]),
                is_root
            ))
            
            conn.commit()
            return {"message": "Node created successfully", "id": body["id"]}
    except HTTPException:
        raise
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
            # Get the tree_id for this node first
            cur.execute("SELECT tree_id FROM decision_tree_nodes WHERE node_id = %s", (node_id,))
            node_result = cur.fetchone()
            if not node_result:
                raise HTTPException(status_code=404, detail="Node not found")
            
            tree_id = node_result[0]
            
            # Validate root node constraints if setting as root
            is_root = body.get("isRoot", False) or body.get("data", {}).get("isRoot", False)
            if is_root:
                validate_root_node_constraints({"is_root": True, "id": node_id}, tree_id)
            
            cur.execute("""
                UPDATE decision_tree_nodes 
                SET position_x = %s, position_y = %s, data = %s, is_root = %s, updated_at = CURRENT_TIMESTAMP
                WHERE node_id = %s
            """, (
                body["position"]["x"],
                body["position"]["y"],
                json.dumps(body["data"]),
                is_root,
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
            # Find the tree_id by looking up one of the nodes (source node)
            cur.execute("""
                SELECT tree_id FROM decision_tree_nodes WHERE node_id = %s LIMIT 1
            """, (body["source"],))
            
            node_result = cur.fetchone()
            if not node_result:
                raise HTTPException(status_code=400, detail=f"Source node {body['source']} not found")
            
            tree_id = node_result[0]
            
            cur.execute("""
                INSERT INTO decision_tree_edges (edge_id, tree_id, source, target, source_handle, target_handle, label)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                body["id"],
                tree_id,
                body["source"],
                body["target"],
                body.get("sourceHandle"),
                body.get("targetHandle"),
                body.get("label")
            ))
            
            conn.commit()
            return {"message": "Edge created successfully", "id": body["id"]}
    except HTTPException:
        raise
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

@router.post("/nodes/{node_id}/set-root")
async def set_root_node(node_id: str):
    """Set a node as the root node (removes root from other nodes in the same tree)"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First, check if the node exists and get its tree_id
            cur.execute("SELECT type, tree_id FROM decision_tree_nodes WHERE node_id = %s", (node_id,))
            node = cur.fetchone()
            
            if not node:
                raise HTTPException(status_code=404, detail="Node not found")
            
            if node[0] != 'tourStep':
                raise HTTPException(status_code=400, detail="Only tour steps can be set as root nodes")
            
            tree_id = node[1]
            
            # Remove root flag from all nodes in the SAME TREE (including the current node if it was already root)
            cur.execute("UPDATE decision_tree_nodes SET is_root = FALSE WHERE tree_id = %s", (tree_id,))
            
            # Now set the specified node as root (no constraint violation since all others are FALSE)
            cur.execute("UPDATE decision_tree_nodes SET is_root = TRUE WHERE node_id = %s", (node_id,))
            
            conn.commit()
            
            # Verify the root was set correctly
            cur.execute("SELECT node_id FROM decision_tree_nodes WHERE tree_id = %s AND is_root = TRUE", (tree_id,))
            new_root = cur.fetchone()
            
            if not new_root or new_root[0] != node_id:
                raise HTTPException(status_code=500, detail="Failed to set root node - verification failed")
            
            return {
                "message": f"Node {node_id} set as root successfully",
                "tree_id": str(tree_id),
                "root_node_id": node_id
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to set root node: {e}")
        logger.error(f"Exception type: {type(e)}")
        logger.error(f"Exception args: {e.args}")
        raise HTTPException(status_code=500, detail=f"Failed to set root node: {str(e)}")
    finally:
        conn.close()

@router.get("/root")
async def get_root_node():
    """Get the current root node"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM decision_tree_nodes WHERE is_root = TRUE")
            root_node = cur.fetchone()
            
            if not root_node:
                return {"root": None, "message": "No root node found"}
            
            return {
                "root": {
                    "id": root_node["node_id"],
                    "type": root_node["type"],
                    "position": {
                        "x": root_node["position_x"],
                        "y": root_node["position_y"]
                    },
                    "data": root_node["data"],
                    "isRoot": True
                }
            }
    except Exception as e:
        logger.error(f"Failed to get root node: {e}")
        raise HTTPException(status_code=500, detail="Failed to get root node")
    finally:
        conn.close()

@router.get("/validate-connectivity")
async def validate_tree_connectivity(tree_id: str = None):
    """Validate that all nodes are reachable from root"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Determine which tree to validate
            if tree_id:
                # Validate specific tree
                cur.execute("SELECT id FROM decision_trees WHERE id = %s", (tree_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail=f"Decision tree {tree_id} not found")
                target_tree_id = tree_id
            else:
                # Fallback to default tour tree for backward compatibility
                cur.execute("SELECT id FROM decision_trees WHERE is_default_for_tour = TRUE LIMIT 1")
                default_tree = cur.fetchone()
                
                if not default_tree:
                    # Fallback: use the first available tree
                    cur.execute("SELECT id FROM decision_trees ORDER BY created_at LIMIT 1")
                    default_tree = cur.fetchone()
                
                if not default_tree:
                    raise HTTPException(status_code=400, detail="No decision trees available. Please create a decision tree first.")
                
                target_tree_id = default_tree[0]
            
            # Get nodes and edges for the specific tree only
            cur.execute("SELECT * FROM decision_tree_nodes WHERE tree_id = %s", (target_tree_id,))
            nodes = cur.fetchall()
            
            cur.execute("SELECT * FROM decision_tree_edges WHERE tree_id = %s", (target_tree_id,))
            edges = cur.fetchall()
            
            # Find root node
            root_node = next((n for n in nodes if n["is_root"]), None)
            
            validation_result = {
                "isValid": True,
                "errors": [],
                "warnings": [],
                "rootNodeId": root_node["node_id"] if root_node else None,
                "orphanedNodes": [],
                "unreachableNodes": []
            }
            
            if not root_node:
                validation_result["isValid"] = False
                validation_result["errors"].append("No root node found. Please designate one tour step as the root.")
                return validation_result
            
            # Build adjacency map for reachability analysis
            adjacency = {}
            reverse_adjacency = {}
            
            for edge in edges:
                source, target = edge["source"], edge["target"]
                if source not in adjacency:
                    adjacency[source] = []
                adjacency[source].append(target)
                
                if target not in reverse_adjacency:
                    reverse_adjacency[target] = []
                reverse_adjacency[target].append(source)
            
            # Find nodes reachable from root
            reachable = set()
            queue = [root_node["node_id"]]
            
            while queue:
                current = queue.pop(0)
                if current in reachable:
                    continue
                reachable.add(current)
                
                if current in adjacency:
                    for neighbor in adjacency[current]:
                        if neighbor not in reachable:
                            queue.append(neighbor)
            
            # Check for unreachable nodes
            all_node_ids = {n["node_id"] for n in nodes}
            unreachable = all_node_ids - reachable
            
            if unreachable:
                validation_result["unreachableNodes"] = list(unreachable)
                validation_result["warnings"].append(f"{len(unreachable)} nodes are not reachable from the root node")
            
            # Check for orphaned step nodes (no path back to root)
            for node in nodes:
                if node["type"] == "tourStep" and node["node_id"] != root_node["node_id"]:
                    # Check if there's a path back to root using reverse traversal
                    visited = set()
                    queue = [node["node_id"]]
                    has_path_to_root = False
                    
                    while queue and not has_path_to_root:
                        current = queue.pop(0)
                        if current in visited:
                            continue
                        visited.add(current)
                        
                        if current == root_node["node_id"]:
                            has_path_to_root = True
                            break
                        
                        if current in reverse_adjacency:
                            for parent in reverse_adjacency[current]:
                                if parent not in visited:
                                    queue.append(parent)
                    
                    if not has_path_to_root:
                        validation_result["orphanedNodes"].append(node["node_id"])
            
            if validation_result["orphanedNodes"]:
                validation_result["warnings"].append(f"{len(validation_result['orphanedNodes'])} step nodes have no path back to root")
            
            return validation_result
            
    except Exception as e:
        logger.error(f"Failed to validate connectivity: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate connectivity")
    finally:
        conn.close() 