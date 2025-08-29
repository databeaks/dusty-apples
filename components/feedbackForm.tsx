'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { FeedbackCategory, FeedbackCreateRequest } from '@/types/api';
import { submitFeedback } from '@/lib/fastapi';
import { useAppStore } from '@/lib/store/appStore';

interface FeedbackFormProps {
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onSubmitSuccess,
  onCancel,
  className = ""
}) => {
  const { currentUser, loadCurrentUser } = useAppStore();
  const [formData, setFormData] = useState<FeedbackCreateRequest>({
    category: 'other',
    role: '',
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load user data and initialize form when component mounts
  useEffect(() => {
    console.log('FeedbackForm mounted - currentUser:', currentUser);
    console.log('currentUser company_role:', currentUser?.company_role);
    console.log('currentUser object keys:', currentUser ? Object.keys(currentUser) : 'no user');
    
    if (!currentUser) {
      console.log('Loading current user...');
      loadCurrentUser();
    } else {
      // Initialize role field with saved company role
      const savedRole = currentUser.company_role || '';
      console.log('User found, initializing with saved role:', `"${savedRole}"`);
      console.log('Full currentUser object:', JSON.stringify(currentUser, null, 2));
      setFormData(prev => ({ 
        ...prev, 
        role: savedRole 
      }));
    }
  }, [currentUser, loadCurrentUser]);

  // Additional effect to handle user data loading completion
  useEffect(() => {
    if (currentUser && formData.role === '') {
      const savedRole = currentUser.company_role || '';
      console.log('User data loaded, setting role to:', `"${savedRole}"`);
      setFormData(prev => ({ 
        ...prev, 
        role: savedRole 
      }));
    }
  }, [currentUser]);

  const categoryOptions = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'tour_suggestion', label: 'Tour Suggestion' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.comment.trim()) {
      setError('Please provide a comment');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback(formData);

      setSuccess(true);
      // Reset form but keep the user's saved role
      const savedRole = currentUser?.company_role || '';
      setFormData({ category: 'other', role: savedRole, comment: '' });
      
      if (onSubmitSuccess) {
        setTimeout(() => {
          onSubmitSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value as FeedbackCategory }));
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, comment: e.target.value }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, role: e.target.value }));
  };

  if (success) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert className="border-green-200 bg-green-50">
            <div className="text-green-800">
              <h4 className="font-medium">Thank you for your feedback!</h4>
              <p className="text-sm mt-1">
                Your feedback has been submitted successfully. We appreciate your input and will review it soon.
              </p>
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>
            Help us improve by sharing your thoughts, reporting bugs, or suggesting new features.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <div className="text-red-800">
                <p className="text-sm">{error}</p>
              </div>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Your Role (Optional)</Label>
            <Input
              id="role"
              value={formData.role || ''}
              onChange={handleRoleChange}
              placeholder="e.g., Data Scientist, Product Manager, Developer, Analyst..."
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              What's your current role? This helps us understand the context of your feedback.
            </p>
          </div>

          <div className="space-y-2 mb-6">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={handleCommentChange}
              placeholder="Please describe your feedback in detail..."
              rows={4}
              className="resize-vertical"
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isSubmitting || !formData.comment.trim()}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
          {onCancel && (
            <Button 
              type="button" 
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};

export default FeedbackForm;
