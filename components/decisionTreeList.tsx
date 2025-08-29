'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Download,
  Search,
  Calendar,
  User,
  Hash,
  FileText,
  Tags,
  Clock,
  Star,
  StarOff
} from 'lucide-react';
import {
  listDecisionTrees,
  createDecisionTree,
  deleteDecisionTree,
  duplicateDecisionTree,
  exportDecisionTree,
  setDefaultTourTree
} from '@/lib/fastapi';
import { DecisionTreeMetadata } from '@/types/api';

interface DecisionTreeListProps {
  onEditTree: (treeId: string) => void;
}

export function DecisionTreeList({ onEditTree }: DecisionTreeListProps) {
  const [trees, setTrees] = useState<DecisionTreeMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadTrees();
  }, []);

  const loadTrees = async () => {
    setIsLoading(true);
    try {
      const response = await listDecisionTrees();
      setTrees(response.trees);
      setError(null);
    } catch (err) {
      console.error('Failed to load decision trees:', err);
      setError('Failed to load decision trees');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTree = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const response = await createDecisionTree({
        name: 'New Decision Tree',
        description: 'A new decision tree',
        tags: []
        // created_by and last_edited_by are now handled by the backend based on the current user
      });
      
      await loadTrees(); // Refresh the list
      onEditTree(response.id); // Open the new tree for editing
    } catch (err) {
      console.error('Failed to create decision tree:', err);
      setError('Failed to create decision tree');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTree = async (treeId: string, treeName: string) => {
    if (!confirm(`Are you sure you want to delete "${treeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDecisionTree(treeId);
      await loadTrees(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete decision tree:', err);
      setError('Failed to delete decision tree');
    }
  };

  const handleDuplicateTree = async (treeId: string, treeName: string) => {
    try {
      const response = await duplicateDecisionTree(treeId, {
        name: `${treeName} (Copy)`
        // created_by and last_edited_by are now handled by the backend based on the current user
      });
      
      await loadTrees(); // Refresh the list
      onEditTree(response.id); // Open the duplicated tree for editing
    } catch (err) {
      console.error('Failed to duplicate decision tree:', err);
      setError('Failed to duplicate decision tree');
    }
  };

  const handleExportTree = async (treeId: string, treeName: string) => {
    try {
      const exportData = await exportDecisionTree(treeId);
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${treeName.replace(/\s+/g, '_')}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export decision tree:', err);
      setError('Failed to export decision tree');
    }
  };

  const handleSetDefaultTree = async (treeId: string, treeName: string) => {
    if (settingDefault) return;
    
    setSettingDefault(treeId);
    try {
      await setDefaultTourTree(treeId);
      
      // Update the local state to reflect the change
      setTrees(prevTrees => 
        prevTrees.map(tree => ({
          ...tree,
          is_default_for_tour: tree.id === treeId
        }))
      );
      
      // Optional: Show success message
      console.log(`"${treeName}" set as default for guided tours`);
    } catch (err) {
      console.error('Failed to set default tour tree:', err);
      setError('Failed to set default tour tree');
    } finally {
      setSettingDefault(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const filteredTrees = trees.filter(tree => 
    tree.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tree.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tree.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
    tree.created_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tree.last_edited_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading decision trees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadTrees}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Decision Trees</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage and organize your decision trees
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button 
                onClick={handleCreateTree} 
                disabled={isCreating}
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreating ? 'Creating...' : 'Create New Tree'}
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search trees by name, description, tags, or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Trees List */}
        {filteredTrees.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">
              {searchTerm ? 'No trees found matching your search' : 'No decision trees yet'}
            </p>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first decision tree to get started'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateTree} disabled={isCreating}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Tree
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTrees.map((tree) => (
            <Card key={tree.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Main Info */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {tree.name}
                          </h3>
                          {tree.is_default_for_tour && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-xs font-medium text-yellow-600">Default Tour</span>
                            </div>
                          )}
                        </div>
                        {tree.description && (
                          <p className="text-gray-600 mt-1 text-sm line-clamp-2">
                            {tree.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          v{tree.version}
                        </span>
                        {tree.is_default_for_tour && (
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {tree.tags.length > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        <Tags className="h-3 w-3 text-gray-400" />
                        <div className="flex gap-1 flex-wrap">
                          {tree.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">ID:</span>
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">
                          {tree.id.substring(0, 8)}...
                        </code>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">Created by:</span>
                        <span className="font-medium truncate">{tree.created_by}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">Last edited by:</span>
                        <span className="font-medium truncate">{tree.last_edited_by}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">Nodes:</span>
                        <span className="font-medium">{tree.node_count || 0}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">Created:</span>
                        <span className="font-medium">{formatDate(tree.created_at)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">Updated:</span>
                        <span className="font-medium">{formatDate(tree.updated_at)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 md:col-span-2">
                        <span className="text-gray-500">Connections:</span>
                        <span className="font-medium">{tree.edge_count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => onEditTree(tree.id)}
                      className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    {!tree.is_default_for_tour && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefaultTree(tree.id, tree.name)}
                        disabled={settingDefault === tree.id}
                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 border-yellow-200"
                      >
                        {settingDefault === tree.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>
                        ) : (
                          <Star className="h-4 w-4 mr-1" />
                        )}
                        Set as Default
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateTree(tree.id, tree.name)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportTree(tree.id, tree.name)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTree(tree.id, tree.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
