import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Logo } from '../components/Logo';
import { Credits } from '../components/Credits';
import { User, Post, ReportItem } from '../types';
import {
  ShieldAlert,
  Users,
  Film,
  Flag,
  Activity,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Ban,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface AdminPanelProps {
  onBack: () => void;
  onSelectUser?: (userId: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onSelectUser }) => {
  const {
    currentUser,
    users,
    banUser,
    unbanUser,
    deleteUserAdmin,
    makeAdmin,
    removeAdmin,
    adminLogs,
  } = useAuth();

  const {
    posts,
    reports,
    dismissReport,
    actionReport,
    adminDeletePost,
    adminDeleteComment,
    setActivePostId,
  } = useData();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'posts' | 'reports' | 'logs'>('dashboard');
  const [userSearch, setUserSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');

  // Modals state
  const [banTargetUser, setBanTargetUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('Violation of community standards');
  const [banDuration, setBanDuration] = useState<'1' | '7' | '30' | 'permanent'>('permanent');

  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const [deleteTargetPost, setDeleteTargetPost] = useState<Post | null>(null);

  // Security check: only admins allowed
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-[#EF4444]" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          You do not have administrative privileges to view the Mehfil Management Console.
        </p>
        <button
          onClick={onBack}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-xs font-semibold"
        >
          Return to App
        </button>
      </div>
    );
  }

  // Dashboard Metrics
  const totalUsers = users.length;
  const bannedUsers = users.filter(u => u.status === 'banned').length;
  const totalPosts = posts.length;
  const pendingReports = reports.filter(r => r.status === 'pending').length;

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // Filtered Posts
  const filteredPosts = posts.filter(p => {
    const q = postSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.caption.toLowerCase().includes(q) ||
      p.authorUsername.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q)
    );
  });

  const handleConfirmBan = () => {
    if (!banTargetUser) return;
    banUser(banTargetUser.id, banReason, banDuration);
    setBanTargetUser(null);
    setBanReason('Violation of community standards');
    setBanDuration('permanent');
  };

  const handleConfirmDeleteUser = () => {
    if (!deleteTargetUser || deleteConfirmationText !== 'DELETE') return;
    deleteUserAdmin(deleteTargetUser.id);
    setDeleteTargetUser(null);
    setDeleteConfirmationText('');
  };

  return (
    <div className="min-h-screen w-full bg-[#111111] text-white flex flex-col justify-between selection:bg-[#FACC15] selection:text-black">
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
              title="Return to App"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Logo variant="compact" size="sm" />
            <div className="border-l border-zinc-800 pl-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-wide">Admin Console</span>
                <span className="bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Root
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Logged in as <strong className="text-[#FACC15]">{currentUser.email}</strong>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-2xl overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'dashboard' ? 'bg-[#FACC15] text-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'users' ? 'bg-[#FACC15] text-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users ({totalUsers})</span>
            </button>

            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'posts' ? 'bg-[#FACC15] text-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Posts ({totalPosts})</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all relative ${
                activeTab === 'reports' ? 'bg-[#FACC15] text-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Reports</span>
              {pendingReports > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingReports}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'logs' ? 'bg-[#FACC15] text-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* TAB 1: DASHBOARD METRICS                                     */}
        {/* ============================================================ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#FACC15]" />
                  Registered Users
                </span>
                <p className="text-2xl sm:text-3xl font-black text-white">{totalUsers}</p>
                <p className="text-[10px] text-zinc-500">Real verified signups</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-sky-400" />
                  Live Posts
                </span>
                <p className="text-2xl sm:text-3xl font-black text-white">{totalPosts}</p>
                <p className="text-[10px] text-zinc-500">Reels & Photos published</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5 text-[#EF4444]" />
                  Banned Users
                </span>
                <p className="text-2xl sm:text-3xl font-black text-red-400">{bannedUsers}</p>
                <p className="text-[10px] text-zinc-500">Suspended from platform</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5 text-amber-400" />
                  Pending Reports
                </span>
                <p className="text-2xl sm:text-3xl font-black text-[#FACC15]">{pendingReports}</p>
                <p className="text-[10px] text-zinc-500">Awaiting moderator review</p>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FACC15]" />
                  System Overview
                </h3>
                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Mehfil operates with zero fake data. All accounts, feeds, reels, comments, and direct messages come directly from real users who completed signup and email verification. Full moderation authority allows administrators to enforce community standards, issue suspensions, review user reports, and remove inappropriate content.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-1">
                  <p className="font-semibold text-white">Database & Persistence</p>
                  <p className="text-zinc-400 text-[11px]">
                    Firestore Dual-Mode: Ready for Firebase Cloud or live browser session sandbox.
                  </p>
                </div>
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-1">
                  <p className="font-semibold text-white">Admin Privileges</p>
                  <p className="text-zinc-400 text-[11px]">
                    Multi-role access control enforced with protective safeguards preventing self-lockout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: USER MANAGEMENT                                       */}
        {/* ============================================================ */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users by name, @username, or email..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-[#FACC15] focus:outline-none text-white text-xs rounded-2xl py-2.5 pl-10 pr-4 placeholder-zinc-500"
              />
            </div>

            {/* Users List */}
            <div className="space-y-2.5">
              {filteredUsers.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center text-zinc-500 text-xs">
                  No users found matching query.
                </div>
              ) : (
                filteredUsers.map(u => {
                  const isCurrent = u.id === currentUser.id;
                  const isUserAdmin = u.role === 'admin';
                  const isBanned = u.status === 'banned';

                  return (
                    <div
                      key={u.id}
                      className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="w-12 h-12 rounded-full object-cover border border-zinc-800 shrink-0"
                        />
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm">{u.name}</span>
                            <span className="text-zinc-400">@{u.username}</span>
                            {isUserAdmin && (
                              <span className="bg-[#FACC15] text-black text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase">
                                Admin
                              </span>
                            )}
                            {isBanned && (
                              <span className="bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase">
                                Banned
                              </span>
                            )}
                            {isCurrent && (
                              <span className="bg-zinc-800 text-zinc-300 text-[9px] px-1.5 py-0.2 rounded-md">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-400 text-[11px]">{u.email}</p>
                          <p className="text-zinc-500 text-[10px]">
                            Joined: {new Date(u.createdAt).toLocaleDateString()} • {u.postsCount || 0} posts • {u.followersCount || 0} followers
                          </p>
                          {isBanned && (
                            <p className="text-red-400 text-[10px] font-medium pt-0.5">
                              Ban Reason: {u.banReason || 'Standards violation'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {onSelectUser && (
                          <button
                            onClick={() => onSelectUser(u.id)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View
                          </button>
                        )}

                        {!isCurrent && (
                          <>
                            {/* Ban / Unban */}
                            {isBanned ? (
                              <button
                                onClick={() => unbanUser(u.id)}
                                className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                              >
                                Unban
                              </button>
                            ) : (
                              !isUserAdmin && (
                                <button
                                  onClick={() => setBanTargetUser(u)}
                                  className="bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  Ban
                                </button>
                              )
                            )}

                            {/* Promote / Demote Admin */}
                            {!isUserAdmin ? (
                              <button
                                onClick={() => makeAdmin(u.id)}
                                className="bg-yellow-950/50 hover:bg-yellow-900/60 border border-[#FACC15]/40 text-[#FACC15] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                                title="Make Administrator"
                              >
                                +Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => removeAdmin(u.id)}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-2.5 py-1.5 rounded-xl text-xs transition-colors"
                                title="Remove Administrator role"
                              >
                                -Admin
                              </button>
                            )}

                            {/* Delete User */}
                            {!isUserAdmin && (
                              <button
                                onClick={() => setDeleteTargetUser(u)}
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: POSTS MODERATION                                      */}
        {/* ============================================================ */}
        {activeTab === 'posts' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Search Posts */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={postSearch}
                onChange={e => setPostSearch(e.target.value)}
                placeholder="Search posts by caption or creator..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-[#FACC15] focus:outline-none text-white text-xs rounded-2xl py-2.5 pl-10 pr-4 placeholder-zinc-500"
              />
            </div>

            {/* Posts Grid */}
            <div className="space-y-3">
              {filteredPosts.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center text-zinc-500 text-xs">
                  No posts created yet.
                </div>
              ) : (
                filteredPosts.map(p => (
                  <div
                    key={p.id}
                    className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 flex-1">
                      <div
                        onClick={() => setActivePostId(p.id, posts)}
                        className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 cursor-pointer group relative"
                      >
                        <img
                          src={p.thumbnailUrl || p.mediaUrl}
                          alt={p.caption}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                          View
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">@{p.authorUsername}</span>
                          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-300 uppercase">
                            {p.type}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-zinc-200 line-clamp-2 leading-relaxed">{p.caption}</p>
                        <p className="text-[10px] text-zinc-500">
                          {p.likesCount} likes • {p.commentsCount} comments • {p.sharesCount} shares
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => setActivePostId(p.id, posts)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => setDeleteTargetPost(p)}
                        className="bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Post
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: REPORTS MODERATION                                    */}
        {/* ============================================================ */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-fadeIn">
            {reports.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-12 text-center space-y-2 text-zinc-500 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-zinc-300 font-bold text-sm">Inbox Zero</p>
                <p>No content or user reports currently pending review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(rep => (
                  <div
                    key={rep.id}
                    className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="text-xs space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-400 uppercase tracking-wide text-[10px] bg-red-950/60 border border-red-800/80 px-2 py-0.5 rounded-md">
                          Reported {rep.targetType}
                        </span>
                        <span className="text-zinc-500 text-[10px]">
                          By @{rep.reporterUsername} • {new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.2 rounded-full font-bold uppercase ${
                            rep.status === 'pending'
                              ? 'bg-yellow-950 text-[#FACC15] border border-yellow-800/60'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>
                      <p className="text-white font-medium">
                        Reason: <span className="text-zinc-200">{rep.reason}</span>
                      </p>
                      {rep.targetDetails?.caption && (
                        <p className="text-zinc-400 text-[11px] italic bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                          "{rep.targetDetails.caption}"
                        </p>
                      )}
                    </div>

                    {rep.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => dismissReport(rep.id)}
                          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Dismiss
                        </button>
                        {rep.targetType === 'post' && (
                          <button
                            onClick={() => actionReport(rep.id, 'delete_post')}
                            className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Delete Post
                          </button>
                        )}
                        <button
                          onClick={() => actionReport(rep.id, 'ban_user')}
                          className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Ban User
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: AUDIT LOG                                             */}
        {/* ============================================================ */}
        {activeTab === 'logs' && (
          <div className="space-y-3 animate-fadeIn">
            {adminLogs.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center text-zinc-500 text-xs">
                No administrative actions logged yet.
              </div>
            ) : (
              <div className="space-y-2">
                {adminLogs.map(log => (
                  <div
                    key={log.id}
                    className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#FACC15] uppercase tracking-wider text-[10px]">
                          {log.action.replace('_', ' ')}
                        </span>
                        <span className="text-white font-medium">{log.targetName}</span>
                      </div>
                      <p className="text-zinc-500 text-[10px]">
                        Admin: {log.adminEmail} • {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.reason && (
                        <p className="text-zinc-400 text-[10px]">Detail: {log.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Credits on Admin Panel */}
        <Credits className="pt-4" />
      </div>

      {/* ============================================================ */}
      {/* BAN USER MODAL                                               */}
      {/* ============================================================ */}
      {banTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-red-900/60 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto text-[#EF4444]">
              <Ban className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-white text-base">Ban User: @{banTargetUser.username}</h3>
              <p className="text-xs text-zinc-400">
                This user will be logged out and locked out of all feeds and chats.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1">Reason for Suspension</label>
                <input
                  type="text"
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  placeholder="e.g. Inappropriate content, spam"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Suspension Duration</label>
                <select
                  value={banDuration}
                  onChange={e => setBanDuration(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                >
                  <option value="1">24 Hours (1 Day)</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="permanent">Permanent Suspension</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setBanTargetUser(null)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold py-2.5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBan}
                className="flex-1 bg-[#EF4444] hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-red-900/40"
              >
                Apply Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE USER ACCOUNT MODAL (SAFETY TYPE: "DELETE")            */}
      {/* ============================================================ */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-red-900 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 flex items-center justify-center mx-auto text-[#EF4444]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-white text-base">Permanent Account Deletion</h3>
              <p className="text-xs text-zinc-400">
                You are about to purge <strong className="text-white">@{deleteTargetUser.username}</strong> ({deleteTargetUser.email}).
              </p>
            </div>

            <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-[11px] text-red-300">
              Type <strong className="font-mono text-white">DELETE</strong> below to confirm permanent eradication.
            </div>

            <input
              type="text"
              value={deleteConfirmationText}
              onChange={e => setDeleteConfirmationText(e.target.value)}
              placeholder='Type "DELETE"'
              className="w-full bg-zinc-900 border border-zinc-700 text-center font-mono font-bold tracking-widest rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500 text-sm"
            />

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteTargetUser(null);
                  setDeleteConfirmationText('');
                }}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold py-2.5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmationText !== 'DELETE'}
                onClick={handleConfirmDeleteUser}
                className="flex-1 bg-[#EF4444] hover:bg-red-600 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-red-900/40 transition-opacity"
              >
                Eradicate User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE POST MODAL                                            */}
      {/* ============================================================ */}
      {deleteTargetPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Delete Post?</h3>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete this post by @{deleteTargetPost.authorUsername}?
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetPost(null)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold py-2.5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  adminDeletePost(deleteTargetPost.id);
                  setDeleteTargetPost(null);
                }}
                className="flex-1 bg-[#EF4444] hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
