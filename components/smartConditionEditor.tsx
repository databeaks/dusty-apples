'use client';

import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Lightbulb } from 'lucide-react';
import { 
  ConditionalRule, 
  QuestionContext, 
  ConditionalNodeData 
} from '@/types/api';
import { 
  getAvailableQuestions, 
  getConditionSuggestions, 
  getAvailableTargetNodes,
  validateConditionalNode 
} from '@/lib/conditionalNavigation';

interface SmartConditionEditorProps {
  condition: ConditionalRule;
  availableQuestions: QuestionContext[];
  availableTargets: Node[];
  onChange: (condition: ConditionalRule) => void;
  onRemove: () => void;
}

interface MultiSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

const MultiSelect = ({ options, value, onChange, placeholder }: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };
  
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start text-left font-normal"
      >
        {value.length === 0 ? placeholder : `${value.length} selected`}
      </Button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map(option => (
            <div
              key={option.value}
              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => toggleOption(option.value)}
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => {}}
                className="mr-2"
              />
              <span className="text-sm">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SmartConditionEditor = ({
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
          value={Array.isArray(condition.condition.value) ? condition.condition.value.join(', ') : (condition.condition.value as string || '')}
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
            value={Array.isArray(condition.condition.value) ? (condition.condition.value[0] || '') : (condition.condition.value as string || '')}
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
          value={Array.isArray(condition.condition.value) ? (condition.condition.value[0] || '') : (condition.condition.value as string || '')}
          onChange={(e) => updateCondition({ value: parseFloat(e.target.value) || 0 })}
        />
      );
    }
    
    // Default text input
    return (
      <Input
        placeholder="Enter value..."
        value={Array.isArray(condition.condition.value) ? condition.condition.value.join(', ') : (condition.condition.value as string || '')}
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
          <Label className="text-sm font-medium">Condition</Label>
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

// Component for showing auto-suggestions
interface ConditionSuggestionsProps {
  availableQuestions: QuestionContext[];
  onApplySuggestion: (suggestion: ConditionalRule) => void;
}

export const ConditionSuggestions = ({ 
  availableQuestions, 
  onApplySuggestion 
}: ConditionSuggestionsProps) => {
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
