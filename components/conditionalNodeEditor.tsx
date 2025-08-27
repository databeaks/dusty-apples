'use client';

import { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Lightbulb, Save, X } from 'lucide-react';
import { 
  ConditionalNodeData, 
  ConditionalRule, 
  QuestionContext,
  ValidationResult 
} from '@/types/api';
import { 
  getAvailableQuestions, 
  getAvailableTargetNodes,
  validateConditionalNode 
} from '@/lib/conditionalNavigation';
import { SmartConditionEditor, ConditionSuggestions } from './smartConditionEditor';

interface ConditionalNodeEditorProps {
  data: ConditionalNodeData;
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
  onSave: (data: ConditionalNodeData) => void;
  onClose: () => void;
}

export const ConditionalNodeEditor = ({ 
  data, 
  nodeId, 
  nodes, 
  edges, 
  onSave,
  onClose
}: ConditionalNodeEditorProps) => {
  const [editData, setEditData] = useState<ConditionalNodeData>(data);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ errors: [], warnings: [], isValid: true });
  
  // Get available questions from previous steps
  const availableQuestions = getAvailableQuestions(nodeId, nodes, edges);
  const availableTargets = getAvailableTargetNodes(nodes, nodeId);
  
  const addCondition = () => {
    const newCondition: ConditionalRule = {
      id: `condition-${Date.now()}`,
      description: '',
      condition: {
        questionId: '',
        operator: 'equals',
        value: ''
      },
      targetNodeId: '',
      label: ''
    };
    
    setEditData({
      ...editData,
      conditions: [...editData.conditions, newCondition]
    });
  };
  
  const updateCondition = (index: number, condition: ConditionalRule) => {
    const newConditions = [...editData.conditions];
    newConditions[index] = condition;
    setEditData({
      ...editData,
      conditions: newConditions
    });
    
    // Validate after update
    const validationResult = validateConditionalNode({ ...editData, conditions: newConditions }, availableQuestions);
    setValidation(validationResult);
  };
  
  const removeCondition = (index: number) => {
    const newConditions = editData.conditions.filter((_, i) => i !== index);
    setEditData({
      ...editData,
      conditions: newConditions
    });
    
    // Validate after removal
    const validationResult = validateConditionalNode({ ...editData, conditions: newConditions }, availableQuestions);
    setValidation(validationResult);
  };
  
  const handleApplySuggestion = (suggestion: ConditionalRule) => {
    const newCondition = {
      ...suggestion,
      id: `condition-${Date.now()}` // Generate new ID
    };
    
    setEditData({
      ...editData,
      conditions: [...editData.conditions, newCondition]
    });
    setShowSuggestions(false);
    
    // Validate after adding suggestion
    const validationResult = validateConditionalNode({ 
      ...editData, 
      conditions: [...editData.conditions, newCondition] 
    }, availableQuestions);
    setValidation(validationResult);
  };
  
  const handleSave = () => {
    const validationResult = validateConditionalNode(editData, availableQuestions);
    setValidation(validationResult);
    
    if (validationResult.isValid) {
      onSave(editData);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-orange-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Plus className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Edit Conditional Node</h2>
              <p className="text-sm text-gray-600">Configure routing logic based on user answers</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label>Node Title</Label>
                <Input 
                  value={editData.title} 
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="e.g., Customer Type Router"
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={editData.description} 
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Describe what this conditional node does..."
                  rows={2}
                />
              </div>
            </div>
            
            {/* Available Questions Info */}
            {availableQuestions.length > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-2">
                  Available Questions ({availableQuestions.length})
                </div>
                <div className="space-y-1">
                  {availableQuestions.slice(0, 3).map(question => (
                    <div key={question.questionId} className="text-xs text-blue-600">
                      <strong>{question.questionTitle}</strong> from "{question.sourceStepTitle}" ({question.questionType})
                    </div>
                  ))}
                  {availableQuestions.length > 3 && (
                    <div className="text-xs text-blue-500 italic">
                      +{availableQuestions.length - 3} more questions available...
                    </div>
                  )}
                </div>
              </Card>
            )}
            
            {availableQuestions.length === 0 && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="text-sm font-medium text-yellow-800 mb-1">
                  No Questions Available
                </div>
                <div className="text-xs text-yellow-600">
                  This conditional node cannot access any questions from previous steps. 
                  Make sure there are connected steps with questions before this node.
                </div>
              </Card>
            )}
            
            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Conditions</Label>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    disabled={availableQuestions.length === 0}
                  >
                    <Lightbulb className="h-4 w-4 mr-1" />
                    Smart Suggestions
                  </Button>
                  <Button 
                    onClick={addCondition} 
                    variant="outline" 
                    size="sm"
                    disabled={availableQuestions.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Condition
                  </Button>
                </div>
              </div>
              
              {showSuggestions && availableQuestions.length > 0 && (
                <div className="mb-4">
                  <ConditionSuggestions
                    availableQuestions={availableQuestions}
                    onApplySuggestion={handleApplySuggestion}
                  />
                </div>
              )}
              
              <div className="space-y-3">
                {editData.conditions.map((condition, index) => (
                  <SmartConditionEditor
                    key={condition.id}
                    condition={condition}
                    availableQuestions={availableQuestions}
                    availableTargets={availableTargets}
                    onChange={(updated) => updateCondition(index, updated)}
                    onRemove={() => removeCondition(index)}
                  />
                ))}
                
                {editData.conditions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No conditions configured</p>
                    <p className="text-xs">Add conditions to route users based on their answers</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Default Target */}
            <div>
              <Label>Default Target (Optional)</Label>
              <Select 
                value={editData.defaultTarget || 'none'} 
                onValueChange={(value) => setEditData({ ...editData, defaultTarget: value === 'none' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default target..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default target</SelectItem>
                  {availableTargets.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.data?.title || node.id} ({node.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-500 mt-1">
                Users will go here if no conditions match their answers
              </div>
            </div>
            
            {/* Validation Messages */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <Card className="p-4">
                {validation.errors.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-red-800 mb-2">Errors:</div>
                    {validation.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-600 mb-1">• {error}</div>
                    ))}
                  </div>
                )}
                
                {validation.warnings.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-yellow-800 mb-2">Warnings:</div>
                    {validation.warnings.map((warning, index) => (
                      <div key={index} className="text-xs text-yellow-600 mb-1">• {warning}</div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {editData.conditions.length} condition{editData.conditions.length !== 1 ? 's' : ''} configured
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!validation.isValid}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
