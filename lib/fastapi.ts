// lib/api.ts
import axios from "axios";

// Use environment variable for backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Example: GET /api/hello
export const getHello = async () => {
  const response = await api.get("/hello");
  return response.data;
};

// Example: GET /api/health
export const checkHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

// Example: GET /api/data
export const fetchData = async () => {
  const response = await api.get("/data");
  return response.data;
};

// Example: GET /api/user
export const getUser = async () => {
  const response = await api.get("/user");
  return response.data;
};

// Decision Tree API functions
export interface DecisionTreeNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

export interface DecisionTreeEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface DecisionTree {
  nodes: DecisionTreeNode[];
  edges: DecisionTreeEdge[];
}

// Get the complete decision tree
export const getDecisionTree = async (): Promise<DecisionTree> => {
  const response = await api.get("/decision-tree");
  return response.data;
};

// Create a new node
export const createNode = async (node: DecisionTreeNode) => {
  const response = await api.post("/decision-tree/nodes", node);
  return response.data;
};

// Update an existing node
export const updateNode = async (nodeId: string, node: Partial<DecisionTreeNode>) => {
  const response = await api.put(`/decision-tree/nodes/${nodeId}`, node);
  return response.data;
};

// Delete a node
export const deleteNode = async (nodeId: string) => {
  const response = await api.delete(`/decision-tree/nodes/${nodeId}`);
  return response.data;
};

// Create a new edge
export const createEdge = async (edge: DecisionTreeEdge) => {
  const response = await api.post("/decision-tree/edges", edge);
  return response.data;
};

// Delete an edge
export const deleteEdge = async (edgeId: string) => {
  const response = await api.delete(`/decision-tree/edges/${edgeId}`);
  return response.data;
};

// Function to convert database decision tree to guided tour format
export interface TourStep {
  id: string;
  title: string;
  description: string;
  questions: TourQuestion[];
  condition?: (answers: any) => boolean;
}

export interface TourQuestion {
  id: string;
  type: 'select' | 'multiselect' | 'text' | 'textarea' | 'number';
  title: string;
  description?: string;
  options?: string[];
  required?: boolean;
  showIf?: {
    questionId: string;
    value: string | string[];
  };
}

export const convertDatabaseToTourSteps = async (): Promise<TourStep[]> => {
  try {
    const data = await getDecisionTree();
    
    if (!data || !data.nodes || !data.edges) {
      throw new Error('Invalid decision tree data');
    }

    console.log('Converting database to tour steps:', { 
      nodeCount: data.nodes.length, 
      edgeCount: data.edges.length 
    });

    // Group nodes by type
    const stepNodes = data.nodes.filter((node: any) => node.type === 'tourStep');
    const questionNodes = data.nodes.filter((node: any) => node.type === 'question');
    
    console.log('Node distribution:', { 
      stepNodes: stepNodes.length, 
      questionNodes: questionNodes.length 
    });

    // Create adjacency maps for navigation
    const outgoingEdges = new Map(); // source -> [targets]
    const incomingEdges = new Map(); // target -> [sources]
    
    data.edges.forEach((edge: any) => {
      // Outgoing edges
      if (!outgoingEdges.has(edge.source)) {
        outgoingEdges.set(edge.source, []);
      }
      outgoingEdges.get(edge.source).push(edge);
      
      // Incoming edges  
      if (!incomingEdges.has(edge.target)) {
        incomingEdges.set(edge.target, []);
      }
      incomingEdges.get(edge.target).push(edge);
    });

    // Find root nodes (nodes with no incoming edges or tour steps that are entry points)
    const rootNodes = stepNodes.filter(node => 
      !incomingEdges.has(node.id) || 
      (stepNodes.length === 1) // If only one step, it's the root
    );

    console.log('Root nodes found:', rootNodes.length);

    if (rootNodes.length === 0 && stepNodes.length > 0) {
      // If no clear root, use the first step node
      rootNodes.push(stepNodes[0]);
      console.log('No root found, using first step node as root');
    }

    // Build tour steps following the flow
    const tourSteps: TourStep[] = [];
    const processedNodes = new Set();

    const processNode = (node: any, stepIndex: number): TourStep | null => {
      if (processedNodes.has(node.id)) {
        return null;
      }
      
      processedNodes.add(node.id);
      const nodeData = node.data || {};

      // Handle different node types
      if (node.type === 'tourStep') {
        // Find connected questions for this step
        const connectedEdges = outgoingEdges.get(node.id) || [];
        const connectedQuestions = connectedEdges
          .map((edge: any) => questionNodes.find((q: any) => q.id === edge.target))
          .filter(Boolean)
          .map((questionNode: any) => {
            const questionData = questionNode.data || {};
            
            const tourQuestion: TourQuestion = {
              id: questionData.questionId || questionNode.id,
              type: questionData.type || 'text',
              title: questionData.title || 'Untitled Question',
              description: questionData.description,
              required: questionData.required !== false, // Default to required
            };

            // Add options for select/multiselect questions
            if ((questionData.type === 'select' || questionData.type === 'multiselect') && questionData.options) {
              tourQuestion.options = questionData.options.map((opt: any) => 
                typeof opt === 'string' ? opt : (opt.value || opt.label || String(opt))
              );
            }

            return tourQuestion;
          });

        return {
          id: nodeData.stepId || node.id,
          title: nodeData.title || `Step ${stepIndex + 1}`,
          description: nodeData.description || 'Please complete the questions below.',
          questions: connectedQuestions,
        };
      } else if (node.type === 'question') {
        // Convert standalone question to a step
        const questionData = nodeData;
        
        const tourQuestion: TourQuestion = {
          id: questionData.questionId || node.id,
          type: questionData.type || 'text',
          title: questionData.title || 'Untitled Question',
          description: questionData.description,
          required: questionData.required !== false,
        };

        if ((questionData.type === 'select' || questionData.type === 'multiselect') && questionData.options) {
          tourQuestion.options = questionData.options.map((opt: any) => 
            typeof opt === 'string' ? opt : (opt.value || opt.label || String(opt))
          );
        }

        return {
          id: questionData.questionId || node.id,
          title: questionData.title || `Question ${stepIndex + 1}`,
          description: 'Please answer the following question:',
          questions: [tourQuestion],
        };
      }

      return null;
    };

    // Process nodes starting from roots
    const nodesToProcess = [...rootNodes];
    let stepIndex = 0;

    while (nodesToProcess.length > 0) {
      const currentNode = nodesToProcess.shift();
      if (!currentNode) continue;

      const tourStep = processNode(currentNode, stepIndex);
      if (tourStep) {
        tourSteps.push(tourStep);
        stepIndex++;
      }

      // Add connected nodes to processing queue
      const connectedEdges = outgoingEdges.get(currentNode.id) || [];
      connectedEdges.forEach((edge: any) => {
        const targetNode = [...stepNodes, ...questionNodes].find(n => n.id === edge.target);
        if (targetNode && !processedNodes.has(targetNode.id)) {
          nodesToProcess.push(targetNode);
        }
      });
    }

    // Process any remaining unconnected nodes
    const allNodes = [...stepNodes, ...questionNodes];
    allNodes.forEach(node => {
      if (!processedNodes.has(node.id)) {
        const tourStep = processNode(node, stepIndex);
        if (tourStep) {
          tourSteps.push(tourStep);
          stepIndex++;
        }
      }
    });

    console.log('Generated tour steps:', tourSteps.length);
    console.log('Tour steps preview:', tourSteps.map(step => ({ 
      id: step.id, 
      title: step.title, 
      questionCount: step.questions.length 
    })));

    if (tourSteps.length === 0) {
      throw new Error('No tour steps could be generated from the decision tree. Please ensure you have nodes in your decision tree.');
    }

    return tourSteps;
  } catch (error) {
    console.error('Failed to convert database to tour steps:', error);
    throw error;
  }
};
