'use client';

import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store/appStore';
import { Home, User, Menu, Loader2, BarChart3, GitBranch, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const { 
    currentUser, 
    isLoadingUser, 
    userError, 
    loadCurrentUser,
    isAdmin 
  } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Load user data on component mount if not already loaded
    if (!currentUser && !isLoadingUser && !userError) {
      loadCurrentUser();
    }
  }, [currentUser, isLoadingUser, userError, loadCurrentUser]);

  const baseNavItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/', isView: true },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/dashboard', isView: true },
    { id: 'decision-tree-list', label: 'Decision Tree', icon: GitBranch, path: '/decision-tree', isView: true },
  ];

  // Add settings for admin users only
  const navItems = currentUser && isAdmin() 
    ? [...baseNavItems, { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', isView: true }]
    : baseNavItems;

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
                // Use appropriate logic for each navigation item
                let isActive = false;
                if (item.id === 'home') {
                  isActive = pathname === '/';
                } else if (item.id === 'dashboard') {
                  isActive = pathname === '/dashboard' || pathname === '/dashboard/';
                } else if (item.id === 'decision-tree-list') {
                  isActive = pathname.startsWith('/decision-tree');
                } else if (item.id === 'settings') {
                  isActive = pathname.startsWith('/settings');
                }

                
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                {isLoadingUser ? (
                  <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                ) : (
                  <User className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-medium text-gray-700">
                  {isLoadingUser ? (
                    'Loading...'
                  ) : userError ? (
                    'Guest User'
                  ) : currentUser?.name || currentUser?.username || currentUser?.email || 'Unknown User'}
                </span>
                {currentUser && isAdmin() && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-red-500 to-orange-500 text-white">
                    <Settings className="w-3 h-3 mr-1" />
                    Admin
                  </span>
                )}
              </div>
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
                // Use appropriate logic for each navigation item
                let isActive = false;
                if (item.id === 'home') {
                  isActive = pathname === '/';
                } else if (item.id === 'dashboard') {
                  isActive = pathname === '/dashboard' || pathname === '/dashboard/';
                } else if (item.id === 'decision-tree-list') {
                  isActive = pathname.startsWith('/decision-tree');
                } else if (item.id === 'settings') {
                  isActive = pathname.startsWith('/settings');
                }
                
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full text-left flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors ${
                      isActive
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}