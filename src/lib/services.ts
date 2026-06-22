import { 
  Task, 
  TaskStatus, 
  TaskPriority, 
  WorkflowRule, 
  Message, 
  TaskComment, 
  ActivityLog, 
  Project, 
  UserProfile,
  ProjectTemplate,
  TemplateTask
} from '../types';
import { TEAM_MEMBERS } from '../data';

// --- Presence Tracker Configuration ---
let presenceIntervalId: any = null;

// --- DUMMY FUNCTION FOR REST SYNCRONICITY ---
export async function seedDatabaseIfEmpty() {
  // Database seeding is now safely handled server-side in server.ts on boot!
  console.log('[Services] Database seeding check delegated to backend.');
}

// ---------------- PRESENCE HEARTBEAT ----------------
export function startUserPresenceHeartbeat(userId: string) {
  if (presenceIntervalId) clearInterval(presenceIntervalId);

  const updatePresence = async () => {
    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (e) {
      console.error("Presence update error:", e);
    }
  };

  updatePresence();
  presenceIntervalId = setInterval(updatePresence, 8000); // Heartbeat every 8s
}

export function stopUserPresenceHeartbeat(userId: string) {
  if (presenceIntervalId) {
    clearInterval(presenceIntervalId);
    presenceIntervalId = null;
  }
}

export function subToPresence(callback: (onlineMap: Record<string, boolean>) => void) {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/presence');
      if (!res.ok) throw new Error();
      const onlineMap = await res.json();
      if (active) callback(onlineMap);
    } catch (e) {
      console.error("Error polling user presence:", e);
    }
  };

  poll();
  const idStr = setInterval(poll, 2500);
  return () => {
    active = false;
    clearInterval(idStr);
  };
}

// ---------------- AUTOMATION WORKFLOWS ----------------
export async function applyWorkflowAction(task: Task, rule: WorkflowRule, triggerUser: UserProfile) {
  const updates: Partial<Task> = {
    updatedAt: Date.now()
  };
  
  let actionDescription = "";

  if (rule.actionType === 'reassign') {
    updates.assigneeId = rule.actionValue;
    const targetUser = TEAM_MEMBERS.find(m => m.id === rule.actionValue);
    actionDescription = `Assigned task to ${targetUser ? targetUser.name : 'System User'}`;
    
    // Save to server
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } else if (rule.actionType === 'add_tags') {
    const rawTags = rule.actionValue.split(',').map(t => t.trim());
    const mergedTags = Array.from(new Set([...task.tags, ...rawTags]));
    updates.tags = mergedTags;
    actionDescription = `Appended workflow tagging: [${rawTags.join(', ')}]`;
    
    // Save to server
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } else if (rule.actionType === 'set_due_date_days') {
    const offsetDays = parseInt(rule.actionValue) || 1;
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const dateString = date.toISOString().split('T')[0];
    updates.dueDate = dateString;
    actionDescription = `Extended deadline to ${dateString} (+${offsetDays} days)`;
    
    // Save to server
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } else if (rule.actionType === 'post_comment') {
    const commentId = 'comment_wf_' + Math.floor(Math.random() * 1000000);
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: commentId,
        taskId: task.id,
        senderId: 'system_bot',
        text: rule.actionValue,
        createdAt: Date.now()
      })
    });
    actionDescription = `Published automated feedback comment`;
  }

  // Create Activity log
  const logId = 'log_wf_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: logId,
      userId: 'system_bot',
      userName: 'Workflow Engine',
      action: `Workflow Triggered: "${rule.name}" ➔ ${actionDescription}`,
      taskId: task.id,
      taskTitle: task.title,
      createdAt: Date.now()
    })
  });
}

export async function runWorkflowsForTask(
  oldTask: Task | null,
  newTask: Task,
  rules: WorkflowRule[],
  triggerUser: UserProfile
) {
  for (const rule of rules) {
    if (!rule.active) continue;
    let isTriggered = false;

    // Trigger 1: status_change
    if (rule.triggerType === 'status_change') {
      const targetStatus = rule.triggerValue;
      if (newTask.status === targetStatus && (!oldTask || oldTask.status !== targetStatus)) {
        isTriggered = true;
      }
    }

    // Trigger 2: priority_change
    if (rule.triggerType === 'priority_change') {
      const targetPriority = rule.triggerValue;
      if (newTask.priority === targetPriority && (!oldTask || oldTask.priority !== targetPriority)) {
        isTriggered = true;
      }
    }

    // Trigger 3: checklist_completed
    if (rule.triggerType === 'checklist_completed') {
      const wasCompletedBefore = oldTask ? (oldTask.checklist.length > 0 && oldTask.checklist.every(item => item.completed)) : false;
      const isCompletedNow = newTask.checklist.length > 0 && newTask.checklist.every(item => item.completed);
      if (isCompletedNow && !wasCompletedBefore) {
        isTriggered = true;
      }
    }

    if (isTriggered) {
      console.log(`Executing rule trigger: ${rule.name}`);
      await applyWorkflowAction(newTask, rule, triggerUser);
    }
  }
}

// ---------------- SUBSCRIBERS ----------------
export function subToTasks(callback: (tasks: Task[]) => void) {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (active) callback(list);
    } catch (e) {
      console.error("Error fetching tasks backlog:", e);
    }
  };

  poll();
  const indexInt = setInterval(poll, 2200);
  return () => {
    active = false;
    clearInterval(indexInt);
  };
}

export function subToProjects(callback: (projects: Project[]) => void) {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (active) callback(list);
    } catch (e) {
      console.error("Error fetching projects list:", e);
    }
  };

  poll();
  const indexInt = setInterval(poll, 2500);
  return () => {
    active = false;
    clearInterval(indexInt);
  };
}

export function subToWorkflowRules(callback: (rules: WorkflowRule[]) => void) {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/workflow-rules');
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (active) callback(list);
    } catch (e) {
      console.error("Error fetching rules:", e);
    }
  };

  poll();
  const indexInt = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(indexInt);
  };
}

export function subToActivityLogs(callback: (logs: ActivityLog[]) => void) {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/activity-logs');
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (active) callback(list);
    } catch (e) {
      console.error("Error fetching activity log stream:", e);
    }
  };

  poll();
  const indexInt = setInterval(poll, 2500);
  return () => {
    active = false;
    clearInterval(indexInt);
  };
}

export function subToComments(taskId: string, callback: (comments: TaskComment[]) => void) {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch(`/api/comments?taskId=${encodeURIComponent(taskId)}`);
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (active) callback(list);
    } catch (e) {
      console.error("Error loading task comments:", e);
    }
  };

  poll();
  const indexInt = setInterval(poll, 2000);
  return () => {
    active = false;
    clearInterval(indexInt);
  };
}

export function subToMessages(channelId: string, callback: (messages: Message[]) => void) {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch(`/api/messages?channelId=${encodeURIComponent(channelId)}`);
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (active) callback(list);
    } catch (e) {
      console.error("Error loading room messages:", e);
    }
  };

  poll();
  const indexInt = setInterval(poll, 2000);
  return () => {
    active = false;
    clearInterval(indexInt);
  };
}

// ---------------- CRUD API ----------------
export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, user: UserProfile, rules: WorkflowRule[]) {
  const idStr = 'task_' + Math.floor(Math.random() * 1000000);
  const now = Date.now();
  const fullTask: Task = {
    ...task,
    id: idStr,
    createdAt: now,
    updatedAt: now
  };

  // 1. Save Task
  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullTask)
  });

  // 2. Add activity Log
  const logId = 'log_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: logId,
      userId: user.id,
      userName: user.name,
      action: `Created task "${task.title}"`,
      taskId: idStr,
      taskTitle: task.title,
      createdAt: now
    })
  });

  // 3. Run workflows
  await runWorkflowsForTask(null, fullTask, rules, user);
  return idStr;
}

export async function updateTask(oldTask: Task, updates: Partial<Task>, user: UserProfile, rules: WorkflowRule[]) {
  const now = Date.now();
  const updatedTaskObj: Task = {
    ...oldTask,
    ...updates,
    updatedAt: now
  };

  if (updates.status === 'done') {
    updatedTaskObj.completedAt = now;
  } else if (updates.status) {
    updatedTaskObj.completedAt = undefined;
  }

  // Determine logs message
  let actionMessage = `Updated task "${oldTask.title}"`;
  if (updates.status && updates.status !== oldTask.status) {
    actionMessage = `Changed status of "${oldTask.title}" to ${updates.status.replace('_', ' ').toUpperCase()}`;
  } else if (updates.priority && updates.priority !== oldTask.priority) {
    actionMessage = `Changed priority of "${oldTask.title}" to ${updates.priority.toUpperCase()}`;
  } else if (updates.assigneeId && updates.assigneeId !== oldTask.assigneeId) {
    const newAssignee = TEAM_MEMBERS.find(m => m.id === updates.assigneeId);
    actionMessage = `Reassigned "${oldTask.title}" to ${newAssignee ? newAssignee.name : 'Unknown'}`;
  }

  // 1. Submit update
  await fetch(`/api/tasks/${oldTask.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...updates,
      updatedAt: now,
      completedAt: updates.status === 'done' ? now : (updates.status ? null : (oldTask.completedAt || null))
    })
  });

  // 2. Record log
  const logId = 'log_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: logId,
      userId: user.id,
      userName: user.name,
      action: actionMessage,
      taskId: oldTask.id,
      taskTitle: oldTask.title,
      createdAt: now
    })
  });

  // 3. Run workflows sequential
  await runWorkflowsForTask(oldTask, updatedTaskObj, rules, user);
}

export async function deleteTask(task: Task, user: UserProfile) {
  // 1. Delete
  await fetch(`/api/tasks/${task.id}`, {
    method: 'DELETE'
  });

  // 2. Activity Log
  const logId = 'log_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: logId,
      userId: user.id,
      userName: user.name,
      action: `Deleted task "${task.title}"`,
      createdAt: Date.now()
    })
  });
}

export async function createProject(proj: Omit<Project, 'id'>) {
  const projId = 'proj_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...proj,
      id: projId
    })
  });
}

export async function updateProject(projId: string, updates: Partial<Project>) {
  await fetch(`/api/projects/${projId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
}

export async function createWorkflowRule(rule: Omit<WorkflowRule, 'id'>) {
  const ruleId = 'rule_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/workflow-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...rule,
      id: ruleId
    })
  });
}

export async function toggleWorkflowRule(rule: WorkflowRule) {
  await fetch(`/api/workflow-rules/${rule.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      active: !rule.active
    })
  });
}

export async function postComment(taskId: string, commentText: string, user: UserProfile) {
  const idStr = 'comment_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: idStr,
      taskId,
      senderId: user.id,
      text: commentText,
      createdAt: Date.now()
    })
  });
}

export async function postChannelMessage(channelId: string, text: string, user: UserProfile) {
  const idStr = 'msg_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: idStr,
      channelId,
      senderId: user.id,
      text,
      createdAt: Date.now()
    })
  });
}

// ---------------- PROJECT TEMPLATES SERVICES ----------------
export function subToProjectTemplates(callback: (templates: ProjectTemplate[]) => void) {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/project-templates');
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (active) callback(list);
    } catch (e) {
      console.error("Error polling templates:", e);
    }
  };

  poll();
  const indexInt = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(indexInt);
  };
}

export async function saveProjectAsTemplate(
  projectId: string,
  projectName: string,
  templateName: string,
  templateDesc: string,
  templateColor: string,
  tasksInProject: Task[],
  user: UserProfile
) {
  const dates = tasksInProject
    .map(t => new Date(t.dueDate).getTime())
    .filter(t => !isNaN(t));
  const baseTime = dates.length > 0 ? Math.min(...dates) : Date.now();

  const getOffsetDays = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    if (isNaN(t)) return 0;
    const diff = t - baseTime;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const templateTasks: TemplateTask[] = tasksInProject.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    dayOffset: getOffsetDays(task.dueDate),
    assigneeId: task.assigneeId,
    tags: task.tags || [],
    checklist: task.checklist?.map(c => ({ text: c.text, completed: c.completed })) || [],
    dependencies: task.dependencies || []
  }));

  const templateId = 'tpl_' + Math.floor(Math.random() * 1000000);
  const template: ProjectTemplate = {
    id: templateId,
    name: templateName,
    description: templateDesc,
    color: templateColor,
    tasks: templateTasks,
    isCustom: true,
    createdBy: user.id
  };

  // 1. Create Template
  await fetch('/api/project-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template)
  });

  // 2. Clear log
  const logId = 'log_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: logId,
      userId: user.id,
      userName: user.name,
      action: `Saved project "${projectName}" as new template "${templateName}"`,
      createdAt: Date.now()
    })
  });
}

export async function createProjectFromTemplate(
  template: ProjectTemplate,
  projectName: string,
  projectDesc: string,
  projectColor: string,
  user: UserProfile
) {
  // 1. Create Project
  const projId = 'proj_' + Math.floor(Math.random() * 1000000);
  const initialRoles: Record<string, any> = {};
  TEAM_MEMBERS.forEach(m => {
    initialRoles[m.id] = m.id === user.id ? 'Admin' : 'Member';
  });

  await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: projId,
      name: projectName,
      description: projectDesc,
      color: projectColor,
      memberRoles: initialRoles
    })
  });

  // Log creation activity
  const logId = 'log_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: logId,
      userId: user.id,
      userName: user.name,
      action: `Created new project "${projectName}" from template "${template.name}"`,
      createdAt: Date.now()
    })
  });

  // 2. Generate and map Task IDs
  const taskIdMap: Record<string, string> = {};
  template.tasks.forEach(task => {
    taskIdMap[task.id] = 'task_' + Math.floor(Math.random() * 1000000);
  });

  // 3. Insert Tasks with relative dates
  const today = new Date();
  for (const tTask of template.tasks) {
    const newTaskId = taskIdMap[tTask.id];
    
    const dDate = new Date();
    dDate.setDate(today.getDate() + tTask.dayOffset);
    const dueDateString = dDate.toISOString().split('T')[0];

    const mappedDeps = (tTask.dependencies || [])
      .map(oldId => taskIdMap[oldId])
      .filter((id): id is string => !!id);

    const taskData: Task = {
      id: newTaskId,
      projectId: projId,
      title: tTask.title,
      description: tTask.description,
      status: 'todo',
      priority: tTask.priority,
      dueDate: dueDateString,
      startDate: today.toISOString().split('T')[0],
      assigneeId: tTask.assigneeId,
      tags: tTask.tags,
      checklist: tTask.checklist.map((item, idx) => ({
        id: `c_${idx}_${Math.floor(Math.random() * 1000)}`,
        text: item.text,
        completed: false
      })),
      dependencies: mappedDeps,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
  }

  return projId;
}

// ---------------- DYNAMIC USERS OPERATIONS ----------------
export function subToUsers(callback: (users: UserProfile[]) => void) {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (active) callback(list);
    } catch (e) {
      console.error("Error polling user profiles:", e);
    }
  };

  poll();
  const indexInt = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(indexInt);
  };
}

export async function createUserProfile(profile: UserProfile, creator: UserProfile) {
  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });

  // Log activity
  const logId = 'log_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: logId,
      userId: creator.id,
      userName: creator.name,
      action: `Created new team member "${profile.name}" (${profile.role})`,
      createdAt: Date.now()
    })
  });
}

export async function updateUserProfile(id: string, updates: Partial<UserProfile>, changer: UserProfile) {
  await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  // Log activity
  const logId = 'log_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: logId,
      userId: changer.id,
      userName: changer.name,
      action: `Updated team member profile or role for "${updates.name || id}"`,
      createdAt: Date.now()
    })
  });
}

export async function deleteUserProfile(id: string, changer: UserProfile, memberName: string) {
  await fetch(`/api/users/${id}`, {
    method: 'DELETE'
  });

  const logId = 'log_' + Math.floor(Math.random() * 1000000);
  await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: logId,
      userId: changer.id,
      userName: changer.name,
      action: `Removed team member profile "${memberName}"`,
      createdAt: Date.now()
    })
  });
}