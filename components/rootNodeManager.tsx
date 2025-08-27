'use client';

import { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Crown, CheckCircle, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { validateRootConnectivity } from '@/lib/conditionalNavigation';
import { RootValidationResult } from '@/types/api';

interface RootNodeManagerProps {
  nodes: Node[];
  edges: Edge[];
  onSetRoot: (nodeId: string) => Promise<void>;
  onValidateConnectivity: () => Promise<RootValidationResult>;
}

export const RootNodeManager = ({ 
  nodes, 
  edges, 
  onSetRoot, 
  onValidateConnectivity 
}: RootNodeManagerProps) => {
  const [validation, setValidation] = useState<RootValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSettingRoot, setIsSettingRoot] = useState(false);
  
  const stepNodes = nodes.filter(n => n.type === 'tourStep');
  const currentRoot = nodes.find(n => n.data?.isRoot === true || n.isRoot === true);
  
  // Validate connectivity on component mount and when nodes/edges change
  useEffect(() => {
    const validateOnMount = async () => {
      setIsValidating(true);
      try {
        const result = await onValidateConnectivity();
        setValidation(result);
      } catch (error) {
        console.error('Failed to validate connectivity:', error);
        // Fallback to client-side validation
        const clientValidation = validateRootConnectivity(nodes, edges);
        setValidation(clientValidation);
      } finally {
        setIsValidating(false);
      }
    };
    
    validateOnMount();
  }, [nodes, edges, onValidateConnectivity]);
  
  const handleSetRoot = async (nodeId: string) => {
    setIsSettingRoot(true);
    try {
      await onSetRoot(nodeId);
      // Re-validate after setting root
      const result = await onValidateConnectivity();
      setValidation(result);
    } catch (error) {
      console.error('Failed to set root node:', error);
    } finally {
      setIsSettingRoot(false);
    }
  };
  
  const handleManualValidation = async () => {
    setIsValidating(true);
    try {
      const result = await onValidateConnectivity();
      setValidation(result);
    } catch (error) {
      console.error('Failed to validate connectivity:', error);
    } finally {
      setIsValidating(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center">
            <Crown className="h-4 w-4 mr-2 text-red-600" />
            Root Node Management
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualValidation}
            disabled={isValidating}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Root Display */}
        <div>
          <Label className="text-xs font-medium text-gray-700">Current Root Node:</Label>
          {currentRoot ? (
            <div className="mt-1 p-2 bg-green-50 rounded border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-800 flex items-center">
                    <Crown className="h-3 w-3 mr-1" />
                    {currentRoot.data?.title || 'Untitled Step'}
                  </div>
                  <div className="text-xs text-green-600">ID: {currentRoot.id}</div>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          ) : (
            <div className="mt-1 p-2 bg-red-50 rounded border border-red-200">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <div className="text-sm text-red-700">No root node set</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Root Selection */}
        {stepNodes.length > 0 && (
          <div>
            <Label className="text-xs font-medium text-gray-700">Set Root Node:</Label>
            <div className="mt-1 flex space-x-2">
              <Select onValueChange={handleSetRoot} disabled={isSettingRoot}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose root step..." />
                </SelectTrigger>
                <SelectContent>
                  {stepNodes.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      <div className="flex items-center">
                        {(node.data?.isRoot || node.isRoot) && (
                          <Crown className="h-3 w-3 mr-1 text-red-600" />
                        )}
                        {node.data?.title || 'Untitled Step'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSettingRoot && (
                <div className="flex items-center px-2">
                  <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Validation Results */}
        <ConnectivityValidationDisplay 
          validation={validation} 
          nodes={nodes} 
          isValidating={isValidating}
        />
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-blue-50 rounded border">
            <div className="font-medium text-blue-800">{stepNodes.length}</div>
            <div className="text-blue-600">Steps</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded border">
            <div className="font-medium text-green-800">{nodes.filter(n => n.type === 'question').length}</div>
            <div className="text-green-600">Questions</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded border">
            <div className="font-medium text-orange-800">{edges.length}</div>
            <div className="text-orange-600">Connections</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ConnectivityValidationDisplayProps {
  validation: RootValidationResult | null;
  nodes: Node[];
  isValidating: boolean;
}

const ConnectivityValidationDisplay = ({ 
  validation, 
  nodes, 
  isValidating 
}: ConnectivityValidationDisplayProps) => {
  if (isValidating) {
    return (
      <div className="p-3 bg-gray-50 border rounded">
        <div className="flex items-center text-sm text-gray-600">
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Validating connectivity...
        </div>
      </div>
    );
  }
  
  if (!validation) {
    return (
      <div className="p-3 bg-gray-50 border rounded">
        <div className="text-sm text-gray-600">Click refresh to validate connectivity</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {/* Errors */}
      {validation.errors.map((error, index) => (
        <div key={`error-${index}`} className="p-2 bg-red-50 border border-red-200 rounded">
          <div className="flex items-start">
            <X className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-700">{error}</div>
          </div>
        </div>
      ))}
      
      {/* Warnings */}
      {validation.warnings.map((warning, index) => (
        <div key={`warning-${index}`} className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-700">{warning}</div>
          </div>
        </div>
      ))}
      
      {/* Orphaned Nodes */}
      {validation.orphanedNodes.length > 0 && (
        <div className="p-2 bg-orange-50 border border-orange-200 rounded">
          <div className="text-xs font-medium text-orange-800 mb-1 flex items-center">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Orphaned Nodes ({validation.orphanedNodes.length}):
          </div>
          <div className="space-y-1">
            {validation.orphanedNodes.map(nodeId => {
              const node = nodes.find(n => n.id === nodeId);
              return (
                <div key={nodeId} className="text-xs text-orange-700 ml-4">
                  • {node?.data?.title || nodeId} (no path back to root)
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Unreachable Nodes */}
      {validation.unreachableNodes.length > 0 && (
        <div className="p-2 bg-purple-50 border border-purple-200 rounded">
          <div className="text-xs font-medium text-purple-800 mb-1 flex items-center">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Unreachable Nodes ({validation.unreachableNodes.length}):
          </div>
          <div className="space-y-1">
            {validation.unreachableNodes.map(nodeId => {
              const node = nodes.find(n => n.id === nodeId);
              return (
                <div key={nodeId} className="text-xs text-purple-700 ml-4">
                  • {node?.data?.title || nodeId} (not reachable from root)
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Success State */}
      {validation.isValid && validation.warnings.length === 0 && (
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center text-xs text-green-700">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            ✅ All nodes are properly connected to the root
          </div>
        </div>
      )}
      
      {/* Connectivity Summary */}
      {validation.rootNodeId && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="text-xs text-blue-700">
            <strong>Root:</strong> {validation.rootNodeId}
            {validation.orphanedNodes.length === 0 && validation.unreachableNodes.length === 0 && (
              <span className="ml-2 text-green-600">✓ Fully connected</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
