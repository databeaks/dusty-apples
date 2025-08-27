import { Node, Edge } from '@xyflow/react';
import { QuestionContext, ConditionalRule, ConditionalNodeData, ValidationResult, RootValidationResult, TourFlow, TourConnection, DecisionTreeNode } from '@/types/api';
import { FormAnswers } from '@/lib/store/appStore';

// Helper function to find all steps that can reach a conditional node
export const findReachableSteps = (conditionalNodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const reachableSteps: Node[] = [];
  const visited = new Set<string>();
  
  const traverse = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    // Find all edges that lead TO this node
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    
    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        if (sourceNode.type === 'tourStep') {
          reachableSteps.push(sourceNode);
        }
        // Continue traversing backwards
        traverse(sourceNode.id);
      }
    });
  };
  
  traverse(conditionalNodeId);
  return reachableSteps;
};

// Helper function to get questions connected to a step
export const getConnectedQuestions = (stepNodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const connectedQuestions: Node[] = [];
  
  // Find all edges FROM this step node
  const outgoingEdges = edges.filter(edge => edge.source === stepNodeId);
  
  outgoingEdges.forEach(edge => {
    const targetNode = nodes.find(n => n.id === edge.target);
    if (targetNode && targetNode.type === 'question') {
      connectedQuestions.push(targetNode);
    }
  });
  
  return connectedQuestions;
};

// Helper function to get available target nodes (excluding the current conditional node)
export const getAvailableTargetNodes = (nodes: Node[], excludeId?: string): Node[] => {
  return nodes.filter(node => 
    node.id !== excludeId && 
    (node.type === 'tourStep' || node.type === 'question' || node.type === 'conditional')
  );
};

// Get available questions from previous steps
export const getAvailableQuestions = (
  nodeId: string, 
  nodes: Node[], 
  edges: Edge[]
): QuestionContext[] => {
  const availableQuestions: QuestionContext[] = [];
  
  // Find all nodes that can reach this conditional node
  const reachableSteps = findReachableSteps(nodeId, nodes, edges);
  
  reachableSteps.forEach(stepNode => {
    // Get questions from connected question nodes
    const connectedQuestions = getConnectedQuestions(stepNode.id, nodes, edges);
    connectedQuestions.forEach(questionNode => {
      const questionData = questionNode.data;
      availableQuestions.push({
        questionId: questionData.questionId || questionNode.id,
        questionTitle: questionData.title || 'Untitled Question',
        questionType: questionData.type || 'text',
        options: questionData.options?.map((opt: any) => 
          typeof opt === 'string' ? opt : (opt.value || opt.label || String(opt))
        ),
        sourceStepId: stepNode.id,
        sourceStepTitle: stepNode.data?.title || 'Untitled Step'
      });
    });
    
    // Get questions directly from step node data
    if (stepNode.data?.questions) {
      stepNode.data.questions.forEach((question: any) => {
        availableQuestions.push({
          questionId: question.id,
          questionTitle: question.title,
          questionType: question.type,
          options: question.options,
          sourceStepId: stepNode.id,
          sourceStepTitle: stepNode.data?.title || 'Untitled Step'
        });
      });
    }
  });
  
  return availableQuestions;
};

// Auto-suggest conditions based on question types and common patterns
export const getConditionSuggestions = (question: QuestionContext): ConditionalRule[] => {
  const suggestions: ConditionalRule[] = [];
  
  if (question.questionType === 'select' && question.options) {
    // Create a suggestion for each option
    question.options.forEach((option, index) => {
      suggestions.push({
        id: `auto-${question.questionId}-${index}`,
        description: `Route ${option} customers`,
        condition: {
          questionId: question.questionId,
          operator: 'equals',
          value: option
        },
        targetNodeId: '', // To be filled by user
        label: `${option} Path`
      });
    });
  }
  
  if (question.questionType === 'multiselect' && question.options) {
    // Create suggestions for common multi-select patterns
    suggestions.push({
      id: `auto-${question.questionId}-any`,
      description: `Users who selected any options`,
      condition: {
        questionId: question.questionId,
        operator: 'not_equals',
        value: []
      },
      targetNodeId: '',
      label: 'Has Selections'
    });
  }
  
  if (question.questionType === 'number') {
    // Create common number-based conditions
    suggestions.push(
      {
        id: `auto-${question.questionId}-high`,
        description: `High value users`,
        condition: {
          questionId: question.questionId,
          operator: 'greater_than',
          value: 1000
        },
        targetNodeId: '',
        label: 'High Value'
      },
      {
        id: `auto-${question.questionId}-low`,
        description: `Low value users`,
        condition: {
          questionId: question.questionId,
          operator: 'less_than',
          value: 100
        },
        targetNodeId: '',
        label: 'Low Value'
      }
    );
  }
  
  return suggestions;
};

// Validate conditional node configuration
export const validateConditionalNode = (
  nodeData: ConditionalNodeData,
  availableQuestions: QuestionContext[]
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if all conditions reference valid questions
  nodeData.conditions.forEach(condition => {
    const question = availableQuestions.find(q => q.questionId === condition.condition.questionId);
    if (!question) {
      errors.push(`Question "${condition.condition.questionId}" not found in previous steps`);
    } else {
      // Validate operator compatibility
      if (question.questionType === 'select' && !['equals', 'not_equals', 'in', 'not_in'].includes(condition.condition.operator)) {
        warnings.push(`Operator "${condition.condition.operator}" may not work well with select questions`);
      }
      
      // Validate value compatibility
      if (question.options && condition.condition.operator === 'equals') {
        if (!question.options.includes(condition.condition.value as string)) {
          warnings.push(`Value "${condition.condition.value}" is not a valid option for question "${question.questionTitle}"`);
        }
      }
    }
  });
  
  // Check for unreachable conditions
  if (nodeData.conditions.length === 0) {
    errors.push('At least one condition is required');
  }
  
  // Check for missing targets
  nodeData.conditions.forEach(condition => {
    if (!condition.targetNodeId) {
      errors.push(`Condition "${condition.description}" is missing a target step`);
    }
  });
  
  return { errors, warnings, isValid: errors.length === 0 };
};

// Tour Navigator class for conditional logic evaluation
export class TourNavigator {
  static evaluateCondition(
    condition: ConditionalRule['condition'], 
    answers: FormAnswers
  ): boolean {
    const userAnswer = answers[condition.questionId];
    
    switch (condition.operator) {
      case 'equals':
        return userAnswer === condition.value;
      case 'not_equals':
        return userAnswer !== condition.value;
      case 'contains':
        return Array.isArray(userAnswer) 
          ? userAnswer.includes(condition.value as string)
          : String(userAnswer).includes(String(condition.value));
      case 'not_contains':
        return Array.isArray(userAnswer) 
          ? !userAnswer.includes(condition.value as string)
          : !String(userAnswer).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) 
          ? condition.value.includes(userAnswer as string)
          : false;
      case 'not_in':
        return Array.isArray(condition.value) 
          ? !condition.value.includes(userAnswer as string)
          : true;
      case 'greater_than':
        return Number(userAnswer) > Number(condition.value);
      case 'less_than':
        return Number(userAnswer) < Number(condition.value);
      default:
        return false;
    }
  }
  
  static evaluateConditionalNode(
    nodeData: ConditionalNodeData, 
    answers: FormAnswers
  ): string | null {
    // Evaluate each condition
    for (const rule of nodeData.conditions) {
      if (this.evaluateCondition(rule.condition, answers)) {
        return rule.targetNodeId;
      }
    }
    
    // Use default target if no conditions match
    return nodeData.defaultTarget || null;
  }
  
  static getNextStepId(
    currentStepId: string,
    tourSteps: any[],
    conditionalNodes: ConditionalNodeData[],
    answers: FormAnswers
  ): string | null {
    // Check if current step has conditional navigation
    const conditionalNode = conditionalNodes.find(node => 
      // This would need to be connected via edges in a real implementation
      // For now, we'll check if the step ID matches
      node.title.includes(currentStepId) || currentStepId.includes('conditional')
    );
    
    if (conditionalNode) {
      return this.evaluateConditionalNode(conditionalNode, answers);
    }
    
    // Default linear navigation
    const currentIndex = tourSteps.findIndex(step => step.id === currentStepId);
    if (currentIndex !== -1 && currentIndex + 1 < tourSteps.length) {
      return tourSteps[currentIndex + 1].id;
    }
    
    return null;
  }
}

// Root connectivity validation functions
export const validateRootConnectivity = (nodes: Node[], edges: Edge[]): RootValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const orphanedNodes: string[] = [];
  const unreachableNodes: string[] = [];
  
  // Find root node
  const rootNode = nodes.find(n => n.data?.isRoot === true || n.isRoot === true);
  if (!rootNode) {
    errors.push('No root node found. Please designate one tour step as the root.');
    return { errors, warnings, isValid: false, orphanedNodes, unreachableNodes };
  }
  
  // Find all nodes reachable from root
  const reachableFromRoot = findReachableNodes(rootNode.id, nodes, edges);
  const allNodeIds = nodes.map(n => n.id);
  
  // Identify unreachable nodes
  allNodeIds.forEach(nodeId => {
    if (!reachableFromRoot.has(nodeId)) {
      unreachableNodes.push(nodeId);
    }
  });
  
  // Check for orphaned step nodes (no path back to root)
  nodes.filter(n => n.type === 'tourStep' && n.id !== rootNode.id).forEach(stepNode => {
    if (!hasPathToRoot(stepNode.id, rootNode.id, nodes, edges)) {
      orphanedNodes.push(stepNode.id);
    }
  });
  
  if (unreachableNodes.length > 0) {
    warnings.push(`${unreachableNodes.length} nodes are not reachable from the root node`);
  }
  
  if (orphanedNodes.length > 0) {
    warnings.push(`${orphanedNodes.length} step nodes have no path back to root`);
  }
  
  return {
    errors,
    warnings,
    isValid: errors.length === 0,
    rootNodeId: rootNode.id,
    orphanedNodes,
    unreachableNodes
  };
};

export const findReachableNodes = (startNodeId: string, nodes: Node[], edges: Edge[]): Set<string> => {
  const reachable = new Set<string>();
  const queue = [startNodeId];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (reachable.has(currentId)) continue;
    
    reachable.add(currentId);
    
    // Find all outgoing edges from current node
    const outgoingEdges = edges.filter(e => e.source === currentId);
    outgoingEdges.forEach(edge => {
      if (!reachable.has(edge.target)) {
        queue.push(edge.target);
      }
    });
  }
  
  return reachable;
};

export const hasPathToRoot = (nodeId: string, rootId: string, nodes: Node[], edges: Edge[]): boolean => {
  if (nodeId === rootId) return true;
  
  const visited = new Set<string>();
  const queue = [nodeId];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    if (currentId === rootId) return true;
    
    // Find all incoming edges (reverse direction)
    const incomingEdges = edges.filter(e => e.target === currentId);
    incomingEdges.forEach(edge => {
      if (!visited.has(edge.source)) {
        queue.push(edge.source);
      }
    });
  }
  
  return false;
};

// Connection validation functions
export const validateConnection = (
  connection: { source: string; target: string }, 
  nodes: Node[], 
  edges: Edge[]
): ValidationResult => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!sourceNode || !targetNode) {
    errors.push('Invalid connection: source or target node not found');
    return { errors, warnings, isValid: false };
  }
  
  // Rule: Step Nodes can connect to questions, other steps, or conditional nodes
  if (sourceNode.type === 'tourStep') {
    if (!['question', 'tourStep', 'conditional'].includes(targetNode.type || '')) {
      errors.push('Tour steps can only connect to questions, other steps, or conditional nodes');
    }
  }
  
  // Rule: Conditional Nodes can only route to step nodes
  if (sourceNode.type === 'conditional') {
    if (targetNode.type !== 'tourStep') {
      errors.push('Conditional nodes can only route to tour steps');
    }
  }
  
  // Rule: Question Nodes can connect to steps or conditional nodes
  if (sourceNode.type === 'question') {
    if (!['tourStep', 'conditional'].includes(targetNode.type || '')) {
      errors.push('Questions can only connect to tour steps or conditional nodes');
    }
  }
  
  // Check for existing connection
  const existingConnection = edges.find(e => e.source === connection.source && e.target === connection.target);
  if (existingConnection) {
    warnings.push('Connection already exists between these nodes');
  }
  
  // Prevent self-connections
  if (connection.source === connection.target) {
    errors.push('Cannot connect a node to itself');
  }
  
  return { errors, warnings, isValid: errors.length === 0 };
};

// Enhanced Tour Navigator for root-based navigation
export class RootTourNavigator extends TourNavigator {
  static buildTourFlow(nodes: Node[], edges: Edge[]): TourFlow {
    const rootNode = nodes.find(n => n.data?.isRoot === true || n.isRoot === true);
    if (!rootNode) {
      throw new Error('No root node found. Cannot build tour flow.');
    }
    
    const flowMap = this.buildFlowMap(nodes, edges);
    
    return {
      rootNodeId: rootNode.id,
      flowMap,
      stepNodes: nodes.filter(n => n.type === 'tourStep').map(n => this.nodeToDecisionTreeNode(n)),
      conditionalNodes: nodes.filter(n => n.type === 'conditional').map(n => this.nodeToDecisionTreeNode(n)),
      questionNodes: nodes.filter(n => n.type === 'question').map(n => this.nodeToDecisionTreeNode(n))
    };
  }
  
  private static nodeToDecisionTreeNode(node: Node): DecisionTreeNode {
    return {
      id: node.id,
      type: node.type || 'default',
      position: node.position,
      data: node.data,
      isRoot: node.data?.isRoot || node.isRoot
    };
  }
  
  private static buildFlowMap(nodes: Node[], edges: Edge[]): Map<string, TourConnection[]> {
    const flowMap = new Map<string, TourConnection[]>();
    
    edges.forEach(edge => {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (!targetNode) return;
      
      if (!flowMap.has(edge.source)) {
        flowMap.set(edge.source, []);
      }
      
      const connection: TourConnection = {
        targetId: edge.target,
        type: this.getConnectionType(targetNode.type || 'default')
      };
      
      // Add conditional rules if target is conditional
      if (targetNode.type === 'conditional' && targetNode.data) {
        connection.conditions = targetNode.data.conditions || [];
      }
      
      flowMap.get(edge.source)!.push(connection);
    });
    
    return flowMap;
  }
  
  private static getConnectionType(nodeType: string): 'step' | 'question' | 'conditional' {
    switch (nodeType) {
      case 'tourStep': return 'step';
      case 'question': return 'question';
      case 'conditional': return 'conditional';
      default: return 'step';
    }
  }
  
  static getInitialStepId(tourFlow: TourFlow): string {
    return tourFlow.rootNodeId;
  }
  
  static getNextStepFromRoot(
    currentStepId: string,
    tourFlow: TourFlow,
    answers: FormAnswers
  ): string | null {
    const connections = tourFlow.flowMap.get(currentStepId) || [];
    
    // Handle conditional routing first
    for (const connection of connections) {
      if (connection.type === 'conditional' && connection.conditions) {
        const conditionalNode = tourFlow.conditionalNodes.find(n => n.id === connection.targetId);
        if (conditionalNode) {
          const conditionalResult = this.evaluateConditionalNode(conditionalNode.data, answers);
          if (conditionalResult) {
            return conditionalResult;
          }
        }
      }
    }
    
    // Handle direct step connections
    for (const connection of connections) {
      if (connection.type === 'step') {
        return connection.targetId;
      }
    }
    
    return null;
  }
  
  static validateTourPath(tourFlow: TourFlow, stepPath: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (stepPath.length === 0) {
      errors.push('Tour path is empty');
      return { errors, warnings, isValid: false };
    }
    
    if (stepPath[0] !== tourFlow.rootNodeId) {
      errors.push('Tour path must start from the root node');
    }
    
    // Validate each step in the path
    for (let i = 0; i < stepPath.length - 1; i++) {
      const currentStep = stepPath[i];
      const nextStep = stepPath[i + 1];
      
      const connections = tourFlow.flowMap.get(currentStep) || [];
      const hasValidConnection = connections.some(conn => conn.targetId === nextStep);
      
      if (!hasValidConnection) {
        errors.push(`Invalid step transition from ${currentStep} to ${nextStep}`);
      }
    }
    
    return { errors, warnings, isValid: errors.length === 0 };
  }
}
