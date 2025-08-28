// Sample data for guided tour/dynamic form
export interface FormQuestion {
  id: string;
  type: 'select' | 'multiselect' | 'text' | 'textarea' | 'number';
  title: string;
  description?: string;
  options?: string[];
  required?: boolean;
  showIf?: {
    questionId: string;
    value: string | string[];
  };
}

export interface FormStep {
  id: string;
  title: string;
  description: string;
  questions: FormQuestion[];
  condition?: (answers: any) => boolean;
}

export const guidedTourSteps: FormStep[] = [
  {
    id: 'customer-type',
    title: 'Customer Scenario',
    description: 'Let\'s identify your situation to recommend the optimal Databricks workspace setup.',
    questions: [
      {
        id: 'customer-type',
        type: 'select',
        title: 'Which scenario best describes your situation?',
        description: 'This determines your qualification path and available options.',
        options: [
          'New Customer (Trial)',
          'Existing Customer (Sandbox)',
          'Production on Azure/GCP',
          'AWS Customer/Cloud Migration'
        ],
        required: true,
      },
    ],
  },
  {
    id: 'use-case-category',
    title: 'Primary Use Case',
    description: 'What\'s your main focus area? This helps us understand your technical requirements.',
    condition: (answers) => ['New Customer (Trial)', 'Existing Customer (Sandbox)', 'AWS Customer/Cloud Migration'].includes(answers['customer-type']),
    questions: [
      {
        id: 'use-case-category',
        type: 'select',
        title: 'What\'s your primary use case category?',
        description: 'Select the area that best represents your main needs.',
        options: [
          'Generative AI & Machine Learning',
          'Connectivity Requirements',
          'Business User Enablement',
          'Data Analytics & Engineering'
        ],
        required: true,
      },
    ],
  },
  {
    id: 'aws-billing',
    title: 'AWS Billing Preference',
    description: 'For AWS customers, let\'s determine your billing requirements.',
    condition: (answers) => answers['customer-type'] === 'AWS Customer/Cloud Migration',
    questions: [
      {
        id: 'aws-billing',
        type: 'select',
        title: 'How would you prefer to handle billing?',
        description: 'This affects your deployment options and setup process.',
        options: [
          'Must use AWS Marketplace',
          'Direct billing acceptable',
          'Not sure / Need guidance'
        ],
        required: true,
      },
    ],
  },
  {
    id: 'generative-ai-details',
    title: 'Generative AI & ML Requirements',
    description: 'Let\'s understand your specific AI and machine learning needs.',
    condition: (answers) => answers['use-case-category'] === 'Generative AI & Machine Learning',
    questions: [
      {
        id: 'generative-ai-details',
        type: 'multiselect',
        title: 'Which AI/ML capabilities do you need?',
        description: 'Select all that apply to your requirements.',
        options: [
          'Genie Spaces (Serverless Compatible)',
          'Mosaic AI Testing (Serverless Compatible)',
          'GPU Development Work (Classic Required)',
          'ML Runtime/MLlib (Classic Required)'
        ],
        required: true,
      },
    ],
  },
  {
    id: 'connectivity-details',
    title: 'Connectivity Requirements',
    description: 'What are your data connectivity and integration needs?',
    condition: (answers) => answers['use-case-category'] === 'Connectivity Requirements',
    questions: [
      {
        id: 'connectivity-details',
        type: 'multiselect',
        title: 'Which connectivity features do you need?',
        description: 'Select all that apply to your integration requirements.',
        options: [
          'PrivateLink to APIs (Classic Required)',
          'On-Premises/Private DB via Lakeflow Connect (Classic Required)',
          'SaaS Federation (not Lakeflow) (Serverless Compatible)'
        ],
        required: true,
      },
    ],
  },
  {
    id: 'business-user-details',
    title: 'Business User Enablement',
    description: 'What business user features are most important to you?',
    condition: (answers) => answers['use-case-category'] === 'Business User Enablement',
    questions: [
      {
        id: 'business-user-details',
        type: 'multiselect',
        title: 'Which business user capabilities do you need?',
        description: 'Select all that apply to your business user requirements.',
        options: [
          'Databricks One (Serverless Compatible)',
          'AI/BI Dashboards (Serverless Compatible)',
          'Databricks Apps (Serverless Compatible)'
        ],
        required: true,
      },
    ],
  },
  {
    id: 'analytics-engineering-details',
    title: 'Analytics & Engineering Requirements',
    description: 'What are your data analytics and engineering needs?',
    condition: (answers) => answers['use-case-category'] === 'Data Analytics & Engineering',
    questions: [
      {
        id: 'analytics-engineering-details',
        type: 'multiselect',
        title: 'Which analytics and engineering features do you need?',
        description: 'Select all that apply to your data processing requirements.',
        options: [
          'Exploratory Analytics (Notebooks/SQL) (Serverless Compatible)',
          'Serverless Declarative Pipelines (Serverless Compatible)',
          'Legacy Spark RDDs (Classic Required)',
          'Scala/R Primary Languages (Classic Required)',
          'Streaming with Trigger Intervals (Classic Required)'
        ],
        required: true,
      },
    ],
  },
  {
    id: 'team_setup',
    title: 'Team & Collaboration',
    description: 'Tell us about your team structure and collaboration needs.',
    questions: [
      {
        id: 'team_size',
        type: 'select',
        title: 'How large is your immediate team?',
        options: ['Just me', '2-5 people', '6-15 people', '16-30 people', '30+ people'],
        required: true,
      },
      {
        id: 'collaboration_tools',
        type: 'multiselect',
        title: 'Which collaboration tools does your team use?',
        options: ['Slack', 'Microsoft Teams', 'Discord', 'Notion', 'Confluence', 'Linear', 'Jira', 'Asana', 'Trello'],
        required: false,
      },
      {
        id: 'feedback_sources',
        type: 'multiselect',
        title: 'Where do you currently collect feedback?',
        description: 'Select all that apply',
        options: ['Customer support tickets', 'Sales calls', 'User interviews', 'App reviews', 'Social media', 'Surveys', 'Internal feedback'],
        required: false,
      },
    ],
  },
  {
    id: 'product_focus',
    title: 'Product Focus',
    description: 'Help us understand your product and goals.',
    questions: [
      {
        id: 'product_type',
        type: 'select',
        title: 'What type of product do you work on?',
        options: ['Web Application', 'Mobile App', 'Desktop Software', 'API/Platform', 'Hardware', 'Service/Consulting'],
        required: true,
      },
      {
        id: 'main_challenge',
        type: 'select',
        title: 'What\'s your biggest product challenge right now?',
        options: [
          'Understanding user needs',
          'Prioritizing features',
          'Managing technical debt',
          'Scaling the team',
          'Improving user experience',
          'Increasing user engagement'
        ],
        required: true,
      },
      {
        id: 'priority_areas',
        type: 'multiselect',
        title: 'Which areas are you focusing on this quarter?',
        options: ['User research', 'Feature development', 'Performance optimization', 'Design improvements', 'Analytics', 'Integration'],
        showIf: {
          questionId: 'role',
          value: 'Product Manager'
        },
        required: false,
      },
    ],
  },
  {
    id: 'technical_preferences',
    title: 'Technical Setup',
    description: 'Let\'s configure your technical preferences.',
    questions: [
      {
        id: 'technical_stack',
        type: 'multiselect',
        title: 'What\'s your primary tech stack?',
        options: ['React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Python', 'Java', 'C#', '.NET', 'PHP'],
        showIf: {
          questionId: 'role',
          value: 'Engineer'
        },
        required: false,
      },
      {
        id: 'deployment_preferences',
        type: 'select',
        title: 'How do you prefer to deploy?',
        options: ['Cloud (AWS/GCP/Azure)', 'On-premise', 'Hybrid', 'Not applicable'],
        showIf: {
          questionId: 'role',
          value: 'Engineer'
        },
        required: false,
      },
      {
        id: 'design_tools',
        type: 'multiselect',
        title: 'Which design tools do you use?',
        options: ['Figma', 'Sketch', 'Adobe XD', 'InVision', 'Principle', 'Framer'],
        showIf: {
          questionId: 'role',
          value: 'Designer'
        },
        required: false,
      },
    ],
  },
  {
    id: 'goals_metrics',
    title: 'Goals & Success Metrics',
    description: 'Define what success looks like for you.',
    questions: [
      {
        id: 'success_metric',
        type: 'select',
        title: 'What\'s your primary success metric?',
        options: ['User satisfaction', 'Feature adoption', 'Revenue growth', 'User retention', 'Performance improvements', 'Team productivity'],
        required: true,
      },
      {
        id: 'timeline',
        type: 'select',
        title: 'What\'s your typical project timeline?',
        options: ['1-2 weeks', '1 month', '2-3 months', '6+ months', 'Varies significantly'],
        required: true,
      },
      {
        id: 'additional_notes',
        type: 'textarea',
        title: 'Any additional context or specific goals?',
        description: 'Help us understand your unique situation (optional)',
        required: false,
      },
    ],
  },
  {
    id: 'recommendation',
    title: 'Your Recommended Setup',
    description: 'Based on your responses, here\'s what we recommend for your deployment.',
    questions: [
      {
        id: 'contact_info',
        type: 'text',
        title: 'Email address (optional)',
        description: 'We can send you setup instructions and updates.',
        required: false,
      },
      {
        id: 'timeline',
        type: 'select',
        title: 'When are you looking to get started?',
        options: ['Immediately', 'Within 2 weeks', 'Within a month', '2-3 months', 'Just exploring'],
        required: true,
      },
    ],
  },
];

// Recommendation system interfaces and data
export interface DeploymentRecommendation {
  id: string;
  title: string;
  qualification: 'Yes' | 'Not Yet' | 'Maybe';
  description: string;
  actions: string[];
  timeline?: string;
  benefits: string[];
  nextSteps: string[];
  isAvailable: boolean;
}

// Classification of requirements
const CLASSIC_REQUIRED_FEATURES = [
  'GPU Development Work (Classic Required)',
  'ML Runtime/MLlib (Classic Required)',
  'PrivateLink to APIs (Classic Required)',
  'On-Premises/Private DB via Lakeflow Connect (Classic Required)',
  'Legacy Spark RDDs (Classic Required)',
  'Scala/R Primary Languages (Classic Required)',
  'Streaming with Trigger Intervals (Classic Required)'
];

const SERVERLESS_COMPATIBLE_FEATURES = [
  'Genie Spaces (Serverless Compatible)',
  'Mosaic AI Testing (Serverless Compatible)',
  'SaaS Federation (not Lakeflow) (Serverless Compatible)',
  'Databricks One (Serverless Compatible)',
  'AI/BI Dashboards (Serverless Compatible)',
  'Databricks Apps (Serverless Compatible)',
  'Exploratory Analytics (Notebooks/SQL) (Serverless Compatible)',
  'Serverless Declarative Pipelines (Serverless Compatible)'
];

interface TechnicalRequirements {
  needsClassic: boolean;
  needsServerless: boolean;
  classicFeatures: string[];
  serverlessFeatures: string[];
}

const gatherTechnicalRequirements = (answers: any): TechnicalRequirements => {
  const allSelectedFeatures = [
    ...(answers['generative-ai-details'] || []),
    ...(answers['connectivity-details'] || []),
    ...(answers['business-user-details'] || []),
    ...(answers['analytics-engineering-details'] || [])
  ];

  const classicFeatures = allSelectedFeatures.filter(feature => 
    CLASSIC_REQUIRED_FEATURES.includes(feature)
  );
  
  const serverlessFeatures = allSelectedFeatures.filter(feature => 
    SERVERLESS_COMPATIBLE_FEATURES.includes(feature)
  );

  return {
    needsClassic: classicFeatures.length > 0,
    needsServerless: serverlessFeatures.length > 0,
    classicFeatures,
    serverlessFeatures
  };
};

export const getRecommendation = (answers: any): DeploymentRecommendation => {
  const customerType = answers['customer-type'];
  
  // Handle Azure/GCP Production
  if (customerType === 'Production on Azure/GCP') {
    return {
      id: 'azure-gcp-not-available',
      title: 'Azure/GCP Production Deployment',
      qualification: 'Not Yet',
      description: 'Full production deployment capabilities for Azure and GCP are coming soon.',
      actions: ['Join early access program', 'Get notified of availability'],
      timeline: 'ETA: H2 FY26 (Second half of fiscal year 2026)',
      benefits: [
        'Native cloud integration',
        'Enterprise-grade security',
        'Auto-scaling capabilities',
        'Multi-region deployment'
      ],
      nextSteps: [
        'Join our early access waitlist',
        'Schedule architecture consultation',
        'Consider interim trial setup',
        'Review integration requirements'
      ],
      isAvailable: false
    };
  }

  // Handle simple cases (New/Trial, Existing Sandbox)
  if (customerType === 'New Customer (Trial)' || customerType === 'Existing Customer (Sandbox)') {
    return {
      id: 'serverless-recommended',
      title: 'Serverless Workspace Recommended',
      qualification: 'Yes',
      description: 'Express setup with serverless workspace meets your needs perfectly.',
      actions: ['Sign up with Express', 'Create serverless workspace', 'Access sample datasets'],
      benefits: [
        'Get started in minutes',
        'No infrastructure setup required',
        'Built-in sample data and tutorials',
        'Scales automatically with usage',
        'Pay-per-use pricing model'
      ],
      nextSteps: [
        'Complete account creation',
        'Explore sample workflows',
        'Schedule onboarding call',
        'Invite team members'
      ],
      isAvailable: true
    };
  }

  // Handle AWS Complex Logic
  if (customerType === 'AWS Customer/Cloud Migration') {
    // Check AWS Marketplace requirement first
    if (answers['aws-billing'] === 'Must use AWS Marketplace') {
      return {
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
    }

    // Analyze technical requirements for direct billing customers
    const requirements = gatherTechnicalRequirements(answers);
    
    if (requirements.needsClassic && requirements.needsServerless) {
      return {
        id: 'hybrid-approach',
        title: 'Both Workspace Types Needed',
        qualification: 'Maybe',
        description: 'Start with Express for immediate needs, then add classic workspace for advanced features.',
        actions: ['Start with Express setup', 'Plan classic workspace deployment', 'Migrate advanced workloads'],
        benefits: [
          'Quick initial deployment',
          'Full feature compatibility',
          'Flexible migration path',
          'Cost optimization opportunities',
          'Best of both architectures'
        ],
        nextSteps: [
          'Begin with Express setup',
          'Test serverless-compatible workloads',
          'Schedule classic workspace planning',
          'Design migration strategy'
        ],
        isAvailable: true
      };
    } else if (requirements.needsClassic) {
      return {
        id: 'classic-workspace',
        title: 'Classic Workspace Required',
        qualification: 'Maybe',
        description: 'Your requirements need cloud assets deployed in your environment.',
        actions: ['Deploy classic workspace', 'Configure cloud resources', 'Set up connectivity'],
        benefits: [
          'Full feature compatibility',
          'Custom infrastructure control',
          'Advanced networking options',
          'Legacy workload support',
          'Enterprise-grade isolation'
        ],
        nextSteps: [
          'Plan classic workspace architecture',
          'Configure cloud resources',
          'Set up required connectivity',
          'Migrate existing workloads'
        ],
        isAvailable: true
      };
    } else {
      return {
        id: 'serverless-workspace',
        title: 'Serverless Workspace Recommended',
        qualification: 'Yes',
        description: 'Express setup with serverless workspace meets all your technical requirements.',
        actions: ['Express setup', 'Serverless workspace', 'Configure integrations'],
        benefits: [
          'Pay-per-use pricing',
          'Auto-scaling resources',
          'Reduced operational overhead',
          'Quick time to value',
          'Serverless architecture benefits'
        ],
        nextSteps: [
          'Complete Express setup',
          'Configure serverless environment',
          'Import existing data sources',
          'Set up monitoring and governance'
        ],
        isAvailable: true
      };
    }
  }

  // Fallback recommendation
  return {
    id: 'consultation-required',
    title: 'Custom Consultation Required',
    qualification: 'Maybe',
    description: 'Let\'s discuss your specific needs to find the best deployment approach.',
    actions: ['Schedule consultation', 'Technical requirements review', 'Custom solution design'],
    benefits: [
      'Personalized approach',
      'Expert technical guidance',
      'Custom solution architecture',
      'Risk assessment and mitigation',
      'Tailored deployment strategy'
    ],
    nextSteps: [
      'Book consultation call',
      'Prepare requirements document',
      'Technical architecture review',
      'Develop custom deployment plan'
    ],
    isAvailable: true
  };
};

// Dashboard sample data
export interface DashboardMetric {
  id: string;
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

export const dashboardMetrics: DashboardMetric[] = [
  {
    id: 'feedback_items',
    title: 'Feedback Items',
    value: 1247,
    change: '+12%',
    trend: 'up',
    icon: 'MessageSquare',
  },
  {
    id: 'active_projects',
    title: 'Active Projects',
    value: 8,
    change: '+2',
    trend: 'up',
    icon: 'FolderOpen',
  },
  {
    id: 'completion_rate',
    title: 'Completion Rate',
    value: '92%',
    change: '+5%',
    trend: 'up',
    icon: 'TrendingUp',
  },
  {
    id: 'team_members',
    title: 'Team Members',
    value: 12,
    trend: 'neutral',
    icon: 'Users',
  },
];

export interface RecentActivity {
  id: string;
  type: 'feedback' | 'project' | 'release';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

export const recentActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'feedback',
    title: 'New feedback from customer portal',
    description: 'User reported login issues on mobile app',
    timestamp: '2 minutes ago',
    user: 'Sarah Chen',
  },
  {
    id: '2',
    type: 'project',
    title: 'Mobile redesign project updated',
    description: 'Design system components completed',
    timestamp: '1 hour ago',
    user: 'Mike Johnson',
  },
  {
    id: '3',
    type: 'release',
    title: 'Version 2.1.4 released',
    description: 'Bug fixes and performance improvements',
    timestamp: '3 hours ago',
    user: 'Alex Kim',
  },
  {
    id: '4',
    type: 'feedback',
    title: 'Feature request from sales team',
    description: 'Bulk export functionality for reports',
    timestamp: '5 hours ago',
    user: 'Emma Davis',
  },
  {
    id: '5',
    type: 'project',
    title: 'API documentation updated',
    description: 'Added new endpoint documentation',
    timestamp: '1 day ago',
    user: 'David Wilson',
  },
];

// Tour Session Sample Data for Dashboard
import { TourSession } from '@/types/api';

export const sampleTourSessions: TourSession[] = [
  {
    id: 'tour-001',
    user_id: 'user-123',
    tree_id: 'tree-default',
    tree_name: 'Databricks Workspace Setup',
    status: 'completed',
    date_started: '2024-01-15T09:30:00Z',
    date_completed: '2024-01-15T10:45:00Z',
    current_step: 'recommendation',
    answers: {
      'customer-type': 'New Customer (Trial)',
      'use-case-category': 'Generative AI & Machine Learning',
      'team_size': '2-5 people',
      'product_type': 'Web Application'
    },
    recommendation: {
      id: 'serverless-recommended',
      title: 'Serverless Workspace Recommended'
    },
    progress_percentage: 100
  },
  {
    id: 'tour-002',
    user_id: 'user-123',
    tree_id: 'tree-default',
    tree_name: 'Databricks Workspace Setup',
    status: 'in_progress',
    date_started: '2024-01-20T14:15:00Z',
    current_step: 'team_setup',
    answers: {
      'customer-type': 'AWS Customer/Cloud Migration',
      'aws-billing': 'Direct billing acceptable',
      'use-case-category': 'Data Analytics & Engineering'
    },
    progress_percentage: 65
  },
  {
    id: 'tour-003',
    user_id: 'user-123',
    tree_id: 'tree-default',
    tree_name: 'Databricks Workspace Setup',
    status: 'completed',
    date_started: '2024-01-10T11:20:00Z',
    date_completed: '2024-01-10T12:10:00Z',
    current_step: 'recommendation',
    answers: {
      'customer-type': 'Existing Customer (Sandbox)',
      'use-case-category': 'Business User Enablement',
      'team_size': '6-15 people'
    },
    recommendation: {
      id: 'serverless-recommended',
      title: 'Serverless Workspace Recommended'
    },
    progress_percentage: 100
  },
  {
    id: 'tour-004',
    user_id: 'user-123',
    tree_id: 'tree-default',
    tree_name: 'Databricks Workspace Setup',
    status: 'abandoned',
    date_started: '2024-01-08T16:45:00Z',
    current_step: 'use-case-category',
    answers: {
      'customer-type': 'Production on Azure/GCP'
    },
    progress_percentage: 25
  },
  {
    id: 'tour-005',
    user_id: 'user-123',
    tree_id: 'tree-default',
    tree_name: 'Databricks Workspace Setup',
    status: 'completed',
    date_started: '2024-01-05T08:00:00Z',
    date_completed: '2024-01-05T09:30:00Z',
    current_step: 'recommendation',
    answers: {
      'customer-type': 'AWS Customer/Cloud Migration',
      'aws-billing': 'Must use AWS Marketplace',
      'use-case-category': 'Connectivity Requirements'
    },
    recommendation: {
      id: 'aws-marketplace',
      title: 'Express Setup + Buy with AWS'
    },
    progress_percentage: 100
  }
];
