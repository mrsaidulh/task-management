import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Briefcase, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  Eye, 
  EyeOff 
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  availableUsers: UserProfile[];
}

export default function LoginScreen({ onLoginSuccess, availableUsers }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials or connection error.');
        setLoading(false);
        return;
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError('Server connection failed. Please verify the backend service is active.');
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !role.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role: role.trim(),
          isOwner
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully! Logging you in...');
      setTimeout(() => {
        onLoginSuccess(data);
      }, 1200);
    } catch (err: any) {
      setError('Server connection failed. Please verify the backend service is active.');
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoUser: UserProfile) => {
    setEmail(demoUser.email);
    setPassword(demoUser.password || 'password123');
    setError('');
  };

  return (
    <div id="login_viewport_root" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Informative Column */}
        <div className="lg:col-span-5 bg-gradient-to-tr from-indigo-650 from-indigo-700 to-violet-800 p-8 lg:p-12 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white text-indigo-700 rounded-xl flex items-center justify-center font-bold shadow-md">
                <div className="w-4 h-4 bg-indigo-700 rounded-sm" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight leading-none">Fluresta</h1>
                <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold">Collaborative Portal</p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-2xl font-black tracking-tight leading-tight">
                Streamline your workspace sprints with automated workflows
              </h2>
              <p className="text-xs text-indigo-150 leading-relaxed font-medium">
                Fluresta offers agile task boards, structured sprint planning, and automatic rule-based escalations for elite software development and project coordination.
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Header Form */}
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {isRegistering ? 'Create Workspace Profile' : 'Authenticate Identity'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRegistering 
                  ? 'Recruit a new profile to Fluresta workspace with personalized parameters.' 
                  : 'Enter your credentials to sign in.'
                }
              </p>
            </div>

            {/* Error & Success indicators */}
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-xs font-semibold animate-shake">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-700 rounded-xl text-xs font-semibold">
                <Check size={16} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Login Form */}
            {!isRegistering ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="e.g. sarah.chen@asana.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Password PIN</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                      <span>{showPassword ? 'Hide password' : 'Show password'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={14} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="e.g. password123"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-mono tracking-wider font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 mt-2"
                >
                  <LogIn size={14} />
                  <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                </button>
              </form>
            ) : (
              // Register Form
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User size={14} />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Liam Sterling"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Job Title / Role</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Briefcase size={14} />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Senior Backend Architect"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="liam.sterling@cowork.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Password PIN</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                      <span>{showPassword ? 'Hide password' : 'Show password'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={14} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter password (at least 4 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-mono tracking-wider font-medium"
                    />
                  </div>
                </div>

                {/* Workspace Owner Privilege Toggle */}
                <div className="flex items-center justify-between bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                  <div className="space-y-0.5 pr-2">
                    <p className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-indigo-600 shrink-0" />
                      <span>Register as Workspace Owner</span>
                    </p>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Workspace Owners have full global permissions to manage team members, delete projects, and configure workflow automation.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isOwner}
                    onChange={(e) => setIsOwner(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-400 focus:outline-none border-slate-300 shrink-0 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 mt-2"
                >
                  <UserPlus size={14} />
                  <span>{loading ? 'Creating Profile...' : 'Create & Sign In'}</span>
                </button>
              </form>
            )}

            {/* Switch Toggle */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold focus:outline-none"
              >
                {isRegistering 
                  ? 'Already have a profile? Sign In' 
                  : 'Recruit a new profile? Sign Up / Register'
                }
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
