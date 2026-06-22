import React, { useState } from 'react';
import { WorkflowRule } from '../types';
import { TEAM_MEMBERS } from '../data';
import { 
  Zap, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Power,
  Sliders,
  Sparkles
} from 'lucide-react';

interface WorkflowAutomationProps {
  rules: WorkflowRule[];
  onCreateRule: (rule: Omit<WorkflowRule, 'id'>) => Promise<void>;
  onToggleRule: (rule: WorkflowRule) => Promise<void>;
}

export default function WorkflowAutomation({
  rules,
  onCreateRule,
  onToggleRule
}: WorkflowAutomationProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [ruleName, setRuleName] = useState('');
  
  // States for new trigger/action
  const [triggerType, setTriggerType] = useState<'status_change' | 'priority_change' | 'checklist_completed' | 'deadline_near'>('status_change');
  const [triggerValue, setTriggerValue] = useState('review');
  const [actionType, setActionType] = useState<'reassign' | 'add_tags' | 'post_comment' | 'set_due_date_days'>('reassign');
  const [actionValue, setActionValue] = useState('user_marcus');

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    setSaving(true);
    try {
      const generatedRuleName = ruleName || `Auto-Rule [${triggerType} ➔ ${actionType}]`;
      await onCreateRule({
        name: generatedRuleName,
        active: true,
        triggerType,
        triggerValue,
        actionType,
        actionValue
      });
      // reset form
      setRuleName('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // When trigger changes, offer default logic
  const handleTriggerTypeChange = (val: typeof triggerType) => {
    setTriggerType(val);
    if (val === 'status_change') {
      setTriggerValue('review');
    } else if (val === 'priority_change') {
      setTriggerValue('high');
    } else {
      setTriggerValue('all');
    }
  };

  // Convert trigger values to readable texts 
  const getReadableTriggerText = (type: string, value: string) => {
    switch (type) {
      case 'status_change':
        return `When Task Status changes to "${value.replace('_', ' ').toUpperCase()}"`;
      case 'priority_change':
        return `When Task Priority changes to "${value.toUpperCase()}"`;
      case 'checklist_completed':
        return 'When All Checklist list items are completed';
      default:
        return 'When Task details change';
    }
  };

  const getReadableActionText = (type: string, value: string) => {
    switch (type) {
      case 'reassign':
        const matchUser = TEAM_MEMBERS.find(m => m.id === value);
        return `Automatically reassign task to: ${matchUser ? matchUser.name : 'Unknown Dev'}`;
      case 'add_tags':
        return `Automatically append tags: [${value}]`;
      case 'set_due_date_days':
        return `Automatically calculate due date: Today + ${value} days`;
      case 'post_comment':
        return `Post automated system reaction comment: "${value}"`;
      default:
        return 'Notify active workflow monitors';
    }
  };

  return (
    <div id="automation_pane_root" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* Rules Manager Column */}
      <div className="lg:col-span-2 space-y-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sliders size={18} className="text-indigo-600" />
                <span>Active Automation Rules</span>
              </h3>
              <p className="text-xs text-slate-400">Trigger actions automatically on task status shifts</p>
            </div>
            
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Create Rule</span>
            </button>
          </div>

          {/* List of rules */}
          <div className="divide-y divide-slate-100 mt-2">
            {rules.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No custom workflows specified. Use the button above to build an autotask rule!
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-md ${rule.active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Zap size={14} className="stroke-[2.5]" />
                      </div>
                      <h4 className={`text-xs font-bold ${rule.active ? 'text-slate-800' : 'text-slate-400'}`}>
                        {rule.name}
                      </h4>
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                        rule.active 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {rule.active ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-21 gap-2 items-center text-[11px] text-slate-500 font-medium pl-6">
                      <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                        <span className="text-[9px] font-bold text-indigo-600 uppercase block mb-0.5">Trigger Condition</span>
                        <span className="text-slate-700 leading-normal">{getReadableTriggerText(rule.triggerType, rule.triggerValue)}</span>
                      </div>
                      <div className="hidden md:flex justify-center text-indigo-400">
                        <ArrowRight size={14} />
                      </div>
                      <div className="bg-indigo-50/50 border border-indigo-100/60 p-2.5 rounded-xl">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Action Executed</span>
                        <span className="text-slate-700 leading-normal">{getReadableActionText(rule.actionType, rule.actionValue)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle rule Switch */}
                  <div className="pt-1.5">
                    <button
                      onClick={() => onToggleRule(rule)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rule.active ? 'bg-indigo-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          rule.active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Trigger Builder Form or Tutorial Overview Panel */}
      <div className="space-y-5">
        {showAddForm ? (
          <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Rule Constructor</h3>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Cancel
              </button>
            </div>

            {/* Rule Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Rule Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Escalate high priorities"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Trigger selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Trigger When...</label>
              <select
                value={triggerType}
                onChange={(e) => handleTriggerTypeChange(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="status_change">Task Status is updated</option>
                <option value="priority_change">Task Priority level is modified</option>
                <option value="checklist_completed">All subtasks on Checklist are checked off</option>
              </select>
            </div>

            {/* Trigger Value conditional input */}
            {triggerType === 'status_change' && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Matches Status</label>
                <select
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            )}

            {triggerType === 'priority_change' && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Matches Priority</label>
                <select
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            )}

            {/* Action Type Selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Then Execute Action...</label>
              <select
                value={actionType}
                onChange={(e) => {
                  setActionType(e.target.value as any);
                  if (e.target.value === 'reassign') {
                    setActionValue('user_sarah');
                  } else if (e.target.value === 'add_tags') {
                    setActionValue('automated');
                  } else if (e.target.value === 'set_due_date_days') {
                    setActionValue('2');
                  } else {
                    setActionValue('Done!');
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="reassign">Reassign the task</option>
                <option value="add_tags">Append tags to task</option>
                <option value="set_due_date_days">Set deadline relative offset</option>
                <option value="post_comment">Publish bot feedback message</option>
              </select>
            </div>

            {/* Action value input */}
            {actionType === 'reassign' && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Choose New Assignee</label>
                <select
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
                >
                  {TEAM_MEMBERS.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            )}

            {actionType === 'add_tags' && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Tags (comma-separated)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. core-issue, automated-test"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
                />
              </div>
            )}

            {actionType === 'set_due_date_days' && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Set Deadline In (Days from today)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-mono"
                />
              </div>
            )}

            {actionType === 'post_comment' && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Bot Comment Text</label>
                <textarea
                  required
                  placeholder="Rules engine comment text..."
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 h-16 resize-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-indigo-600 border border-indigo-750 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              {saving ? 'Registering...' : 'Activate Workflow Rule ✓'}
            </button>
          </form>
        ) : (
          <div className="bg-gradient-to-br from-indigo-900 to-purple-950 p-6 rounded-2xl text-white shadow-md space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white/5 rounded-full blur-xl" />
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

            <div className="flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={18} />
              <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-300">Active Workflows Guide</span>
            </div>

            <h3 className="text-sm font-extrabold leading-snug">The Reactive Autopilot Engine</h3>
            
            <p className="text-xs text-indigo-200 leading-normal">
              Remote team collaboration is smooth when simple protocols execute on autopilot. Build rules that respond to human trigger nodes immediately.
            </p>

            <div className="space-y-2 text-[11px] text-indigo-100">
              <div className="flex items-start gap-2">
                <ShieldCheck size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                <span>**Standard Protocols**: When status updates trigger review phases, automatically forward tasks to corresponding leads.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                <span>**Deadline Tracking Protection**: Automatically append priority dates so remote engineers don't lose focus on core items.</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-2 bg-white/10 hover:bg-white/20 duration-150 rounded-xl text-xs font-extrabold text-white text-center transition-all"
              >
                Let’s build a rule
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
