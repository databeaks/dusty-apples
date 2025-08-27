import { create } from 'zustand';
import { TourStep, ConditionalRouting } from '@/lib/fastapi';
import { ConditionalNodeData, TourFlow, RootValidationResult } from '@/types/api';
import { RootTourNavigator } from '@/lib/conditionalNavigation';

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
  databaseConditionalNodes: ConditionalNodeData[];
  isLoadingDatabaseTour: boolean;
  
  // Root-based navigation state
  tourFlow: TourFlow | null;
  currentStepPath: string[];
  rootStepId: string | null;
  
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
  setDatabaseConditionalNodes: (nodes: ConditionalNodeData[]) => void;
  setIsLoadingDatabaseTour: (loading: boolean) => void;
  loadDatabaseTourSteps: () => Promise<void>;
  
  // Root-based navigation actions
  initializeTourFromRoot: () => Promise<void>;
  navigateToNextStep: () => string | null;
  navigateToPreviousStep: () => string | null;
  resetToRoot: () => void;
  validateCurrentTourState: () => RootValidationResult;
  getCurrentStep: () => TourStep | null;
  getStepById: (stepId: string) => TourStep | null;
  getMainTourSteps: () => TourStep[];
  getConditionalSteps: () => TourStep[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  currentView: 'home',
  currentStepIndex: 0,
  formAnswers: {},
  isGuidedTourOpen: false,
  useDatabaseTour: false,
  databaseTourSteps: [],
  databaseConditionalNodes: [],
  isLoadingDatabaseTour: false,
  
  // Root-based navigation initial state
  tourFlow: null,
  currentStepPath: [],
  rootStepId: null,
  
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
  
  setDatabaseConditionalNodes: (nodes) => set({ databaseConditionalNodes: nodes }),
  
  setIsLoadingDatabaseTour: (loading) => set({ isLoadingDatabaseTour: loading }),
  
  loadDatabaseTourSteps: async () => {
    const { convertDatabaseToTourSteps } = await import('@/lib/fastapi');
    set({ isLoadingDatabaseTour: true });
    try {
      const result = await convertDatabaseToTourSteps();
      set({ 
        databaseTourSteps: result.steps, 
        databaseConditionalNodes: result.conditionalNodes,
        isLoadingDatabaseTour: false 
      });
      console.log('Database tour data loaded successfully:', {
        steps: result.steps.length,
        conditionalNodes: result.conditionalNodes.length
      });
    } catch (error) {
      console.error('Failed to load database tour steps:', error);
      set({ isLoadingDatabaseTour: false });
    }
  },
  
  // Root-based navigation implementation
  initializeTourFromRoot: async () => {
    const { databaseTourSteps, loadDatabaseTourSteps } = get();
    
    // Load tour steps if not already loaded
    if (databaseTourSteps.length === 0) {
      await loadDatabaseTourSteps();
    }
    
    const allSteps = get().databaseTourSteps;
    
    // Separate main tour steps from conditional-only steps
    const mainTourSteps = allSteps.filter(step => !step.isConditionalOnly);
    const conditionalOnlySteps = allSteps.filter(step => step.isConditionalOnly);
    
    console.log('🎯 Tour initialization:');
    console.log('- Main tour steps:', mainTourSteps.map(s => s.id));
    console.log('- Conditional-only steps:', conditionalOnlySteps.map(s => s.id));
    
    // Find root step
    const rootStep = mainTourSteps.find(step => step.isRoot === true);
    if (!rootStep) {
      throw new Error('No root step found in main tour data');
    }
    
    // Build tour flow (simplified for now - could be enhanced with full graph analysis)
    const flowMap = new Map<string, any[]>();
    
    // Only use main tour steps for the flow map (conditional steps are handled dynamically)
    allSteps.forEach(step => {
      if (step.nextStepId) {
        if (!flowMap.has(step.id)) {
          flowMap.set(step.id, []);
        }
        flowMap.get(step.id)!.push({
          targetId: step.nextStepId,
          type: 'step'
        });
      }
      
      if (step.conditionalRouting) {
        if (!flowMap.has(step.id)) {
          flowMap.set(step.id, []);
        }
        step.conditionalRouting.forEach(routing => {
          flowMap.get(step.id)!.push({
            targetId: routing.targetStepId,
            type: 'conditional',
            conditions: [routing]
          });
        });
      }
    });
    
    const tourFlow: TourFlow = {
      rootNodeId: rootStep.id,
      flowMap: flowMap as Map<string, any[]>,
      stepNodes: allSteps.map(step => ({
        id: step.id,
        type: 'tourStep',
        position: { x: 0, y: 0 },
        data: step,
        isRoot: step.isRoot
      })),
      conditionalNodes: [],
      questionNodes: []
    };
    
    set({
      tourFlow,
      rootStepId: rootStep.id,
      currentStepIndex: 0,
      currentStepPath: [rootStep.id]
    });
    
    console.log('✅ Tour initialized with root:', rootStep.id);
  },
  
  navigateToNextStep: () => {
    const { tourFlow, formAnswers, currentStepPath, databaseTourSteps } = get();
    if (!tourFlow) return null;
    
    const currentStepId = currentStepPath[currentStepPath.length - 1];
    const currentStep = databaseTourSteps.find(step => step.id === currentStepId);
    
    if (!currentStep) return null;
    
    // Handle conditional routing first
    if (currentStep.conditionalRouting && currentStep.conditionalRouting.length > 0) {
      console.log('🔀 Evaluating conditional routing for step:', currentStepId);
      console.log('📝 Current form answers:', formAnswers);
      
      for (const routing of currentStep.conditionalRouting) {
        const userAnswer = formAnswers[routing.questionId];
        let conditionMet = false;
        
        console.log(`🔍 Checking condition: ${routing.questionId} ${routing.operator} ${routing.value}`);
        console.log(`📋 User answer: ${userAnswer}`);
        
        switch (routing.operator) {
          case 'equals':
            conditionMet = userAnswer === routing.value;
            break;
          case 'not_equals':
            conditionMet = userAnswer !== routing.value;
            break;
          case 'contains':
            conditionMet = Array.isArray(userAnswer) 
              ? userAnswer.includes(routing.value as string)
              : String(userAnswer).includes(String(routing.value));
            break;
          case 'in':
            conditionMet = Array.isArray(routing.value) 
              ? routing.value.includes(userAnswer as string)
              : false;
            break;
          case 'not_contains':
            conditionMet = Array.isArray(userAnswer) 
              ? !userAnswer.includes(routing.value as string)
              : !String(userAnswer).includes(String(routing.value));
            break;
          case 'not_in':
            conditionMet = Array.isArray(routing.value) 
              ? !routing.value.includes(userAnswer as string)
              : true;
            break;
          case 'greater_than':
            conditionMet = Number(userAnswer) > Number(routing.value);
            break;
          case 'less_than':
            conditionMet = Number(userAnswer) < Number(routing.value);
            break;
          default:
            conditionMet = false;
        }
        
        console.log(`✅ Condition met: ${conditionMet}`);
        
        if (conditionMet) {
          const nextStepId = routing.targetStepId;
          console.log(`🎯 Routing to step: ${nextStepId}`);
          
          // Verify the target step exists in our tour steps
          const targetStepExists = databaseTourSteps.some(step => step.id === nextStepId);
          if (!targetStepExists) {
            console.warn(`⚠️ Target step ${nextStepId} not found in tour steps - skipping`);
            continue;
          }
          
          set(state => ({
            currentStepPath: [...state.currentStepPath, nextStepId],
            currentStepIndex: state.currentStepIndex + 1
          }));
          return nextStepId;
        }
      }
      
      // If we have conditional routing but no conditions matched, stay on current step
      // This allows the user to answer questions before proceeding
      console.log('🚫 No conditional routing conditions matched - staying on current step');
      console.log('💡 User needs to answer questions to proceed');
      return null;
    }
    
    // Handle direct next step (only if no conditional routing exists)
    if (currentStep.nextStepId) {
      const nextStepId = currentStep.nextStepId;
      
      // Verify the target step exists in our tour steps
      const targetStepExists = databaseTourSteps.some(step => step.id === nextStepId);
      if (!targetStepExists) {
        console.warn(`⚠️ Next step ${nextStepId} not found in tour steps`);
        return null;
      }
      
      console.log(`➡️ Direct navigation to: ${nextStepId}`);
      set(state => ({
        currentStepPath: [...state.currentStepPath, nextStepId],
        currentStepIndex: state.currentStepIndex + 1
      }));
      return nextStepId;
    }
    
    console.log('🏁 No more steps available - tour complete');
    return null;
  },
  
  navigateToPreviousStep: () => {
    const { currentStepPath } = get();
    if (currentStepPath.length <= 1) return null;
    
    const newPath = currentStepPath.slice(0, -1);
    const previousStepId = newPath[newPath.length - 1];
    
    set(state => ({
      currentStepPath: newPath,
      currentStepIndex: Math.max(0, state.currentStepIndex - 1)
    }));
    
    return previousStepId;
  },
  
  resetToRoot: () => {
    const { rootStepId } = get();
    if (!rootStepId) return;
    
    set({
      currentStepIndex: 0,
      currentStepPath: [rootStepId],
      formAnswers: {}
    });
  },
  
  validateCurrentTourState: (): RootValidationResult => {
    const { tourFlow, currentStepPath } = get();
    
    if (!tourFlow) {
      return {
        errors: ['No tour flow initialized'],
        warnings: [],
        isValid: false,
        orphanedNodes: [],
        unreachableNodes: []
      };
    }
    
    if (currentStepPath.length === 0) {
      return {
        errors: ['Tour path is empty'],
        warnings: [],
        isValid: false,
        orphanedNodes: [],
        unreachableNodes: []
      };
    }
    
    if (currentStepPath[0] !== tourFlow.rootNodeId) {
      return {
        errors: ['Tour path must start from the root node'],
        warnings: [],
        isValid: false,
        rootNodeId: tourFlow.rootNodeId,
        orphanedNodes: [],
        unreachableNodes: []
      };
    }
    
    return {
      errors: [],
      warnings: [],
      isValid: true,
      rootNodeId: tourFlow.rootNodeId,
      orphanedNodes: [],
      unreachableNodes: []
    };
  },
  
  getCurrentStep: () => {
    const { currentStepPath, databaseTourSteps } = get();
    if (currentStepPath.length === 0) return null;
    
    const currentStepId = currentStepPath[currentStepPath.length - 1];
    return databaseTourSteps.find(step => step.id === currentStepId) || null;
  },
  
  getStepById: (stepId: string) => {
    const { databaseTourSteps } = get();
    return databaseTourSteps.find(step => step.id === stepId) || null;
  },
  
  getMainTourSteps: () => {
    const { databaseTourSteps } = get();
    return databaseTourSteps.filter(step => !step.isConditionalOnly);
  },
  
  getConditionalSteps: () => {
    const { databaseTourSteps } = get();
    return databaseTourSteps.filter(step => step.isConditionalOnly === true);
  },
}));