import { create } from 'zustand';
import { TourStep, ConditionalRouting } from '@/lib/fastapi';
import { ConditionalNodeData, TourFlow, RootValidationResult, DecisionTreeMetadata, User } from '@/types/api';
import { RootTourNavigator } from '@/lib/conditionalNavigation';

export interface FormAnswers {
  [questionId: string]: string | string[];
}

interface AppStore {
  // User authentication state
  currentUser: User | null;
  isLoadingUser: boolean;
  userError: string | null;
  
  // User actions
  setCurrentUser: (user: User | null) => void;
  loadCurrentUser: () => Promise<void>;
  clearUser: () => void;
  isAdmin: () => boolean;
  
  // Decision Tree Management state
  currentDecisionTree: DecisionTreeMetadata | null;
  currentDecisionTreeId: string | null;
  decisionTreeView: 'list' | 'editor';
  setCurrentDecisionTree: (tree: DecisionTreeMetadata | null) => void;
  setCurrentDecisionTreeId: (id: string | null) => void;
  setDecisionTreeView: (view: 'list' | 'editor') => void;
  
  // Guided tour state
  currentStepIndex: number;
  formAnswers: FormAnswers;
  isGuidedTourOpen: boolean;
  useDatabaseTour: boolean;
  isTestMode: boolean; // Flag to indicate if this is a test tour (no database sessions)
  showRootStepModal: boolean; // Flag to show the root step modal
  showExitModal: boolean; // Flag to show the exit confirmation modal
  tourReturnPath: string | null; // Path to return to when tour is completed/closed
  databaseTourSteps: TourStep[];
  databaseConditionalNodes: ConditionalNodeData[];
  isLoadingDatabaseTour: boolean;
  databaseTourError: string | null;
  
  // Root-based navigation state
  tourFlow: TourFlow | null;
  currentStepPath: string[];
  rootStepId: string | null;
  
  // Guided tour actions
  setCurrentStepIndex: (index: number) => void;
  updateFormAnswer: (questionId: string, value: string | string[]) => void;
  resetGuidedTour: () => void;
  openGuidedTour: () => Promise<void>;
  openTestTour: () => Promise<void>; // Open tour in test mode (no database sessions)
  closeGuidedTour: () => void;
  showExitConfirmation: () => void;
  hideExitConfirmation: () => void;
  exitAndSave: () => Promise<void>;
  exitWithoutSaving: () => Promise<void>;
  nextStep: () => void;
  previousStep: () => void;
  
  // Form validation
  isCurrentStepValid: () => boolean;
  
  // Database tour actions
  setUseDatabaseTour: (use: boolean) => void;
  setDatabaseTourSteps: (steps: TourStep[]) => void;
  setDatabaseConditionalNodes: (nodes: ConditionalNodeData[]) => void;
  setIsLoadingDatabaseTour: (loading: boolean) => void;
  setDatabaseTourError: (error: string | null) => void;
  setShowRootStepModal: (show: boolean) => void;
  loadDatabaseTourSteps: () => Promise<void>;
  loadEditorTourSteps: (nodes: any[], edges: any[]) => Promise<void>;
  
  // Session management
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  saveSessionState: () => Promise<void>;
  loadSessionState: (sessionId: string) => Promise<void>;
  resumeTourFromSession: (sessionId: string) => Promise<void>;
  
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
  // User authentication initial state
  currentUser: null,
  isLoadingUser: false,
  userError: null,
  
  // Decision Tree Management initial state
  currentDecisionTree: null,
  currentDecisionTreeId: null,
  decisionTreeView: 'list',
  currentStepIndex: 0,
  formAnswers: {},
  isGuidedTourOpen: false,
  useDatabaseTour: false,
  isTestMode: false,
  showRootStepModal: false,
  showExitModal: false,
  tourReturnPath: null,
  databaseTourSteps: [],
  databaseConditionalNodes: [],
  isLoadingDatabaseTour: false,
  databaseTourError: null,
  
  // Root-based navigation initial state
  tourFlow: null,
  currentStepPath: [],
  rootStepId: null,
  
  // Session management initial state
  currentSessionId: null,
  
  // User authentication actions
  setCurrentUser: (user) => set({ currentUser: user, userError: null }),
  
  loadCurrentUser: async () => {
    set({ isLoadingUser: true, userError: null });
    try {
      const { getCurrentUser } = await import('@/lib/fastapi');
      const user = await getCurrentUser();
      set({ currentUser: user, isLoadingUser: false, userError: null });
    } catch (error) {
      console.error('Failed to load current user:', error);
      set({ 
        currentUser: null, 
        isLoadingUser: false, 
        userError: error instanceof Error ? error.message : 'Failed to load user' 
      });
    }
  },
  
  clearUser: () => set({ currentUser: null, userError: null }),
  
  isAdmin: () => {
    const { currentUser } = get();
    return currentUser?.role === 'admin';
  },
  
  // Decision Tree Management actions
  setCurrentDecisionTree: (tree) => set({ currentDecisionTree: tree }),
  setCurrentDecisionTreeId: (id) => set({ currentDecisionTreeId: id }),
  setDecisionTreeView: (view) => set({ decisionTreeView: view }),
  
  // Guided tour actions
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
  
  updateFormAnswer: (questionId, value) => {
    set((state) => ({
      formAnswers: { ...state.formAnswers, [questionId]: value },
    }));
    
    // Auto-save session state after form answer update (debounced)
    // Auto-save only if we have a session, not in test mode, and have progressed past root
    const { currentSessionId, isTestMode, currentStepPath, rootStepId } = get();
    const hasProgressedPastRoot = currentStepPath.length > 1 || (currentStepPath.length === 1 && currentStepPath[0] !== rootStepId);
    if (currentSessionId && !isTestMode && hasProgressedPastRoot) {
      // Debounce the auto-save to avoid too many API calls
      setTimeout(() => {
        get().saveSessionState();
      }, 500);
    }
  },
  
  resetGuidedTour: () =>
    set({
      currentStepIndex: 0,
      formAnswers: {},
      isGuidedTourOpen: false,
      showRootStepModal: false, // Close modal when resetting
      showExitModal: false, // Close exit modal when resetting
    }),
  
  openGuidedTour: async () => {
    try {
      // Clear any previous errors and set loading state
      set({ 
        useDatabaseTour: true,
        isLoadingDatabaseTour: true,
        databaseTourError: null,
        tourReturnPath: null // Regular tours return to home
      });
      
      console.log('🚀 Starting guided tour with default decision tree...');
      
      // Load the default decision tree tour steps
      const { loadDatabaseTourSteps } = get();
      await loadDatabaseTourSteps();
      
      // Get default tree and create a session
      try {
        const { getDefaultTourTree, createTourSession } = await import('@/lib/fastapi');
        const defaultTreeResponse = await getDefaultTourTree();
        
        if (defaultTreeResponse.default_tree) {
          // Create a new tour session
          const session = await createTourSession({
            tree_id: defaultTreeResponse.default_tree.id,
            current_step: get().rootStepId || undefined
          });
          
          set({ currentSessionId: session.id });
          console.log('✅ Tour session created:', session.id);
        }
      } catch (error) {
        console.warn('Failed to create tour session:', error);
        // Continue without session tracking
      }
      
      // Open the guided tour
      set({ 
        isGuidedTourOpen: true
      });
      
      console.log('✅ Guided tour started with default decision tree');
      
    } catch (error) {
      console.error('Failed to start guided tour with default decision tree:', error);
      
      // Handle specific error cases
      if (error instanceof Error && error.message === 'NO_ROOT_STEP') {
        const friendlyMessage = 'No root step found in the decision tree. Please set a root step in the decision tree editor.';
        set({ 
          isLoadingDatabaseTour: false,
          databaseTourError: friendlyMessage,
          isGuidedTourOpen: false // Don't open tour on error
        });
        return; // Don't fallback to static tour for root step errors
      }
      
      // Fallback to static tour if database tour fails (for other errors)
      console.log('📋 Falling back to static tour due to error:', error);
      set({ 
        useDatabaseTour: false,
        isGuidedTourOpen: true,
        isLoadingDatabaseTour: false,
        databaseTourError: null, // Clear error when falling back
        currentSessionId: null // Clear session ID on fallback
      });
    }
  },

  openTestTour: async () => {
    try {
      console.log('🧪 Starting test tour (no database sessions)...');
      
      // Set test mode and open the guided tour
      set({ 
        useDatabaseTour: true,
        isTestMode: true, // This is a test tour - no sessions
        isGuidedTourOpen: true,
        currentSessionId: null, // Ensure no session ID
        databaseTourError: null,
        tourReturnPath: null // No navigation needed - tour opens as overlay on current page
      });
      
      // Initialize root-based tour if we have tour steps loaded
      const { databaseTourSteps, initializeTourFromRoot } = get();
      if (databaseTourSteps.length > 0) {
        await initializeTourFromRoot();
      }
      
      console.log('✅ Test tour started (no database interaction)');
      
    } catch (error) {
      console.error('Failed to start test tour:', error);
      
      // Handle specific error cases
      if (error instanceof Error && error.message === 'NO_ROOT_STEP') {
        // This should not happen anymore since we check before calling openTestTour
        console.warn('🚨 Unexpected NO_ROOT_STEP error in openTestTour - this should be caught earlier');
        set({ 
          isLoadingDatabaseTour: false,
          databaseTourError: null,
          isTestMode: false,
          isGuidedTourOpen: false,
          showRootStepModal: true
        });
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to start test tour';
      set({ 
        isLoadingDatabaseTour: false,
        databaseTourError: errorMessage,
        isTestMode: false, // Reset test mode on error
        isGuidedTourOpen: false // Don't open tour on error
      });
      throw error;
    }
  },
  
  closeGuidedTour: () => {
    const { tourReturnPath } = get();
    
    set({
      isGuidedTourOpen: false,
      isTestMode: false, // Reset test mode when closing
      currentSessionId: null, // Clear any session ID
      showRootStepModal: false, // Close modal when closing tour
      showExitModal: false, // Close exit modal
      tourReturnPath: null, // Clear return path
    });
    
    // Navigate to the return path if it's set (for regular tours that need navigation)
    // Test tours with tourReturnPath=null will stay on current page
    if (tourReturnPath && typeof window !== 'undefined') {
      window.location.href = tourReturnPath;
    }
  },
  
  showExitConfirmation: () => {
    set({ showExitModal: true });
  },
  
  hideExitConfirmation: () => {
    set({ showExitModal: false });
  },
  
  exitAndSave: async () => {
    const { currentSessionId, isTestMode, currentStepPath, rootStepId } = get();
    
    // Save session state if we have a session, not in test mode, and have progressed past root
    const hasProgressedPastRoot = currentStepPath.length > 1 || (currentStepPath.length === 1 && currentStepPath[0] !== rootStepId);
    if (currentSessionId && !isTestMode && hasProgressedPastRoot) {
      try {
        await get().saveSessionState();
        console.log('✅ Session saved before exit');
      } catch (error) {
        console.warn('⚠️ Failed to save session on exit:', error);
        // Continue with exit even if save fails
      }
    }
    
    get().closeGuidedTour();
  },
  
  exitWithoutSaving: async () => {
    const { currentSessionId, isTestMode } = get();
    
    // Mark session as abandoned if we have a session and not in test mode
    if (currentSessionId && !isTestMode) {
      try {
        const { updateTourSession } = await import('@/lib/fastapi');
        await updateTourSession(currentSessionId, {
          status: 'abandoned'
        });
        console.log('✅ Session marked as abandoned');
      } catch (error) {
        console.warn('⚠️ Failed to mark session as abandoned:', error);
        // Continue with exit even if marking abandoned fails
      }
    }
    
    get().closeGuidedTour();
  },
  
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
  
  setDatabaseTourError: (error) => set({ databaseTourError: error }),
  
  setShowRootStepModal: (show) => set({ showRootStepModal: show }),
  
  loadDatabaseTourSteps: async () => {
    const { convertDatabaseToTourSteps } = await import('@/lib/fastapi');
    set({ isLoadingDatabaseTour: true, databaseTourError: null });
    try {
      const result = await convertDatabaseToTourSteps();
      set({ 
        databaseTourSteps: result.steps, 
        databaseConditionalNodes: result.conditionalNodes,
        isLoadingDatabaseTour: false,
        databaseTourError: null
      });
      console.log('Database tour data loaded successfully:', {
        steps: result.steps.length,
        conditionalNodes: result.conditionalNodes.length
      });
    } catch (error) {
      console.error('Failed to load database tour steps:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tour data';
      set({ 
        isLoadingDatabaseTour: false,
        databaseTourError: errorMessage
      });
      // Re-throw the error so openGuidedTour knows it failed
      throw error;
    }
  },

  loadEditorTourSteps: async (nodes: any[], edges: any[]) => {
    const { convertEditorToTourSteps } = await import('@/lib/fastapi');
    set({ isLoadingDatabaseTour: true, databaseTourError: null });
    try {
      const result = convertEditorToTourSteps(nodes, edges);
      set({ 
        databaseTourSteps: result.steps, 
        databaseConditionalNodes: result.conditionalNodes,
        isLoadingDatabaseTour: false,
        databaseTourError: null
      });
      console.log('🧪 Editor tour data loaded successfully:', {
        steps: result.steps.length,
        conditionalNodes: result.conditionalNodes.length
      });
    } catch (error) {
      console.error('Failed to load editor tour steps:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load editor tour data';
      set({ 
        isLoadingDatabaseTour: false,
        databaseTourError: errorMessage
      });
      // Re-throw the error so openGuidedTour knows it failed
      throw error;
    }
  },
  
  // Root-based navigation implementation
  initializeTourFromRoot: async () => {
    const { databaseTourSteps, loadDatabaseTourSteps } = get();
    
    // Load tour steps if not already loaded
    if (databaseTourSteps.length === 0) {
      try {
        await loadDatabaseTourSteps();
      } catch (error) {
        console.error('Failed to initialize tour from root:', error);
        throw new Error('Failed to load database tour data for initialization');
      }
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
      throw new Error('NO_ROOT_STEP');
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
    console.log('🎯 Initial state:', {
      currentStepIndex: 0,
      currentStepPath: [rootStep.id],
      totalSteps: allSteps.length,
      mainSteps: mainTourSteps.length,
      conditionalSteps: conditionalOnlySteps.length
    });
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
          
          // Auto-save session state only if we have a session, not in test mode, and have progressed past root
          const { currentSessionId, isTestMode, currentStepPath, rootStepId } = get();
          const hasProgressedPastRoot = currentStepPath.length > 1 || (currentStepPath.length === 1 && currentStepPath[0] !== rootStepId);
          if (currentSessionId && !isTestMode && hasProgressedPastRoot) {
            get().saveSessionState();
          }
          
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
      
      // Auto-save session state only if we have a session, not in test mode, and have progressed past root
      const { currentSessionId, isTestMode, currentStepPath, rootStepId } = get();
      const hasProgressedPastRoot = currentStepPath.length > 1 || (currentStepPath.length === 1 && currentStepPath[0] !== rootStepId);
      if (currentSessionId && !isTestMode && hasProgressedPastRoot) {
        get().saveSessionState();
      }
      
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
    
    // Auto-save session state only if we have a session, not in test mode, and have progressed past root
    const state = get();
    const hasProgressedPastRoot = state.currentStepPath.length > 1 || (state.currentStepPath.length === 1 && state.currentStepPath[0] !== state.rootStepId);
    if (state.currentSessionId && !state.isTestMode && hasProgressedPastRoot) {
      get().saveSessionState();
    }
    
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
  
  // Session management implementation
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  
  saveSessionState: async () => {
    const { 
      currentSessionId, 
      currentStepIndex, 
      currentStepPath, 
      formAnswers, 
      getCurrentStep,
      databaseTourSteps
    } = get();
    
    if (!currentSessionId) {
      console.log('No session ID - skipping session save');
      return;
    }
    
    const currentStep = getCurrentStep();
    const sessionState = {
      currentStepIndex,
      currentStepPath,
      formAnswers,
      timestamp: new Date().toISOString()
    };
    
    try {
      const { updateTourSession } = await import('@/lib/fastapi');
      await updateTourSession(currentSessionId, {
        current_step: currentStep?.id,
        answers: formAnswers,
        session_state: sessionState,
        progress_percentage: Math.round((currentStepIndex / Math.max(databaseTourSteps.length, 1)) * 100)
      });
      console.log('✅ Session state saved successfully');
    } catch (error) {
      console.warn('⚠️ Failed to save session state (tour can continue):', error);
      // Don't throw error - allow tour to continue even if save fails
    }
  },
  
  loadSessionState: async (sessionId: string) => {
    try {
      const { getTourSession } = await import('@/lib/fastapi');
      const session = await getTourSession(sessionId);
      
      if (session.session_state) {
        const {
          currentStepIndex = 0,
          currentStepPath = [],
          formAnswers = {}
        } = session.session_state;
        
        set({
          currentSessionId: sessionId,
          currentStepIndex,
          currentStepPath,
          formAnswers,
          isGuidedTourOpen: true,
          useDatabaseTour: true
        });
        
        console.log('Session state loaded successfully:', session.id);
      } else {
        // No session state, start fresh but mark the session
        set({
          currentSessionId: sessionId,
          currentStepIndex: 0,
          formAnswers: session.answers || {},
          isGuidedTourOpen: true,
          useDatabaseTour: true
        });
      }
    } catch (error) {
      console.error('Failed to load session state:', error);
      throw error;
    }
  },
  
  resumeTourFromSession: async (sessionId: string) => {
    try {
      const { getTourSession } = await import('@/lib/fastapi');
      const session = await getTourSession(sessionId);
      
      // Load database tour steps if not already loaded
      const { databaseTourSteps, loadDatabaseTourSteps } = get();
      if (databaseTourSteps.length === 0) {
        await loadDatabaseTourSteps();
      }
      
      if (session.status === 'abandoned') {
        // For abandoned tours, start from beginning but keep session ID
        console.log('Resuming abandoned tour from beginning');
        await get().initializeTourFromRoot();
        set({
          currentSessionId: sessionId,
          formAnswers: {}, // Clear previous answers for fresh start
          isGuidedTourOpen: true
        });
        
        // Update session status to in_progress
        const { updateTourSession } = await import('@/lib/fastapi');
        await updateTourSession(sessionId, {
          status: 'in_progress',
          progress_percentage: 0,
          answers: {},
          session_state: {}
        });
      } else if (session.status === 'in_progress') {
        // For in-progress tours, resume from saved state
        console.log('Resuming in-progress tour from saved state');
        await get().initializeTourFromRoot();
        await get().loadSessionState(sessionId);
      }
      
      console.log('Tour resumed successfully for session:', sessionId);
    } catch (error) {
      console.error('Failed to resume tour:', error);
      throw error;
    }
  },
}));