import { create } from 'zustand';

export interface FormAnswers {
  [questionId: string]: string | string[];
}

interface AppStore {
  // Navigation state
  currentView: 'dashboard' | 'guided-tour';
  setCurrentView: (view: 'dashboard' | 'guided-tour') => void;
  
  // Guided tour state
  currentStepIndex: number;
  formAnswers: FormAnswers;
  isGuidedTourOpen: boolean;
  
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
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  currentView: 'dashboard',
  currentStepIndex: 0,
  formAnswers: {},
  isGuidedTourOpen: false,
  
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
      currentView: 'dashboard',
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
}));