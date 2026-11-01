import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { Credits } from '../components/Credits';
import { StoriesRow } from '../components/StoriesRow';
import { VideoFeed } from './VideoFeed';
import { PhotoPostCard } from '../components/PhotoPostCard';
import { useData } from '../context/DataContext';
import { Bell, Send, Sparkles, Film, Image as ImageIcon, PlusSquare } from 'lucide-react';

interface HomeScreenProps {
  onSelectUser: (userId: string) => void;
  onOpenNotifications: () => void;
  onOpenMessages: () => void;
  onOpenUpload?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectUser,
  onOpenNotifications,
  onOpenMessages,
  onOpenUpload,
}) => {
  const { posts = [], stories = [], unreadNotificationCount = 0, unreadMessageCount = 0 } = useData();
  const [feedMode, setFeedMode] = useState<'reels' | 'feed'>('reels');

  const safePosts = Array.isArray(posts) ? posts : [];
  const safeStories = Array.isArray(stories) ? stories : [];

  const photoPosts = safePosts.filter(p => p && p.type === 'photo');
  const videoPosts = safePosts.filter(p => p && p.type === 'video');

  return (
    <div className="w-full max-w-lg mx-auto pb-24">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 bg-[#111111]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
        <Logo variant="compact" size="sm" />

        {/* Feed Mode Switcher (TikTok Reels vs Photo Feed) */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-0.5 rounded-xl">
          <button
            onClick={() => setFeedMode('reels')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              feedMode === 'reels'
                ? 'bg-[#FACC15] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Reels</span>
          </button>
          <button
            onClick={() => setFeedMode('feed')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              feedMode === 'feed'
                ? 'bg-[#FACC15] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Feed</span>
          </button>
        </div>

        {/* Right Icon Actions: Notifications & Messages */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenMessages}
            className="relative p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
            title="Direct Messages"
          >
            <Send className="w-5 h-5" />
            {unreadMessageCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FACC15] text-black text-[10px] font-bold flex items-center justify-center">
                {unreadMessageCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Stories Row on top (Instagram Style) */}
      <StoriesRow stories={safeStories} />

      {/* Main Feed Content Area */}
      <main className="pt-3 px-2">
        {feedMode === 'reels' ? (
          videoPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4 bg-zinc-950/60 border border-zinc-800/80 rounded-3xl mx-2">
              <div className="w-16 h-16 rounded-full bg-yellow-950/40 border border-[#FACC15]/30 flex items-center justify-center text-[#FACC15] shadow-lg shadow-yellow-950/30">
                <Film className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="font-bold text-white text-base">No video reels yet</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  No posts yet. Follow people or create your first post on Mehfil!
                </p>
              </div>
              {onOpenUpload && (
                <button
                  onClick={onOpenUpload}
                  className="bg-[#FACC15] hover:bg-[#eab308] text-black font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-yellow-500/10 active:scale-95 transition-all"
                >
                  <PlusSquare className="w-4 h-4 text-black" />
                  <span>Create Post</span>
                </button>
              )}
            </div>
          ) : (
            <VideoFeed onSelectUser={onSelectUser} />
          )
        ) : (
          <div className="space-y-4">
            {photoPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4 bg-zinc-950/60 border border-zinc-800/80 rounded-3xl mx-2">
                <div className="w-16 h-16 rounded-full bg-yellow-950/40 border border-[#FACC15]/30 flex items-center justify-center text-[#FACC15]">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="font-bold text-white text-base">No photo posts yet</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    No posts yet. Follow people or create your first post!
                  </p>
                </div>
                {onOpenUpload && (
                  <button
                    onClick={onOpenUpload}
                    className="bg-[#FACC15] hover:bg-[#eab308] text-black font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-yellow-500/10 active:scale-95 transition-all"
                  >
                    <PlusSquare className="w-4 h-4 text-black" />
                    <span>Create Post</span>
                  </button>
                )}
              </div>
            ) : (
              photoPosts.map(post => (
                <PhotoPostCard
                  key={post.id}
                  post={post}
                  onSelectUser={onSelectUser}
                />
              ))
            )}
          </div>
        )}

        {/* Mandatory Credits at the bottom of the feed */}
        <Credits className="mt-8" />
      </main>
    </div>
  );
};
