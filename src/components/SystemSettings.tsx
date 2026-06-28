import React, { useState, useEffect } from 'react';
import { UserProfile, SmtpConfig } from '../types';
import TeamManagement from './TeamManagement';
import { 
  Settings, 
  Users, 
  Mail, 
  Save, 
  Send, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Info,
  Sliders,
  ShieldCheck
} from 'lucide-react';

interface SystemSettingsProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onlineUsers: Record<string, boolean>;
  onCreateMember: (profile: UserProfile) => Promise<void>;
  onUpdateMember: (id: string, updates: Partial<UserProfile>) => Promise<void>;
  onDeleteMember: (id: string, name: string) => Promise<void>;
  onLoginAsUser: (profile: UserProfile) => void;
}

export default function SystemSettings({
  users,
  currentUser,
  onlineUsers,
  onCreateMember,
  onUpdateMember,
  onDeleteMember,
  onLoginAsUser
}: SystemSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'team' | 'smtp'>('team');
  
  // SMTP Config Form State
  const [host, setHost] = useState('smtp.mailtrap.io');
  const [port, setPort] = useState(2525);
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [senderEmail, setSenderEmail] = useState('noreply@fluresta.com');
  const [senderName, setSenderName] = useState('Fluresta Worksuite');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Notification States
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testRecipient, setTestRecipient] = useState(currentUser.email || '');

  // Load SMTP Config on Mount
  useEffect(() => {
    const fetchSmtpConfig = async () => {
      setLoadingConfig(true);
      try {
        const response = await fetch('/api/settings/smtp');
        if (response.ok) {
          const data: SmtpConfig = await response.json();
          setHost(data.host || 'smtp.mailtrap.io');
          setPort(data.port || 2525);
          setSecure(!!data.secure);
          setUsername(data.username || '');
          setPassword(data.password || '');
          setSenderEmail(data.senderEmail || 'noreply@fluresta.com');
          setSenderName(data.senderName || 'Fluresta Worksuite');
        }
      } catch (e) {
        console.error('Failed to load SMTP config:', e);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchSmtpConfig();
  }, []);

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveStatus(null);
    
    try {
      const response = await fetch('/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port: Number(port),
          secure,
          username: username.trim(),
          password,
          senderEmail: senderEmail.trim(),
          senderName: senderName.trim()
        })
      });
      
      if (response.ok) {
        setSaveStatus({
          type: 'success',
          message: 'SMTP Email Configuration has been securely saved to the database.'
        });
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Server rejected SMTP config saving.');
      }
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Failed to save SMTP configuration. Please try again.'
      });
    } finally {
      setSavingConfig(false);
      setTimeout(() => setSaveStatus(null), 8000);
    }
  };

  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;
    
    setTestingConnection(true);
    setTestStatus(null);
    
    try {
      const response = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: testRecipient.trim().toLowerCase(),
          host: host.trim(),
          port: Number(port),
          secure,
          username: username.trim(),
          password,
          senderEmail: senderEmail.trim(),
          senderName: senderName.trim()
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setTestStatus({
          type: 'success',
          message: `Test email dispatched successfully! Server returned Message-ID: ${data.messageId}`
        });
      } else {
        throw new Error(data.error || 'SMTP handshake or authorization rejected.');
      }
    } catch (err: any) {
      setTestStatus({
        type: 'error',
        message: err.message || 'SMTP Connection failed. Verify your host, port, credentials and SSL settings.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div id="system_settings_viewport" className="space-y-6">
      
      {/* Settings Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="text-indigo-600 animate-spin-slow" size={22} />
            <span>Fluresta System Settings</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure system parameters, administrative users, job credentials, and transactional mail relay.
          </p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeSubTab === 'team'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-150/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/55'
            }`}
          >
            <Users size={14} />
            <span>Fluresta Team Management</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveSubTab('smtp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeSubTab === 'smtp'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-150/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/55'
            }`}
          >
            <Mail size={14} />
            <span>SMTP Configuration</span>
          </button>
        </div>
      </div>

      {/* Main Settings Sub-Tab Views */}
      <div className="transition-all duration-300">
        
        {activeSubTab === 'team' ? (
          <div className="animate-fade-in">
            <TeamManagement
              users={users}
              currentUser={currentUser}
              onlineUsers={onlineUsers}
              onCreateMember={onCreateMember}
              onUpdateMember={onUpdateMember}
              onDeleteMember={onDeleteMember}
              onLoginAsUser={onLoginAsUser}
            />
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {loadingConfig ? (
              <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-3xl space-y-3">
                <Loader2 className="text-indigo-600 animate-spin" size={32} />
                <span className="text-sm font-semibold text-slate-500">Retrieving SMTP credentials...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* SMTP Form Column */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Sliders size={16} className="text-indigo-600" />
                      <span>SMTP Transactional Mail Relay</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      Fluresta uses SMTP to dispatch automatic notification alerts, backlog comments, assigned sprint deliverables, and workflow triggers to remote workers.
                    </p>
                  </div>

                  <form onSubmit={handleSaveSmtp} className="space-y-5">
                    
                    {/* Host and Port */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Host */}
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">SMTP Host Server</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. smtp.mailgun.org, smtp.gmail.com"
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      {/* Port */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">SMTP Port</label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 587, 465, 25"
                          value={port}
                          onChange={(e) => setPort(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                        />
                      </div>

                    </div>

                    {/* Username & Password */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Username */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">SMTP Username</label>
                        <input
                          type="text"
                          required
                          placeholder="Authentication username or API key"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">SMTP Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Sender Identity Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Sender Email */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Sender Mail Address</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. notifications@fluresta.com"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      {/* Sender Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Sender Display Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Fluresta Notifications"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                    </div>

                    {/* SSL/TLS Security Option */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div className="flex gap-2.5 items-start">
                        <Info size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">Use Strict SSL/TLS Connection</span>
                          <span className="text-[10px] text-slate-400 block leading-tight">
                            Enable if SMTP server strictly requires SMTPS (usually port 465). Disable for STARTTLS/Plain connections (usually port 587 or 25).
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={secure}
                          onChange={(e) => setSecure(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                      </label>
                    </div>

                    {/* Save Action Status Banner */}
                    {saveStatus && (
                      <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-medium animate-fade-in ${
                        saveStatus.type === 'success' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        {saveStatus.type === 'success' ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <span>{saveStatus.message}</span>
                      </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={savingConfig}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                      >
                        {savingConfig ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Saving Config...</span>
                          </>
                        ) : (
                          <>
                            <Save size={14} />
                            <span>Save SMTP Settings</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </div>

                {/* SMTP Tester Right Column */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span>SMTP Credentials Tester</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      Verify your connection in real-time. This executes a complete handshake and sends a test notification.
                    </p>
                  </div>

                  <form onSubmit={handleTestSmtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Recipient Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. engineer@team.com"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={testingConnection || !testRecipient}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Executing Handshake...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Dispatch Test Email</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Connection Test Results */}
                  {testStatus && (
                    <div className={`p-4 rounded-2xl border text-xs leading-normal font-medium space-y-1.5 animate-fade-in ${
                      testStatus.type === 'success'
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50/50 border-rose-200 text-rose-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        {testStatus.type === 'success' ? (
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle size={15} className="text-rose-600 shrink-0" />
                        )}
                        <span className="font-extrabold uppercase tracking-wider text-[10px]">
                          {testStatus.type === 'success' ? 'Connection Success' : 'Connection Refused'}
                        </span>
                      </div>
                      <p className="text-[11px] italic font-medium leading-normal">{testStatus.message}</p>
                    </div>
                  )}

                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-[10px] text-slate-500 leading-normal space-y-1.5">
                    <span className="font-extrabold text-indigo-800 uppercase tracking-wider text-[9px] block">Test servers to try:</span>
                    <ul className="list-disc list-inside space-y-1 font-medium">
                      <li><strong>Mailtrap</strong>: Sandbox credential testing</li>
                      <li><strong>Gmail</strong>: SMTP server: smtp.gmail.com (Port 465/587)</li>
                      <li><strong>SendGrid</strong>: SMTP server: smtp.sendgrid.net (Port 587)</li>
                    </ul>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
