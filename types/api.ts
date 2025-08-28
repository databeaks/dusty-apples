export interface ApiData {
  hello: any;
  health: any;
  data: any;
  user: any;
}

// Decision Tree Types
export interface DecisionTreeNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
  isRoot?: boolean; // Flag to identify root nodes
}

export interface DecisionTreeEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

// Conditional Navigation Types
export interface ConditionalRule {
  id: string;
  description: string;
  condition: {
    questionId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: string | string[] | number;
  };
  targetNodeId: string;
  label?: string;
}

export interface ConditionalNodeData extends Record<string, unknown> {
  title: string;
  description: string;
  conditions: ConditionalRule[];
  defaultTarget?: string;
}

export interface QuestionContext {
  questionId: string;
  questionTitle: string;
  questionType: 'select' | 'multiselect' | 'text' | 'textarea' | 'number';
  options?: string[];
  sourceStepId: string;
  sourceStepTitle: string;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

// Root-specific validation result
export interface RootValidationResult extends ValidationResult {
  rootNodeId?: string;
  orphanedNodes: string[];
  unreachableNodes: string[];
}

// Tour flow interfaces
export interface TourFlow {
  rootNodeId: string;
  flowMap: Map<string, TourConnection[]>;
  stepNodes: DecisionTreeNode[];
  conditionalNodes: DecisionTreeNode[];
  questionNodes: DecisionTreeNode[];
}

export interface TourConnection {
  targetId: string;
  type: 'step' | 'question' | 'conditional';
  conditions?: ConditionalRule[];
}

// Decision Tree Management Types
export interface DecisionTreeMetadata {
  id: string;
  name: string;
  description: string;
  tags: string[];
  created_by: string;
  last_edited_by: string;
  version: number;
  is_default_for_tour: boolean;
  created_at: string;
  updated_at: string;
  node_count?: number;
  edge_count?: number;
}

export interface DecisionTreeCreateRequest {
  name: string;
  description?: string;
  tags?: string[];
  created_by?: string;
  last_edited_by?: string;
}

export interface DecisionTreeUpdateRequest {
  name?: string;
  description?: string;
  tags?: string[];
  last_edited_by?: string;
  version?: number;
}

export interface DecisionTreeDuplicateRequest {
  name?: string;
  created_by?: string;
  last_edited_by?: string;
}

export interface DecisionTreeListResponse {
  trees: DecisionTreeMetadata[];
}

export interface DecisionTreeResponse {
  tree: DecisionTreeMetadata;
  nodes: DecisionTreeNode[];
  edges: DecisionTreeEdge[];
}

export interface DecisionTreeExportData {
  metadata: DecisionTreeMetadata & { exported_at: string };
  nodes: any[];
  edges: any[];
}

export interface DefaultTourTreeResponse {
  default_tree: DecisionTreeMetadata | null;
  message?: string;
}

// Tour Session Types for Dashboard
export interface TourSession {
  id: string;
  user_id: string;
  tree_id: string;
  tree_name: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  date_started: string;
  date_completed?: string;
  current_step?: string;
  answers: Record<string, any>;
  recommendation?: any;
  progress_percentage: number;
}