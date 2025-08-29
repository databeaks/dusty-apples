'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store/appStore';
import { guidedTourSteps, FormQuestion, FormStep, getRecommendation, DeploymentRecommendation } from '@/lib/data/sampleData';
import { TourCompletionModal } from './tourCompletionModal';
import { convertDatabaseToTourSteps, TourStep, TourQuestion } from '@/lib/fastapi';
import { TourNavigator } from '@/lib/conditionalNavigation';
import { ConditionalNodeData } from '@/types/api';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface QuestionInputProps {
  question: FormQuestion;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  const handleSelectChange = (selectedValue: string) => {
    onChange(selectedValue);
  };

  const handleMultiSelectChange = (selectedValue: string) => {
    const currentValues = Array.isArray(value) ? value : [];
    const newValues = currentValues.includes(selectedValue)
      ? currentValues.filter(v => v !== selectedValue)
      : [...currentValues, selectedValue];
    onChange(newValues);
  };

  const handleTextChange = (newValue: string) => {
    onChange(newValue);
  };

  switch (question.type) {
    case 'select':
      return (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <label
              key={option}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                value === option 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={value === option}
                onChange={(e) => handleSelectChange(e.target.value)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                value === option ? 'border-red-500' : 'border-gray-300'
              }`}>
                {value === option && <div className="w-2 h-2 bg-red-500 rounded-full" />}
              </div>
              <span className="text-sm font-medium text-gray-900">{option}</span>
            </label>
          ))}
        </div>
      );

    case 'multiselect':
      const currentValues = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <label
              key={option}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                currentValues.includes(option)
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={currentValues.includes(option)}
                onChange={() => handleMultiSelectChange(option)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${
                currentValues.includes(option) 
                  ? 'border-red-500 bg-red-500' 
                  : 'border-gray-300'
              }`}>
                {currentValues.includes(option) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-900">{option}</span>
            </label>
          ))}
        </div>
      );

    case 'text':
      return (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleTextChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder={question.description || `Enter ${question.title.toLowerCase()}`}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          placeholder={question.description || `Enter ${question.title.toLowerCase()}`}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleTextChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder={question.description || `Enter ${question.title.toLowerCase()}`}
        />
      );

    default:
      return null;
  }
}

export function GuidedTour() {
  const {
    currentStepIndex,
    formAnswers,
    closeGuidedTour,
    showExitConfirmation,
    hideExitConfirmation,
    exitAndSave,
    exitWithoutSaving,
    showExitModal,
    nextStep,
    previousStep,
    updateFormAnswer,
    resetGuidedTour,
    useDatabaseTour,
    isTestMode,
    databaseTourSteps,
    databaseConditionalNodes,
    isLoadingDatabaseTour,
    databaseTourError,
    setUseDatabaseTour,
    setDatabaseTourError,
    loadDatabaseTourSteps,
    getMainTourSteps,
    navigateToNextStep,
    navigateToPreviousStep,
    getCurrentStep,
    initializeTourFromRoot,
    currentStepPath,
    currentSessionId,
    rootStepId,
  } = useAppStore();

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<DeploymentRecommendation | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);
  
  // Get applicable steps based on current answers and tour mode
  const getApplicableSteps = () => {
    if (useDatabaseTour) {
      // For database tours, only show main tour steps (exclude conditional-only steps)
      const mainSteps = getMainTourSteps();
      console.log('🎯 Main tour steps for UI:', mainSteps.map(s => s.id));
      return mainSteps.filter(step => !step.condition || step.condition(formAnswers));
    } else {
      // For sample tours, use the original logic
      return guidedTourSteps.filter(step => !step.condition || step.condition(formAnswers));
    }
  };

  const applicableSteps = getApplicableSteps();
  
  // Load database tour steps when switching to database mode
  useEffect(() => {
    if (useDatabaseTour && databaseTourSteps.length === 0 && !isLoadingDatabaseTour && !databaseTourError) {
      // Only load if we're in database mode, don't have data, not currently loading, and no error state
      console.log('Loading database tour steps from useEffect...');
      loadDatabaseTourSteps().catch(error => {
        console.error('Failed to load database tour steps in useEffect:', error);
        // Error is already handled by the store, so no need to do anything here
      });
    }
  }, [useDatabaseTour, databaseTourSteps.length, isLoadingDatabaseTour, databaseTourError]);
  
  // Initialize root-based tour when database tour steps are loaded
  useEffect(() => {
    if (useDatabaseTour && databaseTourSteps.length > 0 && currentStepPath.length === 0) {
      console.log('🚀 Initializing root-based tour...');
      initializeTourFromRoot().catch(console.error);
    }
  }, [useDatabaseTour, databaseTourSteps.length, currentStepPath.length]);
  
  // Get current step based on tour mode
  const currentStep = useDatabaseTour ? getCurrentStep() : applicableSteps[currentStepIndex];
  
  // Calculate isLastStep properly for database tours
  const isLastStep = useDatabaseTour 
    ? (() => {
        if (!currentStep) return false;
        // A step is the last step if it has no nextStepId and no conditional routing
        // Only check these properties for TourStep (database tour steps)
        const tourStep = currentStep as TourStep;
        const hasNextStep = tourStep.nextStepId;
        const hasConditionalRouting = tourStep.conditionalRouting && tourStep.conditionalRouting.length > 0;
        return !hasNextStep && !hasConditionalRouting;
      })()
    : currentStepIndex === applicableSteps.length - 1;
    
  const isFirstStep = useDatabaseTour ? currentStepPath.length <= 1 : currentStepIndex === 0;

  // Check if a question should be shown based on conditional logic
  const shouldShowQuestion = (question: FormQuestion): boolean => {
    if (!question.showIf) return true;
    
    const { questionId, value: expectedValue } = question.showIf;
    const actualValue = formAnswers[questionId];
    
    if (Array.isArray(expectedValue)) {
      return expectedValue.some(v => actualValue === v);
    }
    
    return actualValue === expectedValue;
  };

  // Get visible questions for current step
  const visibleQuestions = currentStep?.questions.filter(shouldShowQuestion) || [];

  // Calculate recommendation when on the final step
  useEffect(() => {
    if (currentStep?.id === 'recommendation') {
      const rec = getRecommendation(formAnswers);
      setRecommendation(rec);
    }
  }, [currentStep?.id, formAnswers]);

  // Validate current step
  const validateCurrentStep = (): boolean => {
    const errors: string[] = [];
    
    visibleQuestions.forEach((question) => {
      if (question.required) {
        const answer = formAnswers[question.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          errors.push(`${question.title} is required`);
        }
      }
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = async () => {
    console.log('🔘 Next button clicked');
    console.log('📋 Current form answers:', formAnswers);
    console.log('🎯 Current step index:', currentStepIndex);
    console.log('🔄 Use database tour:', useDatabaseTour);
    
    if (validateCurrentStep()) {
      console.log('✅ Validation passed');
      
      if (isLastStep) {
        console.log('🏁 Last step - completing tour');
        handleComplete();
      } else {
        if (useDatabaseTour) {
          // For database tour, use root-based navigation
          console.log('🔄 Database tour: navigating to next step...');
          console.log('📍 Current step path:', currentStepPath);
          
          const currentStep = getCurrentStep();
          console.log('📝 Current step details:', {
            id: currentStep?.id,
            title: currentStep?.title,
            conditionalRouting: currentStep?.conditionalRouting?.length || 0,
            nextStepId: currentStep?.nextStepId
          });
          
          const nextStepId = await navigateToNextStep();
          
          if (nextStepId) {
            console.log('✅ Navigated to step:', nextStepId);
            setValidationErrors([]);
          } else {
            // Check if current step has conditional routing - if so, user needs to answer questions
            if (currentStep?.conditionalRouting && currentStep.conditionalRouting.length > 0) {
              console.log('⏳ Staying on current step - user needs to answer questions');
              console.log('🔍 Conditional routing rules:', currentStep.conditionalRouting);
              
              // Check which conditions are not met
              currentStep.conditionalRouting.forEach((routing, index) => {
                const userAnswer = formAnswers[routing.questionId];
                console.log(`🔍 Condition ${index + 1}: ${routing.questionId} ${routing.operator} ${routing.value} | User answer: ${userAnswer}`);
              });
              
              // Don't complete the tour, just stay on current step
              // The user needs to answer the questions to proceed
            } else {
              console.log('🏁 No next step available - tour complete');
              handleComplete();
            }
          }
        } else {
          // For static tour, use the conditional logic
          const allSteps = guidedTourSteps;
          const currentStepId = currentStep?.id;
          const currentFullIndex = allSteps.findIndex(step => step.id === currentStepId);
          
          // Find next applicable step from the full list
          for (let i = currentFullIndex + 1; i < allSteps.length; i++) {
            const candidateStep = allSteps[i];
            if (!candidateStep.condition || candidateStep.condition(formAnswers)) {
              // Update to this step index in the applicable steps array
              const nextApplicableIndex = applicableSteps.findIndex(step => step.id === candidateStep.id);
              if (nextApplicableIndex !== -1) {
                nextStep();
                setValidationErrors([]);
                return;
              }
            }
          }
          
          // If no next step found, complete the tour
          handleComplete();
        }
      }
    } else {
      console.log('❌ Validation failed:', validationErrors);
      console.log('🔍 Required questions not answered:', visibleQuestions.filter(q => q.required && (!formAnswers[q.id] || (Array.isArray(formAnswers[q.id]) && formAnswers[q.id].length === 0))).map(q => ({ id: q.id, title: q.title })));
    }
  };

  const handlePrevious = () => {
    // For database tour, use root-based navigation
    if (useDatabaseTour) {
      console.log('🔄 Database tour: navigating to previous step...');
      const previousStepId = navigateToPreviousStep();
      
      if (previousStepId) {
        console.log('✅ Navigated back to step:', previousStepId);
        setValidationErrors([]);
      } else {
        console.log('🚫 Already at first step');
      }
    } else {
      // For static tour, use the conditional logic
      const allSteps = guidedTourSteps;
      const currentStepId = currentStep?.id;
      const currentFullIndex = allSteps.findIndex(step => step.id === currentStepId);
      
      // Find previous applicable step from the full list
      for (let i = currentFullIndex - 1; i >= 0; i--) {
        const candidateStep = allSteps[i];
        if (!candidateStep.condition || candidateStep.condition(formAnswers)) {
          previousStep();
          setValidationErrors([]);
          return;
        }
      }
      
      // If no previous step found, just go back one step
      previousStep();
      setValidationErrors([]);
    }
  };

  const handleComplete = async () => {
    // Save the form data to backend and mark session as completed
    console.log('Form completed with answers:', formAnswers);
    
    // Save session as completed if we have a session and not in test mode
    if (currentSessionId && !isTestMode) {
      setIsSavingCompletion(true);
      try {
        const { updateTourSession } = await import('@/lib/fastapi');
        
        // Prepare the Express Setup + Buy with AWS recommendation
        const expressSetupRecommendation = {
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
        
        await updateTourSession(currentSessionId, {
          status: 'completed',
          progress_percentage: 100,
          answers: formAnswers,
          recommendation: expressSetupRecommendation,
          current_step: 'completed'
        });
        
        console.log('✅ Tour session marked as completed in database');
      } catch (error) {
        console.warn('⚠️ Failed to save tour completion to database (tour can continue):', error);
        // Don't prevent the completion modal from showing even if save fails
      } finally {
        setIsSavingCompletion(false);
      }
    } else if (isTestMode) {
      console.log('🧪 Test mode - skipping database save');
    } else {
      console.log('ℹ️ No session ID - skipping database save');
    }
    
    // Show completion modal with Express Setup + Buy with AWS recommendation
    setShowCompletionModal(true);
  };

  const handleClose = () => {
    // Show exit confirmation for non-test tours that have progressed past root
    const hasProgressedPastRoot = currentStepPath.length > 1 || (currentStepPath.length === 1 && currentStepPath[0] !== rootStepId);
    if (!isTestMode && currentSessionId && hasProgressedPastRoot) {
      showExitConfirmation();
    } else {
      // For test tours or tours at root step, exit immediately without confirmation
      closeGuidedTour();
      resetGuidedTour();
    }
  };

  // Recommendation component
  const RecommendationCard = ({ rec }: { rec: DeploymentRecommendation }) => {
    const getQualificationBadge = (qualification: string) => {
      switch (qualification) {
        case 'Yes':
          return (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready to Deploy
            </Badge>
          );
        case 'Not Yet':
          return (
            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              Coming Soon
            </Badge>
          );
        case 'Maybe':
          return (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Partial Solution
            </Badge>
          );
        default:
          return null;
      }
    };

    return (
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
                <Clock className="h-4 w-4 inline mr-1" />
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
  };

  const handleCompletionClose = () => {
    setShowCompletionModal(false);
    closeGuidedTour();
    resetGuidedTour();
  };

  const handleGetStarted = () => {
    // Here you could redirect to AWS Marketplace or start setup process
    console.log('Starting Express Setup + Buy with AWS process...');
    setShowCompletionModal(false);
    closeGuidedTour();
    resetGuidedTour();
  };

  // Show loading state for database tour
  if (useDatabaseTour && isLoadingDatabaseTour) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Database Tour</h3>
          <p className="text-sm text-gray-600">Converting your decision tree into a guided tour...</p>
        </div>
      </div>
    );
  }

  // Show error state if no steps available or if there was a load error
  if (useDatabaseTour && databaseTourSteps.length === 0 && !isLoadingDatabaseTour) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="h-8 w-8 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {databaseTourError ? 'Error Loading Tour Data' : 'No Tour Steps Found'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {databaseTourError || 'Your decision tree doesn\'t contain any tour steps or questions. Please add some nodes to your decision tree first.'}
          </p>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setUseDatabaseTour(false);
                setDatabaseTourError(null);
              }}
              className="flex-1"
            >
              Switch to Static Tour
            </Button>
            <Button 
              onClick={() => {
                setDatabaseTourError(null);
                // Clear error and try loading again
                loadDatabaseTourSteps().catch(error => {
                  console.error('Manual retry failed:', error);
                });
              }}
              className="flex-1"
              disabled={isLoadingDatabaseTour}
            >
              {isLoadingDatabaseTour ? 'Loading...' : 'Retry'}
            </Button>
            <Button 
              onClick={() => {
                closeGuidedTour();
              }}
              variant="outline"
              className="flex-1"
            >
              Edit Tree
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                Step {currentStepIndex + 1} of {applicableSteps.length}
              </Badge>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-600 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / applicableSteps.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">Tour Mode:</span>
              <Button
                variant={useDatabaseTour ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setUseDatabaseTour(!useDatabaseTour);
                  resetGuidedTour(); // Reset progress when switching modes
                }}
                disabled={isLoadingDatabaseTour}
                className={`text-xs ${useDatabaseTour ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
              >
                {isLoadingDatabaseTour ? "Loading..." : useDatabaseTour ? "🔗 Database" : "📋 Static"}
              </Button>
              {useDatabaseTour && (
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-medium ${isTestMode ? 'text-orange-600' : 'text-purple-600'}`}>
                    {isTestMode ? '🧪 Test Mode (No Database)' : 'Using Decision Tree'}
                  </span>
                  {!isTestMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!isLoadingDatabaseTour) {
                          // Reset the tour state and reload fresh data
                          resetGuidedTour();
                          loadDatabaseTourSteps();
                        }
                      }}
                      disabled={isLoadingDatabaseTour}
                      className="text-xs h-6 px-2"
                      title="Refresh tour with latest decision tree data"
                    >
                      {isLoadingDatabaseTour ? "..." : "🔄"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentStep.title}</h2>
            <p className="text-gray-600">{currentStep.description}</p>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-1">
                    Please fix the following errors:
                  </h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

                  {/* Recommendation Display (if on recommendation step) */}
        {currentStep.id === 'recommendation' && recommendation && (
          <div className="space-y-6">
            <RecommendationCard rec={recommendation} />
            
            {/* Show regular questions below recommendation */}
            {visibleQuestions.map((question) => (
              <div key={question.id} className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {question.title}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  {question.description && (
                    <p className="text-sm text-gray-600 mt-1">{question.description}</p>
                  )}
                </div>
                <QuestionInput
                  question={question}
                  value={formAnswers[question.id] || (question.type === 'multiselect' ? [] : '')}
                  onChange={(value) => updateFormAnswer(question.id, value)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Regular Questions (for non-recommendation steps) */}
        {currentStep.id !== 'recommendation' && (
          <div className="space-y-6">
            {visibleQuestions.map((question) => (
              <div key={question.id} className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {question.title}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  {question.description && (
                    <p className="text-sm text-gray-600 mt-1">{question.description}</p>
                  )}
                </div>
                <QuestionInput
                  question={question}
                  value={formAnswers[question.id] || (question.type === 'multiselect' ? [] : '')}
                  onChange={(value) => updateFormAnswer(question.id, value)}
                />
              </div>
            ))}
          </div>
        )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center space-x-2">
            {/* Show Save button only when user has progressed past root step */}
            {(() => {
              const hasProgressedPastRoot = currentStepPath.length > 1 || (currentStepPath.length === 1 && currentStepPath[0] !== rootStepId);
              return hasProgressedPastRoot && currentSessionId && !isTestMode ? (
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await exitAndSave();
                  }}
                  className="flex items-center"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save & Exit
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
              );
            })()}
            <Button onClick={handleNext} className="flex items-center">
              {isLastStep ? 'Complete' : 'Next'}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              {isLastStep && <Check className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Exit Tour</h3>
              <p className="text-gray-600">
                You're partway through the setup tour. What would you like to do?
              </p>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Button
                onClick={async () => {
                  await exitAndSave();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Save Progress & Exit
              </Button>
              
              <Button
                onClick={async () => {
                  await exitWithoutSaving();
                }}
                variant="destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Exit Without Saving
              </Button>
              
              <Button
                onClick={hideExitConfirmation}
                variant="outline"
              >
                Continue Tour
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      <TourCompletionModal 
        isOpen={showCompletionModal}
        onClose={handleCompletionClose}
        onGetStarted={handleGetStarted}
        isSaving={isSavingCompletion}
        showSaveStatus={currentSessionId !== null && !isTestMode}
      />
    </div>
  );
}