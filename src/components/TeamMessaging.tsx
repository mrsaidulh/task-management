import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, UserProfile } from '../types';
import { TEAM_MEMBERS } from '../data';
import { 
  Send, 
  Hash, 
  MessageSquare, 
  Users, 
  Search, 
  AtSign, 
  Sparkles,
  SearchCode
} from 'lucide-react';

interface TeamMessagingProps {
  messages: Message[];
  activeChannel: string;
  onSelectChannel: (channelId: string) => void;
  onSendMessage: (channelId: string, text: string) => Promise<void>;
  currentUser: UserProfile;
  onlineUsers: Record<string, boolean>;
  users?: UserProfile[];
}

const CHANNELS = [
  { id: 'general', name: 'general', desc: 'Central announcements and team check-ins' },
  { id: 'design', name: 'design-feedback', desc: 'UI assets, mock reviews, and wireframe specs' },
  { id: 'development', name: 'dev-stream', desc: 'Bug alerts, PR review requests, and CI/CD logs' },
  { id: 'marketing', name: 'goget-marketing', desc: 'Launch copy reviews, changelogs, and campaign calendars' }
];

export default function TeamMessaging({
  messages,
  activeChannel,
  onSelectChannel,
  onSendMessage,
  currentUser,
  onlineUsers,
  users
}: TeamMessagingProps) {
  const activeUsers = users && users.length > 0 ? users : TEAM_MEMBERS;
  const [inputText, setInputText] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [sending, setSending] = useState(false);
  
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to chat bottom
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(activeChannel, inputText);
      setInputText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!chatSearch.trim()) return messages;
    const s = chatSearch.toLowerCase();
    return messages.filter(m => m.text.toLowerCase().includes(s));
  }, [messages, chatSearch]);

  const activeChannelObj = useMemo(() => {
    return CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];
  }, [activeChannel]);

  // Mentions parser that encloses @NAME into highlighted span
  const formatMessageText = (text: string) => {
    const parts = text.split(/(@[a-zA-Z\s]+(?=\s|$)|\s)/);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const nameQuery = part.slice(1).trim().toLowerCase();
        // Check if query matches check any team member
        const found = activeUsers.some(m => m.name.toLowerCase().includes(nameQuery));
        if (found) {
          return (
            <span key={index} className="bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-md mx-0.5 inline-block text-[11px]">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  return (
    <div id="messaging_board_root" className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white border border-slate-200 rounded-2xl shadow-sm h-[calc(100vh-250px)] max-h-[750px] min-h-[500px] overflow-hidden">
      
      {/* Channels list column */}
      <div className="md:col-span-1 border-r border-slate-200 bg-slate-50/50 p-4 flex flex-col h-full">
        {/* Workspace Team Title */}
        <div className="pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-tight">Remote Workspace</h3>
              <p className="text-[10px] text-slate-400">Team chat rooms</p>
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-1">
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest px-2.5 mb-2">Discuss Channels</p>
          {CHANNELS.map(ch => {
            const isSelected = ch.id === activeChannel;
            return (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold leading-none duration-150 transition-colors ${
                  isSelected 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                    : 'hover:bg-slate-100 text-slate-600 border border-transparent'
                }`}
              >
                <Hash size={13} className={isSelected ? 'text-indigo-650' : 'text-slate-400'} />
                <span className="truncate">{ch.name}</span>
              </button>
            );
          })}

          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest px-2.5 mt-6 mb-2">Team Directory</p>
          <div className="space-y-2 px-1">
            {activeUsers.map(member => (
              <div key={member.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${member.avatarColor}`}>
                    {member.avatarText}
                  </div>
                  <span className="text-slate-600 font-semibold">{member.name}</span>
                </div>
                <span className={`inline-block w-2 h-2 rounded-full ${onlineUsers[member.id] ? 'bg-emerald-500' : 'bg-slate-350'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Current profile summary */}
        <div className="pt-3.5 border-t border-slate-200 mt-4 flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${currentUser.avatarColor}`}>
            {currentUser.avatarText}
          </div>
          <div className="truncate min-w-0">
            <p className="text-xs font-bold text-slate-800 leading-tight leading-none truncate">{currentUser.name}</p>
            <span className="text-[10px] text-slate-400 font-bold">{currentUser.role}</span>
          </div>
        </div>
      </div>

      {/* Primary chat workspace pane */}
      <div className="md:col-span-3 flex flex-col h-full">
        {/* Chat top context bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <Hash size={18} className="text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">#{activeChannelObj.name}</h2>
              <p className="text-[10px] text-slate-400">{activeChannelObj.desc}</p>
            </div>
          </div>

          <div className="relative w-full sm:w-60">
            <input
              type="text"
              placeholder="Search chat history..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 pl-8 border border-slate-250 bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-medium"
            />
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Messages Stream container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 scrollbar-thin">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-1.5 p-6">
              <MessageSquare size={32} className="text-slate-300 stroke-[1.5]" />
              <p className="font-medium">{chatSearch ? "No matches found." : `This is the start of #${activeChannelObj.name}`}</p>
              <p className="text-[10px] text-slate-400">Write a thread block below to collaborate in real-time!</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const sender = activeUsers.find(m => m.id === msg.senderId);
              const isSystem = msg.senderId === 'system_bot';
              const isMe = msg.senderId === currentUser.id;

              return (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  {/* Sender Avatar */}
                  <div className="mt-0.5 shrink-0">
                    {isSystem ? (
                      <div className="w-7 h-7 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center border border-indigo-200">
                        <Sparkles size={11} className="stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold border shadow-xs ${sender?.avatarColor || 'bg-slate-200 text-slate-600'}`}>
                        {sender?.avatarText || '?'}
                      </div>
                    )}
                  </div>

                  {/* Message body */}
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-[10px] ${isMe ? 'justify-end' : ''}`}>
                      <span className="font-bold text-slate-700">
                        {isSystem ? 'System Rules Engine' : (sender ? sender.name : 'Unknown Dev')}
                      </span>
                      {sender && !isSystem && (
                        <span className="text-slate-400">({sender.role})</span>
                      )}
                      <span className="text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                      isSystem 
                        ? 'bg-amber-50/50 text-slate-700 border-amber-250 rounded-tl-none'
                        : isMe 
                          ? 'bg-indigo-600 text-white border-indigo-750 rounded-tr-none' 
                          : 'bg-white text-slate-800 border-slate-200 rounded-tl-none'
                    }`}>
                      {formatMessageText(msg.text)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Chat input box */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              disabled={sending}
              placeholder={`Write a message to # ${activeChannelObj.name}... (Use @Name to mention developers)`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-350 rounded-xl text-xs bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500 hover:border-slate-300 transition-all font-medium"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs shrink-0 duration-150 transition-colors disabled:opacity-40"
              title="Send Message"
            >
              <Send size={14} />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
