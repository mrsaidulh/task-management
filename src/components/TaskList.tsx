import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, Project, UserProfile } from '../types';
import { TEAM_MEMBERS } from '../data';
import { 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  Plus,
  AlertTriangle,
  GripVertical
} from 'lucide-react';
import { getProjectRole } from '../lib/permissions';

// Import DndKit elements
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  activeProject: string;
  onOpenTaskDetails: (task: Task) => void;
  onAddTaskClick: (defaultStatus?: TaskStatus) => void;
  onUpdateStatus: (task: Task, newStatus: TaskStatus) => void;
  onReorderTask?: (task: Task, updates: Partial<Task>) => Promise<void>;
  searchQuery?: string;
  onSearchQueryChange?: (val: string) => void;
  currentUser: UserProfile;
}

interface GroupHeaderProps {
  id: TaskStatus;
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  colorClass: string;
}

// Custom Droppable List wrapper for empty states or list targets
interface ListSegmentDroppableProps {
  id: TaskStatus;
  children: React.ReactNode;
}

function ListSegmentDroppable({ id, children }: ListSegmentDroppableProps) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="contents bg-white">
      {children}
    </div>
  );
}

function GroupHeader({ title, count, expanded, onToggle, colorClass }: GroupHeaderProps) {
  return (
    <div 
      onClick={onToggle}
      className="flex items-center justify-between p-2.5 hover:bg-slate-50 border-b border-slate-200/50 cursor-pointer text-slate-800 font-bold select-none text-xs transition-colors shrink-0"
    >
      <div className="flex items-center gap-2">
        {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
        <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
        <span className="tracking-wide uppercase text-slate-700 font-semibold">{title}</span>
        <span className="bg-slate-100 text-slate-500 font-bold font-mono px-1.5 py-0.5 rounded-md text-[10px]/none">
          {count}
        </span>
      </div>
    </div>
  );
}

// Sub-Component: Sortable Task List Row
interface SortableTaskRowProps {
  key?: any;
  task: Task;
  projects: Project[];
  tasks: Task[];
  onOpenTaskDetails: (task: Task) => void;
  onUpdateStatus: (task: Task, newStatus: TaskStatus) => any;
  isOverdue: (task: Task) => boolean;
  getPriorityStyle: (p: string) => string;
  isTaskGuest: boolean;
}

function SortableTaskRow({
  task,
  projects,
  tasks,
  onOpenTaskDetails,
  onUpdateStatus,
  isOverdue,
  getPriorityStyle,
  isTaskGuest
}: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const assignee = TEAM_MEMBERS.find(m => m.id === task.assigneeId);
  const project = projects.find(p => p.id === task.projectId);
  const overdue = isOverdue(task);
  const subCompleted = task.checklist.filter(c => c.completed).length;
  const subTotal = task.checklist.length;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      onClick={() => onOpenTaskDetails(task)}
      className={`grid grid-cols-12 p-3 font-medium text-slate-800 text-xs items-center cursor-pointer duration-150 transition-colors border-b border-slate-100 ${
        isDragging ? 'bg-indigo-50/40 border-dashed border-indigo-300' : 'bg-white hover:bg-slate-50/70'
      }`}
    >
      {/* Title & mark complete with grip handle */}
      <div className="col-span-5 flex items-center gap-2.5 pl-4 min-w-0">
        {!isTaskGuest ? (
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="p-1 -ml-1 text-slate-404 hover:text-slate-600 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing transition-colors shrink-0"
            title="Drag task grip to prioritize"
          >
            <GripVertical size={13} className="stroke-[2.5]" />
          </div>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateStatus(task, task.status === 'done' ? 'todo' : 'done');
          }}
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border duration-150 ${
            task.status === 'done' 
              ? 'bg-indigo-600 border-indigo-600 text-white' 
              : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-transparent hover:text-indigo-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        </button>
        
        <div className="truncate pr-4">
          <p className={`truncate text-xs font-semibold ${task.status === 'done' ? 'line-through text-slate-400 font-medium' : 'text-slate-800'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-[10px] text-slate-440 truncate mt-0.5 max-w-sm font-normal">
              {task.description}
            </p>
          )}
          {task.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {task.tags.map(tag => (
                <span key={tag} className="text-[8px] font-bold tracking-tight bg-slate-100 text-slate-500 border border-slate-200/50 px-1 rounded-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project pill */}
      <div className="col-span-2 truncate min-w-0 pr-2">
        {project ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-slate-200/60 rounded-full max-w-full bg-slate-50">
            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${project.color}`} />
            <span className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
              {project.name}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 italic">No Project</span>
        )}
      </div>

      {/* Deadline with Alert */}
      <div className="col-span-2">
        {task.dueDate ? (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-mono text-[10px] ${
            overdue 
              ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' 
              : 'text-slate-500 border-transparent bg-transparent'
          }`}>
            <Calendar size={11} className={overdue ? 'text-rose-600' : 'text-slate-400'} />
            <span>{task.dueDate}</span>
            {overdue && <AlertTriangle size={11} className="stroke-[2.5]" />}
          </div>
        ) : (
          <span className="text-slate-400 text-[10px]">—</span>
        )}
      </div>

      {/* PriorityBadge */}
      <div className="col-span-1 text-center font-sans">
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${getPriorityStyle(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      {/* Subtask completeness indicator */}
      <div className="col-span-1 text-center">
        {subTotal > 0 ? (
          <span className="text-[10px] font-semibold font-mono tracking-tight bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
            {subCompleted}/{subTotal}
          </span>
        ) : (
          <span className="text-slate-400 text-[10px]/none font-normal">—</span>
        )}
      </div>

      {/* Assignee pill */}
      <div className="col-span-1 text-right pr-4 shrink-0">
        <div className="inline-flex items-center gap-1.5 text-slate-600 font-medium text-[11px] float-right">
          <span className="hidden leading-none xl:inline text-slate-500 font-medium text-[10px]">
            {assignee ? assignee.name : 'Unassigned'}
          </span>
          <div 
            title={assignee ? `${assignee.name} (${assignee.role})` : 'Unassigned'}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ${assignee?.avatarColor || 'bg-slate-200'}`}
          >
            {assignee?.avatarText || '?'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Primary Component
export default function TaskList({
  tasks,
  projects,
  activeProject,
  onOpenTaskDetails,
  onAddTaskClick,
  onUpdateStatus,
  onReorderTask,
  searchQuery,
  onSearchQueryChange,
  currentUser
}: TaskListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  const activeSearchQuery = searchQuery !== undefined ? searchQuery : localSearchQuery;
  const setActiveSearchQuery = onSearchQueryChange !== undefined ? onSearchQueryChange : setLocalSearchQuery;

  // Track pointer sensors for drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter tasks pool
  const filteredTasks = useMemo(() => {
    let pool = activeProject === 'all' ? tasks : tasks.filter(t => t.projectId === activeProject);
    
    if (activeSearchQuery.trim() !== '') {
      const q = activeSearchQuery.toLowerCase();
      pool = pool.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    return pool;
  }, [tasks, activeProject, activeSearchQuery]);

  // Group columns definition
  const statusGroups: { id: TaskStatus; name: string; color: string }[] = [
    { id: 'todo', name: 'To Do Backlog', color: 'bg-slate-400' },
    { id: 'in_progress', name: 'In Progress Sprint', color: 'bg-emerald-500' },
    { id: 'review', name: 'Awaiting Review & QA', color: 'bg-amber-500' },
    { id: 'done', name: 'Completed & Published', color: 'bg-indigo-600' }
  ];

  // Map into sorting categories
  const tasksByStatus = useMemo(() => {
    const acc: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: []
    };
    filteredTasks.forEach(task => {
      if (acc[task.status]) {
        acc[task.status].push(task);
      }
    });

    const sortAscending = (a: Task, b: Task) => getTaskOrderValue(a) - getTaskOrderValue(b);
    acc.todo.sort(sortAscending);
    acc.in_progress.sort(sortAscending);
    acc.review.sort(sortAscending);
    acc.done.sort(sortAscending);

    return acc;
  }, [filteredTasks]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const isOverdue = (task: Task) => {
    if (task.status === 'done') return false;
    if (!task.dueDate) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return task.dueDate < todayStr;
  };

  // Helper utility functions
  function getTaskOrderValue(task: Task): number {
    return task.order !== undefined ? task.order : -task.createdAt;
  }

  // drag-and-drop end handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Reject Guest-role modification
    const project = projects.find(p => p.id === activeTask.projectId);
    if (getProjectRole(project, currentUser.id) === 'Guest') return;

    // Detect target group pipeline state
    let targetStatus: TaskStatus;
    if (['todo', 'in_progress', 'review', 'done'].includes(overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
    }

    // Filter list items in target group pipeline, sorted
    const targetColumnTasks = tasks
      .filter(t => t.status === targetStatus && t.id !== activeId && (activeProject === 'all' || t.projectId === activeProject))
      .sort((a, b) => getTaskOrderValue(a) - getTaskOrderValue(b));

    let newOrder: number;

    // Dropped on status group header or empty group
    if (['todo', 'in_progress', 'review', 'done'].includes(overId)) {
      if (targetColumnTasks.length === 0) {
        newOrder = Date.now();
      } else {
        const lastTask = targetColumnTasks[targetColumnTasks.length - 1];
        newOrder = getTaskOrderValue(lastTask) + 1000;
      }
    } else {
      // Dropped on another list row
      const overIdx = targetColumnTasks.findIndex(t => t.id === overId);
      if (overIdx === -1) {
        if (targetColumnTasks.length === 0) {
          newOrder = Date.now();
        } else {
          const lastTask = targetColumnTasks[targetColumnTasks.length - 1];
          newOrder = getTaskOrderValue(lastTask) + 1000;
        }
      } else {
        const prevTask = overIdx > 0 ? targetColumnTasks[overIdx - 1] : null;
        const nextTask = targetColumnTasks[overIdx];

        const prevOrder = prevTask ? getTaskOrderValue(prevTask) : null;
        const nextOrder = getTaskOrderValue(nextTask);

        if (prevOrder === null) {
          newOrder = nextOrder - 1000;
        } else {
          newOrder = (prevOrder + nextOrder) / 2;
        }
      }
    }

    if (onReorderTask) {
      await onReorderTask(activeTask, { status: targetStatus, order: newOrder });
    } else {
      onUpdateStatus(activeTask, targetStatus);
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div id="task_list_component" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col font-sans">
        {/* List Toolbar header */}
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border-b border-slate-250">
          <input
            type="text"
            placeholder="Filter backlog (title, details, tags...)..."
            value={activeSearchQuery}
            onChange={(e) => setActiveSearchQuery(e.target.value)}
            className="w-full sm:w-80 px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 duration-150 transition-all font-medium"
          />
          <button
            onClick={() => onAddTaskClick('todo')}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>New Task</span>
          </button>
        </div>

        {/* Grid table area */}
        <div className="overflow-x-auto select-none">
          <div className="min-w-[800px] divide-y divide-slate-100">
            {/* Table Column Headers */}
            <div className="grid grid-cols-12 bg-slate-100/60 p-3 text-slate-400 text-[10px]/none font-extrabold uppercase tracking-widest border-b border-slate-200">
              <div className="col-span-5 pl-4 flex items-center gap-2">
                <span className="w-4" /> {/* Alignment padding corresponding to grip */}
                <span>Task Name</span>
              </div>
              <div className="col-span-2">Project</div>
              <div className="col-span-2">Deadline</div>
              <div className="col-span-1 text-center">Priority</div>
              <div className="col-span-1 text-center">Subtasks</div>
              <div className="col-span-1 text-right pr-4">Assignee</div>
            </div>

            {statusGroups.map(group => {
              const list = tasksByStatus[group.id] || [];
              const isCollapsed = collapsedGroups[group.id];

              return (
                <div key={group.id} className="contents">
                  <GroupHeader
                    id={group.id}
                    title={group.name}
                    count={list.length}
                    expanded={!isCollapsed}
                    onToggle={() => toggleGroup(group.id)}
                    colorClass={group.color}
                  />

                  {!isCollapsed && (
                    <ListSegmentDroppable id={group.id}>
                      {list.length === 0 ? (
                        <div className="col-span-12 p-6 text-center text-xs text-slate-400 font-medium bg-white">
                          No active tasks under this pipeline segment.
                        </div>
                      ) : (
                        <SortableContext
                          id={group.id}
                          items={list.map(t => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {list.map((task) => {
                            const project = projects.find(p => p.id === task.projectId);
                            const isTaskGuest = getProjectRole(project, currentUser.id) === 'Guest';
                            return (
                              <SortableTaskRow
                                key={task.id}
                                task={task}
                                projects={projects}
                                tasks={tasks}
                                onOpenTaskDetails={onOpenTaskDetails}
                                onUpdateStatus={onUpdateStatus}
                                isOverdue={isOverdue}
                                getPriorityStyle={getPriorityStyle}
                                isTaskGuest={isTaskGuest}
                              />
                            );
                          })}
                        </SortableContext>
                      )}
                    </ListSegmentDroppable>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
