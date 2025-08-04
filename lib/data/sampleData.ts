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
}

export const guidedTourSteps: FormStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Setup',
    description: 'Let\'s get to know your needs and preferences to customize your experience.',
    questions: [
      {
        id: 'role',
        type: 'select',
        title: 'What\'s your primary role?',
        description: 'This helps us tailor the experience for you.',
        options: ['Product Manager', 'Engineer', 'Designer', 'Executive', 'Other'],
        required: true,
      },
      {
        id: 'company_size',
        type: 'select',
        title: 'What\'s your company size?',
        options: ['1-10 employees', '11-50 employees', '51-200 employees', '201-1000 employees', '1000+ employees'],
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
];

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
