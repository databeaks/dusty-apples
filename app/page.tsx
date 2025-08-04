
'use client';

import { useAppStore } from '@/lib/store/appStore';
import { Navigation } from '@/components/navigation';
import { Dashboard } from '@/components/dashboard';
import { GuidedTour } from '@/components/guidedTour';

export default function Home() {
  const { currentView, isGuidedTourOpen } = useAppStore();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'guided-tour':
        return <Dashboard />; // Show dashboard as background
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-1 flex">
        {renderCurrentView()}
      </div>
      {isGuidedTourOpen && <GuidedTour />}
    </div>
  );
}
