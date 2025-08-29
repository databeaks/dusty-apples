'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Feedback, 
  FeedbackListResponse, 
  FeedbackStatsResponse, 
  FeedbackCategory, 
  FeedbackStatus 
} from '@/types/api';
import { getFeedbackList, getFeedbackStats, updateFeedback } from '@/lib/fastapi';

interface FeedbackDashboardProps {
  className?: string;
}

const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({ className = "" }) => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    username: ''
  });

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  };

  const categoryLabels = {
    bug: 'Bug Report',
    feature_request: 'Feature Request',
    tour_suggestion: 'Tour Suggestion',
    other: 'Other'
  };

  useEffect(() => {
    loadFeedback();
    loadStats();
  }, [filters]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const params = {
        category: filters.category || undefined,
        status: filters.status || undefined,
        username: filters.username || undefined,
      };
      
      const data = await getFeedbackList(params);
      setFeedback(data.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getFeedbackStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load feedback stats:', err);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: FeedbackStatus) => {
    try {
      await updateFeedback(feedbackId, { status: newStatus });
      
      // Reload feedback to get updated data
      loadFeedback();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feedback');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <div className="text-red-800">
          <p className="text-sm">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              setError(null);
              loadFeedback();
            }}
          >
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.by_status.open || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.by_status.in_progress || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.by_status.resolved || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="bug">Bug Report</option>
                <option value="feature_request">Feature Request</option>
                <option value="tour_suggestion">Tour Suggestion</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Username</label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => setFilters(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Filter by username..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback ({feedback.length})</CardTitle>
          <CardDescription>
            Manage and respond to user feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-4 w-1/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No feedback found matching the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={statusColors[item.status]}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {categoryLabels[item.category]}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          by {item.username} ({item.user_role})
                        </span>
                        {item.role && (
                          <Badge variant="secondary" className="text-xs">
                            {item.role}
                          </Badge>
                        )}
                        <span className="text-sm text-gray-400">
                          {formatDate(item.date_submitted)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3 bg-gray-50 p-3 rounded">
                        <div>
                          <span className="font-medium text-gray-600">Date:</span>
                          <div className="text-gray-900">{formatDate(item.date_submitted)}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">User:</span>
                          <div className="text-gray-900">{item.username}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Role:</span>
                          <div className="text-gray-900">{item.role || 'Not specified'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Category:</span>
                          <div className="text-gray-900">{categoryLabels[item.category]}</div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <span className="font-medium text-gray-600 text-sm">Comment:</span>
                        <p className="text-gray-900 whitespace-pre-wrap mt-1">
                          {item.comment}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons for status changes */}
                  <div className="flex gap-2 pt-2 border-t">
                    {item.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateFeedbackStatus(item.id, 'in_progress')}
                      >
                        Mark In Progress
                      </Button>
                    )}
                    {(item.status === 'open' || item.status === 'in_progress') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateFeedbackStatus(item.id, 'resolved')}
                      >
                        Mark Resolved
                      </Button>
                    )}
                    {item.status !== 'closed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateFeedbackStatus(item.id, 'closed')}
                      >
                        Close
                      </Button>
                    )}
                    {item.status === 'closed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateFeedbackStatus(item.id, 'open')}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackDashboard;
