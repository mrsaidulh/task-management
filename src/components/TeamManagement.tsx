import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Key, 
  Trash2, 
  Edit2, 
  Mail, 
  Shield,
  LogIn,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface TeamManagementProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onlineUsers: Record<string, boolean>;
  onCreateMember: (profile: UserProfile) => Promise<void>;
  onUpdateMember: (id: string, updates: Partial<UserProfile>) => Promise<void>;
  onDeleteMember: (id: string, name: string) => Promise<void>;
  onLoginAsUser: (profile: UserProfile) => void;
}

const AVATAR_COLORS = [
  'bg-indigo-600 text-white border-indigo-700',
  'bg-sky-500 text-white border-sky-600',
  'bg-emerald-500 text-white border-emerald-600',
  'bg-pink-500 text-white border-pink-600',
  'bg-amber-500 text-white border-amber-600',
  'bg-rose-500 text-white border-rose-600',
  'bg-violet-600 text-white border-violet-700 font-extrabold',
  'bg-indigo-400 text-white border-indigo-500',
  'bg-teal-500 text-white border-teal-650'
];

export default function TeamManagement({
  users,
  currentUser,
  onlineUsers,
  onCreateMember,
  onUpdateMember,
  onDeleteMember,
  onLoginAsUser
}: TeamManagementProps) {
  const isOwner = !!currentUser.isOwner;

  // Modals / forms state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  
  // Create Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newIsOwner, setNewIsOwner] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editIsOwner, setEditIsOwner] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Login PIN verification state
  const [loginTargetUser, setLoginTargetUser] = useState<UserProfile | null>(null);
  const [verifyPasswordInput, setVerifyPasswordInput] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const generateInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  const handleOpenAdd = () => {
    setNewName('');
    setNewEmail('');
    setNewRole('');
    setNewIsOwner(false);
    setNewPassword('');
    setSelectedColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setShowFormPassword(false);
    setShowAddModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newRole.trim()) return;

    const initials = generateInitials(newName);
    const generatedId = 'user_' + Math.floor(Math.random() * 100000);

    const newProfile: UserProfile = {
      id: generatedId,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole.trim(),
      avatarColor: selectedColor,
      avatarText: initials,
      isOwner: newIsOwner,
      password: newPassword.trim()
    };

    try {
      await onCreateMember(newProfile);
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (member: UserProfile) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditIsOwner(!!member.isOwner);
    setEditPassword(member.password || '');
    setEditColor(member.avatarColor);
    setShowEditPassword(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const initials = generateInitials(editName);
    const updates: Partial<UserProfile> = {
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      role: editRole.trim(),
      avatarColor: editColor,
      avatarText: initials,
      isOwner: editIsOwner,
      password: editPassword.trim()
    };

    try {
      await onUpdateMember(editingMember.id, updates);
      setEditingMember(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser.id) {
      alert("You cannot delete your own profile while logged in.");
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${name} from the team?`)) {
      try {
        await onDeleteMember(id, name);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLoginClick = (user: UserProfile) => {
    if (user.password) {
      setLoginTargetUser(user);
      setVerifyPasswordInput('');
      setVerifyError('');
    } else {
      onLoginAsUser(user);
    }
  };

  const handleVerifyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginTargetUser) return;

    if (verifyPasswordInput.trim() === loginTargetUser.password) {
      onLoginAsUser(loginTargetUser);
      setLoginTargetUser(null);
    } else {
      setVerifyError('Incorrect PIN or Passcode. Please try again.');
    }
  };

  return (
    <div id="team_management_viewport" className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-indigo-600 shrink-0" size={22} />
            <span>Workspace Team Management</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isOwner ? 'You are acting as an Owner. You have administrative access to recruit members, set passcodes, and adjust roles.' : 'View team credentials, membership job roles, and login to your respective active account profiles.'}
          </p>
        </div>
        
        {isOwner && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm duration-150 transform hover:scale-[1.02] shrink-0"
          >
            <UserPlus size={14} />
            <span>Recruit Team Member</span>
          </button>
        )}
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((member) => {
          const isOnline = !!onlineUsers[member.id];
          const isMe = member.id === currentUser.id;
          const hasPin = !!member.password;

          return (
            <div 
              key={member.id} 
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 duration-150 transition-all flex flex-col justify-between ${
                isMe ? 'border-indigo-600 ring-2 ring-indigo-50 bg-indigo-50/5' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                
                {/* User Badges */}
                <div className="flex items-center justify-between">
                  {/* Presence indicator */}
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-[10px] text-slate-400 capitalize font-bold tracking-wider">
                      {isOnline ? 'Active Online' : 'Offline'}
                    </span>
                  </div>

                  {/* Role and Identity marker */}
                  <div className="flex items-center gap-1.5">
                    {member.isOwner ? (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md">
                        <Shield size={10} />
                        <span>Owner</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        <span>Staff</span>
                      </span>
                    )}

                    {isMe && (
                      <span className="text-[9px] font-extrabold uppercase text-emerald-705 bg-emerald-100 border border-emerald-250 px-2 py-0.5 rounded-md">
                        Logged In
                      </span>
                    )}
                  </div>
                </div>

                {/* Identity Core */}
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border tracking-wider shrink-0 shadow-xs ${member.avatarColor}`}>
                    {member.avatarText}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-800 leading-snug truncate">{member.name}</h3>
                    <p className="text-xs text-slate-500 leading-none truncate font-semibold mb-1">{member.role}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Mail size={10} className="shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security PIN Indicator & Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  {hasPin ? (
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-150 font-bold" title="PIN Protected Login">
                      <Lock size={10} />
                      <span>PIN Protected</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-semibold" title="Unprotected Profile Access">
                      <Unlock size={10} />
                      <span>Open Profile</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Delete Button (Owner block, cannot delete self or other owners if they aren't the primary, but here Owner can manage any team member) */}
                  {isOwner && !isMe && (
                    <button
                      onClick={() => handleDelete(member.id, member.name)}
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-405 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-100 duration-150"
                      title="Decommission Team Member"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  {/* Edit Profile Button (Owner block, or editable if they are themselves) */}
                  {(isOwner || isMe) && (
                    <button
                      onClick={() => handleOpenEdit(member)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 duration-150"
                      title="Configure Profile"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}

                  {/* Switch/Login Button */}
                  {!isMe && (
                    <button
                      onClick={() => handleLoginClick(member)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-80 bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white border border-slate-200 hover:border-indigo-600 rounded-xl text-[11px] font-black duration-150 shadow-xs"
                      title="Authenticate Login"
                    >
                      <LogIn size={11} />
                      <span>Login</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Visual Permissions Matrix Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600" />
            <span>Workspace Permissions Matrix</span>
          </h3>
          <p className="text-xs text-slate-400">
            Define global capabilities and authorization tiers for active roles in the Fluresta platform.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Workspace Capability</th>
                <th className="py-3 px-4 text-center">Workspace Owner</th>
                <th className="py-3 px-4 text-center">Workspace Staff</th>
                <th className="py-3 px-4 text-center">Workspace Guest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-700">Recruit & Decommission Team Members</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">✓</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-slate-300 text-xs">—</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-slate-300 text-xs">—</span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-700">Delete Project Records</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">✓</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-slate-300 text-xs">—</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-slate-300 text-xs">—</span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-700">Configure Workflow Automations</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">✓</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-slate-300 text-xs">—</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-slate-300 text-xs">—</span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-700">Create & Modify Sprint Tasks</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">✓</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">✓</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[9px] font-bold">Assigned Only</span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-700">Post Comments & Message Feed</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">✓</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">✓</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">✓</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD NEW MEMBER MODAL (OWNER ONLY) --- */}
      {showAddModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="text-indigo-600" size={18} />
                <span>Recruit Team Member</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 duration-150"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Sterling"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="liam.sterling@cowork.io"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Job Title / Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Architect"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150"
                />
              </div>

              {/* Admin Privileges Toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 border border-slate-150 rounded-xl">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-700">Give Workspace Owner Level</p>
                  <p className="text-[10px] text-slate-400">Allows full member, project, and passcode administration rights</p>
                </div>
                <input
                  type="checkbox"
                  checked={newIsOwner}
                  onChange={(e) => setNewIsOwner(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-400 focus:outline-none border-slate-300"
                />
              </div>

              {/* Login PIN Protection */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-600 flex items-center gap-1.5">
                    <Key size={12} className="text-slate-400" />
                    <span>Login Passcode PIN (Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    {showFormPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
                <input
                  type={showFormPassword ? 'text' : 'password'}
                  placeholder="e.g. 4-digit numeric code or text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150 font-mono tracking-wider"
                />
                <p className="text-[10px] text-slate-400">If left blank, profile can be quick-swapped without entering credentials.</p>
              </div>

              {/* Profile Appearance / Avatar Color */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Profile Swatch Theme Color</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AVATAR_COLORS.map((colorClass) => {
                    const sampleInitials = newName ? generateInitials(newName) : '??';
                    return (
                      <button
                        type="button"
                        key={colorClass}
                        onClick={() => setSelectedColor(colorClass)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all ${colorClass} ${
                          selectedColor === colorClass ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {sampleInitials}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 hover:bg-slate-50 text-slate-500 rounded-xl font-bold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Confirm Addition
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MEMBER MODAL (OWNER OR SELF) --- */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="text-indigo-600" size={18} />
                <span>Configure Profile - {editingMember.name}</span>
              </h3>
              <button 
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 duration-150"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Job Title / Role</label>
                <input
                  type="text"
                  required
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150"
                />
              </div>

              {/* Owner Privileges Toggle (Only if current active user is owner) */}
              {isOwner ? (
                <div className="flex items-center justify-between bg-slate-50 p-3.5 border border-slate-150 rounded-xl">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-700">Give Workspace Owner Level</p>
                    <p className="text-[10px] text-slate-400">Allows full member, project, and passcode administration rights</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsOwner}
                    onChange={(e) => setEditIsOwner(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-400 focus:outline-none border-slate-300"
                    disabled={editingMember.id === currentUser.id && editingMember.isOwner} // Cannot demote yourself if you are current active user
                  />
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-[10px] text-slate-400 font-semibold border border-slate-150">
                  <ShieldCheck size={14} className="text-slate-405 shrink-0" />
                  <span>Only Workspace Owners can escalate or demote administrative privileges.</span>
                </div>
              )}

              {/* Login PIN Protection (Only if current user is owner OR editing themselves) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-600 flex items-center gap-1.5">
                    <Key size={12} className="text-slate-400" />
                    <span>Login Passcode PIN (Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    {showEditPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </div>
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  placeholder="No Passcode PIN Set (Unlocked Profile)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150 font-mono tracking-wider"
                />
                <p className="text-[10px] text-slate-400">If set, any other user must enter this passcode key to switch to this account.</p>
              </div>

              {/* Profile Color selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Profile Swatch Theme Color</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AVATAR_COLORS.map((colorClass) => {
                    const initials = generateInitials(editName || '??');
                    return (
                      <button
                        type="button"
                        key={colorClass}
                        onClick={() => setEditColor(colorClass)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all ${colorClass} ${
                          editColor === colorClass ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {initials}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 hover:bg-slate-50 text-slate-500 rounded-xl font-bold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Configuration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- LOGIN PIN ENTRY PROMPT MODAL --- */}
      {loginTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-scale-in text-center">
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Lock size={20} />
              </div>
              <h3 className="text-base font-black text-slate-800">Passcode Required</h3>
              <p className="text-xs text-slate-450">
                The account profile for <span className="font-extrabold text-slate-700">{loginTargetUser.name}</span> requires a passcode verification.
              </p>
            </div>

            <form onSubmit={handleVerifyLogin} className="space-y-4 text-xs">
              
              <div className="space-y-1 text-left">
                <label className="font-bold text-slate-600">Enter Security PIN / Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="••••••••"
                  value={verifyPasswordInput}
                  onChange={(e) => setVerifyPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-150 font-mono text-center tracking-widest text-lg"
                />
                
                {verifyError && (
                  <div className="flex items-center gap-1.5 p-2 px-3 bg-rose-50 text-rose-600 border border-rose-150 rounded-lg text-[10px] font-bold mt-1.5">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLoginTargetUser(null)}
                  className="flex-1 px-4 py-2 hover:bg-slate-100 text-slate-500 rounded-xl font-bold border border-slate-200"
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
