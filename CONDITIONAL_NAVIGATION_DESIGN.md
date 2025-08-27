# Conditional Navigation Design for Decision Tree Tour

## Overview

This document outlines the design for implementing conditional navigation nodes in the decision tree tour system. These nodes will act as "if-else" logic gates, determining the next step in the tour based on previous user answers.

## Current State

The existing tour system processes nodes sequentially:
- Tour steps contain questions
- Questions are answered by users
- Navigation moves linearly through steps

## Proposed Design

### 1. Conditional Node Type

#### New Node Type: `conditional`
```typescript
interface ConditionalNodeData {
  title: string;
  description: string;
  conditions: ConditionalRule[];
  defaultTarget?: string; // Fallback if no conditions match
}

interface ConditionalRule {
  id: string;
  description: string;
  condition: {
    questionId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: string | string[] | number;
  };
  targetNodeId: string;
  label?: string; // Label for the edge leading to target
}
```

#### Example Conditional Node Data:
```json
{
  "title": "Customer Type Router",
  "description": "Routes users based on their customer type selection",
  "conditions": [
    {
      "id": "enterprise-route",
      "description": "Enterprise customers",
      "condition": {
        "questionId": "customer-type",
        "operator": "equals",
        "value": "Enterprise"
      },
      "targetNodeId": "enterprise-onboarding",
      "label": "Enterprise Path"
    },
    {
      "id": "startup-route",
      "description": "Startup customers",
      "condition": {
        "questionId": "customer-type",
        "operator": "equals",
        "value": "Startup"
      },
      "targetNodeId": "startup-onboarding",
      "label": "Startup Path"
    }
  ],
  "defaultTarget": "general-onboarding"
}
```

### 2. Visual Representation

#### Conditional Node Component
```typescript
const ConditionalNode = ({ data, id }: { data: ConditionalNodeData; id: string }) => {
  return (
    <Card className="min-w-[280px] border-2 border-orange-200 bg-orange-50/30 shadow-lg">
      <CardHeader className="pb-2 bg-orange-100">
        <div className="flex items-center space-x-2">
          <GitBranch className="h-4 w-4 text-orange-600" />
          <CardTitle className="text-sm text-orange-800">{data.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-orange-700 mb-2">{data.description}</p>
        <div className="space-y-1">
          {data.conditions.map((condition, index) => (
            <div key={condition.id} className="text-xs text-orange-600">
              <strong>If:</strong> {condition.condition.questionId} {condition.condition.operator} {condition.condition.value}
              <br />
              <strong>Then:</strong> → {condition.targetNodeId}
            </div>
          ))}
          {data.defaultTarget && (
            <div className="text-xs text-orange-600 mt-2 pt-2 border-t border-orange-200">
              <strong>Default:</strong> → {data.defaultTarget}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Multiple source handles for different conditions */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
      {data.conditions.map((_, index) => (
        <Handle
          key={index}
          type="source"
          position={Position.Right}
          id={`condition-${index}`}
          style={{ top: `${30 + (index * 20)}%` }}
          className="w-3 h-3 bg-orange-500"
        />
      ))}
      {data.defaultTarget && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          className="w-3 h-3 bg-gray-500"
        />
      )}
    </Card>
  );
};
```

### 3. Database Schema Updates

#### Update Decision Tree Nodes Table
```sql
-- Add support for conditional node type
-- The existing JSONB data column will store the conditional rules
-- No schema changes needed, just new data structure
```

#### Example Database Records
```sql
-- Conditional Node
INSERT INTO decision_tree_nodes (node_id, type, position_x, position_y, data) VALUES (
  'customer-router',
  'conditional',
  400,
  200,
  '{
    "title": "Customer Type Router",
    "description": "Routes based on customer type",
    "conditions": [
      {
        "id": "enterprise-route",
        "condition": {
          "questionId": "customer-type",
          "operator": "equals",
          "value": "Enterprise"
        },
        "targetNodeId": "enterprise-step",
        "label": "Enterprise Path"
      }
    ],
    "defaultTarget": "general-step"
  }'
);

-- Conditional Edges
INSERT INTO decision_tree_edges (edge_id, source, target, label) VALUES 
  ('edge-router-enterprise', 'customer-router', 'enterprise-step', 'Enterprise Path'),
  ('edge-router-general', 'customer-router', 'general-step', 'Default Path');
```

### 4. Tour Navigation Logic Updates

#### Enhanced Navigation System
```typescript
interface TourNavigationContext {
  currentStepIndex: number;
  formAnswers: FormAnswers;
  tourSteps: TourStep[];
  conditionalNodes: ConditionalNodeData[];
}

class TourNavigator {
  static getNextStep(context: TourNavigationContext): number | null {
    const currentStep = context.tourSteps[context.currentStepIndex];
    
    // Check if current step has conditional navigation
    const conditionalNode = this.findConditionalNode(currentStep.id, context);
    
    if (conditionalNode) {
      return this.evaluateConditionalNode(conditionalNode, context);
    }
    
    // Default linear navigation
    return context.currentStepIndex + 1 < context.tourSteps.length 
      ? context.currentStepIndex + 1 
      : null;
  }
  
  private static evaluateConditionalNode(
    node: ConditionalNodeData, 
    context: TourNavigationContext
  ): number | null {
    // Evaluate each condition
    for (const rule of node.conditions) {
      if (this.evaluateCondition(rule.condition, context.formAnswers)) {
        // Find the target step index
        const targetIndex = context.tourSteps.findIndex(
          step => step.id === rule.targetNodeId
        );
        return targetIndex !== -1 ? targetIndex : null;
      }
    }
    
    // Use default target if no conditions match
    if (node.defaultTarget) {
      const defaultIndex = context.tourSteps.findIndex(
        step => step.id === node.defaultTarget
      );
      return defaultIndex !== -1 ? defaultIndex : null;
    }
    
    return null;
  }
  
  private static evaluateCondition(
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
      case 'in':
        return Array.isArray(condition.value) 
          ? condition.value.includes(userAnswer as string)
          : false;
      case 'greater_than':
        return Number(userAnswer) > Number(condition.value);
      case 'less_than':
        return Number(userAnswer) < Number(condition.value);
      default:
        return false;
    }
  }
}
```

### 5. Updated Tour Step Processing

#### Enhanced convertDatabaseToTourSteps Function
```typescript
export const convertDatabaseToTourSteps = async (): Promise<{
  steps: TourStep[];
  conditionalNodes: ConditionalNodeData[];
}> => {
  const data = await getDecisionTree();
  
  // Separate different node types
  const stepNodes = data.nodes.filter(n => n.type === 'tourStep');
  const questionNodes = data.nodes.filter(n => n.type === 'question');
  const conditionalNodes = data.nodes.filter(n => n.type === 'conditional');
  
  // Process tour steps (unchanged)
  const tourSteps = processStepNodes(stepNodes, questionNodes, data.edges);
  
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
```

### 6. UI/UX Considerations

#### Smart Conditional Node Editor with Context Awareness

```typescript
interface ConditionalNodeEditorProps {
  data: ConditionalNodeData;
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
  onSave: (data: ConditionalNodeData) => void;
}

interface QuestionContext {
  questionId: string;
  questionTitle: string;
  questionType: 'select' | 'multiselect' | 'text' | 'textarea' | 'number';
  options?: string[];
  sourceStepId: string;
  sourceStepTitle: string;
}

const ConditionalNodeEditor = ({ 
  data, 
  nodeId, 
  nodes, 
  edges, 
  onSave 
}: ConditionalNodeEditorProps) => {
  const [conditions, setConditions] = useState(data.conditions || []);
  
  // Get available questions from previous steps
  const getAvailableQuestions = (): QuestionContext[] => {
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
          options: questionData.options?.map(opt => 
            typeof opt === 'string' ? opt : (opt.value || opt.label || String(opt))
          ),
          sourceStepId: stepNode.id,
          sourceStepTitle: stepNode.data?.title || 'Untitled Step'
        });
      });
      
      // Get questions directly from step node data
      if (stepNode.data?.questions) {
        stepNode.data.questions.forEach(question => {
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
  
  const availableQuestions = getAvailableQuestions();
  
  const addCondition = () => {
    setConditions([...conditions, {
      id: `condition-${Date.now()}`,
      description: '',
      condition: {
        questionId: '',
        operator: 'equals',
        value: ''
      },
      targetNodeId: '',
      label: ''
    }]);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Node Title</Label>
        <Input value={data.title} onChange={...} />
      </div>
      
      <div>
        <Label>Description</Label>
        <Textarea value={data.description} onChange={...} />
      </div>
      
      <div>
        <Label>Conditions</Label>
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <SmartConditionEditor
              key={condition.id}
              condition={condition}
              availableQuestions={availableQuestions}
              availableTargets={getAvailableTargetNodes(nodes)}
              onChange={(updated) => updateCondition(index, updated)}
              onRemove={() => removeCondition(index)}
            />
          ))}
        </div>
        <Button onClick={addCondition} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </div>
      
      <div>
        <Label>Default Target (Optional)</Label>
        <Select value={data.defaultTarget} onValueChange={...}>
          <SelectTrigger>
            <SelectValue placeholder="Select default target..." />
          </SelectTrigger>
          <SelectContent>
            {getAvailableTargetNodes(nodes).map(node => (
              <SelectItem key={node.id} value={node.id}>
                {node.data?.title || node.id} ({node.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
```

#### Smart Condition Editor Component

```typescript
interface SmartConditionEditorProps {
  condition: ConditionalRule;
  availableQuestions: QuestionContext[];
  availableTargets: Node[];
  onChange: (condition: ConditionalRule) => void;
  onRemove: () => void;
}

const SmartConditionEditor = ({
  condition,
  availableQuestions,
  availableTargets,
  onChange,
  onRemove
}: SmartConditionEditorProps) => {
  const selectedQuestion = availableQuestions.find(
    q => q.questionId === condition.condition.questionId
  );
  
  const getOperatorOptions = (questionType: string) => {
    const baseOperators = [
      { value: 'equals', label: 'equals' },
      { value: 'not_equals', label: 'does not equal' }
    ];
    
    switch (questionType) {
      case 'select':
      case 'multiselect':
        return [
          ...baseOperators,
          { value: 'in', label: 'is one of' },
          { value: 'not_in', label: 'is not one of' }
        ];
      case 'text':
      case 'textarea':
        return [
          ...baseOperators,
          { value: 'contains', label: 'contains' },
          { value: 'not_contains', label: 'does not contain' }
        ];
      case 'number':
        return [
          ...baseOperators,
          { value: 'greater_than', label: 'is greater than' },
          { value: 'less_than', label: 'is less than' }
        ];
      default:
        return baseOperators;
    }
  };
  
  const renderValueInput = () => {
    if (!selectedQuestion) {
      return (
        <Input
          placeholder="Enter value..."
          value={condition.condition.value as string}
          onChange={(e) => updateCondition({ value: e.target.value })}
        />
      );
    }
    
    const { questionType, options } = selectedQuestion;
    const operator = condition.condition.operator;
    
    // For select/multiselect questions with options, show dropdown
    if ((questionType === 'select' || questionType === 'multiselect') && options) {
      if (operator === 'in' || operator === 'not_in') {
        // Multi-select for "in" operators
        return (
          <MultiSelect
            options={options.map(opt => ({ value: opt, label: opt }))}
            value={Array.isArray(condition.condition.value) ? condition.condition.value : []}
            onChange={(values) => updateCondition({ value: values })}
            placeholder="Select values..."
          />
        );
      } else {
        // Single select for equals/not_equals
        return (
          <Select
            value={condition.condition.value as string}
            onValueChange={(value) => updateCondition({ value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select value..." />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    }
    
    // For number questions, show number input
    if (questionType === 'number') {
      return (
        <Input
          type="number"
          placeholder="Enter number..."
          value={condition.condition.value as string}
          onChange={(e) => updateCondition({ value: parseFloat(e.target.value) || 0 })}
        />
      );
    }
    
    // Default text input
    return (
      <Input
        placeholder="Enter value..."
        value={condition.condition.value as string}
        onChange={(e) => updateCondition({ value: e.target.value })}
      />
    );
  };
  
  const updateCondition = (updates: Partial<ConditionalRule['condition']>) => {
    onChange({
      ...condition,
      condition: {
        ...condition.condition,
        ...updates
      }
    });
  };
  
  return (
    <Card className="p-4 border-2 border-orange-200">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Condition {condition.id}</Label>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Question Selection */}
          <div>
            <Label className="text-xs">Question</Label>
            <Select
              value={condition.condition.questionId}
              onValueChange={(questionId) => {
                const question = availableQuestions.find(q => q.questionId === questionId);
                updateCondition({ 
                  questionId,
                  // Reset operator and value when question changes
                  operator: 'equals',
                  value: question?.questionType === 'multiselect' ? [] : ''
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select question..." />
              </SelectTrigger>
              <SelectContent>
                {availableQuestions.map(question => (
                  <SelectItem key={question.questionId} value={question.questionId}>
                    <div className="flex flex-col">
                      <span>{question.questionTitle}</span>
                      <span className="text-xs text-gray-500">
                        from "{question.sourceStepTitle}" ({question.questionType})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Operator Selection */}
          <div>
            <Label className="text-xs">Operator</Label>
            <Select
              value={condition.condition.operator}
              onValueChange={(operator) => updateCondition({ operator: operator as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getOperatorOptions(selectedQuestion?.questionType || 'text').map(op => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Value Input */}
          <div>
            <Label className="text-xs">Value</Label>
            {renderValueInput()}
          </div>
        </div>
        
        {/* Target Selection */}
        <div>
          <Label className="text-xs">Target Step</Label>
          <Select
            value={condition.targetNodeId}
            onValueChange={(targetNodeId) => onChange({ ...condition, targetNodeId })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target step..." />
            </SelectTrigger>
            <SelectContent>
              {availableTargets.map(node => (
                <SelectItem key={node.id} value={node.id}>
                  {node.data?.title || node.id} ({node.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Edge Label */}
        <div>
          <Label className="text-xs">Edge Label (Optional)</Label>
          <Input
            placeholder="e.g., 'Enterprise Path'"
            value={condition.label || ''}
            onChange={(e) => onChange({ ...condition, label: e.target.value })}
          />
        </div>
        
        {/* Condition Preview */}
        {selectedQuestion && condition.condition.value && (
          <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
            <div className="text-xs text-orange-800">
              <strong>Preview:</strong> If "{selectedQuestion.questionTitle}" {condition.condition.operator} "{condition.condition.value}" → Go to target step
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
```

#### Helper Functions for Context Analysis

```typescript
// Helper function to find all steps that can reach a conditional node
const findReachableSteps = (conditionalNodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
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
const getConnectedQuestions = (stepNodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
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
const getAvailableTargetNodes = (nodes: Node[], excludeId?: string): Node[] => {
  return nodes.filter(node => 
    node.id !== excludeId && 
    (node.type === 'tourStep' || node.type === 'question' || node.type === 'conditional')
  );
};
```

#### Smart Auto-Suggestion Features

```typescript
// Auto-suggest conditions based on question types and common patterns
const getConditionSuggestions = (question: QuestionContext): ConditionalRule[] => {
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

// Component for showing auto-suggestions
const ConditionSuggestions = ({ 
  availableQuestions, 
  onApplySuggestion 
}: {
  availableQuestions: QuestionContext[];
  onApplySuggestion: (suggestion: ConditionalRule) => void;
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionContext | null>(null);
  const [suggestions, setSuggestions] = useState<ConditionalRule[]>([]);
  
  useEffect(() => {
    if (selectedQuestion) {
      setSuggestions(getConditionSuggestions(selectedQuestion));
    }
  }, [selectedQuestion]);
  
  return (
    <Card className="p-4 border-2 border-blue-200 bg-blue-50/30">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <Label className="text-sm font-medium text-blue-800">Smart Suggestions</Label>
        </div>
        
        <div>
          <Label className="text-xs">Based on question:</Label>
          <Select
            value={selectedQuestion?.questionId || ''}
            onValueChange={(questionId) => {
              const question = availableQuestions.find(q => q.questionId === questionId);
              setSelectedQuestion(question || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a question for suggestions..." />
            </SelectTrigger>
            <SelectContent>
              {availableQuestions.map(question => (
                <SelectItem key={question.questionId} value={question.questionId}>
                  {question.questionTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Suggested conditions:</Label>
            {suggestions.map(suggestion => (
              <div 
                key={suggestion.id}
                className="flex items-center justify-between p-2 bg-white rounded border border-blue-200 hover:border-blue-300 cursor-pointer"
                onClick={() => onApplySuggestion(suggestion)}
              >
                <div className="flex-1">
                  <div className="text-xs font-medium">{suggestion.description}</div>
                  <div className="text-xs text-gray-500">
                    {suggestion.condition.questionId} {suggestion.condition.operator} {suggestion.condition.value}
                  </div>
                </div>
                <Button size="sm" variant="ghost">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
```

#### Enhanced Conditional Node Editor with Suggestions

```typescript
const EnhancedConditionalNodeEditor = ({ 
  data, 
  nodeId, 
  nodes, 
  edges, 
  onSave 
}: ConditionalNodeEditorProps) => {
  const [conditions, setConditions] = useState(data.conditions || []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const availableQuestions = getAvailableQuestions();
  
  const handleApplySuggestion = (suggestion: ConditionalRule) => {
    setConditions([...conditions, {
      ...suggestion,
      id: `condition-${Date.now()}` // Generate new ID
    }]);
    setShowSuggestions(false);
  };
  
  return (
    <div className="space-y-4">
      {/* Existing editor fields... */}
      
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Conditions</Label>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              Smart Suggestions
            </Button>
            <Button onClick={addCondition} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Condition
            </Button>
          </div>
        </div>
        
        {showSuggestions && (
          <ConditionSuggestions
            availableQuestions={availableQuestions}
            onApplySuggestion={handleApplySuggestion}
          />
        )}
        
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <SmartConditionEditor
              key={condition.id}
              condition={condition}
              availableQuestions={availableQuestions}
              availableTargets={getAvailableTargetNodes(nodes, nodeId)}
              onChange={(updated) => updateCondition(index, updated)}
              onRemove={() => removeCondition(index)}
            />
          ))}
        </div>
      </div>
      
      {/* Rest of the editor... */}
    </div>
  );
};
```

#### Visual Flow Indicators
- **Orange color scheme** for conditional nodes to distinguish from regular steps (blue) and questions (green)
- **Multiple output handles** positioned based on number of conditions
- **Conditional edge labels** showing the condition being evaluated
- **Visual branching** in the flow diagram

### 7. Implementation Phases

#### Phase 1: Core Infrastructure
1. Add conditional node type to the node types registry
2. Create basic ConditionalNode component
3. Update database processing to handle conditional nodes
4. Basic condition evaluation logic

#### Phase 2: Enhanced Navigation
1. Implement TourNavigator class
2. Update tour navigation in GuidedTour component
3. Add support for non-linear step progression
4. Handle edge cases (missing targets, circular references)

#### Phase 3: Advanced Features
1. Complex condition operators (AND, OR logic)
2. Conditional node editor UI
3. Visual flow validation
4. Condition testing/preview mode

#### Phase 4: Polish & Optimization
1. Performance optimization for large decision trees
2. Better error handling and user feedback
3. Analytics and usage tracking
4. Documentation and examples

### 8. User Workflow & Experience

#### Creating a Conditional Node - Step by Step

1. **Add Conditional Node**
   - User clicks "Add Conditional Node" button in the decision tree editor
   - Node appears with default orange styling and branching icon
   - Node is positioned automatically to avoid overlaps

2. **Context Analysis**
   - System automatically analyzes the decision tree structure
   - Identifies all reachable steps that come before this conditional node
   - Extracts all questions from those steps with their answer options
   - Builds a context-aware list of available conditions

3. **Smart Condition Setup**
   - User opens the conditional node editor
   - System presents available questions grouped by source step
   - For each question, shows:
     - Question title and type
     - Source step name
     - Available answer options (for select/multiselect)
   - User selects a question and system auto-populates relevant operators

4. **Intelligent Value Selection**
   - For **select questions**: Dropdown with exact answer options
   - For **multiselect questions**: Multi-select with available options
   - For **number questions**: Number input with suggested thresholds
   - For **text questions**: Text input with validation

5. **Auto-Suggestions**
   - System suggests common conditional patterns
   - For customer type questions: "Route Enterprise customers", "Route Startup customers"
   - For budget questions: "High value (>$10k)", "Medium value ($1k-$10k)", "Low value (<$1k)"
   - For feature selection: "Users who selected Analytics", "Users who selected Integrations"

6. **Target Assignment**
   - User selects target steps for each condition
   - System shows available target nodes with clear labels
   - Prevents circular references and invalid connections

7. **Visual Feedback**
   - Real-time preview of conditions as they're created
   - Visual representation of branching logic
   - Edge labels showing condition summaries

#### Example Workflow: Customer Onboarding Router

```
Step 1: Customer Type Question
├─ Question: "What type of customer are you?"
├─ Options: ["Enterprise", "Startup", "Individual"]
└─ Connected to: Conditional Router

Step 2: Conditional Router Setup
├─ System detects: "Customer Type" question from previous step
├─ Auto-suggests conditions:
│  ├─ "Route Enterprise customers" → Enterprise Onboarding
│  ├─ "Route Startup customers" → Startup Onboarding
│  └─ "Route Individual customers" → Individual Onboarding
├─ User clicks suggestions to add them
├─ System creates edges with appropriate labels
└─ Result: Smart branching based on customer type
```

#### Real-time Validation

```typescript
const validateConditionalNode = (
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
```

### 9. Example Use Cases

#### Customer Onboarding Flow
```
Start → Customer Type Question → Conditional Router
├─ Enterprise → Enterprise Onboarding
├─ Startup → Startup Onboarding  
└─ Individual → Individual Onboarding
```

#### Feature Access Control
```
Feature Interest → Conditional Router
├─ "Analytics" → Analytics Setup
├─ "Integrations" → Integration Setup
└─ Default → Basic Setup
```

#### Multi-criteria Routing
```
Budget + Team Size → Conditional Router
├─ Budget > 10k AND Team > 50 → Enterprise Plan
├─ Budget > 1k AND Team > 10 → Professional Plan
└─ Default → Starter Plan
```

### 9. Benefits

1. **Dynamic User Journeys**: Personalized experiences based on user responses
2. **Reduced Cognitive Load**: Users only see relevant steps
3. **Better Conversion**: More targeted onboarding flows
4. **Flexible Business Logic**: Easy to modify routing rules without code changes
5. **Visual Clarity**: Clear representation of decision logic in the UI

### 10. Considerations & Limitations

#### Technical Considerations
- **Circular Reference Prevention**: Detect and prevent infinite loops
- **Performance**: Efficient condition evaluation for complex trees
- **State Management**: Proper handling of form state across non-linear navigation

#### UX Considerations
- **User Confusion**: Clear indication of why certain steps were skipped
- **Back Navigation**: Handling "Previous" button in conditional flows
- **Progress Indication**: Accurate progress bars with dynamic step counts

#### Business Considerations
- **Maintenance**: Complex conditional logic may be harder to maintain
- **Testing**: Need comprehensive testing of all possible paths
- **Analytics**: Tracking user paths through conditional flows

This design provides a robust foundation for implementing conditional navigation while maintaining the existing tour system's simplicity and effectiveness.
