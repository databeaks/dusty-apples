# Root Step Node Specification Implementation Plan

## Overview
This document outlines the implementation plan for adding root node functionality to the decision tree system, ensuring proper connectivity rules and tour navigation flow.

## 1. Root Node Concept Implementation

### 1.1 Data Model Updates

#### Type Definitions (`types/api.ts`)
```typescript
// Add to existing DecisionTreeNode interface
export interface DecisionTreeNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
  isRoot?: boolean; // NEW: Flag to identify root nodes
}

// Add root-specific validation result
export interface RootValidationResult extends ValidationResult {
  rootNodeId?: string;
  orphanedNodes: string[];
  unreachableNodes: string[];
}
```

#### Database Schema Updates (`backend/database.py`)
```sql
-- Add isRoot column to nodes table
ALTER TABLE nodes ADD COLUMN is_root BOOLEAN DEFAULT FALSE;

-- Create unique constraint to ensure only one root node per tree
CREATE UNIQUE INDEX idx_single_root_per_tree ON nodes (is_root) WHERE is_root = TRUE;
```

### 1.2 Backend API Updates

#### Node Creation/Update (`backend/routers/decision_tree.py`)
```python
# Add root node validation
def validate_root_node_constraints(node_data: dict, existing_nodes: list):
    """Ensure only one root node exists"""
    if node_data.get('is_root'):
        existing_root = next((n for n in existing_nodes if n.get('is_root')), None)
        if existing_root and existing_root['id'] != node_data.get('id'):
            raise HTTPException(400, "Only one root node allowed per decision tree")

# Add root node endpoints
@router.post("/nodes/{node_id}/set-root")
async def set_root_node(node_id: str):
    """Set a node as the root node (removes root from other nodes)"""
    
@router.get("/tree/root")
async def get_root_node():
    """Get the current root node"""
    
@router.get("/tree/validate-connectivity")
async def validate_tree_connectivity():
    """Validate that all nodes are reachable from root"""
```

## 2. Connectivity Rules Implementation

### 2.1 Node Connection Validation

#### Enhanced Connection Logic (`components/decisionTree.tsx`)
```typescript
// Update onConnect function to enforce connectivity rules
const validateConnection = (connection: Connection, nodes: Node[], edges: Edge[]): ValidationResult => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  
  const errors: string[] = [];
  
  // Rule: Step Nodes can connect to questions, other steps, or conditional nodes
  if (sourceNode?.type === 'tourStep') {
    if (!['question', 'tourStep', 'conditional'].includes(targetNode?.type || '')) {
      errors.push('Tour steps can only connect to questions, other steps, or conditional nodes');
    }
  }
  
  // Rule: Conditional Nodes can only route to step nodes
  if (sourceNode?.type === 'conditional') {
    if (targetNode?.type !== 'tourStep') {
      errors.push('Conditional nodes can only route to tour steps');
    }
  }
  
  // Rule: Question Nodes can connect to steps or conditional nodes
  if (sourceNode?.type === 'question') {
    if (!['tourStep', 'conditional'].includes(targetNode?.type || '')) {
      errors.push('Questions can only connect to tour steps or conditional nodes');
    }
  }
  
  return { errors, warnings: [], isValid: errors.length === 0 };
};
```

### 2.2 Root Connectivity Validation

#### Connectivity Analysis (`lib/conditionalNavigation.ts`)
```typescript
// Add root connectivity functions
export const validateRootConnectivity = (nodes: Node[], edges: Edge[]): RootValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const orphanedNodes: string[] = [];
  const unreachableNodes: string[] = [];
  
  // Find root node
  const rootNode = nodes.find(n => n.data?.isRoot === true);
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
```

## 3. UI Implementation

### 3.1 Root Node Visual Indicators

#### Enhanced Tour Step Node (`components/decisionTree.tsx`)
```typescript
const TourStepNode = ({ data, id }: { data: any; id: string }) => {
  const isRoot = data.isRoot === true;
  
  // ... existing code ...
  
  return (
    <Card className={`min-w-[260px] max-w-[280px] border-2 shadow-lg ${
      isRoot 
        ? 'border-red-500 bg-red-50/30 ring-2 ring-red-200' 
        : 'border-blue-200 bg-blue-50/30'
    }`}>
      <CardHeader className={`pb-2 ${isRoot ? 'bg-red-100' : 'bg-blue-100'}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            {isRoot && <Crown className="h-4 w-4 text-red-600" />}
            <MessageSquare className={`h-4 w-4 ${isRoot ? 'text-red-600' : 'text-blue-600'}`} />
            <CardTitle className={`text-sm ${isRoot ? 'text-red-800' : 'text-blue-800'}`}>
              {isRoot && '👑 '}{data.title || 'Untitled Step'}
            </CardTitle>
          </div>
          {/* ... existing buttons ... */}
        </div>
      </CardHeader>
      {/* ... rest of component ... */}
    </Card>
  );
};
```

### 3.2 Root Node Management Panel

#### New Root Management Component (`components/rootNodeManager.tsx`)
```typescript
export const RootNodeManager = ({ nodes, edges, onSetRoot }: {
  nodes: Node[];
  edges: Edge[];
  onSetRoot: (nodeId: string) => void;
}) => {
  const rootValidation = validateRootConnectivity(nodes, edges);
  const stepNodes = nodes.filter(n => n.type === 'tourStep');
  const currentRoot = nodes.find(n => n.data?.isRoot === true);
  
  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center">
          <Crown className="h-4 w-4 mr-2" />
          Root Node Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current root display */}
        {currentRoot ? (
          <div className="mb-3 p-2 bg-green-50 rounded border">
            <div className="text-xs font-medium text-green-800">Current Root:</div>
            <div className="text-sm text-green-700">{currentRoot.data?.title}</div>
          </div>
        ) : (
          <div className="mb-3 p-2 bg-red-50 rounded border">
            <div className="text-xs text-red-700">No root node set</div>
          </div>
        )}
        
        {/* Root selection dropdown */}
        <div className="mb-3">
          <Label>Set Root Node:</Label>
          <Select onValueChange={onSetRoot}>
            <SelectTrigger>
              <SelectValue placeholder="Choose root step..." />
            </SelectTrigger>
            <SelectContent>
              {stepNodes.map(node => (
                <SelectItem key={node.id} value={node.id}>
                  {node.data?.title || 'Untitled Step'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Validation results */}
        <ConnectivityValidationDisplay validation={rootValidation} nodes={nodes} />
      </CardContent>
    </Card>
  );
};
```

### 3.3 Connectivity Validation Display

#### Validation Results Component
```typescript
const ConnectivityValidationDisplay = ({ validation, nodes }: {
  validation: RootValidationResult;
  nodes: Node[];
}) => {
  return (
    <div className="space-y-2">
      {/* Errors */}
      {validation.errors.map((error, index) => (
        <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ❌ {error}
        </div>
      ))}
      
      {/* Warnings */}
      {validation.warnings.map((warning, index) => (
        <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          ⚠️ {warning}
        </div>
      ))}
      
      {/* Orphaned nodes */}
      {validation.orphanedNodes.length > 0 && (
        <div className="p-2 bg-orange-50 border border-orange-200 rounded">
          <div className="text-xs font-medium text-orange-800 mb-1">Orphaned Nodes:</div>
          {validation.orphanedNodes.map(nodeId => {
            const node = nodes.find(n => n.id === nodeId);
            return (
              <div key={nodeId} className="text-xs text-orange-700">
                • {node?.data?.title || nodeId}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Success state */}
      {validation.isValid && validation.warnings.length === 0 && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
          ✅ All nodes are properly connected to the root
        </div>
      )}
    </div>
  );
};
```

## 4. Tour Navigation Updates

### 4.1 Root-Based Tour Flow

#### Enhanced Tour Navigator (`lib/conditionalNavigation.ts`)
```typescript
export class TourNavigator {
  // ... existing methods ...
  
  static buildTourFlow(nodes: Node[], edges: Edge[]): TourFlow {
    const rootNode = nodes.find(n => n.data?.isRoot === true);
    if (!rootNode) {
      throw new Error('No root node found. Cannot build tour flow.');
    }
    
    return {
      rootNodeId: rootNode.id,
      flowMap: this.buildFlowMap(nodes, edges),
      stepNodes: nodes.filter(n => n.type === 'tourStep'),
      conditionalNodes: nodes.filter(n => n.type === 'conditional'),
      questionNodes: nodes.filter(n => n.type === 'question')
    };
  }
  
  static getInitialStepId(tourFlow: TourFlow): string {
    return tourFlow.rootNodeId;
  }
  
  static getNextStepFromRoot(
    currentStepId: string,
    tourFlow: TourFlow,
    answers: FormAnswers
  ): string | null {
    // Start from root and navigate based on connections and conditions
    const flowMap = tourFlow.flowMap;
    const currentConnections = flowMap.get(currentStepId) || [];
    
    // Handle conditional routing
    for (const connection of currentConnections) {
      const targetNode = tourFlow.conditionalNodes.find(n => n.id === connection.targetId);
      if (targetNode) {
        const conditionalResult = this.evaluateConditionalNode(targetNode.data, answers);
        if (conditionalResult) {
          return conditionalResult;
        }
      }
      
      // Direct step connections
      const stepNode = tourFlow.stepNodes.find(n => n.id === connection.targetId);
      if (stepNode) {
        return stepNode.id;
      }
    }
    
    return null;
  }
}

interface TourFlow {
  rootNodeId: string;
  flowMap: Map<string, Connection[]>;
  stepNodes: Node[];
  conditionalNodes: Node[];
  questionNodes: Node[];
}

interface Connection {
  targetId: string;
  type: 'step' | 'question' | 'conditional';
  conditions?: ConditionalRule[];
}
```

### 4.2 Store Updates for Root-Based Navigation

#### Enhanced App Store (`lib/store/appStore.ts`)
```typescript
interface AppStore {
  // ... existing properties ...
  
  // Root-based navigation
  tourFlow: TourFlow | null;
  currentStepPath: string[]; // Track the path taken through the tour
  
  // New actions
  initializeTourFromRoot: () => Promise<void>;
  navigateToNextStep: () => string | null;
  navigateToPreviousStep: () => string | null;
  resetToRoot: () => void;
  validateCurrentTourState: () => RootValidationResult;
}

// Implementation
export const useAppStore = create<AppStore>((set, get) => ({
  // ... existing state ...
  tourFlow: null,
  currentStepPath: [],
  
  // ... existing actions ...
  
  initializeTourFromRoot: async () => {
    const { databaseTourSteps } = get();
    if (databaseTourSteps.length === 0) {
      await get().loadDatabaseTourSteps();
    }
    
    // Convert database steps to tour flow
    const { nodes, edges } = await convertDatabaseToFlow();
    const tourFlow = TourNavigator.buildTourFlow(nodes, edges);
    
    set({ 
      tourFlow,
      currentStepIndex: 0,
      currentStepPath: [tourFlow.rootNodeId]
    });
  },
  
  navigateToNextStep: () => {
    const { tourFlow, formAnswers, currentStepPath } = get();
    if (!tourFlow) return null;
    
    const currentStepId = currentStepPath[currentStepPath.length - 1];
    const nextStepId = TourNavigator.getNextStepFromRoot(currentStepId, tourFlow, formAnswers);
    
    if (nextStepId) {
      set(state => ({
        currentStepPath: [...state.currentStepPath, nextStepId],
        currentStepIndex: state.currentStepIndex + 1
      }));
    }
    
    return nextStepId;
  },
  
  navigateToPreviousStep: () => {
    const { currentStepPath } = get();
    if (currentStepPath.length <= 1) return null;
    
    const newPath = currentStepPath.slice(0, -1);
    const previousStepId = newPath[newPath.length - 1];
    
    set(state => ({
      currentStepPath: newPath,
      currentStepIndex: Math.max(0, state.currentStepIndex - 1)
    }));
    
    return previousStepId;
  },
  
  resetToRoot: () => {
    const { tourFlow } = get();
    if (!tourFlow) return;
    
    set({
      currentStepIndex: 0,
      currentStepPath: [tourFlow.rootNodeId],
      formAnswers: {}
    });
  },
  
  validateCurrentTourState: () => {
    const { tourFlow } = get();
    if (!tourFlow) {
      return {
        errors: ['No tour flow initialized'],
        warnings: [],
        isValid: false,
        orphanedNodes: [],
        unreachableNodes: []
      };
    }
    
    // Validate current tour state
    return validateRootConnectivity(
      [...tourFlow.stepNodes, ...tourFlow.conditionalNodes, ...tourFlow.questionNodes],
      [] // edges would need to be stored in tourFlow
    );
  }
}));
```

## 5. Implementation Timeline

### Phase 1: Core Root Node Functionality (Week 1)
- [ ] Update type definitions with `isRoot` flag
- [ ] Add database schema changes
- [ ] Implement basic root node API endpoints
- [ ] Add root node validation logic

### Phase 2: Connectivity Rules (Week 2)
- [ ] Implement connection validation in UI
- [ ] Add connectivity analysis functions
- [ ] Create root connectivity validation
- [ ] Add path-finding algorithms

### Phase 3: UI Enhancements (Week 3)
- [ ] Add visual indicators for root nodes
- [ ] Create root node management panel
- [ ] Implement connectivity validation display
- [ ] Add orphaned node detection UI

### Phase 4: Tour Navigation (Week 4)
- [ ] Update tour navigator for root-based flow
- [ ] Enhance app store with root navigation
- [ ] Implement path tracking
- [ ] Add tour state validation

### Phase 5: Testing & Polish (Week 5)
- [ ] Comprehensive testing of all connectivity rules
- [ ] Edge case handling
- [ ] Performance optimization
- [ ] Documentation updates

## 6. Testing Strategy

### 6.1 Unit Tests
- Root node validation logic
- Connectivity analysis functions
- Path-finding algorithms
- Tour navigation logic

### 6.2 Integration Tests
- End-to-end tour flow from root
- Conditional navigation scenarios
- Orphaned node detection
- Multi-path tour scenarios

### 6.3 User Acceptance Tests
- Root node designation workflow
- Tour creation and validation
- Complex conditional routing
- Error handling and recovery

## 7. Migration Strategy

### 7.1 Existing Data Migration
```sql
-- Set the first tour step as root for existing trees
UPDATE nodes 
SET is_root = TRUE 
WHERE id IN (
  SELECT DISTINCT n.id 
  FROM nodes n 
  LEFT JOIN edges e ON n.id = e.target 
  WHERE n.type = 'tourStep' 
  AND e.id IS NULL 
  LIMIT 1
);
```

### 7.2 Backward Compatibility
- Existing tours without root nodes will auto-designate first step as root
- Legacy navigation will continue to work until migrated
- Gradual rollout with feature flags

## 8. Success Metrics

### 8.1 Technical Metrics
- All nodes reachable from root: 100%
- Zero orphaned nodes in production tours
- Tour navigation success rate: >99%
- Average tour completion time improvement: 15%

### 8.2 User Experience Metrics
- Reduced tour creation errors: 50%
- Improved tour flow clarity: User feedback
- Faster tour debugging: Developer feedback
- Increased tour completion rates: Analytics

## 9. Risk Mitigation

### 9.1 Technical Risks
- **Complex conditional logic**: Implement comprehensive testing
- **Performance with large trees**: Add caching and optimization
- **Data migration issues**: Thorough testing in staging environment

### 9.2 User Experience Risks
- **Learning curve**: Provide clear documentation and examples
- **Existing workflow disruption**: Gradual rollout with training
- **Complex error messages**: User-friendly validation feedback

## 10. Future Enhancements

### 10.1 Advanced Features
- Multiple root nodes for different user types
- Dynamic root selection based on user context
- Visual tour flow preview
- Automated tour optimization suggestions

### 10.2 Analytics Integration
- Tour path analytics
- Drop-off point identification
- A/B testing for different root strategies
- Performance monitoring dashboard
