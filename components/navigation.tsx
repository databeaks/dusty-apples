'use client';

import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store/appStore';
import { getUser } from '@/lib/fastapi';
import { Home, Settings, Bell, User, Menu, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Navigation() {
  const { currentView, setCurrentView } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoadingUser(true);
        const user = await getUser();
        setUserData(user);
        setUserError(null);
      } catch (error) {
        setUserError(error instanceof Error ? error.message : 'Failed to load user');
        setUserData(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserData();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 bg-gradient-to-br from-red-600 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">DA</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">Dusty Apple</span>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as any)}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                {isLoadingUser ? (
                  <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                ) : (
                  <User className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {isLoadingUser ? (
                  'Loading...'
                ) : userError ? (
                  'Guest User'
                ) : userData?.name || userData?.username || userData?.email || 'Unknown User'}
              </span>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors ${
                      isActive
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}