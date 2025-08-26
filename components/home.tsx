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

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Built on cutting-edge technology for optimal performance and speed.'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime guarantee.'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Seamless collaboration tools for distributed teams.'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive insights and reporting for data-driven decisions.'
    }
  ];

  const benefits = [
    'Streamline your workflow with intelligent automation',
    'Get real-time insights from your data',
    'Collaborate effectively with your team',
    'Scale your operations with confidence',
    'Maintain security and compliance standards'
  ];

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
              Your Data Intelligence
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                Platform
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your feedback into actionable insights. Build better products, 
              engage customers effectively, and drive innovation with our comprehensive 
              data intelligence platform.
            </p>
            
            {/* Main CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                onClick={openGuidedTour}
                size="lg"
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-lg px-8 py-3"
              >
                <Play className="h-5 w-5 mr-2" />
                Start Your Journey
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-red-200 text-red-600 hover:bg-red-50 text-lg px-8 py-3"
              >
                Learn More
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                <span>4.9/5 Customer Rating</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-green-500 mr-1" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 text-blue-500 mr-1" />
                <span>10,000+ Active Users</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Dusty Apple?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to turn data into insights and insights into action.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              What You'll Achieve
            </h3>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-8">
              <Button 
                onClick={openGuidedTour}
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
              >
                <Play className="h-4 w-4 mr-2" />
                Get Started Now
              </Button>
            </div>
          </div>
          
          <Card className="p-8 bg-gradient-to-br from-gray-50 to-white border-0 shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-4">
                Ready to Transform Your Data?
              </h4>
              <p className="text-gray-600 mb-6">
                Join thousands of companies already using Dusty Apple to make 
                data-driven decisions and accelerate their growth.
              </p>
              <Button 
                onClick={openGuidedTour}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Start Free Setup Tour
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h3 className="text-2xl font-bold mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-red-100 mb-6 max-w-2xl mx-auto">
            Take our interactive setup tour to customize Dusty Apple for your specific needs. 
            It only takes 5 minutes and will help you get the most out of our platform.
          </p>
          <Button 
            onClick={openGuidedTour}
            size="lg"
            className="bg-white text-red-600 hover:bg-gray-100 text-lg px-8 py-3"
          >
            <Play className="h-5 w-5 mr-2" />
            Begin Setup Tour
          </Button>
        </div>
      </div>
    </div>
  );
}