import React, { useMemo } from 'react';
import { Task, TaskStatus, Project, UserProfile } from '../types';
import { TEAM_MEMBERS } from '../data';
import { 
  Plus, 
  Calendar, 
  CheckSquare, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Lock,
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

interface TaskBoardProps {
  tasks: Task[];
  projects: Project[];
  activeProject: string;
  onOpenTaskDetails: (task: Task) => void;
  onAddTaskClick: (defaultStatus?: TaskStatus) => void;
  onMoveTask: (task: Task, newStatus: TaskStatus) => void;
  onReorderTask?: (task: Task, updates: Partial<Task>) => Promise<void>;
  currentUser: UserProfile;
}

const COLUMNS: { id: TaskStatus; title: string; color: string; hoverColor: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-100 text-slate-800 border-slate-200', hoverColor: 'hover:bg-slate-200' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', hoverColor: 'hover:bg-emerald-100/50' },
  { id: 'review', title: 'Under Review', color: 'bg-amber-50 text-amber-800 border-amber-200', hoverColor: 'hover:bg-amber-100/50' },
  { id: 'done', title: 'Completed', color: 'bg-indigo-50 text-indigo-800 border-indigo-200', hoverColor: 'hover:bg-indigo-100/50' }
];

// Helper to calculate position scoring
function getTaskOrderValue(task: Task): number {
  return task.order !== undefined ? task.order : -task.createdAt;
}

// Sub-Component: Droppable column container
interface ColumnDroppableProps {
  id: TaskStatus;
  children: React.ReactNode;
}

function ColumnDroppable({ id, children }: ColumnDroppableProps) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin min-h-[250px]"
    >
      {children}
    </div>
  );
}

// Sub-Component: Draggable & Sortable Task Card
interface BoardTaskCardProps {
  key?: any;
  task: Task;
  projects: Project[];
  tasks: Task[];
  onOpenTaskDetails: (task: Task) => void;
  isTaskOverdue: (task: Task) => boolean;
  currentUser: UserProfile;
  isTaskGuest: boolean;
  shiftTask: (task: Task, direction: 'left' | 'right', e: React.MouseEvent) => any;
  columnId: TaskStatus;
}

function BoardTaskCard({
  task,
  projects,
  tasks,
  onOpenTaskDetails,
  isTaskOverdue,
  currentUser,
  isTaskGuest,
  shiftTask,
  columnId
}: BoardTaskCardProps) {
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
  const completedSubtasks = task.checklist.filter(c => c.completed).length;
  const totalSubtasks = task.checklist.length;
  const overdue = isTaskOverdue(task);

  const unmetDeps = (task.dependencies || [])
    .map(depId => tasks.find(t => t.id === depId))
    .filter((depTask): depTask is Task => !!depTask && depTask.status !== 'done');
  const isBlocked = unmetDeps.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border p-4 rounded-xl cursor-default duration-150 transition-all space-y-3.5 select-none relative group ${
        isDragging ? 'border-dashed border-indigo-400 shadow-md ring-2 ring-indigo-500/5' : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
      }`}
      onClick={() => onOpenTaskDetails(task)}
    >
      {/* Visual Header */}
      <div className="flex items-center justify-between gap-1.5 md:min-h-[20px]">
        {project ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${project.color}`} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {project.name}
            </span>
          </div>
        ) : (
          <div />
        )}
        
        {/* Grip Handle & Guest Locked view */}
        {!isTaskGuest ? (
          <div 
            {...attributes} 
            {...listeners} 
            onClick={(e) => e.stopPropagation()}
            className="p-1 -mr-1 -mt-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing transition-colors duration-150"
            title="Drag handle to reorder or transition pipeline state"
          >
            <GripVertical size={13} className="stroke-[2.5]" />
          </div>
        ) : (
          <Lock size={10} className="text-slate-300" title="Locked (Guest role)" />
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-normal">
          {task.description}
        </p>
      )}

      {/* Unmet Dependencies block */}
      {isBlocked && (
        <div 
          className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700 animate-pulse" 
          title={`Blocked by tasks: ${unmetDeps.map(d => `"${d.title}"`).join(', ')}`}
          onClick={(e) => e.stopPropagation()} 
        >
          <AlertCircle size={11} className="text-amber-500 shrink-0" />
          <span className="truncate">Blocked (unmet dependencies: {unmetDeps.length})</span>
        </div>
      )}

      {/* Checklist meter */}
      {totalSubtasks > 0 && (
        <div className="flex items-center gap-1.5 text-slate-400">
          <CheckSquare size={12} className="text-slate-400 shrink-0" />
          <span className="text-[10px] font-semibold font-mono">
            {completedSubtasks}/{totalSubtasks}
          </span>
          <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map(t => (
            <span key={t} className="text-[9px] font-bold tracking-tight px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/50 rounded-sm">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer & Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        {/* Due Date Indicator */}
        <div className="flex items-center gap-1">
          <Calendar size={11} className={`${overdue ? 'text-rose-600' : 'text-slate-400'}`} />
          <span className={`text-[10px] font-semibold font-mono tracking-tight ${
            overdue ? 'text-rose-600 font-bold flex items-center gap-0.5' : 'text-slate-400'
          }`}>
            {task.dueDate || 'No date'}
            {overdue && <AlertCircle size={10} className="stroke-[2.5]" />}
          </span>
        </div>

        {/* Assignee Identity & Shift layout */}
        <div className="flex items-center gap-2">
          <div 
            title={assignee ? `${assignee.name} (${assignee.role})` : 'Unassigned'}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ${assignee?.avatarColor || 'bg-slate-200 text-slate-600'}`}
          >
            {assignee?.avatarText || '?'}
          </div>

          {/* Quick movement selectors */}
          <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-100 rounded-lg p-0.5 opacity-0 group-hover:opacity-100 duration-150 transition-opacity">
            <button
              disabled={columnId === 'todo' || isTaskGuest}
              onClick={(e) => shiftTask(task, 'left', e)}
              className="p-0.5 disabled:opacity-30 hover:bg-slate-200 rounded text-slate-500"
              title={isTaskGuest ? "Locked (Guest)" : "Move Left"}
            >
              <ChevronLeft size={12} />
            </button>
            <button
              disabled={columnId === 'done' || isTaskGuest}
              onClick={(e) => shiftTask(task, 'right', e)}
              className="p-0.5 disabled:opacity-30 hover:bg-slate-200 rounded text-slate-500"
              title={isTaskGuest ? "Locked (Guest)" : "Move Right"}
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Primary Component Export
export default function TaskBoard({
  tasks,
  projects,
  activeProject,
  onOpenTaskDetails,
  onAddTaskClick,
  onMoveTask,
  onReorderTask,
  currentUser
}: TaskBoardProps) {
  // Configured sensors: drag starts only after a slight move, avoiding hijacking component click interactions
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

  // Filter task pool
  const filteredTasks = useMemo(() => {
    if (activeProject === 'all') return tasks;
    return tasks.filter(t => t.projectId === activeProject);
  }, [tasks, activeProject]);

  const activeProjObj = useMemo(() => {
    return projects.find(p => p.id === activeProject);
  }, [projects, activeProject]);

  const isGuestInActiveProject = useMemo(() => {
    if (activeProject === 'all') return false;
    return getProjectRole(activeProjObj, currentUser.id) === 'Guest';
  }, [activeProjObj, currentUser]);

  // Map tasks into sorted columns
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

    // Sort column elements ascending by order calculation value
    const sortAscending = (a: Task, b: Task) => getTaskOrderValue(a) - getTaskOrderValue(b);
    acc.todo.sort(sortAscending);
    acc.in_progress.sort(sortAscending);
    acc.review.sort(sortAscending);
    acc.done.sort(sortAscending);

    return acc;
  }, [filteredTasks]);

  // Assistive layout quick movement buttons
  const shiftTask = async (task: Task, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = COLUMNS.findIndex(col => col.id === task.status);
    let targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx >= 0 && targetIdx < COLUMNS.length) {
      const targetCol = COLUMNS[targetIdx].id;
      if (onReorderTask) {
        // Find bottom order index of target pipeline column to push to end
        const columnTasks = tasksByStatus[targetCol];
        const lastOrder = columnTasks.length > 0 ? getTaskOrderValue(columnTasks[columnTasks.length - 1]) : Date.now();
        await onReorderTask(task, { status: targetCol, order: lastOrder + 1000 });
      } else {
        onMoveTask(task, targetCol);
      }
    }
  };

  const isTaskOverdue = (task: Task) => {
    if (task.status === 'done') return false;
    if (!task.dueDate) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return task.dueDate < todayStr;
  };

  // Drag and drop event handle callback
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Check if dragging account is guest role for this task's project
    const project = projects.find(p => p.id === activeTask.projectId);
    if (getProjectRole(project, currentUser.id) === 'Guest') return;

    // Detect target column pipeline state
    let targetStatus: TaskStatus;
    if (['todo', 'in_progress', 'review', 'done'].includes(overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
    }

    // Filter non-dragged items currently inside target column, sorted by order index
    const targetColumnTasks = tasks
      .filter(t => t.status === targetStatus && t.id !== activeId && (activeProject === 'all' || t.projectId === activeProject))
      .sort((a, b) => getTaskOrderValue(a) - getTaskOrderValue(b));

    let newOrder: number;

    // Dropped on empty column container boundary itself
    if (['todo', 'in_progress', 'review', 'done'].includes(overId)) {
      if (targetColumnTasks.length === 0) {
        newOrder = Date.now();
      } else {
        const lastTask = targetColumnTasks[targetColumnTasks.length - 1];
        newOrder = getTaskOrderValue(lastTask) + 1000;
      }
    } else {
      // Dropped on another task element
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

    // Fire callback persistence event
    if (onReorderTask) {
      await onReorderTask(activeTask, { status: targetStatus, order: newOrder });
    } else {
      onMoveTask(activeTask, targetStatus);
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragEnd={handleDragEnd}
    >
      <div id="k_board_container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.id] || [];
          return (
            <div 
              key={column.id} 
              className="flex flex-col bg-slate-50 border border-slate-200 rounded-2xl h-[calc(100vh-250px)] max-h-[750px] min-h-[500px]"
            >
              {/* Column Header */}
              <div className="p-4 flex items-center justify-between border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border leading-none ${column.color}`}>
                    {column.title}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    {columnTasks.length}
                  </span>
                </div>
                {!isGuestInActiveProject && (
                  <button
                    onClick={() => onAddTaskClick(column.id)}
                    className="p-1 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-500 transition-all duration-150"
                    title={`Add task to ${column.title}`}
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              {/* Columns list of Tasks (Droppable) */}
              <ColumnDroppable id={column.id}>
                {columnTasks.length === 0 ? (
                  <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 p-4 text-center">
                    <p>No tasks here</p>
                    {!isGuestInActiveProject && (
                      <button 
                        onClick={() => onAddTaskClick(column.id)}
                        className="text-indigo-600 hover:underline font-semibold mt-1 font-sans"
                      >
                        Add Task
                      </button>
                    )}
                  </div>
                ) : (
                  <SortableContext 
                    id={column.id}
                    items={columnTasks.map(t => t.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {columnTasks.map((task) => {
                      const project = projects.find(p => p.id === task.projectId);
                      const isTaskGuest = getProjectRole(project, currentUser.id) === 'Guest';
                      return (
                        <BoardTaskCard
                          key={task.id}
                          task={task}
                          projects={projects}
                          tasks={tasks}
                          onOpenTaskDetails={onOpenTaskDetails}
                          isTaskOverdue={isTaskOverdue}
                          currentUser={currentUser}
                          isTaskGuest={isTaskGuest}
                          shiftTask={shiftTask}
                          columnId={column.id}
                        />
                      );
                    })}
                  </SortableContext>
                )}
              </ColumnDroppable>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
