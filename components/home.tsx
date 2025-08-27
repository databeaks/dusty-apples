'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store/appStore';
import { 
  Play, 
  Zap, 
  Shield, 
  Users, 
  BarChart3, 
  ArrowRight,
  CheckCircle,
  Star,
  Sparkles
} from 'lucide-react';

export function Home() {
  const { openGuidedTour } = useAppStore();

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-1">
                <Sparkles className="h-4 w-4 mr-2" />
                Welcome to Dusty Apple
              </Badge>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              Find out which
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                Databricks Deployment
              </span>
              to recommend
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Dusty Apple will recommend the best Databricks deployment optionfor your customers based on their requirements
            </p>
            
            {/* Main CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                onClick={openGuidedTour}
                size="lg"
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-lg px-8 py-3"
              >
                <Play className="h-5 w-5 mr-2" />
                Start Discovery
              </Button>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}