import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, Project, UserProfile, TaskChecklistItem, TaskComment } from '../types';
import { TEAM_MEMBERS } from '../data';
import { subToComments, postComment } from '../lib/services';
import { 
  X, 
  Trash2, 
  Calendar, 
  UserPlus, 
  Tag, 
  CheckSquare, 
  MessageSquare, 
  Clock, 
  AlertCircle, 
  Plus, 
  Layers,
  Lock
} from 'lucide-react';
import { getProjectRole } from '../lib/permissions';

interface TaskDetailsModalProps {
  task: Task;
  tasks: Task[];
  projects: Project[];
  onClose: () => void;
  onUpdateTask: (task: Task, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (task: Task) => Promise<void>;
  currentUser: UserProfile;
  users?: UserProfile[];
}

export default function TaskDetailsModal({
  task,
  tasks,
  projects,
  onClose,
  onUpdateTask,
  onDeleteTask,
  currentUser,
  users
}: TaskDetailsModalProps) {
  const activeProj = useMemo(() => {
    return projects.find(p => p.id === task.projectId);
  }, [projects, task.projectId]);

  const activeUsers = users || TEAM_MEMBERS;

  const userRoleOnProj = useMemo(() => {
    return getProjectRole(activeProj, currentUser.id);
  }, [activeProj, currentUser.id]);

  const isGuest = userRoleOnProj === 'Guest';
  const isAdmin = userRoleOnProj === 'Admin';
  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  // Subtask Checklist states
  const [checklistInput, setChecklistInput] = useState('');

  // New Tag State
  const [tagInput, setTagInput] = useState('');

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to comments for this task in real-time
  useEffect(() => {
    const unsub = subToComments(task.id, (loadedComments) => {
      setComments(loadedComments);
    });
    return () => unsub();
  }, [task.id]);

  // Scroll details chat list on receipt of new logs
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // On-the-fly input helpers
  const handleFieldChange = async (fieldName: keyof Task, value: any) => {
    try {
      await onUpdateTask(task, { [fieldName]: value });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    const freshChecklist = task.checklist.map(item => {
      if (item.id === subtaskId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });
    await onUpdateTask(task, { checklist: freshChecklist });
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistInput.trim()) return;

    const newItem: TaskChecklistItem = {
      id: 'sub_' + Math.floor(Math.random() * 1000000),
      text: checklistInput.trim(),
      completed: false
    };

    const freshChecklist = [...task.checklist, newItem];
    setChecklistInput('');
    await onUpdateTask(task, { checklist: freshChecklist });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const freshChecklist = task.checklist.filter(item => item.id !== subtaskId);
    await onUpdateTask(task, { checklist: freshChecklist });
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    const formattedTag = tagInput.trim().replace(/\s+/g, '-');
    if (!task.tags.includes(formattedTag)) {
      const freshTags = [...task.tags, formattedTag];
      await onUpdateTask(task, { tags: freshTags });
    }
    setTagInput('');
  };

  const handleRemoveTag = async (tagName: string) => {
    const freshTags = task.tags.filter(t => t !== tagName);
    await onUpdateTask(task, { tags: freshTags });
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || posting) return;

    setPosting(true);
    try {
      await postComment(task.id, newCommentText.trim(), currentUser);
      setNewCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const isOverdue = useMemo(() => {
    if (task.status === 'done') return false;
    if (!task.dueDate) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return task.dueDate < todayStr;
  }, [task]);

  const activeProjectColor = useMemo(() => {
    const p = projects.find(proj => proj.id === task.projectId);
    return p?.color || 'from-slate-400 to-slate-500';
  }, [task.projectId, projects]);

  return (
    <div id="drawer_overlay" className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      {/* Click backdrop to exit */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide sheet content */}
      <div 
        id="drawer_body"
        className="relative w-full max-w-lg md:max-w-xl h-full bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-slide-in"
      >
        {/* Drawer Header Navbar */}
        <div className="p-4 border-b border-slate-250 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${activeProjectColor}`} />
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Work item inspector
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Delete button */}
            {isAdmin ? (
              <button
                onClick={() => {
                  if (confirm('Delete this task?')) {
                    onDeleteTask(task);
                    onClose();
                  }
                }}
                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all duration-150"
                title="Prune task record"
              >
                <Trash2 size={16} />
              </button>
            ) : (
              <span className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-not-allowed leading-none" title="Only Project Admins can delete tasks">
                <Lock size={10} className="text-slate-400" />
                <span>Delete Locked</span>
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all duration-150"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Panel Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          
          {/* Real-time editable Title */}
          <div className="space-y-1">
            <input
              type="text"
              value={task.title}
              disabled={isGuest}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Give task a short summary..."
              className={`w-full text-base font-bold text-slate-800 bg-transparent border-b border-transparent focus:outline-none py-1 transition-all ${
                isGuest 
                  ? 'cursor-not-allowed opacity-80' 
                  : 'hover:border-slate-200 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            
            {/* Assignee item */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <UserPlus size={11} />
                <span>Assignee</span>
              </label>
              <select
                value={task.assigneeId}
                disabled={isGuest}
                onChange={(e) => handleFieldChange('assigneeId', e.target.value)}
                className={`w-full bg-white border border-slate-250 rounded-xl text-xs px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:border-indigo-500 ${
                  isGuest ? 'cursor-not-allowed opacity-75' : ''
                }`}
              >
                {activeUsers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Status Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Layers size={11} />
                <span>Status Stage</span>
              </label>
              <select
                value={task.status}
                disabled={isGuest}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className={`w-full bg-white border border-slate-250 rounded-xl text-xs px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:border-indigo-500 ${
                  isGuest ? 'cursor-not-allowed opacity-75' : ''
                }`}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Date timeline ranges */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Calendar size={11} />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={task.startDate || ''}
                disabled={isGuest}
                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                className={`w-full bg-white border border-slate-250 rounded-xl text-xs px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-indigo-500 font-mono ${
                  isGuest ? 'cursor-not-allowed opacity-75' : ''
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Calendar size={11} className={isOverdue ? 'text-rose-600' : ''} />
                <span className={isOverdue ? 'text-rose-600 font-extrabold' : ''}>Due Date</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={task.dueDate || ''}
                  disabled={isGuest}
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  className={`w-full bg-white border rounded-xl text-xs px-2.5 py-1.5 font-medium focus:outline-none focus:border-indigo-500 font-mono ${
                    isOverdue 
                      ? 'border-rose-300 text-rose-700 font-bold bg-rose-50' 
                      : 'border-slate-250 text-slate-700'
                  } ${isGuest ? 'cursor-not-allowed opacity-75' : ''}`}
                />
                {isOverdue && (
                  <span className="absolute right-2.5 top-2.5 text-rose-600" title="Overdue!">
                    <AlertCircle size={12} className="stroke-[2.5]" />
                  </span>
                )}
              </div>
            </div>

            {/* Priority selection selector */}
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Priority Range</label>
              <select
                value={task.priority}
                disabled={isGuest}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
                className={`w-full bg-white border border-slate-250 rounded-xl text-xs px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:border-indigo-500 ${
                  isGuest ? 'cursor-not-allowed opacity-75' : ''
                }`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Associated Project */}
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Aligned Project</label>
              <select
                value={task.projectId}
                disabled={isGuest}
                onChange={(e) => handleFieldChange('projectId', e.target.value)}
                className={`w-full bg-white border border-slate-250 rounded-xl text-xs px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none ${
                  isGuest ? 'cursor-not-allowed opacity-75' : ''
                }`}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Real-time editable description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Goal & Context Decription</label>
            <textarea
              value={task.description}
              disabled={isGuest}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="State key directives or steps for remote teams..."
              className={`w-full border border-slate-250 bg-white px-3 py-2.5 rounded-2xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 hover:border-slate-300 transition-all min-h-[80px] ${
                isGuest ? 'cursor-not-allowed opacity-75' : ''
              }`}
            />
          </div>

          {/* Subtask Action Checklist */}
          <div className="space-y-3 p-4 border border-slate-200/80 bg-slate-50/50 rounded-2xl">
            <h4 className="text-xs font-extrabold text-slate-500 flex items-center gap-1.5">
              <CheckSquare size={13} className="text-indigo-600" />
              <span>Subtask Action Checklist</span>
              <span className="text-[10px] bg-slate-200/85 px-1.5 py-0.5 rounded-full font-mono text-slate-500">
                {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
              </span>
            </h4>

            {/* List subtasks */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {task.checklist.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No micro-actions allocated yet</p>
              ) : (
                task.checklist.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 grupa hover:bg-white p-1 rounded-lg transition-all">
                    <div 
                      className={`flex items-center gap-2 ${isGuest ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`} 
                      onClick={() => {
                        if (isGuest) return;
                        handleToggleSubtask(item.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {}} // handled by parent div
                        disabled={isGuest}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                      />
                      <span className={`text-xs ${item.completed ? 'line-through text-slate-400 font-medium' : 'text-slate-700 font-medium'}`}>
                        {item.text}
                      </span>
                    </div>

                    {!isGuest && (
                      <button
                        onClick={() => handleDeleteSubtask(item.id)}
                        className="text-xs text-slate-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition-all p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Checklist form */}
            {!isGuest ? (
              <form onSubmit={handleAddSubtask} className="flex gap-2.5 pt-1.5">
                <input
                  type="text"
                  placeholder="Break down task with details..."
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-250 bg-white rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                />
                <button
                  type="submit"
                  disabled={!checklistInput.trim()}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shrink-0 transition-all"
                >
                  Add action
                </button>
              </form>
            ) : (
              <p className="text-[10px] text-slate-400 italic">Checklist editing is locked for Guests</p>
            )}
          </div>

          {/* Tags list */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Tag size={11} />
              <span>Project Classification Tags</span>
            </label>
            
            <div className="flex flex-wrap gap-1">
              {task.tags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center gap-1 text-[9px] font-bold tracking-tight px-2 py-0.5 bg-slate-105 border border-slate-200 text-slate-600 rounded-sm"
                >
                  <span>{tag}</span>
                  {!isGuest && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[9px] font-bold hover:text-rose-500 opacity-50 hover:opacity-100"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>

            {!isGuest && (
              <form onSubmit={handleAddTag} className="flex gap-2 max-w-xs">
                <input
                  type="text"
                  placeholder="Tag text and Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="w-full px-2.5 py-1 border border-slate-250 bg-white rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                />
              </form>
            )}
          </div>

          {/* Task Dependency Links */}
          <div className="space-y-2 pt-2 border-t border-slate-100 flex-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Layers size={11} className="text-amber-500" />
              <span>Blocking Dependencies (Task Blocks)</span>
            </label>

            <div className="space-y-1.5">
              {(!task.dependencies || task.dependencies.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No dependencies currently. This task can be scheduled freely.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {task.dependencies.map(depId => {
                    const depTask = tasks.find(t => t.id === depId);
                    if (!depTask) return null;
                    const isCompleted = depTask.status === 'done';
                    return (
                      <div key={depId} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-150 bg-slate-50/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCompleted ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                          <span className={`text-xs font-semibold truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                            {depTask.title}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm shrink-0 font-mono tracking-tight ${
                            isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {depTask.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        {!isGuest && (
                          <button
                            type="button"
                            onClick={() => {
                              const newDeps = (task.dependencies || []).filter(id => id !== depId);
                              onUpdateTask(task, { dependencies: newDeps });
                            }}
                            className="text-slate-400 hover:text-rose-500 text-xs font-bold leading-none p-1 transition-all"
                            title="Remove link"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!isGuest && (
              <div className="flex gap-2 max-w-sm pt-1">
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const currentDeps = task.dependencies || [];
                    if (!currentDeps.includes(val)) {
                      onUpdateTask(task, { dependencies: [...currentDeps, val] });
                    }
                    e.target.value = ''; // Reset select
                  }}
                  defaultValue=""
                  className="bg-white border border-slate-250 rounded-xl text-xs px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:border-indigo-500 flex-1"
                >
                  <option value="" disabled>Link blocking task...</option>
                  {tasks
                    .filter(t => t.id !== task.id && t.projectId === task.projectId && !(task.dependencies || []).includes(t.id))
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Integrated Comments Thread */}
          <div className="space-y-4 pt-4 border-t border-slate-150">
            <h4 className="text-xs font-extrabold text-slate-500 flex items-center gap-2">
              <MessageSquare size={13} className="text-indigo-600" />
              <span>Discussion Activity Feed ({comments.length})</span>
            </h4>

            {/* Comments Stream */}
            <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1 bg-slate-50/20 p-3 rounded-2xl border border-slate-200/50 scrollbar-thin">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No comments logged. Post a brief below to start the thread.
                </div>
              ) : (
                comments.map(c => {
                  const sender = activeUsers.find(m => m.id === c.senderId);
                  const isBot = c.senderId === 'system_bot';

                  return (
                    <div key={c.id} className="text-xs flex gap-2.5">
                      <div className="shrink-0 mt-0.5">
                        {isBot ? (
                          <div className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-[9px]">
                            🤖
                          </div>
                        ) : (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${sender?.avatarColor || 'bg-slate-200'}`}>
                            {sender?.avatarText || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 bg-white p-2.5 rounded-xl border border-slate-150 shadow-2xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-slate-700 leading-none">
                            {isBot ? 'Automation Bot' : (sender ? sender.name : 'Unknown Dev')}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 break-words leading-relaxed">{c.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Publish comments form */}
            {!isGuest ? (
              <form onSubmit={handleSendComment} className="flex gap-2">
                <input
                  type="text"
                  required
                  disabled={posting}
                  placeholder="Publish comment in task thread..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-350 bg-white rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || posting}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[11px] text-slate-400 text-center font-medium flex items-center justify-center gap-1.5">
                <Lock size={12} className="text-slate-400" />
                <span>Discussion replies can only be viewed by Guests.</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
