export interface UserProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarColor: string;
  avatarText: string;
  isOwner?: boolean;
  password?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  assigneeId: string;
  tags: string[];
  checklist: TaskChecklistItem[];
  projectId: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  dependencies?: string[]; // IDs of tasks that block this task
  order?: number; // Real position coordinate for drag-and-drop hierarchy
  timeSpent?: number; // Total time spent in seconds
}

export interface WorkflowRule {
  id: string;
  name: string;
  active: boolean;
  triggerType: 'status_change' | 'priority_change' | 'checklist_completed' | 'deadline_near';
  triggerValue: string; // e.g., 'done', 'high'
  actionType: 'reassign' | 'add_tags' | 'post_comment' | 'set_due_date_days';
  actionValue: string; // e.g. userId, 'v4-review', 'AUTOMATED: Check accuracy of completed task', or '3' (days)
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  text: string;
  createdAt: number;
  taskId?: string; // Optional reference to a task
}

export interface TaskComment {
  id: string;
  taskId: string;
  senderId: string;
  text: string;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string; // 'create_task', 'change_status', 'trigger_workflow', etc.
  taskId?: string;
  taskTitle?: string;
  createdAt: number;
}

export type ProjectRole = 'Admin' | 'Member' | 'Guest';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  memberRoles?: Record<string, ProjectRole>;
}

export interface TemplateTask {
  id: string; // Placeholder string id, used only to establish dependency relations inside the template
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dayOffset: number; // Days from template project creation to set dueDate
  assigneeId: string;
  tags: string[];
  checklist: { text: string; completed: boolean }[];
  dependencies?: string[]; // IDs of TemplateTasks in the same list
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  tasks: TemplateTask[];
  isCustom?: boolean; // True if it's created by a user from an existing project
  createdBy?: string;
}

export interface TimeLog {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  description: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  senderEmail: string;
  senderName: string;
  updatedAt?: number;
}

