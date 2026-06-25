import { useMemo } from 'react';
import { Task, Project, ActivityLog, UserProfile, ProjectRole } from '../types';
import { TEAM_MEMBERS } from '../data';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Layers, 
  Zap, 
  ChevronRight, 
  CircleUser,
  Users,
  Lock
} from 'lucide-react';
import { getProjectRole } from '../lib/permissions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardOverviewProps {
  tasks: Task[];
  projects: Project[];
  activeProject: string;
  logs: ActivityLog[];
  onlineUsers: Record<string, boolean>;
  onSelectProject: (projectId: string) => void;
  onOpenTaskDetails: (task: Task) => void;
  currentUser: UserProfile;
  onUpdateProject?: (projId: string, updates: Partial<Project>) => Promise<void>;
}

export default function DashboardOverview({
  tasks,
  projects,
  activeProject,
  logs,
  onlineUsers,
  onSelectProject,
  onOpenTaskDetails,
  currentUser,
  onUpdateProject
}: DashboardOverviewProps) {
  const activeProjObj = useMemo(() => {
    return projects.find(p => p.id === activeProject);
  }, [projects, activeProject]);

  const currentUserRole = useMemo(() => {
    return activeProjObj ? getProjectRole(activeProjObj, currentUser.id) : null;
  }, [activeProjObj, currentUser]);

  // Filter tasks belonging to current project or all projects if selected all
  const filteredTasks = useMemo(() => {
    if (activeProject === 'all') return tasks;
    return tasks.filter(t => t.projectId === activeProject);
  }, [tasks, activeProject]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const todo = filteredTasks.filter(t => t.status === 'todo').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
    const review = filteredTasks.filter(t => t.status === 'review').length;
    const done = filteredTasks.filter(t => t.status === 'done').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = filteredTasks.filter(t => 
      t.status !== 'done' && t.dueDate && t.dueDate < todayStr
    ).length;

    const highPriority = filteredTasks.filter(t => t.priority === 'high').length;

    return { total, todo, inProgress, review, done, overdue, highPriority };
  }, [filteredTasks]);

  // Compute workload breakdown by assignee
  const assigneeWorkload = useMemo(() => {
    const counts: Record<string, { total: number; completed: number; load: number }> = {};
    TEAM_MEMBERS.forEach(m => {
      counts[m.id] = { total: 0, completed: 0, load: 0 };
    });

    filteredTasks.forEach(t => {
      if (counts[t.assigneeId]) {
        counts[t.assigneeId].total += 1;
        if (t.status === 'done') {
          counts[t.assigneeId].completed += 1;
        } else {
          counts[t.assigneeId].load += t.priority === 'high' ? 3 : t.priority === 'medium' ? 2 : 1;
        }
      }
    });

    return Object.entries(counts).map(([userId, val]) => {
      const user = TEAM_MEMBERS.find(m => m.id === userId);
      return {
        id: userId,
        name: user ? user.name : 'Unassigned',
        role: user ? user.role : '',
        avatarColor: user ? user.avatarColor : 'bg-gray-500 text-white',
        avatarText: user ? user.avatarText : '?',
        online: !!onlineUsers[userId],
        ...val
      };
    });
  }, [filteredTasks, onlineUsers]);

  // Get tasks that are overdue
  const overdueTasksList = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return filteredTasks
      .filter(t => t.status !== 'done' && t.dueDate && t.dueDate < todayStr)
      .slice(0, 5);
  }, [filteredTasks]);

  // Velocity calculation: completed tasks per week over the last month
  const velocityData = useMemo(() => {
    const data: { name: string; completed: number; points: number }[] = [];
    const today = new Date();

    // Generate last 4 weeks of slots
    for (let i = 3; i >= 0; i--) {
      // Offset ranges
      const endOffset = i * 7;
      const startOffset = (i + 1) * 7;
      
      const startDate = new Date(today.getTime() - startOffset * 24 * 60 * 60 * 1000);
      const endDate = new Date(today.getTime() - endOffset * 24 * 60 * 60 * 1000);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Find tasks completed within this slot
      const matches = filteredTasks.filter(t => {
        if (t.status !== 'done') return false;
        
        let compDateStr = '';
        if (t.completedAt) {
          if (typeof t.completedAt === 'number') {
            compDateStr = new Date(t.completedAt).toISOString().split('T')[0];
          } else {
            compDateStr = String(t.completedAt).split('T')[0];
          }
        } else if (t.dueDate) {
          compDateStr = t.dueDate;
        }

        if (!compDateStr) return false;
        return compDateStr >= startStr && compDateStr <= endStr;
      });

      const totalPoints = matches.reduce((acc, t) => {
        const weight = t.priority === 'high' ? 3 : t.priority === 'medium' ? 2 : 1;
        return acc + weight;
      }, 0);

      const label = i === 0 ? 'This Week' : `${i}w Ago`;
      data.push({
        name: label,
        completed: matches.length,
        points: totalPoints
      });
    }

    return data;
  }, [filteredTasks]);

  return (
    <div id="dashboard_overview_container" className="space-y-6">
      {/* Header and Welcome Message */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-sm text-slate-500">
            Real-time status updates and automation controls for your remote team.
          </p>
        </div>
        
        {/* Live Presence indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 duration-150 rounded-full text-xs font-medium text-slate-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>{TEAM_MEMBERS.filter(m => onlineUsers[m.id]).length} Online Collaborators</span>
        </div>
      </div>

      {/* Grid of Key Stats Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Item 1: Total Backlog */}
        <div id="stat_total_backlog" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-slate-300 transition-all">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-0.5">{stats.total}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Active in backlog
            </p>
          </div>
        </div>

        {/* Stat Item 2: In progress */}
        <div id="stat_in_progress" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-slate-300 transition-all">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Progress</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-0.5">{stats.inProgress + stats.review}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {stats.review} pending QA review
            </p>
          </div>
        </div>

        {/* Stat Item 3: Completed */}
        <div id="stat_completed_tasks" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-slate-300 transition-all">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Done</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-0.5">{stats.done}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}% Completion rate
            </p>
          </div>
        </div>

        {/* Stat Item 4: Overdue Alert */}
        <div id="stat_overdue_alert" className={`p-5 rounded-2xl border shadow-sm flex items-start gap-4 transition-all ${
          stats.overdue > 0 
           ? 'bg-rose-50/70 border-rose-200 text-rose-900 shadow-rose-100/40' 
           : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className={`p-3 rounded-xl ${
            stats.overdue > 0 ? 'bg-rose-100/80 text-rose-600' : 'bg-slate-50 text-slate-600'
          }`}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Alerts</p>
            <h3 className="text-2xl font-bold tracking-tight mt-0.5">{stats.overdue}</h3>
            <p className="text-xs mt-1 text-slate-500">
              {stats.overdue > 0 ? 'Urgent attention required' : 'No overdue items'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns (Workloads & Overdue items) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Workload balancing pane */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Team Workload Distribution</h3>
                <p className="text-xs text-slate-500">Balance task flow across active members</p>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Load score</span>
            </div>

            <div className="space-y-4">
              {assigneeWorkload.map(member => {
                // Calculate percentage based on max load
                // Avoid divide-by-zero, max load can be ~10 tasks
                const maxBarScore = 15;
                const percent = Math.min((member.load / maxBarScore) * 100, 100);
                
                return (
                  <div key={member.id} className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="md:w-44 flex items-center gap-2.5">
                      <div className="relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold leading-none ${member.avatarColor}`}>
                          {member.avatarText}
                        </div>
                        {member.online && (
                          <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 leading-tight">{member.name}</p>
                        <p className="text-[10px] text-slate-400">{member.role}</p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="bg-slate-100 rounded-full h-2 w-full overflow-hidden flex">
                        <div 
                          className={`rounded-full h-full transition-all duration-500 ${
                            member.load > 9 
                              ? 'bg-rose-500' 
                              : member.load > 5 
                                ? 'bg-amber-500' 
                                : 'bg-indigo-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="w-24 text-right flex items-center justify-end gap-2 text-xs">
                      <span className="font-semibold text-slate-800">{member.load} pts</span>
                      <span className="text-[10px] text-slate-400">({member.completed}/{member.total} tasks)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Velocity Chart Panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Zap className="text-indigo-650 shrink-0 animate-bounce" size={18} />
                <span>Sprint Throughput (Velocity Chart)</span>
              </h3>
              <p className="text-xs text-slate-500">Completed tasks and estimated velocity throughput points per week over the last month</p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={velocityData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
                    }}
                    labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b' }}
                    itemStyle={{ fontSize: '11px', padding: '2px 0' }}
                  />
                  <Bar 
                    name="Completed Tasks" 
                    dataKey="completed" 
                    fill="#6366f1" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={32}
                  />
                  <Bar 
                    name="Velocity Score" 
                    dataKey="points" 
                    fill="#34d399" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory subtitle footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 uppercase tracking-wider font-extrabold">
              <span className="flex items-center gap-1.5 leading-none">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500 shrink-0" />
                <span>Task Count Volume</span>
              </span>
              <span className="flex items-center gap-1.5 leading-none">
                <span className="w-2.5 h-2.5 rounded bg-emerald-400 shrink-0" />
                <span>Weighted sprint velocity score (high=3, medium=2, low=1)</span>
              </span>
            </div>
          </div>

          {/* Overdue alert panel */}
          {stats.overdue > 0 && (
            <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-3">
                <AlertTriangle size={18} />
                <span>Urgent Deadline Actions Requested ({stats.overdue})</span>
              </div>
              <div className="divide-y divide-rose-100">
                {overdueTasksList.map(task => {
                  const assignee = TEAM_MEMBERS.find(m => m.id === task.assigneeId);
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => onOpenTaskDetails(task)}
                      className="py-3 flex items-center justify-between text-xs hover:bg-rose-100/30 px-2 rounded-lg cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold tracking-tight px-1.5 py-0.5 bg-rose-200/50 text-rose-700 rounded-md">
                          Overdue
                        </span>
                        <div className="font-medium text-slate-800 line-clamp-1">{task.title}</div>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${assignee?.avatarColor || 'bg-slate-200'}`}>
                            {assignee?.avatarText || '?'}
                          </div>
                          <span className="text-[10px] hidden sm:inline">{assignee?.name}</span>
                        </div>
                        <span className="font-semibold text-rose-600 font-mono">{task.dueDate}</span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Workflows, Active Projects, Activity Log */}
        <div className="space-y-6">
          
          {/* Active Projects Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-2">Projects Status</h3>
            <p className="text-xs text-slate-500 mb-4">Click to swap project dashboard context</p>
            <div className="space-y-2">
              <button
                onClick={() => onSelectProject('all')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between duration-150 ${
                  activeProject === 'all' 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/40' 
                    : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                }`}
              >
                <span>🌐 All Workspace Projects</span>
                <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-mono text-[10px]">
                  {tasks.length}
                </span>
              </button>

              {projects.map(proj => {
                const count = tasks.filter(t => t.projectId === proj.id).length;
                return (
                  <button
                    key={proj.id}
                    onClick={() => onSelectProject(proj.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between duration-150 ${
                      activeProject === proj.id 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                        : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${proj.color || 'from-slate-400 to-slate-500'}`} />
                      <span>{proj.name}</span>
                    </div>
                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-mono text-[10px]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project Members & Roles Manager Card */}
          {activeProjObj && (
            <div id="project_members_roles_card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Users size={16} className="text-indigo-600" />
                    <span>Project Members & Roles</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Assign project roles and system access</p>
                </div>
                
                {/* User's current project role indicator */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 shadow-xs">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    My Role: {currentUserRole}
                  </span>
                </div>
              </div>

              {/* Members assignments block */}
              <div className="space-y-3">
                {TEAM_MEMBERS.map(member => {
                  const role = getProjectRole(activeProjObj, member.id);
                  const canEditRoles = currentUserRole === 'Admin';
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between gap-2.5 text-xs">
                      {/* Left: User identity */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${member.avatarColor}`}>
                          {member.avatarText}
                        </div>
                        <div className="truncate">
                          <p className="font-extrabold text-slate-800 leading-none truncate">{member.name}</p>
                          <span className="text-[9px] text-slate-400 leading-none truncate">{member.role}</span>
                        </div>
                      </div>

                      {/* Right: Role selection dropdown */}
                      <div>
                        {canEditRoles ? (
                          <select
                            value={role}
                            onChange={async (e) => {
                              if (!onUpdateProject) return;
                              const newRole = e.target.value as ProjectRole;
                              const currentRoles = activeProjObj.memberRoles || {};
                              const updatedRoles = {
                                ...currentRoles,
                                [member.id]: newRole
                              };
                              try {
                                await onUpdateProject(activeProjObj.id, {
                                  memberRoles: updatedRoles
                                });
                              } catch (err) {
                                console.error("Error setting member project role:", err);
                              }
                            }}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[10px] text-slate-750 font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-none"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Member">Member</option>
                            <option value="Guest">Guest</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg shadow-xs" title="Only Project Admins can change roles">
                            <Lock size={10} className="text-slate-405 shrink-0" />
                            <span>{role}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Roles explanation footer */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Permitted Privileges</p>
                <div className="space-y-1.5 text-[10px] text-slate-500 leading-normal">
                  <div className="flex items-start gap-1">
                    <span className="font-extrabold text-slate-700">🛡️ Admin:</span>
                    <span>Full reading, editing, task deletions, and roles allocation.</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="font-extrabold text-slate-700">👥 Member:</span>
                    <span>Can create and edit tasks, view sublists. But cannot delete tasks.</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="font-extrabold text-slate-700">👁️ Guest:</span>
                    <span>View-only access. Cannot create/edit tasks, modify subtasks, or post comments.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Logs Frame */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-72">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Collaborative Stream</h3>
                <p className="text-[10px] text-slate-400">Real-time update actions and automations</p>
              </div>
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Live</span>
            </div>
            
            <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-3 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No activity captured yet
                </div>
              ) : (
                logs.map(log => {
                  const isWorkflow = log.userId === 'system_bot';
                  return (
                    <div key={log.id} className="text-xs flex gap-2">
                      <div className="mt-0.5 shrink-0">
                        {isWorkflow ? (
                          <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                            <Zap size={11} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                            {log.userName ? log.userName.charAt(0) : '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800">
                          <span className={`font-semibold ${isWorkflow ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {log.userName || 'Someone'}
                          </span>{' '}
                          <span className="text-slate-600">{log.action}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
