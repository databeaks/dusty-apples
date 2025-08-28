'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DecisionTree } from '@/components/decisionTree';
import { DecisionTreeList } from '@/components/decisionTreeList';
import { useAppStore } from '@/lib/store/appStore';
import { getDecisionTreeById } from '@/lib/fastapi';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

function DecisionTreePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const treeId = searchParams.get('id');
  const [currentView, setCurrentView] = useState<'list' | 'editor'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    currentDecisionTree,
    setCurrentDecisionTree,
    setCurrentDecisionTreeId,
  } = useAppStore();

  useEffect(() => {
    if (treeId) {
      setCurrentView('editor');
      loadDecisionTree(treeId);
    } else {
      setCurrentView('list');
      setCurrentDecisionTree(null);
      setCurrentDecisionTreeId(null);
    }
  }, [treeId, setCurrentDecisionTree, setCurrentDecisionTreeId]);

  const loadDecisionTree = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDecisionTreeById(id);
      setCurrentDecisionTree(response.tree);
      setCurrentDecisionTreeId(id);
    } catch (err) {
      console.error('Failed to load decision tree:', err);
      setError('Failed to load decision tree');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTree = (id: string) => {
    router.push(`/decision-tree?id=${id}`);
  };

  const handleBackToList = () => {
    router.push('/decision-tree');
  };

  const renderHeader = () => {
    if (currentView === 'list') {
      // No header for list view - DecisionTreeList component handles its own layout
      return null;
    } else {
      return (
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={handleBackToList}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Decision Trees
                </Button>
                <div className="h-6 w-px bg-gray-300" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentDecisionTree?.name || 'Decision Tree Editor'}
                  </h1>
                  {currentDecisionTree && (
                    <p className="text-sm text-gray-500">
                      v{currentDecisionTree.version} • Last edited by {currentDecisionTree.last_edited_by}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
      );
    }
  };

  const renderContent = () => {
    if (currentView === 'list') {
      return <DecisionTreeList onEditTree={handleEditTree} />;
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading decision tree...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleBackToList}>Back to List</Button>
          </div>
        </div>
      );
    }

    return <DecisionTree />;
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      {renderHeader()}
      <main className={`flex-1 w-full ${currentView === 'editor' ? 'overflow-hidden' : ''}`}>
        {currentView === 'list' ? (
          // List view can scroll when there are many decision trees
          <div className="w-full h-full overflow-y-auto">
            {renderContent()}
          </div>
        ) : (
          // Editor view is not scrollable - fixed height
          <div className="w-full h-full overflow-hidden">
            {renderContent()}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DecisionTreePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DecisionTreePageContent />
    </Suspense>
  );
}