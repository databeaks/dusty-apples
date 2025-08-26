'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  useReactFlow,
  Panel,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '@/lib/store/appStore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getDecisionTree, 
  createNode, 
  updateNode, 
  deleteNode, 
  createEdge, 
  deleteEdge,
  DecisionTreeNode,
  DecisionTreeEdge 
} from '@/lib/fastapi';

import { Plus, Save, Trash2, Edit3, GitBranch, MessageSquare, Layout, Link, X } from 'lucide-react';
import ELK from 'elkjs/lib/elk.bundled.js';

// Custom node types for different tour elements
const TourStepNode = ({ data, id }: { data: any; id: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);
  const { setNodes, getNodes } = useReactFlow();

  const handleSave = async () => {
    try {
      // Get the current node to preserve position
      const currentNode = getNodes().find(n => n.id === id);
      if (!currentNode) return;
      
      // Send complete node data including position
      await updateNode(id, {
        type: currentNode.type,
        position: currentNode.position,
        data: editData
      });
      
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: editData } : node
        )
      );
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNode(id);
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  if (isEditing) {
    return (
      <Card className="min-w-[280px] border-2 border-blue-200 shadow-lg">
        <CardHeader className="pb-2 bg-blue-100">
          <CardTitle className="text-sm text-blue-800 flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Edit Tour Step
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="stepId">Step ID</Label>
            <Input
              id="stepId"
              value={editData.stepId || ''}
              onChange={(e) => setEditData({ ...editData, stepId: e.target.value })}
              placeholder="e.g., customer-type"
            />
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={editData.title || ''}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              placeholder="Step title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Step description"
              rows={2}
            />
          </div>
          
          {/* Tour-specific fields */}
          <div>
            <Label htmlFor="target">Target Element (CSS Selector)</Label>
            <Input
              id="target"
              value={editData.target || ''}
              onChange={(e) => setEditData({ ...editData, target: e.target.value })}
              placeholder="e.g., #my-button, .navbar, [data-tour='step1']"
            />
          </div>
          
          <div>
            <Label htmlFor="placement">Tooltip Placement</Label>
            <Select value={editData.placement || 'bottom'} onValueChange={(value) => setEditData({ ...editData, placement: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select placement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="center">Center</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="disableBeacon">Disable Beacon</Label>
              <Select 
                value={editData.disableBeacon ? 'true' : 'false'} 
                onValueChange={(value) => setEditData({ ...editData, disableBeacon: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Show Beacon</SelectItem>
                  <SelectItem value="true">Hide Beacon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="showSkipButton">Show Skip Button</Label>
              <Select 
                value={editData.showSkipButton ? 'true' : 'false'} 
                onValueChange={(value) => setEditData({ ...editData, showSkipButton: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Show Skip</SelectItem>
                  <SelectItem value="false">Hide Skip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
      </Card>
    );
  }

  return (
    <Card className="min-w-[260px] max-w-[280px] border-2 border-blue-200 bg-blue-50/30 shadow-lg">
      <CardHeader className="pb-2 bg-blue-100">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm text-blue-800">{data.title || 'Untitled Step'}</CardTitle>
          </div>
          <div className="flex space-x-1">
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-blue-700 mb-2">{data.description || 'No description'}</p>
        <div className="text-xs text-blue-600">
          <strong>ID:</strong> {data.stepId || 'No ID'}
        </div>
        {data.target && (
          <div className="mt-1 text-xs text-blue-600">
            <strong>Target:</strong> 
            <code className="bg-blue-100 px-1 py-0.5 rounded text-xs ml-1">
              {data.target.length > 15 ? `${data.target.substring(0, 15)}...` : data.target}
            </code>
          </div>
        )}
        {/* Show compact summary of configuration */}
        {(data.placement || data.disableBeacon || data.showSkipButton) && (
          <div className="mt-1 text-xs text-blue-600">
            <strong>Config:</strong> 
            {data.placement && ` ${data.placement}`}
            {data.disableBeacon && ' • No Beacon'}
            {data.showSkipButton && ' • Skip Button'}
          </div>
        )}
      </CardContent>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-blue-500 border-2 border-white shadow-lg hover:bg-blue-600 transition-colors" 
        title="Connect from another node to this step"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-blue-500 border-2 border-white shadow-lg hover:bg-blue-600 transition-colors" 
        title="Connect this step to another node"
      />
    </Card>
  );
};

const QuestionNode = ({ data, id }: { data: any; id: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);
  const { setNodes, getNodes } = useReactFlow();

  const handleSave = async () => {
    try {
      // Get the current node to preserve position
      const currentNode = getNodes().find(n => n.id === id);
      if (!currentNode) return;
      
      // Send complete node data including position
      await updateNode(id, {
        type: currentNode.type,
        position: currentNode.position,
        data: editData
      });
      
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: editData } : node
        )
      );
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNode(id);
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  if (isEditing) {
    return (
      <Card className="min-w-[250px] border-2 border-green-200 shadow-lg">
        <CardHeader className="pb-2 bg-green-100">
          <CardTitle className="text-sm text-green-800 flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Edit Question
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="questionId">Question ID</Label>
            <Input
              id="questionId"
              value={editData.questionId || ''}
              onChange={(e) => setEditData({ ...editData, questionId: e.target.value })}
              placeholder="e.g., customer-type"
            />
          </div>
          <div>
            <Label htmlFor="title">Question Title</Label>
            <Input
              id="title"
              value={editData.title || ''}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              placeholder="Question text"
            />
          </div>
          <div>
            <Label htmlFor="type">Question Type</Label>
            <Select value={editData.type} onValueChange={(value) => setEditData({ ...editData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select">Single Select</SelectItem>
                <SelectItem value="multiselect">Multi Select</SelectItem>
                <SelectItem value="text">Text Input</SelectItem>
                <SelectItem value="textarea">Text Area</SelectItem>
                <SelectItem value="number">Number Input</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Question description"
              rows={2}
            />
          </div>
          
          {/* Options Management for Select/Multiselect Questions */}
          {(editData.type === 'select' || editData.type === 'multiselect') && (
            <div>
              <Label>Answer Options</Label>
              <div className="space-y-2">
                {(editData.options || []).map((option: any, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={option.value || ''}
                      onChange={(e) => {
                        const newOptions = [...(editData.options || [])];
                        newOptions[index] = { ...option, value: e.target.value, label: e.target.value };
                        setEditData({ ...editData, options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newOptions = (editData.options || []).filter((_: any, i: number) => i !== index);
                        setEditData({ ...editData, options: newOptions });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newOptions = [...(editData.options || []), { value: '', label: '' }];
                    setEditData({ ...editData, options: newOptions });
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500" />
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
      </Card>
    );
  }

  return (
    <Card className="min-w-[230px] max-w-[250px] border-2 border-green-200 bg-green-50/30 shadow-lg">
      <CardHeader className="pb-2 bg-green-100">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm text-green-800">{data.title || 'Untitled Question'}</CardTitle>
          </div>
          <div className="flex space-x-1">
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-green-700 mb-2">{data.description || 'No description'}</p>
        <div className="text-xs text-green-600">
          <strong>ID:</strong> {data.questionId || 'No ID'}
        </div>
        <div className="text-xs text-green-600">
          <strong>Type:</strong> {data.type || 'No type'}
        </div>
        {data.options && data.options.length > 0 && (
          <div className="mt-1 text-xs text-green-600">
            <strong>Options:</strong> {data.options.length} choices
          </div>
        )}
      </CardContent>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-lg hover:bg-green-600 transition-colors" 
        title="Connect from another node to this question"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-lg hover:bg-green-600 transition-colors" 
        title="Connect this question to another node"
      />
      </Card>
    );
};








const nodeTypes: NodeTypes = {
  tourStep: TourStepNode,
  question: QuestionNode,
};

// ELK layout configuration
const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '350', // Horizontal spacing between layers (root to questions)
  'elk.spacing.nodeNode': '180', // Vertical spacing between nodes in same layer
  'elk.direction': 'RIGHT', // Left-to-right flow: root on left, questions spread right
  'elk.layered.nodePlacement.strategy': 'INTERACTIVE',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.spacing.edgeNodeBetweenLayers': '80',
  'elk.spacing.edgeNode': '50',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '30',
  'elk.spacing.edgeEdge': '20',
  'elk.padding': '[top=100,left=100,bottom=100,right=100]',
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.nodePlacement.favorStraightEdges': 'true',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN', // Better hierarchy handling
};

// Function to apply root-left grid layout with layered questions
const applyGridLayout = (nodes: Node[]): Node[] => {
  const gridNodes = [...nodes];
  
  // Separate tour steps and questions
  const tourSteps = gridNodes.filter(n => n.type === 'tourStep');
  const questions = gridNodes.filter(n => n.type === 'question');
  
  // Simple grid: steps on left, questions spread to the right in layers
  const stepY = 300; // All steps on same horizontal line
  const questionBaseY = 500; // Questions positioned below steps
  const baseStepSpacing = 500;
  
  // Layout tour steps horizontally
  tourSteps.forEach((node, index) => {
    node.position = {
      x: 150 + (index * baseStepSpacing),
      y: stepY,
    };
  });
  
  // Layout questions in layers to the right
  let questionX = 600; // Start questions after first step
  questions.forEach((node, index) => {
    node.position = {
      x: questionX,
      y: questionBaseY + (index * 180), // Stagger vertically to avoid overlaps
    };
    questionX += 350; // Each question in its own X layer
  });
  
  return gridNodes;
};

// Function to apply a hierarchical force-directed layout
const applyForceLayout = (nodes: Node[], edges: Edge[]): Node[] => {
  const forceNodes = [...nodes];
  const iterations = 100;
  const repulsionStrength = 50000;
  const attractionStrength = 0.01;
  const centeringForce = 0.001;
  const minDistance = 200;
  
  // Initialize positions with root-left layout in mind
  forceNodes.forEach((node, index) => {
    if (!node.position.x || !node.position.y) {
      // Place tour steps starting from left, questions spread to the right
      const baseX = node.type === 'tourStep' ? 200 + (index * 200) : 600 + (index * 150);
      node.position = {
        x: baseX + (Math.random() - 0.5) * 100,
        y: 300 + (Math.random() - 0.5) * 200, // Center around Y=300
      };
    }
  });
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces = forceNodes.map(() => ({ x: 0, y: 0 }));
    
    // Repulsion between all nodes
    for (let i = 0; i < forceNodes.length; i++) {
      for (let j = i + 1; j < forceNodes.length; j++) {
        const nodeA = forceNodes[i];
        const nodeB = forceNodes[j];
        
        const dx = nodeA.position.x - nodeB.position.x;
        const dy = nodeA.position.y - nodeB.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        if (distance < minDistance) {
          const force = repulsionStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          forces[i].x += fx;
          forces[i].y += fy;
          forces[j].x -= fx;
          forces[j].y -= fy;
        }
      }
    }
    
    // Attraction along edges
    edges.forEach(edge => {
      const sourceIndex = forceNodes.findIndex(n => n.id === edge.source);
      const targetIndex = forceNodes.findIndex(n => n.id === edge.target);
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const sourceNode = forceNodes[sourceIndex];
        const targetNode = forceNodes[targetIndex];
        
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = distance * attractionStrength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        forces[sourceIndex].x += fx;
        forces[sourceIndex].y += fy;
        forces[targetIndex].x -= fx;
        forces[targetIndex].y -= fy;
      }
    });
    
    // Apply forces
    forceNodes.forEach((node, index) => {
      node.position.x += forces[index].x;
      node.position.y += forces[index].y;
      
      // Center the layout vertically
      node.position.y += (300 - node.position.y) * centeringForce;
      
      // Keep tour steps towards the left, questions towards the right
      if (node.type === 'tourStep') {
        // Pull steps towards left side
        node.position.x += (Math.max(150, node.position.x - 200) - node.position.x) * (centeringForce * 0.5);
      } else {
        // Keep questions on the right side
        node.position.x += (Math.max(600, node.position.x) - node.position.x) * (centeringForce * 0.5);
      }
    });
  }
  
  // Apply final hierarchy enforcement
  const hierarchicalNodes = enforceHierarchy(forceNodes, edges);
  return hierarchicalNodes;
};

// Function to enforce root-left layout with layered questions
const enforceHierarchy = (nodes: Node[], edges: Edge[]): Node[] => {
  const hierarchicalNodes = [...nodes];
  
  // Separate tour steps and questions
  const tourSteps = hierarchicalNodes.filter(n => n.type === 'tourStep');
  const questions = hierarchicalNodes.filter(n => n.type === 'question');
  
  // Create adjacency maps
  const outgoingEdges = new Map<string, string[]>();
  const incomingEdges = new Map<string, string[]>();
  
  edges.forEach(edge => {
    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge.target);
    
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, []);
    }
    incomingEdges.get(edge.target)!.push(edge.source);
  });
  
  // Find root node (tour step with no incoming edges)
  const rootNodes = tourSteps.filter(node => !incomingEdges.has(node.id));
  const rootNode = rootNodes.length > 0 ? rootNodes[0] : tourSteps[0];
  
  if (rootNode) {
    // Position root on the left
    rootNode.position.x = 150;
    rootNode.position.y = 300; // Center vertically
  }
  
  // Create step-to-questions mapping
  const stepToQuestions = new Map<string, string[]>();
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode?.type === 'tourStep' && targetNode?.type === 'question') {
      if (!stepToQuestions.has(edge.source)) {
        stepToQuestions.set(edge.source, []);
      }
      stepToQuestions.get(edge.source)!.push(edge.target);
    }
  });
  
  // Position other tour steps and their questions
  let currentStepX = 150;
  const processedSteps = new Set<string>();
  
  const processStep = (stepId: string, depth: number = 0) => {
    if (processedSteps.has(stepId)) return;
    processedSteps.add(stepId);
    
    const stepNode = hierarchicalNodes.find(n => n.id === stepId);
    if (!stepNode) return;
    
    // Position the step if not root
    if (stepNode.id !== rootNode?.id) {
      stepNode.position.x = currentStepX;
      stepNode.position.y = 300; // Keep steps on same horizontal line
    }
    
    // Get connected questions
    const connectedQuestions = stepToQuestions.get(stepId) || [];
    
    if (connectedQuestions.length > 0) {
      // Position questions in separate X layers with independent Y positioning
      connectedQuestions.forEach((questionId, questionIndex) => {
        const questionNode = hierarchicalNodes.find(n => n.id === questionId);
        if (questionNode) {
          // Each question gets its own X layer to the right
          const questionLayerX = stepNode.position.x + 400 + (questionIndex * 350);
          questionNode.position.x = questionLayerX;
          // Let questions maintain their own Y positions (no forced alignment)
          console.log(`📍 Positioning question ${questionId} at X=${questionLayerX}, keeping Y=${questionNode.position.y}`);
        }
      });
      
      // Update currentStepX for next step
      currentStepX = stepNode.position.x + 400 + (connectedQuestions.length * 350) + 100;
    } else {
      // No questions, just move to next step position
      currentStepX += 500;
    }
    
    // Process connected tour steps
    const connectedSteps = (outgoingEdges.get(stepId) || [])
      .filter(targetId => {
        const targetNode = hierarchicalNodes.find(n => n.id === targetId);
        return targetNode?.type === 'tourStep';
      });
    
    connectedSteps.forEach(connectedStepId => {
      processStep(connectedStepId, depth + 1);
    });
  };
  
  // Start processing from root
  if (rootNode) {
    processStep(rootNode.id);
  }
  
  // Process any remaining unconnected steps
  tourSteps.forEach(step => {
    if (!processedSteps.has(step.id)) {
      processStep(step.id);
    }
  });
  
  return hierarchicalNodes;
};

// Function to detect and fix overlapping nodes
const fixNodeOverlaps = (nodes: Node[]): Node[] => {
  const fixedNodes = [...nodes];
  const minSpacing = 50; // Minimum spacing between nodes
  
  // Sort nodes by position for processing
  fixedNodes.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  
  for (let i = 0; i < fixedNodes.length; i++) {
    for (let j = i + 1; j < fixedNodes.length; j++) {
      const nodeA = fixedNodes[i];
      const nodeB = fixedNodes[j];
      
      // Calculate node bounds (assuming standard node sizes)
      const aWidth = nodeA.type === 'tourStep' ? 280 : 250;
      const aHeight = nodeA.type === 'tourStep' ? 140 : 120;
      const bWidth = nodeB.type === 'tourStep' ? 280 : 250;
      const bHeight = nodeB.type === 'tourStep' ? 140 : 120;
      
      // Check for overlap
      const horizontalOverlap = 
        nodeA.position.x < nodeB.position.x + bWidth + minSpacing &&
        nodeA.position.x + aWidth + minSpacing > nodeB.position.x;
      
      const verticalOverlap = 
        nodeA.position.y < nodeB.position.y + bHeight + minSpacing &&
        nodeA.position.y + aHeight + minSpacing > nodeB.position.y;
      
      if (horizontalOverlap && verticalOverlap) {
        // Calculate separation distance needed
        const xSeparation = (aWidth + bWidth) / 2 + minSpacing;
        const ySeparation = (aHeight + bHeight) / 2 + minSpacing;
        
        // Normal overlap resolution - separate in optimal direction
        const xDistance = Math.abs(nodeA.position.x - nodeB.position.x);
        const yDistance = Math.abs(nodeA.position.y - nodeB.position.y);
        
        if (xDistance < yDistance) {
          // Separate horizontally
          if (nodeA.position.x < nodeB.position.x) {
            nodeB.position.x = nodeA.position.x + xSeparation;
          } else {
            nodeA.position.x = nodeB.position.x + xSeparation;
          }
        } else {
          // Separate vertically
          if (nodeA.position.y < nodeB.position.y) {
            nodeB.position.y = nodeA.position.y + ySeparation;
          } else {
            nodeA.position.y = nodeB.position.y + ySeparation;
          }
        }
      }
    }
  }
  
  return fixedNodes;
};

// Function to apply ELK layout to nodes and edges
const applyElkLayout = async (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
  console.log('ELK Layout Input - Nodes:', nodes.length, 'Edges:', edges.length);
  console.log('Sample nodes:', nodes.slice(0, 2));
  
  // Filter out nodes/edges with invalid IDs and ensure they're strings
  const validNodes = nodes.filter(node => {
    const isValid = node && node.id && typeof node.id === 'string' && node.id.trim() !== '';
    if (!isValid) {
      console.warn('Invalid node filtered out:', node);
    }
    return isValid;
  });
  
  const validEdges = edges.filter(edge => {
    const isValid = edge && edge.id && typeof edge.id === 'string' && edge.id.trim() !== '' &&
      edge.source && typeof edge.source === 'string' && edge.source.trim() !== '' &&
      edge.target && typeof edge.target === 'string' && edge.target.trim() !== '';
    if (!isValid) {
      console.warn('Invalid edge filtered out:', edge);
    }
    return isValid;
  });

  console.log('Valid nodes after filtering:', validNodes.length);
  console.log('Valid edges after filtering:', validEdges.length);

  if (validNodes.length === 0) {
    console.warn('No valid nodes for ELK layout - returning original nodes');
    return { nodes, edges };
  }

  const elkNodes = validNodes.map((node) => {
    // Calculate more compact node sizes
    const baseWidth = node.type === 'tourStep' ? 280 : 250;
    const baseHeight = node.type === 'tourStep' ? 140 : 120;
    
    // Minimal extra height for content (since we've made nodes more compact)
    let extraHeight = 0;
    if (node.data?.target) {
      extraHeight += 20; // Space for target element
    }
    if (node.data?.placement || node.data?.disableBeacon || node.data?.showSkipButton) {
      extraHeight += 15; // Space for config line
    }
    
    return {
      id: String(node.id),
      width: baseWidth,
      height: baseHeight + extraHeight,
    };
  });

  const elkEdges = validEdges.map((edge) => ({
    id: String(edge.id), // Ensure ID is string
    sources: [String(edge.source)],
    targets: [String(edge.target)],
  }));

  const elkGraph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    const layoutedGraph = await elk.layout(elkGraph);
    
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === String(node.id));
      if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
        return {
          ...node,
          position: {
            x: elkNode.x,
            y: elkNode.y,
          },
        };
      }
      return node;
    });

    // Apply hierarchy enforcement first
    const hierarchicalNodes = enforceHierarchy(layoutedNodes, edges);
    console.log('Applied hierarchy enforcement to', hierarchicalNodes.length, 'nodes');
    
    // Then apply overlap detection and fixing
    const fixedNodes = fixNodeOverlaps(hierarchicalNodes);
    console.log('Applied overlap fixes to', fixedNodes.length, 'nodes');

    return { nodes: fixedNodes, edges };
  } catch (error) {
    console.error('ELK layout failed, falling back to grid layout:', error);
    const gridNodes = applyGridLayout(nodes);
    return { nodes: gridNodes, edges };
  }
};

export function DecisionTree() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionFeedback, setConnectionFeedback] = useState<string | null>(null);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const router = useRouter();


  // Load data from database and apply ELK layout
  const loadDatabaseData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDecisionTree();
      console.log('✅ API Response received:', data);
      console.log('✅ Raw API data structure:', {
        hasNodes: !!data.nodes,
        hasEdges: !!data.edges,
        nodeCount: data.nodes?.length,
        edgeCount: data.edges?.length,
        nodeType: typeof data.nodes,
        edgeType: typeof data.edges
      });
      
      // Ensure data has the expected structure
      if (!data || !data.nodes || !data.edges) {
        throw new Error('Invalid data structure from database');
      }

      // Convert database format to ReactFlow format with validation
      console.log('🔍 Processing database data...');
      console.log('📊 First 3 database nodes:', data.nodes?.slice(0, 3));
      console.log('📊 First 3 database edges:', data.edges?.slice(0, 3));

      const flowNodes: Node[] = (data.nodes || [])
        .filter((dbNode: any) => {
          // Check for both id and node_id since API might return either format
          const nodeId = dbNode.id || dbNode.node_id;
          const hasValidId = dbNode && nodeId && String(nodeId).trim() !== '';
          if (!hasValidId) {
            console.warn('❌ Invalid node filtered out:', dbNode);
          }
          return hasValidId;
        })
        .map((dbNode: any, index: number) => {
          const nodeId = dbNode.id || dbNode.node_id;
          const positionX = dbNode.position?.x ?? dbNode.position_x ?? 0;
          const positionY = dbNode.position?.y ?? dbNode.position_y ?? 0;
          
          console.log(`🔍 Processing node ${index}:`, {
            id: nodeId,
            type: dbNode.type,
            position_x: positionX,
            position_y: positionY,
            hasData: !!dbNode.data
          });
          
          const processedNode: Node = {
            id: String(nodeId), // Use either id or node_id
            type: dbNode.type || 'default',
            position: { 
              x: Number(positionX) || 0, 
              y: Number(positionY) || 0 
            },
            data: dbNode.data || {},
          };
          
          console.log(`✅ Processed node ${index}:`, processedNode);
          return processedNode;
        });

      const flowEdges: Edge[] = (data.edges || [])
        .filter((dbEdge: any) => {
          // Check for both id and edge_id since API might return either format
          const edgeId = dbEdge.id || dbEdge.edge_id;
          const hasValidData = dbEdge && edgeId && dbEdge.source && dbEdge.target &&
            String(edgeId).trim() !== '' &&
            String(dbEdge.source).trim() !== '' &&
            String(dbEdge.target).trim() !== '';
          if (!hasValidData) {
            console.warn('❌ Invalid edge filtered out:', dbEdge);
          }
          return hasValidData;
        })
        .map((dbEdge: any, index: number) => {
          const edgeId = dbEdge.id || dbEdge.edge_id;
          console.log(`🔍 Processing edge ${index}:`, {
            id: edgeId,
            source: dbEdge.source,
            target: dbEdge.target,
            label: dbEdge.label
          });
          
          const processedEdge: Edge = {
            id: String(edgeId), // Use either id or edge_id
            source: String(dbEdge.source),
            target: String(dbEdge.target),
            label: dbEdge.label || '',
            style: { stroke: '#6b7280', strokeWidth: 2 },
            labelStyle: { fill: '#374151', fontSize: 12, fontWeight: 500 },
          };
          
          console.log(`✅ Processed edge ${index}:`, processedEdge);
          return processedEdge;
        });

      console.log('📈 Final processed counts:', { 
        flowNodes: flowNodes.length, 
        flowEdges: flowEdges.length 
      });
      console.log('📝 Sample processed node:', flowNodes[0]);
      console.log('📝 Sample processed edge:', flowEdges[0]);

      // Apply ELK layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = await applyElkLayout(flowNodes, flowEdges);
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setError(null);
    } catch (error) {
      console.error('Failed to load decision tree:', error);
      setError('Failed to load decision tree from database.');
    } finally {
      setIsLoading(false);
    }
  }, []);





  // Load decision tree from database
  useEffect(() => {
    const loadDecisionTree = async () => {
      try {
        await loadDatabaseData();
        setError(null);
      } catch (err) {
        setError('Failed to load decision tree');
        console.error('Error loading decision tree:', err);
      }
    };

    loadDecisionTree();
  }, [loadDatabaseData]);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Clear any previous feedback
      setConnectionFeedback(null);

      // Prevent self-connections
      if (connection.source === connection.target) {
        setConnectionFeedback('❌ Cannot connect a node to itself');
        setTimeout(() => setConnectionFeedback(null), 3000);
        return;
      }

      // Check if connection already exists
      const existingEdge = edges.find(
        edge => edge.source === connection.source && edge.target === connection.target
      );
      if (existingEdge) {
        setConnectionFeedback('⚠️ Connection already exists between these nodes');
        setTimeout(() => setConnectionFeedback(null), 3000);
        return;
      }

      // Determine connection type based on node types
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);
      
      let connectionLabel = 'connected';
      if (sourceNode?.type === 'tourStep' && targetNode?.type === 'question') {
        connectionLabel = 'contains';
      } else if (sourceNode?.type === 'tourStep' && targetNode?.type === 'tourStep') {
        connectionLabel = 'next';
      } else if (sourceNode?.type === 'question' && targetNode?.type === 'tourStep') {
        connectionLabel = 'leads to';
      }

      const newEdge: DecisionTreeEdge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        label: connectionLabel,
      };

      console.log('Creating new connection:', {
        from: sourceNode?.data?.title || connection.source,
        to: targetNode?.data?.title || connection.target,
        type: connectionLabel
      });

      try {
        await createEdge(newEdge);
        setEdges((eds) => addEdge({
          ...connection,
          id: newEdge.id,
          label: connectionLabel,
          style: { stroke: '#6b7280', strokeWidth: 2 },
          labelStyle: { fill: '#374151', fontSize: 12, fontWeight: 500 },
        }, eds));
        setConnectionFeedback(`✅ Connected: ${sourceNode?.data?.title || connection.source} → ${targetNode?.data?.title || connection.target}`);
        setTimeout(() => setConnectionFeedback(null), 3000);
      } catch (error) {
        console.error('❌ Failed to create edge:', error);
        setConnectionFeedback('❌ Failed to create connection. Please try again.');
        setTimeout(() => setConnectionFeedback(null), 3000);
      }
    },
    [setEdges, edges, nodes, setConnectionFeedback]
  );

  const onNodesDelete = useCallback(
    async (deleted: Node[]) => {
      for (const node of deleted) {
        try {
          await deleteNode(node.id);
        } catch (error) {
          console.error('Failed to delete node:', error);
        }
      }
    },
    []
  );

  const onEdgesDelete = useCallback(
    async (deleted: Edge[]) => {
      for (const edge of deleted) {
        try {
          await deleteEdge(edge.id);
        } catch (error) {
          console.error('Failed to delete edge:', error);
        }
      }
    },
    []
  );

  const onSelectionChange = useCallback((params: any) => {
    setSelectedEdges(params.edges || []);
  }, []);

  const deleteSelectedEdges = useCallback(async () => {
    if (selectedEdges.length === 0) return;
    
    setConnectionFeedback(`🗑️ Deleting ${selectedEdges.length} connection(s)...`);
    
    try {
      for (const edge of selectedEdges) {
        await deleteEdge(edge.id);
      }
      
      setEdges((eds) => eds.filter(e => !selectedEdges.find(se => se.id === e.id)));
      setSelectedEdges([]);
      setConnectionFeedback(`✅ Deleted ${selectedEdges.length} connection(s)`);
      setTimeout(() => setConnectionFeedback(null), 3000);
    } catch (error) {
      console.error('Failed to delete edges:', error);
      setConnectionFeedback('❌ Failed to delete connections');
      setTimeout(() => setConnectionFeedback(null), 3000);
    }
  }, [selectedEdges, setEdges]);



  const addNewStep = async () => {
    // Calculate position for new step to avoid overlaps
    const existingSteps = nodes.filter(node => node.type === 'tourStep');
    const questionNodeWidth = 280;
    const stepY = 150;
    const startX = 200;
    
    // Use standard spacing for new steps
    const requiredStepSpacing = 400; // Standard spacing between steps
    
    let newStepX = startX;
    if (existingSteps.length > 0) {
      // Find the rightmost step and place new one to the right
      const rightmostStep = existingSteps.reduce((rightmost, current) => 
        current.position.x > rightmost.position.x ? current : rightmost
      );
      newStepX = rightmostStep.position.x + requiredStepSpacing;
    }

    const newNode: Node = {
      id: `step-new-${Date.now()}`,
      type: 'tourStep',
      position: { x: newStepX, y: stepY },
      data: { 
        stepId: 'new-step',
        title: 'New Tour Step', 
        description: 'Add description here',
        questions: []
      },
    };

    try {
      const decisionTreeNode: DecisionTreeNode = {
        id: newNode.id,
        type: newNode.type || 'tourStep',
        position: newNode.position,
        data: newNode.data,
      };
      await createNode(decisionTreeNode);
    } catch (error) {
      console.error('Failed to create node:', error);
    }
    
    setNodes((nds) => [...nds, newNode]);
  };

  const addNewQuestion = async () => {
    // Calculate position for new question to avoid overlaps
    const existingQuestions = nodes.filter(node => node.type === 'question');
    const questionSpacing = 320;
    const questionY = 400;
    
    let newQuestionX = 200; // Default starting position
    if (existingQuestions.length > 0) {
      // Find the rightmost question and place new one to the right
      const rightmostQuestion = existingQuestions.reduce((rightmost, current) => 
        current.position.x > rightmost.position.x ? current : rightmost
      );
      newQuestionX = rightmostQuestion.position.x + questionSpacing;
    }

    const newNode: Node = {
      id: `question-new-${Date.now()}`,
      type: 'question',
      position: { x: newQuestionX, y: questionY },
      data: { 
        questionId: 'new-question',
        title: 'New Question', 
        description: 'Add question description',
        type: 'select',
        options: []
      },
    };

    try {
      const decisionTreeNode: DecisionTreeNode = {
        id: newNode.id,
        type: newNode.type || 'question',
        position: newNode.position,
        data: newNode.data,
      };
      await createNode(decisionTreeNode);
    } catch (error) {
      console.error('Failed to create node:', error);
    }
    
    setNodes((nds) => [...nds, newNode]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading decision tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-1" style={{ height: 'calc(100vh - 120px)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, includeHiddenNodes: false, maxZoom: 1.2 }}
        minZoom={0.1}
        maxZoom={2.0}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        attributionPosition="bottom-left"
        style={{ width: '100%', height: '100%' }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        key="reactflow-database"
      >
        <Background key="background" />
        <Controls key="controls" />
        <MiniMap key="minimap" />
        <Panel key="panel-left" position="top-left" className="space-y-2">
          <div className="bg-white p-3 rounded-lg shadow-lg border">
            <div className="text-xs font-medium text-gray-700 mb-2">
              Layout & Connections
              <span className="ml-2 text-gray-500">({edges.length} connections)</span>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await loadDatabaseData();
                }}
                className="flex items-center bg-green-50 hover:bg-green-100 w-full"
              >
                <Layout className="h-4 w-4 mr-1" />
                Apply ELK Layout
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const gridNodes = applyGridLayout(nodes);
                  const hierarchicalNodes = enforceHierarchy(gridNodes, edges);
                  setNodes(hierarchicalNodes);
                }}
                className="flex items-center bg-blue-50 hover:bg-blue-100 w-full"
              >
                <GitBranch className="h-4 w-4 mr-1" />
                Grid Layout
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const forceNodes = applyForceLayout(nodes, edges);
                  setNodes(forceNodes);
                }}
                className="flex items-center bg-purple-50 hover:bg-purple-100 w-full"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Force Layout
              </Button>
              {selectedEdges.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteSelectedEdges}
                  className="flex items-center bg-red-50 hover:bg-red-100 w-full text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Delete {selectedEdges.length} Connection{selectedEdges.length > 1 ? 's' : ''}
                </Button>
              )}
              <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded border">
                💡 <strong>Root-Left Layered Layout:</strong><br/>
                🔵 Root tour step starts on the left<br/>
                🟢 Questions from same step: separate X layers, independent Y positioning<br/>
                <strong>Connect:</strong> Drag from right handle to left handle<br/>
                <strong>Delete:</strong> Select connections and click delete button
              </div>
              {connectionFeedback && (
                <div className={`text-xs p-2 rounded border ${
                  connectionFeedback.includes('❌') ? 'bg-red-50 text-red-700 border-red-200' :
                  connectionFeedback.includes('⚠️') ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {connectionFeedback}
                </div>
              )}
            </div>
          </div>
        </Panel>
        <Panel key="panel-right" position="top-right" className="space-y-2">
          <div className="bg-white p-3 rounded-lg shadow-lg border">
            <div className="text-xs font-medium text-gray-700 mb-2">Add Nodes</div>
            <div className="space-y-2">
              <Button onClick={addNewStep} className="shadow-lg bg-blue-600 hover:bg-blue-700 w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
              <Button onClick={addNewQuestion} className="shadow-lg bg-green-600 hover:bg-green-700 w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-lg border">
            <div className="text-xs font-medium text-gray-700 mb-2">Tour Integration</div>
            <Button 
              onClick={async () => {
                try {
                  // Load and enable database tour mode
                  const { setUseDatabaseTour, loadDatabaseTourSteps, openGuidedTour } = useAppStore.getState();
                  setUseDatabaseTour(true);
                  await loadDatabaseTourSteps();
                  
                  // Navigate to home page and open tour
                  router.push('/');
                  
                  // Small delay to ensure navigation completes before opening tour
                  setTimeout(() => {
                    openGuidedTour();
                  }, 100);
                } catch (error) {
                  console.error('Failed to start database tour:', error);
                  alert('Failed to start database tour. Please ensure you have nodes in your decision tree.');
                }
              }}
              className="shadow-lg bg-purple-600 hover:bg-purple-700 w-full text-xs"
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Test Database Tour
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
} 