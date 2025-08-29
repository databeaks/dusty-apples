export interface ApiData {
  hello: any;
  health: any;
  data: any;
  user: any;
}

// User Management Types
export interface User {
  username: string;
  add_date: string;
  last_accessed: string;
  role: 'user' | 'admin';
  company_role?: string; // User's company role (e.g., Data Scientist, Product Manager)
  email?: string;
  full_name?: string; // Changed from 'name' to match API response
}

export interface UserCreateRequest {
  username: string;
  email?: string;
  full_name?: string;
  role?: 'user' | 'admin';
  company_role?: string;
}

export interface UserUpdateRequest {
  email?: string;
  full_name?: string;
  role?: 'user' | 'admin';
  company_role?: string;
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
  session_state?: Record<string, any>;
}

// Tour Session Management Types
export interface TourSessionCreateRequest {
  tree_id: string;
  current_step?: string;
}

export interface TourSessionUpdateRequest {
  status?: 'in_progress' | 'completed' | 'abandoned';
  current_step?: string;
  answers?: Record<string, any>;
  recommendation?: any;
  progress_percentage?: number;
  session_state?: Record<string, any>;
}

export interface TourSessionListResponse {
  sessions: TourSession[];
}

// Feedback Types
export type FeedbackCategory = 'bug' | 'feature_request' | 'tour_suggestion' | 'other';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Feedback {
  id: string;
  username: string;
  date_submitted: string;
  category: FeedbackCategory;
  user_role: 'user' | 'admin';
  role?: string;  // Optional role field
  comment: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
}

export interface FeedbackCreateRequest {
  category: FeedbackCategory;
  role?: string;  // Optional role field
  comment: string;
}

export interface FeedbackUpdateRequest {
  status?: FeedbackStatus;
  role?: string;
  comment?: string;
}

export interface FeedbackListResponse {
  feedback: Feedback[];
  total: number;
}

export interface FeedbackStatsResponse {
  total: number;
  by_category: Record<FeedbackCategory, number>;
  by_status: Record<FeedbackStatus, number>;
  by_role: Record<'user' | 'admin', number>;
}