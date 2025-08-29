'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store/appStore';
import { User } from '@/types/api';
import { getAllUsers, updateUser } from '@/lib/fastapi';
import { 
  Settings, 
  Search, 
  User as UserIcon, 
  Shield, 
  Calendar,
  Clock,
  Mail,
  RotateCcw,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, isLoadingUser, isAdmin, loadCurrentUser } = useAppStore();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());

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

  // Load users
  useEffect(() => {
    if (currentUser && isAdmin()) {
      loadUsers();
    }
  }, [currentUser]);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);
    try {
      const userList = await getAllUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleRoleToggle = async (user: User) => {
    if (user.username === currentUser?.username) {
      alert("You cannot change your own role.");
      return;
    }

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    
    setUpdatingUsers(prev => new Set(prev).add(user.username));
    
    try {
      const updatedUser = await updateUser(user.username, { role: newRole });
      
      // Update the user in our local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.username === user.username 
            ? { ...u, role: updatedUser.role }
            : u
        )
      );
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert(`Failed to update user role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.username);
        return newSet;
      });
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
            <Settings className="h-8 w-8 mr-3 text-red-600" />
            Settings
          </h1>
          <p className="mt-2 text-gray-600">Manage users and system settings</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadUsers}
          disabled={isLoadingUsers}
        >
          <RotateCcw className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* User Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2 text-red-600" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts and permissions. You can search users and toggle admin roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users by username, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
              <Button variant="outline" size="sm" onClick={loadUsers}>
                Retry
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoadingUsers && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                <span>Loading users...</span>
              </div>
            </div>
          )}

          {/* Users Table */}
          {!isLoadingUsers && filteredUsers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">User</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Date Added</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Last Accessed</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Role</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.username} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-2">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-8 w-8 bg-red-50 rounded-full flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-red-600" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.full_name || user.username}
                              {user.username === currentUser?.username && (
                                <span className="ml-2 text-xs text-red-600">(You)</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {user.email || 'No email'}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(user.add_date)}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDate(user.last_accessed)}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={`flex items-center ${
                            user.role === 'admin' 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : ''
                          }`}
                        >
                          {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleToggle(user)}
                          disabled={
                            user.username === currentUser?.username || 
                            updatingUsers.has(user.username)
                          }
                          className="text-xs"
                        >
                          {updatingUsers.has(user.username) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                          ) : user.role === 'admin' ? (
                            'Remove Admin'
                          ) : (
                            'Make Admin'
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingUsers && filteredUsers.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                {searchTerm ? 'No users found' : 'No users yet'}
              </h3>
              <p className="text-xs text-gray-500 mb-4 max-w-sm">
                {searchTerm 
                  ? `No users match your search for "${searchTerm}"`
                  : 'Users will appear here once they start accessing the application.'
                }
              </p>
              {searchTerm && (
                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              )}
            </div>
          )}

          {/* Stats Summary */}
          {!isLoadingUsers && users.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                  <div className="text-xs text-gray-500">Total Users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {users.filter(u => u.role === 'admin').length}
                  </div>
                  <div className="text-xs text-gray-500">Admins</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-500">
                    {users.filter(u => u.role === 'user').length}
                  </div>
                  <div className="text-xs text-gray-500">Users</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
