'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeploymentRecommendation } from '@/lib/data/sampleData';
import { TourSession } from '@/types/api';
import { 
  Check,
  X,
  ArrowRight,
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface TourCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted?: () => void;
  session?: TourSession | null;
  isSaving?: boolean;
  showSaveStatus?: boolean;
}

export function TourCompletionModal({ 
  isOpen, 
  onClose, 
  onGetStarted, 
  session,
  isSaving = false,
  showSaveStatus = false
}: TourCompletionModalProps) {
  if (!isOpen) return null;

  // Use session recommendation if available, otherwise use default Express Setup
  const expressSetupRecommendation: DeploymentRecommendation = session?.recommendation || {
    id: 'aws-marketplace',
    title: 'Express Setup + Buy with AWS',
    qualification: 'Yes',
    description: 'Set up Express and upgrade using Buy with AWS for marketplace billing.',
    actions: ['Express setup', 'Upgrade via Buy with AWS', 'Configure workspace'],
    benefits: [
      'Consolidated AWS billing',
      'Use existing AWS credits',
      'Simplified procurement process',
      'AWS security compliance',
      'Familiar AWS marketplace experience'
    ],
    nextSteps: [
      'Visit AWS Marketplace listing',
      'Complete subscription setup',
      'Configure workspace settings',
      'Connect existing AWS resources'
    ],
    isAvailable: true
  };

  const getQualificationBadge = (qualification: string) => {
    switch (qualification) {
      case 'Yes':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Ready to Deploy
          </Badge>
        );
      case 'Not Yet':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Coming Soon
          </Badge>
        );
      case 'Maybe':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Partial Solution
          </Badge>
        );
      default:
        return null;
    }
  };

  const RecommendationCard = ({ rec }: { rec: DeploymentRecommendation }) => (
    <Card className="border-2 border-red-200 bg-red-50/30">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl text-gray-900 mb-2">
              {rec.title}
            </CardTitle>
            {getQualificationBadge(rec.qualification)}
          </div>
          <Sparkles className="h-6 w-6 text-red-500" />
        </div>
        <CardDescription className="text-base text-gray-700">
          {rec.description}
        </CardDescription>
        {rec.timeline && (
          <div className="mt-2 p-2 bg-orange-100 rounded-md border border-orange-200">
            <p className="text-sm font-medium text-orange-800">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              {rec.timeline}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Actions */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Recommended Actions:</h4>
          <div className="grid gap-2">
            {rec.actions.map((action, index) => (
              <div key={index} className="flex items-center">
                <ArrowRight className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">{action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Key Benefits:</h4>
          <div className="grid gap-2">
            {rec.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Next Steps:</h4>
          <div className="grid gap-2">
            {rec.nextSteps.map((step, index) => (
              <div key={index} className="flex items-start">
                <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <span className="text-sm text-gray-700">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          {rec.isAvailable ? (
            <>
              <Button className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 flex-1">
                Get Started Now
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                Schedule Consultation
              </Button>
            </>
          ) : (
            <>
              <Button className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 flex-1">
                Join Early Access
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                Get Notified
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-60">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {session ? 'Tour Results' : 'Congratulations!'}
              </h2>
              <p className="text-sm text-gray-600">
                {session 
                  ? `Completed on ${new Date(session.date_completed || '').toLocaleDateString()}`
                  : 'Your guided tour is complete'
                }
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {session ? 'Your Recommendation' : 'Recommended Next Steps'}
            </h3>
            <p className="text-gray-600">
              {session 
                ? 'Based on your tour responses, here was the personalized recommendation:'
                : 'Based on typical AWS customer needs, here\'s our top recommendation to get you started quickly:'
              }
            </p>
            {showSaveStatus && !session && (
              <div className="mt-3 flex items-center text-sm">
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-blue-600">Saving your progress...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-600" />
                    <span className="text-green-600">Your tour progress has been saved successfully</span>
                  </>
                )}
              </div>
            )}
          </div>

          <RecommendationCard rec={expressSetupRecommendation} />
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Why Express Setup + Buy with AWS?</h4>
                <p className="text-sm text-blue-800">
                  This approach gives you the fastest time to value while maintaining AWS marketplace billing integration. 
                  You can get started immediately and scale as needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Ready to transform your data workflows?
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              {session ? 'Close' : 'Close Tour'}
            </Button>
            {onGetStarted && (
              <Button
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                onClick={onGetStarted}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Get Started Now'}
                {!isSaving && <ExternalLink className="h-4 w-4 ml-2" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
