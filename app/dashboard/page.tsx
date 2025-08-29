'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store/appStore';
import { dashboardMetrics } from '@/lib/data/sampleData';
import { TourSession } from '@/types/api';
import { useState, useEffect } from 'react';
import { getMyTourSessions } from '@/lib/fastapi';
import { 
  MessageSquare, 
  FolderOpen, 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Minus,
  Play,
  MoreVertical,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

const iconMap = {
  MessageSquare,
  FolderOpen,
  TrendingUp,
  Users,
};

export default function DashboardPage() {
  const { openGuidedTour } = useAppStore();
  const [tourSessions, setTourSessions] = useState<TourSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Load tour sessions on component mount
  useEffect(() => {
    const loadTourSessions = async () => {
      setIsLoadingSessions(true);
      try {
        // Get tour sessions for the current authenticated user
        const sessions = await getMyTourSessions(10);
        setTourSessions(sessions);
      } catch (error) {
        console.error('Failed to load tour sessions:', error);
        // Keep empty array if API fails
        setTourSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadTourSessions();
  }, []);

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: TourSession['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'abandoned':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: TourSession['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'abandoned':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewResults = (session: TourSession) => {
    // This would navigate to a results page in a real implementation
    console.log('Viewing results for session:', session.id);
    // For now, just show an alert
    alert(`Viewing results for tour session: ${session.tree_name}\nStatus: ${session.status}\nProgress: ${session.progress_percentage}%`);
  };

  const refreshTourSessions = async () => {
    try {
      const sessions = await getMyTourSessions(10);
      setTourSessions(sessions);
    } catch (error) {
      console.warn('Failed to refresh tour sessions:', error);
    }
  };

  const handleResumeTour = async (session: TourSession) => {
    console.log('Resuming tour session:', session.id);
    
    try {
      const { resumeTourFromSession } = useAppStore.getState();
      await resumeTourFromSession(session.id);
      // Refresh sessions after resuming
      await refreshTourSessions();
    } catch (error) {
      console.error('Failed to resume tour:', error);
      alert('Failed to resume tour. Please try again.');
    }
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back! Take a look at your tour sessions and quick actions.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button onClick={openGuidedTour} className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600">
                <Play className="h-4 w-4 mr-2" />
                Start Tour
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardMetrics.map((metric) => {
            const Icon = iconMap[metric.icon as keyof typeof iconMap];
            return (
              <Card key={metric.id} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {Icon && <Icon className="h-5 w-5 text-red-600 mr-3" />}
                      <div>
                        <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(metric.trend)}
                    </div>
                  </div>
                  {metric.change && (
                    <div className="mt-2">
                      <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                        {metric.change}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">vs last month</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tour Activity */}
          <Card className="lg:col-span-2 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Tour Activity</CardTitle>
                  <CardDescription>Your completed and ongoing setup tours</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                    <span>Loading tour sessions...</span>
                  </div>
                </div>
              ) : tourSessions.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Tour Name</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Date Started</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Date Completed</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Status</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Progress</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Results</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tourSessions.map((session) => (
                          <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-2">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 mr-3">
                                  <div className="h-8 w-8 bg-red-50 rounded-full flex items-center justify-center">
                                    <Play className="h-4 w-4 text-red-600" />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{session.tree_name}</p>
                                  <p className="text-xs text-gray-500">ID: {session.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mr-1" />
                                {formatDate(session.date_started)}
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              {session.date_completed ? (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {formatDate(session.date_completed)}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4 px-2">
                              <div className="flex items-center">
                                {getStatusIcon(session.status)}
                                <Badge 
                                  variant={getStatusBadgeVariant(session.status)} 
                                  className="ml-2 text-xs"
                                >
                                  {session.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className="bg-red-600 h-2 rounded-full" 
                                    style={{ width: `${session.progress_percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600">{session.progress_percentage}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              {session.status === 'completed' ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewResults(session)}
                                  className="text-xs"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Results
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleResumeTour(session)}
                                  className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Resume
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Button variant="ghost" className="w-full" onClick={refreshTourSessions}>
                      View all tour sessions
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Play className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No tour sessions yet</h3>
                  <p className="text-xs text-gray-500 mb-4 max-w-sm">
                    Start your first tour session to begin exploring the application and track your progress.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Capture Feedback
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FolderOpen className="h-4 w-4 mr-2" />
                New Project
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Invite Team Member
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
