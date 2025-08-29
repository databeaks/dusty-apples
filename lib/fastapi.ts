// lib/api.ts
import axios from "axios";
import {
  DecisionTreeMetadata,
  DecisionTreeCreateRequest,
  DecisionTreeUpdateRequest,
  DecisionTreeDuplicateRequest,
  DecisionTreeListResponse,
  DecisionTreeResponse,
  DecisionTreeExportData,
  DefaultTourTreeResponse
} from '@/types/api';

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

// User authentication
export const getUser = async () => {
  const response = await api.get("/user");
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/users/me");
  return response.data;
};

export const getAllUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const updateUser = async (username: string, userData: any) => {
  const response = await api.put(`/users/${username}`, userData);
  return response.data;
};

export const deleteUser = async (username: string) => {
  const response = await api.delete(`/users/${username}`);
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
export const createNode = async (node: DecisionTreeNode, treeId?: string) => {
  const url = treeId ? `/decision-tree/nodes?tree_id=${treeId}` : "/decision-tree/nodes";
  const response = await api.post(url, node);
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

// Root node management functions
export const setRootNode = async (nodeId: string) => {
  const response = await api.post(`/decision-tree/nodes/${nodeId}/set-root`);
  return response.data;
};

export const getRootNode = async () => {
  const response = await api.get('/decision-tree/root');
  return response.data;
};

export const validateTreeConnectivity = async (treeId?: string) => {
  const url = treeId ? `/decision-tree/validate-connectivity?tree_id=${treeId}` : '/decision-tree/validate-connectivity';
  const response = await api.get(url);
  return response.data;
};

// Function to convert database decision tree to guided tour format
export interface TourStep {
  id: string;
  title: string;
  description: string;
  questions: TourQuestion[];
  condition?: (answers: any) => boolean;
  isRoot?: boolean;
  nextStepId?: string;
  conditionalRouting?: ConditionalRouting[];
  target?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  disableBeacon?: boolean;
  showSkipButton?: boolean;
  isConditionalOnly?: boolean; // Steps that are only reachable through conditional routing
}

export interface ConditionalRouting {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | string[] | number;
  targetStepId: string;
  description?: string;
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

// Helper function to find step nodes that should be included in the static tour
// This excludes steps that are only reachable through conditional routing
const findStaticTourStepNodes = (
  rootNode: any, 
  stepNodes: any[], 
  conditionalNodes: any[], 
  edges: any[]
): any[] => {
  const staticSteps = new Set<string>();
  const visited = new Set<string>();
  const queue = [rootNode.id];
  
  console.log('🔍 Finding static tour steps from root:', rootNode.id);
  
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    
    if (visited.has(currentNodeId)) {
      continue;
    }
    visited.add(currentNodeId);
    
    console.log(`🔍 Analyzing node: ${currentNodeId}`);
    
    // If this is a step node (and not the root), add it to static steps
    const isStepNode = stepNodes.some(s => s.id === currentNodeId);
    if (isStepNode && currentNodeId !== rootNode.id) {
      staticSteps.add(currentNodeId);
      console.log(`✅ Added static step: ${currentNodeId}`);
    }
    
    // Find all outgoing edges from current node
    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);
    
    for (const edge of outgoingEdges) {
      const targetNodeId = edge.target;
      
      if (visited.has(targetNodeId)) {
        continue;
      }
      
      // Check what type of node the target is
      const isTargetStep = stepNodes.some(s => s.id === targetNodeId);
      const isTargetConditional = conditionalNodes.some(c => c.id === targetNodeId);
      
      if (isTargetStep) {
        // Direct connection to another step - include in static tour
        console.log(`🔗 Direct step connection: ${currentNodeId} -> ${targetNodeId}`);
        queue.push(targetNodeId);
      } else if (isTargetConditional) {
        // Connection to conditional node - DON'T follow its routing for static tour
        // The conditional targets will be handled dynamically at runtime
        console.log(`🔀 Conditional connection found: ${currentNodeId} -> ${targetNodeId} (not following for static tour)`);
      }
      // Note: We don't follow question nodes in this traversal since they don't route to other steps
    }
  }
  
  const staticStepNodesList = stepNodes.filter(step => staticSteps.has(step.id));
  console.log('📋 Static tour steps (excluding conditional targets):', staticStepNodesList.map(s => `${s.id} (stepId: ${s.data?.stepId || 'none'})`));
  
  return staticStepNodesList;
};

// Core conversion logic that can work with any nodes/edges data
const convertNodesToTourSteps = (data: { nodes: any[]; edges: any[] }): {
  steps: TourStep[];
  conditionalNodes: any[];
} => {
  if (!data || !data.nodes || !data.edges) {
    throw new Error('Invalid decision tree data');
  }

  console.log('Converting nodes to tour steps:', { 
    nodeCount: data.nodes.length, 
    edgeCount: data.edges.length 
  });

  // Group nodes by type
  const stepNodes = data.nodes.filter((node: any) => node.type === 'tourStep');
  const questionNodes = data.nodes.filter((node: any) => node.type === 'question');
  const conditionalNodes = data.nodes.filter((node: any) => node.type === 'conditional');
  
  // Find root node
  const rootNode = stepNodes.find((node: any) => node.data?.isRoot === true || node.isRoot === true);
  console.log('Root node found:', rootNode ? rootNode.id : 'None');
    
    console.log('Node distribution:', { 
      stepNodes: stepNodes.length, 
      questionNodes: questionNodes.length,
      conditionalNodes: conditionalNodes.length 
    });

    // Create adjacency maps for navigation (simplified)
    const outgoingEdges = new Map(); // source -> [targets]
    
    data.edges.forEach((edge: any) => {
      // Outgoing edges
      if (!outgoingEdges.has(edge.source)) {
        outgoingEdges.set(edge.source, []);
      }
      outgoingEdges.get(edge.source).push(edge);
    });

    // Build tour steps following the flow
    const tourSteps: TourStep[] = [];
    const processedNodes = new Set();
    
    console.log('Processing nodes:', {
      stepNodes: stepNodes.map(n => ({ id: n.id, title: n.data?.title || 'No title' })),
      questionNodes: questionNodes.map(n => ({ id: n.id, title: n.data?.title || 'No title' }))
    });

    const processNode = (node: any, stepIndex: number): TourStep | null => {
      if (processedNodes.has(node.id)) {
        console.log(`⚠️ Node ${node.id} already processed, skipping`);
        return null;
      }
      
      console.log(`✅ Processing node ${node.id} (${node.type})`);
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

        // Check if this is the root node
        const isRoot = nodeData.isRoot === true || node.isRoot === true;
        
        // Find next step connections (direct step-to-step connections)
        const nextStepConnections = connectedEdges
          .filter((edge: any) => stepNodes.some((s: any) => s.id === edge.target))
          .map((edge: any) => edge.target);
        
        // Find conditional connections
        const conditionalConnections = connectedEdges
          .filter((edge: any) => conditionalNodes.some((c: any) => c.id === edge.target));
        
        // If no direct step connections, try to find the next step through the graph
        let inferredNextStepId: string | undefined = undefined;
        if (nextStepConnections.length === 0 && conditionalConnections.length === 0) {
          // This step has no outgoing connections - it might be a terminal step
          // Or it might be connected through questions - let's check
          const questionConnections = connectedEdges
            .filter((edge: any) => questionNodes.some((q: any) => q.id === edge.target));
          
          if (questionConnections.length > 0) {
            // This step connects to questions - for now, we'll leave nextStepId undefined
            // The user will need to answer questions to proceed via conditional routing
            console.log(`📝 Step ${node.id} connects to questions, no direct next step`);
          }
        }
        
        const conditionalRouting: ConditionalRouting[] = [];
        conditionalConnections.forEach((edge: any) => {
          const conditionalNode = conditionalNodes.find((c: any) => c.id === edge.target);
          if (conditionalNode?.data?.conditions) {
            conditionalNode.data.conditions.forEach((condition: any) => {
              // Find the target step node to get its correct step ID
              const targetStepNode = stepNodes.find((s: any) => s.id === condition.targetNodeId);
              const targetStepId = targetStepNode?.data?.stepId || condition.targetNodeId;
              
              console.log(`🔗 Conditional routing: ${condition.condition.questionId} ${condition.condition.operator} ${condition.condition.value} -> ${condition.targetNodeId} (stepId: ${targetStepId})`);
              
              conditionalRouting.push({
                questionId: condition.condition.questionId,
                operator: condition.condition.operator,
                value: condition.condition.value,
                targetStepId: targetStepId,
                description: condition.description
              });
            });
          }
        });

        return {
          id: nodeData.stepId || node.id,
          title: nodeData.title || `Step ${stepIndex + 1}`,
          description: nodeData.description || 'Please complete the questions below.',
          questions: connectedQuestions,
          isRoot,
          nextStepId: nextStepConnections[0] || inferredNextStepId,
          conditionalRouting: conditionalRouting.length > 0 ? conditionalRouting : undefined,
          target: nodeData.target,
          placement: nodeData.placement,
          disableBeacon: nodeData.disableBeacon,
          showSkipButton: nodeData.showSkipButton
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

    // Process nodes in a specific order to avoid duplicates
    let stepIndex = 0;
    
    // Only process nodes that are reachable from the root node
    console.log('🔄 Processing reachable tour step nodes from root...');
    
    if (!rootNode) {
      console.warn('⚠️ No root node found - processing all step nodes as fallback');
      // Fallback: process all step nodes if no root is found
      for (const stepNode of stepNodes) {
        if (!processedNodes.has(stepNode.id)) {
          const tourStep = processNode(stepNode, stepIndex);
          if (tourStep) {
            console.log(`📝 Created tour step: ${tourStep.title} with ${tourStep.questions.length} questions`);
            tourSteps.push(tourStep);
            stepIndex++;
          }
        }
      }
    } else {
      // Root-based traversal: only include static tour steps (not conditional targets)
      const staticStepNodes = findStaticTourStepNodes(rootNode, stepNodes, conditionalNodes, data.edges);
      console.log(`📊 Found ${staticStepNodes.length} static step nodes from root`);
      
      // Process root node first
      if (!processedNodes.has(rootNode.id)) {
        const tourStep = processNode(rootNode, stepIndex);
        if (tourStep) {
          console.log(`📝 Created ROOT tour step: ${tourStep.title} with ${tourStep.questions.length} questions`);
          tourSteps.push(tourStep);
          stepIndex++;
        }
      }
      
      // Then process other static step nodes (directly connected, not through conditionals)
      for (const stepNode of staticStepNodes) {
        if (!processedNodes.has(stepNode.id)) {
          const tourStep = processNode(stepNode, stepIndex);
          if (tourStep) {
            console.log(`📝 Created static tour step: ${tourStep.title} with ${tourStep.questions.length} questions`);
            tourSteps.push(tourStep);
            stepIndex++;
          }
        }
      }
      
      // Also create tour steps for conditional targets, but mark them as conditional-only
      // These will be used for dynamic routing but not included in the main tour sequence
      const conditionalTargets = new Set<string>();
      conditionalNodes.forEach(conditionalNode => {
        if (conditionalNode.data?.conditions) {
          conditionalNode.data.conditions.forEach((condition: any) => {
            const targetId = condition.targetNodeId;
            if (targetId && stepNodes.some(s => s.id === targetId)) {
              conditionalTargets.add(targetId);
            }
          });
        }
      });
      
      console.log(`📊 Found ${conditionalTargets.size} conditional target steps`);
      
      // Process conditional target steps (these won't be in the main sequence but available for routing)
      for (const targetId of conditionalTargets) {
        if (!processedNodes.has(targetId)) {
          const stepNode = stepNodes.find(s => s.id === targetId);
          if (stepNode) {
            const tourStep = processNode(stepNode, stepIndex);
            if (tourStep) {
              // Mark this as a conditional-only step
              tourStep.isConditionalOnly = true;
              console.log(`📝 Created conditional target step: ${tourStep.title} (conditional-only)`);
              tourSteps.push(tourStep);
              stepIndex++;
            }
          }
        }
      }
    }
    
    // Then, process any standalone question nodes that aren't connected to any tour step
    console.log('🔄 Processing standalone question nodes...');
    for (const questionNode of questionNodes) {
      // Check if this question is already processed as part of a tour step
      if (!processedNodes.has(questionNode.id)) {
        // Check if this question is connected to any tour step
        const isConnectedToStep = data.edges.some(edge => 
          edge.target === questionNode.id && 
          stepNodes.some(step => step.id === edge.source)
        );
        
        console.log(`🔍 Question ${questionNode.id}: connected to step = ${isConnectedToStep}`);
        
        // Only process as standalone if not connected to any step
        if (!isConnectedToStep) {
          const tourStep = processNode(questionNode, stepIndex);
          if (tourStep) {
            console.log(`📝 Created standalone question step: ${tourStep.title}`);
            tourSteps.push(tourStep);
            stepIndex++;
          }
        }
      }
    }

    console.log('Generated tour steps:', tourSteps.length);
    console.log('Tour steps preview:', tourSteps.map(step => ({ 
      id: step.id, 
      title: step.title, 
      questionCount: step.questions.length 
    })));

    if (tourSteps.length === 0) {
      throw new Error('No tour steps could be generated from the decision tree. Please ensure you have nodes in your decision tree.');
    }

    // Extract conditional node data
    const conditionalData = conditionalNodes.map(node => ({
      id: node.id,
      ...node.data
    }));

  return {
    steps: tourSteps,
    conditionalNodes: conditionalData
  };
};

// Convert current editor state to tour steps (for testing)
export const convertEditorToTourSteps = (nodes: any[], edges: any[]): {
  steps: TourStep[];
  conditionalNodes: any[];
} => {
  console.log('🧪 Converting current editor state to tour steps...');
  return convertNodesToTourSteps({ nodes, edges });
};

// Convert database decision tree to tour steps (for production)
export const convertDatabaseToTourSteps = async (): Promise<{
  steps: TourStep[];
  conditionalNodes: any[];
}> => {
  try {
    console.log('Starting conversion of database to tour steps...');
    
    // Get the default tour tree
    const defaultTreeResponse = await getDefaultTourTree();
    if (!defaultTreeResponse.default_tree) {
      throw new Error('No default decision tree set for guided tours. Please set a default tree first.');
    }
    
    console.log('Using default tour tree:', defaultTreeResponse.default_tree.name);
    
    // Get the specific decision tree data
    const treeResponse = await getDecisionTreeById(defaultTreeResponse.default_tree.id);
    const data = { nodes: treeResponse.nodes, edges: treeResponse.edges };
    
    if (!data || !data.nodes || !data.edges) {
      throw new Error('Invalid decision tree data');
    }

    return convertNodesToTourSteps(data);
  } catch (error) {
    console.error('Failed to convert database to tour steps:', error);
    throw error;
  }
};

// Decision Tree Management API functions
export const listDecisionTrees = async (): Promise<DecisionTreeListResponse> => {
  const response = await api.get("/decision-trees/");
  return response.data;
};

export const createDecisionTree = async (data: DecisionTreeCreateRequest): Promise<{ id: string; message: string }> => {
  const response = await api.post("/decision-trees/", data);
  return response.data;
};

export const getDecisionTreeById = async (treeId: string): Promise<DecisionTreeResponse> => {
  const response = await api.get(`/decision-trees/${treeId}`);
  return response.data;
};

export const updateDecisionTreeMetadata = async (treeId: string, data: DecisionTreeUpdateRequest): Promise<{ message: string }> => {
  const response = await api.put(`/decision-trees/${treeId}`, data);
  return response.data;
};

export const deleteDecisionTree = async (treeId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/decision-trees/${treeId}`);
  return response.data;
};

export const duplicateDecisionTree = async (treeId: string, data: DecisionTreeDuplicateRequest): Promise<{ id: string; message: string; original_id: string }> => {
  const response = await api.post(`/decision-trees/${treeId}/duplicate`, data);
  return response.data;
};

export const exportDecisionTree = async (treeId: string): Promise<DecisionTreeExportData> => {
  const response = await api.get(`/decision-trees/${treeId}/export`);
  return response.data;
};

export const getDefaultTourTree = async (): Promise<DefaultTourTreeResponse> => {
  const response = await api.get("/decision-trees/default-for-tour");
  return response.data;
};

export const setDefaultTourTree = async (treeId: string): Promise<{ message: string; tree_id: string }> => {
  const response = await api.post(`/decision-trees/${treeId}/set-default-for-tour`);
  return response.data;
};

// Tour Session Management
import type { TourSession, TourSessionCreateRequest, TourSessionUpdateRequest } from '@/types/api';

export const createTourSession = async (request: TourSessionCreateRequest): Promise<TourSession> => {
  const response = await api.post("/tour-sessions/", request);
  return response.data;
};

export const getMyTourSessions = async (limit: number = 10): Promise<TourSession[]> => {
  const response = await api.get(`/tour-sessions/my-sessions?limit=${limit}`);
  return response.data;
};

export const getTourSession = async (sessionId: string): Promise<TourSession> => {
  const response = await api.get(`/tour-sessions/${sessionId}`);
  return response.data;
};

export const updateTourSession = async (sessionId: string, request: TourSessionUpdateRequest): Promise<TourSession> => {
  const response = await api.put(`/tour-sessions/${sessionId}`, request);
  return response.data;
};

export const deleteTourSession = async (sessionId: string): Promise<void> => {
  await api.delete(`/tour-sessions/${sessionId}`);
};
