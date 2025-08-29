'use client';

import { useAppStore } from '@/lib/store/appStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Crown, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function UserInfo() {
  const { 
    currentUser, 
    isLoadingUser, 
    userError, 
    loadCurrentUser, 
    clearUser,
    isAdmin 
  } = useAppStore();

  if (isLoadingUser) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading user information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userError) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load user: {userError}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadCurrentUser}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentUser) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-2 text-gray-500">
            <User className="h-5 w-5" />
            <span>No user loaded</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadCurrentUser}
          >
            Load User
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              {isAdmin() ? (
                <Crown className="h-4 w-4 text-blue-600" />
              ) : (
                <User className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <span>{currentUser.full_name || currentUser.username}</span>
          </CardTitle>
          <Badge variant={isAdmin() ? "default" : "secondary"}>
            {currentUser.role}
          </Badge>
        </div>
        <CardDescription>
          User since {new Date(currentUser.add_date).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-sm font-medium text-gray-700">Username</div>
          <div className="text-sm text-gray-600">{currentUser.username}</div>
        </div>
        
        {currentUser.email && (
          <div>
            <div className="text-sm font-medium text-gray-700">Email</div>
            <div className="text-sm text-gray-600">{currentUser.email}</div>
          </div>
        )}
        
        <div>
          <div className="text-sm font-medium text-gray-700">Last Accessed</div>
          <div className="text-sm text-gray-600">
            {new Date(currentUser.last_accessed).toLocaleString()}
          </div>
        </div>

        {isAdmin() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-medium">Admin Privileges</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              You have administrative access to manage users and system settings.
            </p>
          </div>
        )}
        
        <div className="flex space-x-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadCurrentUser}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearUser}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
