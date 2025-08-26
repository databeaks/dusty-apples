import { create } from 'zustand';
import { TourStep } from '@/lib/fastapi';

export interface FormAnswers {
  [questionId: string]: string | string[];
}

interface AppStore {
  // Navigation state
  currentView: 'home' | 'dashboard' | 'guided-tour';
  setCurrentView: (view: 'home' | 'dashboard' | 'guided-tour') => void;
  
  // Guided tour state
  currentStepIndex: number;
  formAnswers: FormAnswers;
  isGuidedTourOpen: boolean;
  useDatabaseTour: boolean;
  databaseTourSteps: TourStep[];
  isLoadingDatabaseTour: boolean;
  
  // Guided tour actions
  setCurrentStepIndex: (index: number) => void;
  updateFormAnswer: (questionId: string, value: string | string[]) => void;
  resetGuidedTour: () => void;
  openGuidedTour: () => void;
  closeGuidedTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  
  // Form validation
  isCurrentStepValid: () => boolean;
  
  // Database tour actions
  setUseDatabaseTour: (use: boolean) => void;
  setDatabaseTourSteps: (steps: TourStep[]) => void;
  setIsLoadingDatabaseTour: (loading: boolean) => void;
  loadDatabaseTourSteps: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  currentView: 'home',
  currentStepIndex: 0,
  formAnswers: {},
  isGuidedTourOpen: false,
  useDatabaseTour: false,
  databaseTourSteps: [],
  isLoadingDatabaseTour: false,
  
  // Navigation actions
  setCurrentView: (view) => set({ currentView: view }),
  
  // Guided tour actions
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
  
  updateFormAnswer: (questionId, value) =>
    set((state) => ({
      formAnswers: { ...state.formAnswers, [questionId]: value },
    })),
  
  resetGuidedTour: () =>
    set({
      currentStepIndex: 0,
      formAnswers: {},
      isGuidedTourOpen: false,
    }),
  
  openGuidedTour: () => 
    set({ 
      isGuidedTourOpen: true,
      currentView: 'guided-tour'
    }),
  
  closeGuidedTour: () =>
    set({
      isGuidedTourOpen: false,
      currentView: 'home',
    }),
  
  nextStep: () =>
    set((state) => ({
      currentStepIndex: state.currentStepIndex + 1,
    })),
  
  previousStep: () =>
    set((state) => ({
      currentStepIndex: Math.max(0, state.currentStepIndex - 1),
    })),
  
  // Form validation
  isCurrentStepValid: () => {
    const { currentStepIndex, formAnswers } = get();
    // This will be implemented when we import the step data
    // For now, return true
    return true;
  },
  
  // Database tour actions
  setUseDatabaseTour: (use) => set({ useDatabaseTour: use }),
  
  setDatabaseTourSteps: (steps) => set({ databaseTourSteps: steps }),
  
  setIsLoadingDatabaseTour: (loading) => set({ isLoadingDatabaseTour: loading }),
  
  loadDatabaseTourSteps: async () => {
    const { convertDatabaseToTourSteps } = await import('@/lib/fastapi');
    set({ isLoadingDatabaseTour: true });
    try {
      const steps = await convertDatabaseToTourSteps();
      set({ databaseTourSteps: steps, isLoadingDatabaseTour: false });
      console.log('Database tour steps loaded successfully:', steps.length);
    } catch (error) {
      console.error('Failed to load database tour steps:', error);
      set({ isLoadingDatabaseTour: false });
    }
  },
}));