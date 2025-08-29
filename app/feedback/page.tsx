'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store/appStore';
import FeedbackDashboard from '@/components/feedbackDashboard';
import { MessageCircle } from 'lucide-react';

export default function FeedbackPage() {
  const router = useRouter();
  const { currentUser, isLoadingUser, isAdmin, loadCurrentUser } = useAppStore();

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!isLoadingUser && currentUser) {
      if (!isAdmin()) {
        router.push('/');
        return;
      }
    }
  }, [currentUser, isLoadingUser, isAdmin, router]);

  // Load current user if not loaded
  useEffect(() => {
    if (!currentUser && !isLoadingUser) {
      loadCurrentUser();
    }
  }, [currentUser, isLoadingUser, loadCurrentUser]);

  // Show loading state while checking authentication
  if (isLoadingUser) {
    return (
      <div className="flex-1 bg-gray-50 p-6 w-full">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not admin (will redirect)
  if (!currentUser || !isAdmin()) {
    return null;
  }

  return (
    <div className="flex-1 bg-gray-50 p-6 w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MessageCircle className="h-8 w-8 mr-3 text-red-600" />
            Feedback
          </h1>
          <p className="mt-2 text-gray-600">Review and manage user feedback</p>
        </div>
      </div>

      {/* Feedback Dashboard */}
      <FeedbackDashboard />
    </div>
  );
}
