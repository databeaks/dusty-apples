'use client';

import { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Edit3, Trash2 } from 'lucide-react';
import { ConditionalNodeData } from '@/types/api';
import { updateNode, deleteNode } from '@/lib/fastapi';

interface ConditionalNodeProps {
  data: ConditionalNodeData;
  id: string;
  onEdit?: (id: string, data: ConditionalNodeData) => void;
}

export const ConditionalNode = ({ data, id, onEdit }: ConditionalNodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { setNodes, getNodes } = useReactFlow();

  const handleDelete = async () => {
    try {
      await deleteNode(id);
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
    } catch (error) {
      console.error('Failed to delete conditional node:', error);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(id, data);
    } else {
      console.log('No onEdit handler provided for conditional node:', id);
    }
  };

  // Calculate number of output handles needed
  const outputHandles = data.conditions.length + (data.defaultTarget ? 1 : 0);

  return (
    <Card className="min-w-[300px] max-w-[320px] border-2 border-orange-200 bg-orange-50/30 shadow-lg">
      <CardHeader className="pb-2 bg-orange-100">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <GitBranch className="h-4 w-4 text-orange-600" />
            <CardTitle className="text-sm text-orange-800">
              {data.title || 'Conditional Router'}
            </CardTitle>
          </div>
          <div className="flex space-x-1">
            <Button size="sm" variant="ghost" onClick={handleEdit}>
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-orange-700">
          {data.description || 'Routes users based on previous answers'}
        </p>
        
        {/* Conditions Summary */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-orange-800">
            Conditions ({data.conditions.length}):
          </div>
          {data.conditions.slice(0, 3).map((condition, index) => (
            <div key={condition.id} className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
              <div className="font-medium">
                If: {condition.condition.questionId} {condition.condition.operator} "{condition.condition.value}"
              </div>
              <div className="text-orange-500">
                → {condition.targetNodeId}
              </div>
            </div>
          ))}
          {data.conditions.length > 3 && (
            <div className="text-xs text-orange-500 italic">
              +{data.conditions.length - 3} more conditions...
            </div>
          )}
        </div>
        
        {/* Default Target */}
        {data.defaultTarget && (
          <div className="text-xs text-orange-600 bg-gray-100 p-2 rounded border border-orange-200">
            <div className="font-medium">Default:</div>
            <div className="text-orange-500">→ {data.defaultTarget}</div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="flex justify-between items-center">
          <Badge 
            variant="secondary" 
            className="bg-orange-200 text-orange-800 text-xs"
          >
            {data.conditions.length === 0 ? 'Not Configured' : 'Active'}
          </Badge>
          <div className="text-xs text-orange-500">
            {outputHandles} path{outputHandles !== 1 ? 's' : ''}
          </div>
        </div>
      </CardContent>
      
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-orange-500 border-2 border-white shadow-lg hover:bg-orange-600 transition-colors" 
        title="Connect from previous step"
      />
      
      {/* Output Handles for Conditions */}
      {data.conditions.map((condition, index) => (
        <Handle
          key={condition.id}
          type="source"
          position={Position.Right}
          id={`condition-${index}`}
          style={{ 
            top: `${20 + ((index + 1) * (60 / (outputHandles + 1)))}%`,
          }}
          className="w-3 h-3 bg-orange-500 border-2 border-white shadow-lg hover:bg-orange-600 transition-colors"
          title={`${condition.label || condition.description}: ${condition.condition.questionId} ${condition.condition.operator} ${condition.condition.value}`}
        />
      ))}
      
      {/* Default Output Handle */}
      {data.defaultTarget && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          className="w-3 h-3 bg-gray-500 border-2 border-white shadow-lg hover:bg-gray-600 transition-colors"
          title={`Default path to: ${data.defaultTarget}`}
        />
      )}
    </Card>
  );
};
