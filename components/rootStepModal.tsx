'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Crown, AlertTriangle } from 'lucide-react';

interface RootStepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RootStepModal({ isOpen, onClose }: RootStepModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">No Root Step Found</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            To test your tour, you need to set a root step where the tour begins.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">How to set a root step:</h4>
            <ol className="text-sm text-orange-700 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="font-medium">1.</span>
                <span>Select any <strong>tour step node</strong> in your decision tree</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-medium">2.</span>
                <div className="flex items-center space-x-1">
                  <span>Click the</span>
                  <Crown className="h-4 w-4 text-red-600" />
                  <span><strong>crown button</strong> in the node editor</span>
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-medium">3.</span>
                <span>This sets it as the <strong>root step</strong> (tour starting point)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-medium">4.</span>
                <span>Try testing your tour again!</span>
              </li>
            </ol>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>💡 Tip:</strong> The root step should be the first step users see when starting your tour.
            </p>
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button onClick={onClose} className="bg-orange-600 hover:bg-orange-700">
              Got it, I'll set a root step!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
