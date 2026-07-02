/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Task, 
  Project, 
  WorkflowRule, 
  ActivityLog, 
  Message, 
  UserProfile, 
  TaskStatus, 
  TaskPriority,
  ProjectTemplate
} from './types';
import { 
  seedDatabaseIfEmpty, 
  subToTasks, 
  subToProjects, 
  subToWorkflowRules, 
  subToActivityLogs, 
  subToMessages, 
  subToPresence, 
  createTask, 
  updateTask, 
  deleteTask, 
  createProject, 
  updateProject,
  createWorkflowRule, 
  toggleWorkflowRule, 
  postChannelMessage,
  startUserPresenceHeartbeat,
  stopUserPresenceHeartbeat,
  subToProjectTemplates,
  saveProjectAsTemplate,
  createProjectFromTemplate,
  subToUsers,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile
} from './lib/services';
import { TEAM_MEMBERS, PRESET_TEMPLATES } from './data';
import { getProjectRole } from './lib/permissions';
import DashboardOverview from './components/DashboardOverview';
import TaskBoard from './components/TaskBoard';
import TaskList from './components/TaskList';
import SystemSettings from './components/SystemSettings';
import TaskCalendar from './components/TaskCalendar';
import TaskTimeline from './components/TaskTimeline';
import WorkflowAutomation from './components/WorkflowAutomation';
import TeamMessaging from './components/TeamMessaging';
import TaskDetailsModal from './components/TaskDetailsModal';
import LoginScreen from './components/LoginScreen';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  ListTodo, 
  CalendarDays, 
  GanttChart, 
  SlidersHorizontal, 
  MessageSquareCode, 
  ChevronDown, 
  User, 
  Plus, 
  X, 
  CheckCircle2, 
  PlusCircle, 
  Flame,
  Save,
  AlertCircle,
  Layers,
  Users,
  Lock,
  LogIn,
  Search,
  Settings,
  Bell
} from 'lucide-react';

export default function App() {
  // Live states synced with Firestore
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'list' | 'calendar' | 'timeline' | 'workflows' | 'chat' | 'team'>('dashboard');
  const [activeProject, setActiveProject] = useState<string>('all');
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-user Profile context
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const savedAuth = typeof window !== 'undefined' ? localStorage.getItem('as_authenticated_user') : null;
      if (savedAuth) {
        return JSON.parse(savedAuth);
      }
      const saved = typeof window !== 'undefined' ? localStorage.getItem('as_active_user') : null;
      if (saved) {
        const parsed = TEAM_MEMBERS.find(m => m.id === saved);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn('localStorage is blocked or unavailable:', e);
    }
    return TEAM_MEMBERS[0]; // defaults to Sarah Chen
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedAuth = localStorage.getItem('as_authenticated_user');
        if (savedAuth) return true;
      }
    } catch (e) {
      console.warn('localStorage is blocked or unavailable:', e);
    }
    return false;
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Inspector & task creation modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [addTaskDefaultStatus, setAddTaskDefaultStatus] = useState<TaskStatus>('todo');
  const [addTaskDefaultDate, setAddTaskDefaultDate] = useState<string>('');

  // Inline Project Creator state
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('from-indigo-500 to-purple-600');

  // Templates list states
  const [customTemplates, setCustomTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // States for "Save project as template" modal
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateDesc, setSaveTemplateDesc] = useState('');
  const [saveTemplateColor, setSaveTemplateColor] = useState('from-indigo-500 to-purple-600');

  // Passcode verification for quick switcher swap
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserProfile | null>(null);
  const [switcherPasscodeInput, setSwitcherPasscodeInput] = useState('');
  const [switcherPasscodeError, setSwitcherPasscodeError] = useState('');

  const allTemplates = useMemo(() => {
    const combined = [...PRESET_TEMPLATES, ...customTemplates];
    const seen = new Set<string>();
    return combined.filter(tpl => {
      if (seen.has(tpl.id)) return false;
      seen.add(tpl.id);
      return true;
    });
  }, [customTemplates]);

  const urgentTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'done') return false;
      if (!t.dueDate) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      if (t.dueDate <= todayStr) return true;
      
      const parts = t.dueDate.split('-');
      if (parts.length !== 3) return false;
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const dy = parseInt(parts[2], 10);
      
      const dueTime = new Date(yr, mo, dy, 23, 59, 59).getTime();
      const nowTime = Date.now();
      const diffTime = dueTime - nowTime;
      return diffTime > 0 && diffTime <= 24 * 60 * 60 * 1000;
    });
  }, [tasks]);

  // Task creation Form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProjId, setNewTaskProjId] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(TEAM_MEMBERS[0].id);
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskStartDate, setNewTaskStartDate] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');
  const [newTaskDependencies, setNewTaskDependencies] = useState<string[]>([]);

  // Index DB seeding and initial sync
  useEffect(() => {
    const initializeDatabaseState = async () => {
      await seedDatabaseIfEmpty();
    };
    initializeDatabaseState();
  }, []);

  // Subscribe to live resources
  useEffect(() => {
    const unsubTasks = subToTasks(setTasks);
    const unsubProjects = subToProjects(setProjects);
    const unsubRules = subToWorkflowRules(setRules);
    const unsubLogs = subToActivityLogs(setLogs);
    const unsubPresence = subToPresence(setOnlineUsers);
    const unsubTemplates = subToProjectTemplates(setCustomTemplates);
    const unsubUsers = subToUsers(setUsers);

    return () => {
      unsubTasks();
      unsubProjects();
      unsubRules();
      unsubLogs();
      unsubPresence();
      unsubTemplates();
      unsubUsers();
    };
  }, []);

  // Sync messaging channel feeds
  useEffect(() => {
    const unsubMessages = subToMessages(activeChannel, setMessages);
    return () => unsubMessages();
  }, [activeChannel]);

  // Handle local user presence heartbeats
  useEffect(() => {
    startUserPresenceHeartbeat(currentUser.id);
    
    // Save locally safely
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('as_active_user', currentUser.id);
      }
    } catch (e) {
      console.warn('localStorage is blocked or unavailable:', e);
    }

    return () => {
      stopUserPresenceHeartbeat(currentUser.id);
    };
  }, [currentUser]);

  // Real-time align logged-in user profile with live db values
  useEffect(() => {
    if (users.length > 0) {
      const freshMe = users.find(u => u.id === currentUser.id);
      if (freshMe) {
        if (
          freshMe.name !== currentUser.name ||
          freshMe.role !== currentUser.role ||
          freshMe.email !== currentUser.email ||
          freshMe.avatarColor !== currentUser.avatarColor ||
          freshMe.isOwner !== currentUser.isOwner ||
          freshMe.password !== currentUser.password
        ) {
          setCurrentUser(freshMe);
        }
      } else {
        // If our profile was decommissioned/deleted by owner, default back to first available user
        const ownerUser = users.find(u => u.isOwner) || users[0];
        if (ownerUser) {
          setCurrentUser(ownerUser);
        }
      }
    }
  }, [users, currentUser]);

  // Set default project IDs in task allocator
  useEffect(() => {
    if (projects.length > 0 && !newTaskProjId) {
      setNewTaskProjId(projects[0].id);
    }
  }, [projects]);

  // Set default assignee in task allocator once dynamic users directory loads
  useEffect(() => {
    if (users.length > 0) {
      const match = users.find(u => u.id === currentUser.id) || users[0];
      if (match) {
        setNewTaskAssignee(match.id);
      }
    }
  }, [users, currentUser]);

  // Triggers when user clicks "New Task" button
  const handleOpenAddTask = (defaultStatus?: TaskStatus, defaultDate?: string) => {
    setAddTaskDefaultStatus(defaultStatus || 'todo');
    setAddTaskDefaultDate(defaultDate || '');
    setNewTaskDueDate(defaultDate || '');
    setNewTaskDependencies([]);
    setShowAddTaskModal(true);
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskProjId) return;

    try {
      const tagsArray = newTaskTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await createTask({
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        status: addTaskDefaultStatus,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || new Date().toISOString().split('T')[0],
        startDate: newTaskStartDate || null as any,
        assigneeId: newTaskAssignee,
        tags: tagsArray,
        checklist: [],
        projectId: newTaskProjId,
        dependencies: newTaskDependencies
      }, currentUser, rules);

      // Reset
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskTags('');
      setNewTaskDependencies([]);
      setShowAddTaskModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Create Project triggers
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      let createdProjId = '';
      if (selectedTemplateId) {
        const selectedTpl = allTemplates.find(t => t.id === selectedTemplateId);
        if (selectedTpl) {
          createdProjId = await createProjectFromTemplate(
            selectedTpl,
            newProjectName.trim(),
            newProjectDesc.trim(),
            newProjectColor,
            currentUser
          );
        }
      } else {
        const initialRoles: Record<string, any> = {};
        TEAM_MEMBERS.forEach(m => {
          initialRoles[m.id] = m.id === currentUser.id ? 'Admin' : 'Member';
        });

        const projId = 'proj_' + Math.floor(Math.random() * 100000);
        await createProject({
          name: newProjectName.trim(),
          description: newProjectDesc.trim(),
          color: newProjectColor,
          memberRoles: initialRoles
        });
        createdProjId = projId;
      }

      if (createdProjId) {
        setActiveProject(createdProjId);
      }
      setNewProjectName('');
      setNewProjectDesc('');
      setSelectedTemplateId(null);
      setShowAddProjectModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProjectAsTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProjectObj || !saveTemplateName.trim()) return;

    try {
      const projectTasks = tasks.filter(t => t.projectId === currentProjectObj.id);
      await saveProjectAsTemplate(
        currentProjectObj.id,
        currentProjectObj.name,
        saveTemplateName.trim(),
        saveTemplateDesc.trim(),
        saveTemplateColor,
        projectTasks,
        currentUser
      );
      setSaveTemplateName('');
      setSaveTemplateDesc('');
      setShowSaveTemplateModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileSwap = (profile: UserProfile) => {
    // Teardown previous presence heartbeat cleanly
    stopUserPresenceHeartbeat(currentUser.id);
    setCurrentUser(profile);
    setShowProfileMenu(false);
  };

  const initiateProfileSwap = (profile: UserProfile) => {
    if (profile.password) {
      setPasswordTargetUser(profile);
      setSwitcherPasscodeInput('');
      setSwitcherPasscodeError('');
      setShowProfileMenu(false);
    } else {
      handleProfileSwap(profile);
      setShowProfileMenu(false);
    }
  };

  const handleVerifySwitcherLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    if (switcherPasscodeInput.trim() === passwordTargetUser.password) {
      handleProfileSwap(passwordTargetUser);
      setPasswordTargetUser(null);
    } else {
      setSwitcherPasscodeError('Incorrect PIN or Passcode. Please try again.');
    }
  };

  const currentProjectObj = useMemo(() => {
    return projects.find(p => p.id === activeProject);
  }, [activeProject, projects]);

  const cannotCreateInActiveProject = useMemo(() => {
    if (activeProject === 'all') return false;
    const proj = projects.find(p => p.id === activeProject);
    return proj ? getProjectRole(proj, currentUser.id) === 'Guest' : false;
  }, [activeProject, projects, currentUser]);

  const searchedTasksFiltered = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('as_authenticated_user', JSON.stringify(user));
            localStorage.setItem('as_active_user', user.id);
          } catch (e) {
            console.warn(e);
          }
        }}
        availableUsers={users.length > 0 ? users : TEAM_MEMBERS}
      />
    );
  }

  return (
    <div id="application_viewport_root" className="min-h-screen bg-[#F9FAFB] flex flex-col md:flex-row antialiased font-sans text-slate-800">
      
      {/* LEFT NAVIGATION DRAWER / RAIL */}
      <aside className="w-full md:w-64 bg-white text-slate-600 flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-200">
        
        {/* Flagship header panel */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Iconic stylized logo */}
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <div className="w-3.5 h-3.5 bg-white rounded-sm" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">Fluresta Worksuite</h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Remote Operations</p>
            </div>
          </div>
          
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono">
            v1.2
          </span>
        </div>

        {/* Tab triggers list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2.5 mb-2 mt-1">View Navigation</p>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold leading-none duration-150 transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-indigo-50 text-indigo-700 shadow-xs' 
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard size={14} className={activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Workspace Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('board')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold leading-none duration-150 transition-all ${
              activeTab === 'board' 
                ? 'bg-indigo-50 text-indigo-700 shadow-xs' 
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
            }`}
          >
            <KanbanSquare size={14} className={activeTab === 'board' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Sprints Board</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold leading-none duration-150 transition-all ${
              activeTab === 'list' 
                ? 'bg-indigo-50 text-indigo-700 shadow-xs' 
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListTodo size={14} className={activeTab === 'list' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Structured Backlog</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold leading-none duration-150 transition-all ${
              activeTab === 'calendar' 
                ? 'bg-indigo-50 text-indigo-700 shadow-xs' 
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays size={14} className={activeTab === 'calendar' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Schedules Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold leading-none duration-150 transition-all ${
              activeTab === 'timeline' 
                ? 'bg-indigo-50 text-indigo-700 shadow-xs' 
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
            }`}
          >
            <GanttChart size={14} className={activeTab === 'timeline' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Timeline Planner</span>
          </button>

          <button
            onClick={() => setActiveTab('workflows')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold leading-none duration-150 transition-all ${
              activeTab === 'workflows' 
                ? 'bg-indigo-50 text-indigo-700 shadow-xs' 
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal size={14} className={activeTab === 'workflows' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Automations Workflow</span>
          </button>

           <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold leading-none duration-150 transition-all ${
              activeTab === 'chat' 
                ? 'bg-indigo-50 text-indigo-700 shadow-xs' 
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquareCode size={14} className={activeTab === 'chat' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Integrated Chat Channels</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold leading-none duration-150 transition-all ${
              activeTab === 'team' 
                ? 'bg-indigo-50 text-indigo-750 shadow-xs ring-1 ring-indigo-150' 
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings size={14} className={activeTab === 'team' ? 'text-indigo-600' : 'text-slate-400'} />
            <span className="flex items-center gap-1.5 w-full justify-between">
              <span>System Settings</span>
              {currentUser.isOwner && (
                <span className="text-[8px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-full scale-90">Owner</span>
              )}
            </span>
          </button>

          {/* Associated Projects Section block */}
          <div className="pt-6 space-y-2">
            <div className="flex items-center justify-between px-2.5 mb-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Projects</span>
              <button
                onClick={() => setShowAddProjectModal(true)}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="Assemble a project"
              >
                <PlusCircle size={13} />
              </button>
            </div>
            
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveProject('all')}
                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 truncate duration-150 ${
                  activeProject === 'all' 
                    ? 'bg-indigo-50 text-indigo-750' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>🌐</span>
                <span>All Projects</span>
              </button>

              {projects.map(proj => (
                <button
                  key={proj.id}
                  onClick={() => setActiveProject(proj.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 truncate duration-150 ${
                    activeProject === proj.id 
                      ? 'bg-indigo-50 text-indigo-750' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  title={proj.description}
                >
                  <span className={`w-2 h-2 rounded-full ${activeProject === proj.id ? 'bg-indigo-600' : 'bg-slate-400'}`} />
                  <span className="truncate">{proj.name}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Local Profile Active monitor panel */}
        <div className="p-4 border-t border-slate-150 bg-slate-50/50 relative">
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center justify-between gap-2.5 cursor-pointer bg-white hover:bg-slate-50 duration-150 px-3 py-2 rounded-xl border border-slate-200 shadow-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs ${currentUser.avatarColor}`}>
                {currentUser.avatarText}
              </div>
              <div className="truncate min-w-0">
                <p className="text-[11px] font-bold text-slate-700 leading-none truncate">{currentUser.name}</p>
                <span className="text-[9px] text-slate-400 leading-none truncate">{currentUser.role}</span>
              </div>
            </div>
            <ChevronDown size={12} className="text-slate-400 shrink-0" />
          </div>

          {/* Profile Switcher lists drop menu */}
          {showProfileMenu && (
            <div className="absolute bottom-16 left-4 right-4 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 space-y-1 animate-slide-up text-slate-800">
              <p className="text-[9px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider border-b border-slate-100">
                Switch Cooperating Identity
              </p>
              {(users.length > 0 ? users : TEAM_MEMBERS).map(member => (
                <button
                  key={member.id}
                  onClick={() => initiateProfileSwap(member)}
                  className={`w-full text-left px-2 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 duration-150 ${
                    member.id === currentUser.id 
                      ? 'bg-slate-100 text-indigo-700' 
                      : 'hover:bg-slate-50 text-slate-650'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${member.avatarColor}`}>
                      {member.avatarText}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-slate-800 leading-none truncate">{member.name}</p>
                      <span className="text-[9px] text-slate-400 truncate block">{member.role}</span>
                    </div>
                  </div>
                  {member.password && (
                    <Lock size={10} className="text-amber-500 shrink-0" title="PIN Required" />
                  )}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1.5 pt-1.5">
                <button
                  onClick={() => {
                    stopUserPresenceHeartbeat(currentUser.id);
                    setIsAuthenticated(false);
                    try {
                      localStorage.removeItem('as_authenticated_user');
                      localStorage.removeItem('as_active_user');
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 duration-150"
                >
                  <LogIn size={11} className="rotate-180 text-rose-500 shrink-0" />
                  <span>Log Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </aside>

      {/* RIGHT DISPLAY WORKPLACE BODY */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Navigation context bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <span>Workspace Portal</span>
              <span>/</span>
              <span className="font-bold text-slate-700 uppercase tracking-wide">
                {activeProject === 'all' ? 'All Joint Backlogs' : currentProjectObj?.name}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1 uppercase flex items-center gap-2">
              <span>{activeTab === 'team' ? 'SYSTEM SETTINGS' : `${activeTab.toUpperCase()} View`}</span>
              <span className="text-xs lowercase text-slate-400 font-medium tracking-normal">
                {activeProject !== 'all' && currentProjectObj?.description}
              </span>
            </h2>
          </div>

          {/* SEARCH BAR CONTAINER */}
          <div id="workspace_header_search_container" className="flex-1 max-w-sm xl:max-w-md mx-0 md:mx-4 relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} className="stroke-[2.5]" />
            </div>
            <input
              id="workspace_header_search_input"
              type="text"
              placeholder="Search workspace (title, details, tags...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-150 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650"
              >
                <X size={13} className="stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Task creation button context */}
          <div className="flex items-center gap-2">
            {/* Urgent Alerts Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl border transition-all duration-150 relative cursor-pointer ${
                  showNotifications
                    ? 'bg-indigo-50 border-indigo-250 text-indigo-600 shadow-inner'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                }`}
                title="Urgent Alerts"
              >
                <Bell size={15} className={urgentTasks.length > 0 ? "animate-bounce text-amber-500" : ""} />
                {urgentTasks.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-[8px] h-4 w-4 rounded-full flex items-center justify-center border-2 border-white">
                    {urgentTasks.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-45 p-4 space-y-3 text-slate-850 animate-slide-up text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Bell size={14} className="text-indigo-600 shrink-0" />
                      <span className="font-extrabold text-xs uppercase tracking-wider">Urgent Alerts</span>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-850 font-bold px-2 py-0.5 rounded-full font-mono">
                      {urgentTasks.length} pending
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
                    {urgentTasks.length === 0 ? (
                      <div className="py-6 text-center text-slate-400">
                        <p className="text-xs italic font-medium">All quiet! No tasks due soon.</p>
                        <p className="text-[10px] text-slate-350 mt-1">Excellent timeline management!</p>
                      </div>
                    ) : (
                      urgentTasks.map(t => {
                        const proj = projects.find(p => p.id === t.projectId);
                        const isOverdue = t.dueDate < new Date().toISOString().split('T')[0];
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setSelectedTask(t);
                              setShowNotifications(false);
                            }}
                            className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-150 cursor-pointer duration-150 transition-all flex flex-col gap-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                                isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-705'
                              }`}>
                                {isOverdue ? 'OVERDUE' : 'DUE SOON'}
                              </span>
                              {proj && (
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                  {proj.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                              {t.title}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium font-mono mt-0.5">
                              <span className="flex items-center gap-0.5">
                                📅 {t.dueDate}
                              </span>
                              <span className={`font-bold uppercase ${
                                t.priority === 'high' ? 'text-rose-600' :
                                t.priority === 'medium' ? 'text-amber-600' :
                                'text-slate-500'
                              }`}>
                                {t.priority}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {urgentTasks.length > 0 && (
                    <p className="text-[9px] text-slate-400 italic text-center pt-1 border-t border-slate-100">
                      💡 Click on alert card to view details & act
                    </p>
                  )}
                </div>
              )}
            </div>

            {activeProject !== 'all' && currentProjectObj && getProjectRole(currentProjectObj, currentUser.id) !== 'Guest' && (
              <button
                onClick={() => {
                  setSaveTemplateName(currentProjectObj ? `${currentProjectObj.name} Template` : '');
                  setSaveTemplateDesc(currentProjectObj?.description || '');
                  setSaveTemplateColor(currentProjectObj?.color || 'from-indigo-500 to-purple-600');
                  setShowSaveTemplateModal(true);
                }}
                className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100 font-bold rounded-xl text-xs flex items-center gap-1.5 duration-150 transition-all shadow-xs"
              >
                <Save size={13} className="text-emerald-600 shrink-0" />
                <span>Save Project as Template</span>
              </button>
            )}

            <button
              onClick={() => {
                if (cannotCreateInActiveProject) return;
                handleOpenAddTask();
              }}
              disabled={cannotCreateInActiveProject}
              className={`px-4 py-2 border transition-all duration-150 shadow-sm flex items-center gap-1.5 rounded-xl text-xs font-bold ${
                cannotCreateInActiveProject
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 border-indigo-750 hover:bg-indigo-700 text-white'
              }`}
            >
              {cannotCreateInActiveProject ? (
                <>
                  <Lock size={12} className="text-slate-400" />
                  <span>View Only (Guest)</span>
                </>
              ) : (
                <>
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>Create Task</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Tab content container */}
        <section className="flex-1 p-6">
          
          {activeTab === 'dashboard' && (
            <DashboardOverview
              tasks={searchedTasksFiltered}
              projects={projects}
              activeProject={activeProject}
              logs={logs}
              onlineUsers={onlineUsers}
              onSelectProject={setActiveProject}
              onOpenTaskDetails={setSelectedTask}
              currentUser={currentUser}
              onUpdateProject={updateProject}
              users={users}
            />
          )}

          {activeTab === 'board' && (
            <TaskBoard
              tasks={tasks}
              projects={projects}
              activeProject={activeProject}
              onOpenTaskDetails={setSelectedTask}
              onAddTaskClick={(status) => handleOpenAddTask(status)}
              onMoveTask={async (task, newStatus) => {
                await updateTask(task, { status: newStatus }, currentUser, rules);
              }}
              onReorderTask={async (task, updates) => {
                await updateTask(task, updates, currentUser, rules);
              }}
              currentUser={currentUser}
              users={users}
            />
          )}

          {activeTab === 'list' && (
            <TaskList
              tasks={tasks}
              projects={projects}
              activeProject={activeProject}
              onOpenTaskDetails={setSelectedTask}
              onAddTaskClick={(status) => handleOpenAddTask(status)}
              onUpdateStatus={async (task, newStatus) => {
                await updateTask(task, { status: newStatus }, currentUser, rules);
              }}
              onReorderTask={async (task, updates) => {
                await updateTask(task, updates, currentUser, rules);
              }}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              currentUser={currentUser}
              users={users}
            />
          )}

          {activeTab === 'calendar' && (
            <TaskCalendar
              tasks={tasks}
              projects={projects}
              activeProject={activeProject}
              onOpenTaskDetails={setSelectedTask}
              onAddTaskClick={(date) => handleOpenAddTask('todo', date)}
            />
          )}

          {activeTab === 'timeline' && (
            <TaskTimeline
              tasks={tasks}
              projects={projects}
              activeProject={activeProject}
              onOpenTaskDetails={setSelectedTask}
              users={users}
            />
          )}

          {activeTab === 'workflows' && (
            <WorkflowAutomation
              rules={rules}
              onCreateRule={async (rule) => {
                await createWorkflowRule(rule);
              }}
              onToggleRule={async (rule) => {
                await toggleWorkflowRule(rule);
              }}
              currentUser={currentUser}
              users={users}
            />
          )}

          {activeTab === 'chat' && (
            <TeamMessaging
              messages={messages}
              activeChannel={activeChannel}
              onSelectChannel={setActiveChannel}
              onSendMessage={async (chanId, text) => {
                await postChannelMessage(chanId, text, currentUser);
              }}
              currentUser={currentUser}
              onlineUsers={onlineUsers}
              users={users}
            />
          )}

          {activeTab === 'team' && (
            <SystemSettings
              users={users.length > 0 ? users : TEAM_MEMBERS}
              currentUser={currentUser}
              onlineUsers={onlineUsers}
              onCreateMember={async (profile) => {
                await createUserProfile(profile, currentUser);
              }}
              onUpdateMember={async (id, updates) => {
                await updateUserProfile(id, updates, currentUser);
              }}
              onDeleteMember={async (id, name) => {
                await deleteUserProfile(id, currentUser, name);
              }}
              onLoginAsUser={(profile) => {
                handleProfileSwap(profile);
              }}
            />
          )}

        </section>

      </main>

      {/* TASK DETAILS INSPECTOR DRAW MODAL */}
      {selectedTask && (() => {
        const freshSelectedTask = tasks.find(t => t.id === selectedTask.id) || selectedTask;
        return (
          <TaskDetailsModal
            task={freshSelectedTask}
            tasks={tasks}
            projects={projects}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={async (taskItem, updates) => {
              // Locate freshness
              const freshTask = tasks.find(t => t.id === taskItem.id);
              if (freshTask) {
                await updateTask(freshTask, updates, currentUser, rules);
              }
            }}
            onDeleteTask={async (taskItem) => {
              await deleteTask(taskItem, currentUser);
              setSelectedTask(null);
            }}
            currentUser={currentUser}
            users={users}
          />
        );
      })()}

      {/* CREATE TASK DIALOG POPUP MODAL */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="text-indigo-600" size={18} />
                <span>Allocate Work Task</span>
              </h3>
              <button 
                onClick={() => setShowAddTaskModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
              
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Task Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design applet navigation panel"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-505 transition-all font-medium"
                />
              </div>

              {/* Context */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Description & Steps</label>
                <textarea
                  placeholder="Outline key targets..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 h-16 resize-none focus:outline-none focus:border-indigo-505 transition-all font-medium"
                />
              </div>

              {/* Grid selectors */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Project Alignment */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Project Alignment</label>
                  <select
                    value={newTaskProjId}
                    onChange={(e) => {
                      setNewTaskProjId(e.target.value);
                      setNewTaskDependencies([]);
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                  >
                    {projects.filter(p => getProjectRole(p, currentUser.id) !== 'Guest').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Team Assignee */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                  >
                    {(users.length > 0 ? users : TEAM_MEMBERS).map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Priority Level</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Due Date picker */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-xl text-xs text-slate-700 focus:outline-none font-mono"
                  />
                </div>

              </div>

              {/* Task Dependencies */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Task Dependencies (Blocks This Task)
                </label>
                {tasks.filter(t => t.projectId === newTaskProjId).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl p-2">
                    No other tasks exist in this project yet.
                  </p>
                ) : (
                  <div className="border border-slate-300 rounded-xl max-h-32 overflow-y-auto p-1.5 bg-slate-50/50 space-y-1 scrollbar-thin">
                    {tasks
                      .filter(t => t.projectId === newTaskProjId)
                      .map(t => {
                        const isChecked = newTaskDependencies.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className={`flex items-start gap-2 p-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-indigo-50/70 border border-indigo-150/30 text-indigo-900'
                                : 'hover:bg-white text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTaskDependencies([...newTaskDependencies, t.id]);
                                } else {
                                  setNewTaskDependencies(newTaskDependencies.filter(id => id !== t.id));
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold truncate">{t.title}</div>
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">
                                <span className={`px-1 rounded-xs text-[8px] font-black ${
                                  t.priority === 'high' ? 'bg-rose-50 text-rose-700' :
                                  t.priority === 'medium' ? 'bg-amber-50 text-amber-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {t.priority}
                                </span>
                                <span>•</span>
                                <span>{t.status.replace('_', ' ')}</span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Tags inline list */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Classification Tags (comma-spaced)</label>
                <input
                  type="text"
                  placeholder="e.g. core-api, mobile-optimized, branding"
                  value={newTaskTags}
                  onChange={(e) => setNewTaskTags(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim() || !newTaskProjId}
                  className="w-full py-2 bg-indigo-600 border border-indigo-750 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  Confirm Allocations ✓
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Draft Alignment Project</h3>
              <button 
                onClick={() => {
                  setShowAddProjectModal(false);
                  setSelectedTemplateId(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
              {/* Optional Project Template selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Initialize From Template</label>
                <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(null);
                      setNewProjectName('');
                      setNewProjectDesc('');
                    }}
                    className={`text-left p-2 rounded-lg text-xs duration-100 flex flex-col transition-all ${
                      selectedTemplateId === null
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200/50'
                        : 'hover:bg-white/55 text-slate-600'
                    }`}
                  >
                    <span className="font-bold text-slate-705">Blank Slate</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">Start with a completely empty roadmap list.</span>
                  </button>

                  {allTemplates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setNewProjectName(tpl.name);
                        setNewProjectDesc(tpl.description);
                        setNewProjectColor(tpl.color);
                      }}
                      className={`text-left p-2 rounded-lg text-xs duration-100 flex flex-col transition-all ${
                        selectedTemplateId === tpl.id
                          ? 'bg-white text-indigo-700 shadow-xs border border-indigo-250'
                          : 'hover:bg-white/55 text-slate-655'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-slate-805 truncate max-w-[180px]">{tpl.name}</span>
                        {tpl.isCustom ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-sm">CUSTOM</span>
                        ) : (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-sm font-mono">PRESET</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 leading-normal">{tpl.description}</span>
                      <span className="text-[9px] text-slate-400 mt-1 font-bold flex items-center gap-1 uppercase tracking-wider">
                        📂 Contains {tpl.tasks?.length || 0} relative tasks
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gemini AI Integration"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Description Goal</label>
                <textarea
                  placeholder="Outlines values..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 h-16 resize-none"
                />
              </div>

              {/* Color selectors */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Gradient Color Skin</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { style: 'from-indigo-500 to-purple-600', name: 'Indigo' },
                    { style: 'from-emerald-400 to-teal-600', name: 'Teal' },
                    { style: 'from-rose-500 to-pink-600', name: 'Pink' },
                    { style: 'from-amber-400 to-orange-500', name: 'Orange' }
                  ].map(colorOpt => (
                    <button
                      key={colorOpt.name}
                      type="button"
                      onClick={() => setNewProjectColor(colorOpt.style)}
                      className={`py-2 text-[10px] font-extrabold text-white rounded-lg bg-gradient-to-r ${colorOpt.style} ${
                        newProjectColor === colorOpt.style ? 'ring-2 ring-indigo-500 border border-white' : ''
                      }`}
                    >
                      {colorOpt.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="w-full py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-xl text-xs transition-all shadow-sm"
                >
                  {selectedTemplateId ? 'Create From Template ✓' : 'Create Project Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAVE PROJECT AS TEMPLATE MODAL */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                <Save size={16} className="text-emerald-500 shrink-0" />
                <span>Save Project as Template</span>
              </h3>
              <button 
                onClick={() => setShowSaveTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProjectAsTemplateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Product Launch Sprint"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Template Description</label>
                <textarea
                  placeholder="Short summary of this blueprint's focus..."
                  value={saveTemplateDesc}
                  onChange={(e) => setSaveTemplateDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 h-16 resize-none font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Template Brand Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { style: 'from-indigo-500 to-purple-600', name: 'Indigo' },
                    { style: 'from-emerald-400 to-teal-600', name: 'Teal' },
                    { style: 'from-rose-500 to-pink-600', name: 'Pink' },
                    { style: 'from-amber-400 to-orange-500', name: 'Orange' }
                  ].map(colorOpt => (
                    <button
                      key={colorOpt.name}
                      type="button"
                      onClick={() => setSaveTemplateColor(colorOpt.style)}
                      className={`py-2 text-[10px] font-extrabold text-white rounded-lg bg-gradient-to-r ${colorOpt.style} ${
                        saveTemplateColor === colorOpt.style ? 'ring-2 ring-indigo-500 border border-white' : ''
                      }`}
                    >
                      {colorOpt.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 leading-normal">
                <p className="flex items-start gap-1">
                  <span className="text-emerald-700 font-black shrink-0">✓</span>
                  <span><strong>Includes {tasks.filter(t => t.projectId === activeProject).length} tasks</strong> as templates, relative due date offsets, and mapped dependency links.</span>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!saveTemplateName.trim()}
                  className="w-full py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-xl text-xs transition-all shadow-sm"
                >
                  Save Template Blueprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSCODE ENTRY PROMPT FOR DRAWER QUICK SWAP */}
      {passwordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-scale-in text-center">
            <div className="space-y-2 text-slate-850">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Lock size={20} />
              </div>
              <h3 className="text-base font-black text-slate-800">Passcode Required</h3>
              <p className="text-xs text-slate-500">
                The account profile for <span className="font-extrabold text-slate-700">{passwordTargetUser.name}</span> requires a passcode verification.
              </p>
            </div>

            <form onSubmit={handleVerifySwitcherLoginSubmit} className="space-y-4 text-xs">
              
              <div className="space-y-1 text-left">
                <label className="font-bold text-slate-600">Enter Security PIN / Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="••••••••"
                  value={switcherPasscodeInput}
                  onChange={(e) => setSwitcherPasscodeInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150 font-mono text-center tracking-widest text-lg text-slate-850 bg-white"
                />
                
                {switcherPasscodeError && (
                  <div className="flex items-center gap-1.5 p-2 px-3 bg-rose-50 text-rose-650 border border-rose-150 rounded-lg text-[10px] font-semibold mt-1.5">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{switcherPasscodeError}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordTargetUser(null)}
                  className="flex-1 px-4 py-2 hover:bg-slate-100 text-slate-505 rounded-xl font-bold border border-slate-250 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Verify & login
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

