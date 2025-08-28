
'use client';

import { useAppStore } from '@/lib/store/appStore';
import { Home as HomePage } from '@/components/home';
import { Dashboard } from '@/components/dashboard';

export default function Home() {
  const { currentView } = useAppStore();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomePage />;
      case 'dashboard':
        return <Dashboard />;
      case 'guided-tour':
        return <HomePage />; // Show home as background
      default:
        return <HomePage />;
    }
  };

  return renderCurrentView();
}
