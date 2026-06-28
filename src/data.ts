import { UserProfile, Project, WorkflowRule, ProjectTemplate } from './types';

export const TEAM_MEMBERS: UserProfile[] = [
  {
    id: 'user_sarah',
    name: 'Sarah Chen',
    role: 'Product Manager',
    email: 'sarah.chen@asana.io',
    avatarColor: 'bg-indigo-600 text-white border-indigo-700',
    avatarText: 'SC',
    isOwner: true,
    password: 'password123'
  },
  {
    id: 'user_alex',
    name: 'Alex Rivera',
    role: 'Frontend Developer',
    email: 'alex.rivera@asana.io',
    avatarColor: 'bg-sky-500 text-white border-sky-600',
    avatarText: 'AR',
    isOwner: false,
    password: 'password123'
  },
  {
    id: 'user_david',
    name: 'David Kumar',
    role: 'Backend Engineer',
    email: 'david.kumar@asana.io',
    avatarColor: 'bg-emerald-500 text-white border-emerald-600',
    avatarText: 'DK',
    isOwner: false,
    password: 'password123'
  },
  {
    id: 'user_elena',
    name: 'Elena Petrova',
    role: 'UI/UX Designer',
    email: 'elena.petrova@asana.io',
    avatarColor: 'bg-pink-500 text-white border-pink-600',
    avatarText: 'EP',
    isOwner: false,
    password: 'password123'
  },
  {
    id: 'user_marcus',
    name: 'Marcus Vance',
    role: 'QA Engineer',
    email: 'marcus.vance@asana.io',
    avatarColor: 'bg-amber-500 text-white border-amber-600',
    avatarText: 'MV',
    isOwner: false,
    password: 'password123'
  }
];

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj_titan',
    name: 'Titan Platform Launch',
    description: 'Developing and deploying our flagship scalable SaaS cloud work suite.',
    color: 'from-indigo-500 to-purple-600',
    memberRoles: {
      'user_sarah': 'Admin',
      'user_alex': 'Member',
      'user_david': 'Member',
      'user_elena': 'Guest',
      'user_marcus': 'Member'
    }
  },
  {
    id: 'proj_pulse',
    name: 'Pulse Analytics Dashboard',
    description: 'Redesigning the central operations dashboard for customer telemetry and reports.',
    color: 'from-emerald-400 to-teal-600',
    memberRoles: {
      'user_sarah': 'Member',
      'user_alex': 'Admin',
      'user_david': 'Member',
      'user_elena': 'Member',
      'user_marcus': 'Guest'
    }
  }
];

export const DEFAULT_RULES: WorkflowRule[] = [
  {
    id: 'rule_high_priority_escalate',
    name: 'Escalate High Priority Tasks',
    active: true,
    triggerType: 'priority_change',
    triggerValue: 'high',
    actionType: 'set_due_date_days',
    actionValue: '2' // Sets the deadline to 2 days from today
  },
  {
    id: 'rule_review_assign_qa',
    name: 'QA Handoff on Review status',
    active: true,
    triggerType: 'status_change',
    triggerValue: 'review',
    actionType: 'reassign',
    actionValue: 'user_marcus' // Reassign to Marcus Vance
  },
  {
    id: 'rule_done_celebrate',
    name: 'Done status celebration comment',
    active: true,
    triggerType: 'status_change',
    triggerValue: 'done',
    actionType: 'post_comment',
    actionValue: '🎉 Fantastic! This task has been completely resolved. Great team effort! 🚀'
  }
];

export const PRESET_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl_launch',
    name: 'Product Launch Speedrun',
    description: 'Structured blueprint for defining, designing, building, and deploying professional applications.',
    color: 'from-indigo-500 to-purple-600',
    tasks: [
      {
        id: 'task_t_1',
        title: 'Perform Market Fit & Draft Spec',
        description: 'Detail key functional and visual boundaries based on primary target research.',
        status: 'todo',
        priority: 'high',
        dayOffset: 1,
        assigneeId: 'user_sarah',
        tags: ['Product', 'Spec'],
        checklist: [
          { text: 'Analyze market competitors', completed: false },
          { text: 'Draft specification document', completed: false }
        ],
        dependencies: []
      },
      {
        id: 'task_t_2',
        title: 'Design High-Fi Figma Prototypes',
        description: 'Provide pristine vector layout, color scales, and typography pairs to guide development.',
        status: 'todo',
        priority: 'medium',
        dayOffset: 3,
        assigneeId: 'user_elena',
        tags: ['Design', 'UI'],
        checklist: [
          { text: 'Establish color palette', completed: false },
          { text: 'Verify touch target sizes', completed: false }
        ],
        dependencies: ['task_t_1']
      },
      {
        id: 'task_t_3',
        title: 'Develop Backend Architecture & Schemas',
        description: 'Design fully secured and modular database structures with server controllers.',
        status: 'todo',
        priority: 'high',
        dayOffset: 5,
        assigneeId: 'user_david',
        tags: ['Backend', 'Database'],
        checklist: [
          { text: 'Initialize entity models', completed: false },
          { text: 'Write secure query boundaries', completed: false }
        ],
        dependencies: ['task_t_1']
      },
      {
        id: 'task_t_4',
        title: 'Frontend Component Integration',
        description: 'Code the responsive view matching high-fidelity details. Hook up real-time handlers.',
        status: 'todo',
        priority: 'medium',
        dayOffset: 7,
        assigneeId: 'user_alex',
        tags: ['Frontend', 'Vite'],
        checklist: [
          { text: 'Build responsive layouts', completed: false },
          { text: 'Hook state store selectors', completed: false }
        ],
        dependencies: ['task_t_2', 'task_t_3']
      },
      {
        id: 'task_t_5',
        title: 'Conduct Final Regression and QA Sweep',
        description: 'Run exhaustive regression loops, lint checks, and latency checks.',
        status: 'todo',
        priority: 'high',
        dayOffset: 10,
        assigneeId: 'user_marcus',
        tags: ['QA', 'Testing'],
        checklist: [
          { text: 'Audit production accessibility targets', completed: false },
          { text: 'Execute unit testing coverage', completed: false }
        ],
        dependencies: ['task_t_4']
      }
    ]
  },
  {
    id: 'tpl_marketing',
    name: 'Growth Marketing Campaign',
    description: 'Exhaustive pipeline for defining audience, generating campaign copy, designing ad sets, and measuring throughput.',
    color: 'from-emerald-400 to-teal-600',
    tasks: [
      {
        id: 'task_m_1',
        title: 'Define Channels & Budget Metrics',
        description: 'Set core analytics conversions, channel bids, and budget caps.',
        status: 'todo',
        priority: 'high',
        dayOffset: 1,
        assigneeId: 'user_sarah',
        tags: ['Strategy', 'Budget'],
        checklist: [
          { text: 'Map channel ROI metrics', completed: false },
          { text: 'Approve maximum CPC targets', completed: false }
        ],
        dependencies: []
      },
      {
        id: 'task_m_2',
        title: 'Draft Campaign Copy & Ad Scripts',
        description: 'Detail copy blocks, primary headings, conversion action text, and hooks.',
        status: 'todo',
        priority: 'medium',
        dayOffset: 3,
        assigneeId: 'user_sarah',
        tags: ['Copywriting'],
        checklist: [
          { text: 'Draft high-intent headings', completed: false },
          { text: 'Review copy with products', completed: false }
        ],
        dependencies: ['task_m_1']
      },
      {
        id: 'task_m_3',
        title: 'Design Banner Ads & Visual Assets',
        description: 'Generate vectors and rich high-fidelity graphics styled with campaign branding.',
        status: 'todo',
        priority: 'medium',
        dayOffset: 4,
        assigneeId: 'user_elena',
        tags: ['Design', 'Assets'],
        checklist: [
          { text: 'Export assets in clean svg/png', completed: false }
        ],
        dependencies: ['task_m_1']
      },
      {
        id: 'task_m_4',
        title: 'Build Promotional Landing Page',
        description: 'Optimize interactive subscription flow with fast load speeds and minimal network overhead.',
        status: 'todo',
        priority: 'medium',
        dayOffset: 6,
        assigneeId: 'user_alex',
        tags: ['Front-End'],
        checklist: [
          { text: 'Build modular signup interfaces', completed: false },
          { text: 'Audit responsive layout flow', completed: false }
        ],
        dependencies: ['task_m_2', 'task_m_3']
      },
      {
        id: 'task_m_5',
        title: 'Execute Ad Sets Launch',
        description: 'Launch scheduled campaigns with real-time conversion monitoring analytics.',
        status: 'todo',
        priority: 'high',
        dayOffset: 8,
        assigneeId: 'user_david',
        tags: ['Launch', 'Marketing'],
        checklist: [
          { text: 'Hook live conversion telemetry', completed: false }
        ],
        dependencies: ['task_m_4']
      }
    ]
  }
];

