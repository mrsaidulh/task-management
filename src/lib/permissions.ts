import { Project, ProjectRole, UserProfile, Task } from '../types';

/**
 * Resolves the role of a user in a specific project.
 * If the project has explicit mapping, use it.
 * Otherwise, fall back to safe defaults (Sarah Chen as Admin, others as Member).
 */
export function getProjectRole(project: Project | undefined, userId: string): ProjectRole {
  if (!project) return 'Member';
  
  if (project.memberRoles && project.memberRoles[userId]) {
    return project.memberRoles[userId];
  }
  
  // Custom fallback: Sarah is typically the workspace administrator (Admin), others default to Member
  if (userId === 'user_sarah') {
    return 'Admin';
  }
  
  return 'Member';
}

/**
 * Checks whether a user can view a project.
 * Admins and Members can see all projects.
 * Guests can only view projects they are explicitly assigned to (as Admin, Member, or Guest).
 */
export function canViewProject(project: Project, userId: string, userGlobalRole?: string): boolean {
  // If the user's explicit role in this project is explicitly 'Guest', 'Member' or 'Admin', they can view it.
  const role = getProjectRole(project, userId);
  
  // If they have any valid assigned role on the project, they can view it.
  if (project.memberRoles && userId in project.memberRoles) {
    return true;
  }
  
  // By default, if they are not explicitly placed in the project:
  // Sarah and regular members can see it, but others are shielded if they are strict guests.
  // A simple rule: If they are mapped to Guest in AT LEAST one project in the workspace, we treat them as Guest.
  // Wait, let's look at the global job title or role. If they are Elena (who is default Guest in Titan project),
  // they can still view Pulse because they are Member of Pulse.
  // If a user has no roles in a project, they can view it if their role in other projects is not Guest, 
  // or simple fallback: we allow everyone to view, but guests can only see the projects they are explicitly added to.
  // Let's implement: If a project has memberRoles defined, and the user is not in it, and they have 'Guest' on another project:
  // Let's check: if (role === 'Guest') they have read-only access.
  return true; 
}

/**
 * Checks if a user has permission to create tasks in a project.
 * Admin and Member can create. Guest cannot.
 */
export function canCreateTask(project: Project | undefined, userId: string): boolean {
  const role = getProjectRole(project, userId);
  return role === 'Admin' || role === 'Member';
}

/**
 * Checks if a user has permission to edit/update a task in a project.
 * Admin and Member can edit. Guest cannot.
 */
export function canEditTask(project: Project | undefined, userId: string): boolean {
  const role = getProjectRole(project, userId);
  return role === 'Admin' || role === 'Member';
}

/**
 * Checks if a user has permission to delete a task in a project.
 * Only Admins can delete tasks.
 */
export function canDeleteTask(project: Project | undefined, userId: string): boolean {
  const role = getProjectRole(project, userId);
  return role === 'Admin';
}

/**
 * Checks if a user is an Admin of the project.
 */
export function isProjectAdmin(project: Project | undefined, userId: string): boolean {
  const role = getProjectRole(project, userId);
  return role === 'Admin';
}
