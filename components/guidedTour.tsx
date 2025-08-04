'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store/appStore';
import { guidedTourSteps, FormQuestion, FormStep } from '@/lib/data/sampleData';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check,
  AlertCircle
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
    nextStep,
    previousStep,
    updateFormAnswer,
    resetGuidedTour,
  } = useAppStore();

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const currentStep = guidedTourSteps[currentStepIndex];
  const isLastStep = currentStepIndex === guidedTourSteps.length - 1;
  const isFirstStep = currentStepIndex === 0;

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

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (isLastStep) {
        // Complete the tour
        handleComplete();
      } else {
        nextStep();
        setValidationErrors([]);
      }
    }
  };

  const handlePrevious = () => {
    previousStep();
    setValidationErrors([]);
  };

  const handleComplete = () => {
    // Here you could save the form data to a backend
    console.log('Form completed with answers:', formAnswers);
    closeGuidedTour();
    resetGuidedTour();
  };

  const handleClose = () => {
    if (confirm('Are you sure you want to close the setup tour? Your progress will be lost.')) {
      closeGuidedTour();
      resetGuidedTour();
    }
  };

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
                Step {currentStepIndex + 1} of {guidedTourSteps.length}
              </Badge>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-600 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / guidedTourSteps.length) * 100}%` }}
                />
              </div>
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

          {/* Questions */}
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
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleNext} className="flex items-center">
              {isLastStep ? 'Complete' : 'Next'}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              {isLastStep && <Check className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}