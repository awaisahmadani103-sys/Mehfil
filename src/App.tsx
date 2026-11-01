/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { AuthFlow } from './screens/AuthFlow';
import { ProfileSetup } from './screens/ProfileSetup';
import { BannedScreen } from './screens/BannedScreen';
import { AdminPanel } from './screens/AdminPanel';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { UploadScreen } from './screens/UploadScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { BottomNav, TabType } from './components/BottomNav';
import { StoryViewerModal } from './components/StoryViewerModal';
import { FullPostModal } from './components/FullPostModal';
import { Logo } from './components/Logo';
import { Credits } from './components/Credits';
import { User } from './types';

function MainApp() {
  const {
    isAuthenticated,
    isLoading,
    needsProfileSetup,
    currentUser,
    isAdmin,
  } = useAuth();

  const {
    posts,
    activePostId,
    activePostList,
    setActivePostId,
    activeStoryUserStories,
    activeStoryIndex,
    closeStoryViewer,
    openOrCreateConversationWithUser,
  } = useData();

  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // STARTUP FLOW: Loading Screen with Mehfil animated logo
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#111111] text-white flex flex-col justify-between items-center p-6 select-none relative overflow-hidden">
        <div className="w-full h-8" />
        <div className="flex flex-col items-center justify-center space-y-6 text-center my-auto">
          <Logo variant="full" size="xl" animated={true} />
          <div className="flex items-center gap-1.5 pt-4">
            <span className="w-2 h-2 rounded-full bg-[#FACC15] animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-[#FACC15] animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-[#FACC15] animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
        <Credits className="pb-4" />
      </div>
    );
  }

  // LOGIN GATE: If not authenticated, display ONLY the Welcome & Auth screens
  // Home, Search, Upload, Messages, Profile are strictly unreachable!
  if (!isAuthenticated || !currentUser) {
    return <AuthFlow initialView="welcome" />;
  }

  // SUSPENDED / BANNED GATE: If account was banned by administration
  if (currentUser.status === 'banned') {
    return (
      <BannedScreen
        reason={currentUser.banReason}
        expiresAt={currentUser.banExpiresAt}
      />
    );
  }

  // PROFILE SETUP GATE: Redirect immediately after signup until profile setup is done
  if (needsProfileSetup) {
    return <ProfileSetup />;
  }

  // ADMIN PANEL VIEW
  if (isAdminPanelOpen && isAdmin) {
    return (
      <AdminPanel
        onBack={() => setIsAdminPanelOpen(false)}
        onSelectUser={userId => {
          setIsAdminPanelOpen(false);
          setSelectedUserId(userId);
        }}
      />
    );
  }

  // Navigation Handlers
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsNotificationsOpen(false);
    setIsSettingsOpen(false);
    setIsAdminPanelOpen(false);
  };

  const handleOpenMessagesWithUser = (user: User) => {
    openOrCreateConversationWithUser(user);
    setSelectedUserId(null);
    setIsNotificationsOpen(false);
    setIsSettingsOpen(false);
    setIsAdminPanelOpen(false);
    setCurrentTab('messages');
  };

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    setSelectedUserId(null);
    setIsNotificationsOpen(false);
    setIsSettingsOpen(false);
    setIsAdminPanelOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col relative selection:bg-[#FACC15] selection:text-black">
      {/* Active Screen View */}
      <div className="flex-1 w-full">
        {/* Full View: Notifications */}
        {isNotificationsOpen ? (
          <div className="w-full">
            <div className="max-w-lg mx-auto pt-2 px-4">
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="text-xs text-[#FACC15] font-semibold hover:underline flex items-center gap-1 mb-2"
              >
                ← Back
              </button>
            </div>
            <NotificationsScreen
              onSelectUser={handleSelectUser}
            />
          </div>
        ) : isSettingsOpen ? (
          /* Full View: Settings */
          <SettingsScreen
            onBack={() => setIsSettingsOpen(false)}
            onOpenEditProfile={() => {
              setIsSettingsOpen(false);
              setCurrentTab('profile');
              setSelectedUserId(null);
            }}
            onOpenAdminPanel={isAdmin ? () => {
              setIsSettingsOpen(false);
              setIsAdminPanelOpen(true);
            } : undefined}
          />
        ) : selectedUserId ? (
          /* Full View: Selected User Profile */
          <div className="w-full">
            <div className="max-w-lg mx-auto pt-2 px-4">
              <button
                onClick={() => setSelectedUserId(null)}
                className="text-xs text-[#FACC15] font-semibold hover:underline flex items-center gap-1 mb-2"
              >
                ← Back
              </button>
            </div>
            <ProfileScreen
              userId={selectedUserId}
              onOpenMessagesWithUser={handleOpenMessagesWithUser}
              onSelectUser={handleSelectUser}
            />
          </div>
        ) : (
          /* Main Tab Views */
          <>
            {currentTab === 'home' && (
              <HomeScreen
                onSelectUser={handleSelectUser}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenMessages={() => setCurrentTab('messages')}
                onOpenUpload={() => setCurrentTab('upload')}
              />
            )}
            {currentTab === 'search' && (
              <SearchScreen onSelectUser={handleSelectUser} />
            )}
            {currentTab === 'upload' && (
              <UploadScreen onSuccess={() => setCurrentTab('home')} />
            )}
            {currentTab === 'messages' && (
              <MessagesScreen onSelectUser={handleSelectUser} />
            )}
            {currentTab === 'profile' && (
              <ProfileScreen
                userId={currentUser?.id}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onSelectUser={handleSelectUser}
              />
            )}
          </>
        )}
      </div>

      {/* Persistent Bottom Navigation */}
      <BottomNav
        currentTab={
          isNotificationsOpen || isSettingsOpen || selectedUserId || isAdminPanelOpen
            ? ('' as any)
            : currentTab
        }
        onTabChange={handleTabChange}
      />

      {/* Story Viewer Modal */}
      {activeStoryUserStories.length > 0 && activeStoryIndex !== null && (
        <StoryViewerModal
          stories={activeStoryUserStories}
          initialIndex={activeStoryIndex}
          onClose={closeStoryViewer}
        />
      )}

      {/* Full Post Modal (Route #/post/:postId support, refresh, and full post view) */}
      {activePostId && (
        <FullPostModal
          postId={activePostId}
          postList={activePostList.length > 0 ? activePostList : posts}
          onClose={() => setActivePostId(null)}
          onSelectUser={handleSelectUser}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainApp />
      </DataProvider>
    </AuthProvider>
  );
}
