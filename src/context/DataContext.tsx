import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Post, Comment, Story, Conversation, Message, NotificationItem, User, ReportItem } from '../types';
import {
  INITIAL_POSTS,
  INITIAL_STORIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_CONVERSATIONS,
} from '../data/mockData';
import { useAuth } from './AuthContext';
import { safeSetItem, safeGetItem, idbGet } from '../utils/storage';

// Helper to generate consistent sorted chatId: e.g. "uid1_uid2"
export const getDeterministicChatId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_');
};

const MOCK_IDS = ['user_current', 'user_zoya', 'user_hamza', 'user_daniyal', 'user_sarah', 'sarah_malik'];

interface DataContextType {
  posts: Post[];
  stories: Story[];
  conversations: Conversation[];
  notifications: NotificationItem[];
  reports: ReportItem[];
  activeConversation: Conversation | null;
  activePostId: string | null;
  activePostList: Post[];
  activeStoryIndex: number | null;
  activeStoryUserStories: Story[];
  unreadNotificationCount: number;
  unreadMessageCount: number;
  isTypingUserId: string | null;
  // Post Interactions
  setActivePostId: (postId: string | null, list?: Post[]) => void;
  getPostById: (postId: string) => Post | undefined;
  editPost: (postId: string, updates: { caption?: string; visibility?: 'public' | 'followers' | 'private' }) => void;
  deletePost: (postId: string) => void;
  adminDeletePost: (postId: string) => void;
  adminDeleteComment: (postId: string, commentId: string) => void;
  toggleLikePost: (postId: string) => void;
  toggleSavePost: (postId: string) => void;
  addComment: (postId: string, text: string, replyToCommentId?: string) => void;
  likeComment: (postId: string, commentId: string) => void;
  createPost: (postData: {
    type: 'photo' | 'video';
    mediaUrl: string;
    caption: string;
    hashtags: string[];
    visibility: 'public' | 'followers' | 'private';
    musicTitle?: string;
  }) => void;
  // Follow / Unfollow / Remove Follower
  followUser: (targetUserId: string) => void;
  unfollowUser: (targetUserId: string) => void;
  removeFollower: (userId: string, followerId: string) => void;
  acceptFollowRequest: (notificationId: string, requesterId: string) => void;
  rejectFollowRequest: (notificationId: string, requesterId: string) => void;
  // Real-time Chat System
  setActiveConversation: (conv: Conversation | null) => void;
  openOrCreateConversationWithUser: (user: User) => Conversation;
  getMessagesForChat: (chatId: string) => Message[];
  sendMessage: (chatId: string, text: string, mediaUrl?: string) => void;
  deleteMessage: (chatId: string, messageId: string, scope: 'me' | 'everyone') => void;
  markConversationSeen: (chatId: string) => void;
  acceptMessageRequest: (chatId: string) => void;
  // Stories & Viewer
  createStory: (mediaUrl: string, type: 'image' | 'video', caption?: string) => void;
  viewStory: (storyId: string) => void;
  openStoryViewer: (stories: Story[], startIndex?: number) => void;
  closeStoryViewer: () => void;
  // Notifications & Safety & Reports
  markNotificationsAsRead: () => void;
  reportContent: (contentId: string, reason: string, targetType?: 'post' | 'user') => void;
  dismissReport: (reportId: string) => void;
  actionReport: (reportId: string, actionType: 'delete_post' | 'ban_user') => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, users, updateProfile, updateUserById, banUser } = useAuth();

  // Posts State (Scrub mock posts)
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = safeGetItem('mehfil_posts');
      if (saved) {
        const parsed: Post[] = JSON.parse(saved);
        return parsed.filter(p => !MOCK_IDS.includes(p.authorId));
      }
      return INITIAL_POSTS;
    } catch {
      return INITIAL_POSTS;
    }
  });

  // Stories State
  const [stories, setStories] = useState<Story[]>(() => {
    try {
      const saved = safeGetItem('mehfil_stories');
      if (saved) {
        const parsed: Story[] = JSON.parse(saved);
        return parsed.filter(s => !MOCK_IDS.includes(s.authorId));
      }
      return INITIAL_STORIES;
    } catch {
      return INITIAL_STORIES;
    }
  });

  // Messages map (Scrub mock messages)
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = safeGetItem('mehfil_messages_by_chat');
      if (saved) {
        const parsed: Record<string, Message[]> = JSON.parse(saved);
        const cleaned: Record<string, Message[]> = {};
        for (const [key, msgList] of Object.entries(parsed)) {
          const hasMock = key.split('_').some(id => MOCK_IDS.includes(id));
          if (!hasMock) {
            cleaned[key] = msgList;
          }
        }
        return cleaned;
      }
      return {};
    } catch {
      return {};
    }
  });

  // Conversations State (Scrub mock conversations)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = safeGetItem('mehfil_conversations');
      if (saved) {
        const parsed: Conversation[] = JSON.parse(saved);
        return parsed.filter(c => !c.participantIds.some(id => MOCK_IDS.includes(id)));
      }
      return INITIAL_CONVERSATIONS;
    } catch {
      return INITIAL_CONVERSATIONS;
    }
  });

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = safeGetItem('mehfil_notifications');
      if (saved) {
        const parsed: NotificationItem[] = JSON.parse(saved);
        return parsed.filter(n => !MOCK_IDS.includes(n.senderId));
      }
      return INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  // Reports State
  const [reports, setReports] = useState<ReportItem[]>(() => {
    try {
      const saved = safeGetItem('mehfil_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active View States
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activePostId, setActivePostIdState] = useState<string | null>(null);
  const [activePostList, setActivePostList] = useState<Post[]>([]);
  const [activeStoryUserStories, setActiveStoryUserStories] = useState<Story[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isTypingUserId, setIsTypingUserId] = useState<string | null>(null);

  // Restore from IndexedDB in case localStorage was quota-exceeded
  useEffect(() => {
    idbGet<Post[]>('mehfil_posts').then(savedPosts => {
      if (savedPosts && savedPosts.length > 0) {
        setPosts(prev => (prev.length === 0 ? savedPosts : prev));
      }
    });
    idbGet<Story[]>('mehfil_stories').then(savedStories => {
      if (savedStories && savedStories.length > 0) {
        setStories(prev => (prev.length === 0 ? savedStories : prev));
      }
    });
  }, []);

  // Safe Sync to storage
  useEffect(() => {
    safeSetItem('mehfil_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    safeSetItem('mehfil_stories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    safeSetItem('mehfil_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    safeSetItem('mehfil_messages_by_chat', JSON.stringify(messagesByChat));
  }, [messagesByChat]);

  useEffect(() => {
    safeSetItem('mehfil_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    safeSetItem('mehfil_reports', JSON.stringify(reports));
  }, [reports]);

  // Handle URL hash changes for Post URLs: #/post/:postId
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/#\/?post\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setActivePostIdState(match[1]);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const setActivePostId = useCallback((postId: string | null, list?: Post[]) => {
    setActivePostIdState(postId);
    if (list) setActivePostList(list);
    if (postId) {
      window.location.hash = `/post/${postId}`;
    } else {
      if (window.location.hash.includes('/post/')) {
        window.history.pushState(null, '', window.location.pathname);
      }
    }
  }, []);

  const getPostById = useCallback((postId: string) => {
    return posts.find(p => p.id === postId);
  }, [posts]);

  // Purely real badge counts
  const unreadNotificationCount = notifications.filter(n => !n.read && n.recipientId === currentUser?.id).length;
  const unreadMessageCount = conversations.reduce((acc, conv) => {
    if (conv.participantIds.includes(currentUser?.id || '')) {
      return acc + (conv.unreadCount || 0);
    }
    return acc;
  }, 0);

  // ============================================================
  // POSTS FULL VIEW & MUTATIONS
  // ============================================================
  const editPost = (
    postId: string,
    updates: { caption?: string; visibility?: 'public' | 'followers' | 'private' }
  ) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          caption: updates.caption !== undefined ? updates.caption : p.caption,
          visibility: updates.visibility !== undefined ? updates.visibility : p.visibility,
        };
      })
    );
  };

  const deletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (currentUser) {
      updateProfile({ postsCount: Math.max(0, (currentUser.postsCount || 1) - 1) });
    }
    if (activePostId === postId) {
      setActivePostId(null);
    }
  };

  const adminDeletePost = (postId: string) => {
    const postToDelete = posts.find(p => p.id === postId);
    if (postToDelete) {
      const author = users.find(u => u.id === postToDelete.authorId);
      if (author) {
        updateUserById(author.id, { postsCount: Math.max(0, (author.postsCount || 1) - 1) });
      }
    }
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (activePostId === postId) {
      setActivePostId(null);
    }
  };

  const adminDeleteComment = (postId: string, commentId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.filter(c => c.id !== commentId),
          commentsCount: Math.max(0, p.commentsCount - 1),
        };
      })
    );
  };

  const toggleLikePost = (postId: string) => {
    if (!currentUser) return;
    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;
        const alreadyLiked = post.likedBy.includes(currentUser.id);
        const newLikedBy = alreadyLiked
          ? post.likedBy.filter(id => id !== currentUser.id)
          : [...post.likedBy, currentUser.id];

        if (!alreadyLiked && post.authorId !== currentUser.id) {
          const newNotif: NotificationItem = {
            id: `notif_${Date.now()}`,
            recipientId: post.authorId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatarUrl,
            senderUsername: currentUser.username,
            type: 'like',
            targetPostId: post.id,
            targetPostThumbnail: post.thumbnailUrl || post.mediaUrl,
            message: 'liked your post.',
            createdAt: 'Just now',
            read: false,
          };
          setNotifications(n => [newNotif, ...n]);
        }

        return {
          ...post,
          likedBy: newLikedBy,
          likesCount: Math.max(0, post.likesCount + (alreadyLiked ? -1 : 1)),
        };
      })
    );
  };

  const toggleSavePost = (postId: string) => {
    if (!currentUser) return;
    const isSaved = currentUser.savedPosts.includes(postId);
    const updatedSaved = isSaved
      ? currentUser.savedPosts.filter(id => id !== postId)
      : [...currentUser.savedPosts, postId];

    updateProfile({ savedPosts: updatedSaved });

    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;
        const savedBy = post.savedBy || [];
        const updatedSavedBy = isSaved
          ? savedBy.filter(id => id !== currentUser.id)
          : [...savedBy, currentUser.id];
        return { ...post, savedBy: updatedSavedBy };
      })
    );
  };

  const addComment = (postId: string, text: string, replyToCommentId?: string) => {
    if (!currentUser || !text.trim()) return;

    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      postId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.avatarUrl,
      text: text.trim(),
      createdAt: 'Just now',
      likesCount: 0,
      likedBy: [],
      replies: [],
    };

    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;

        let updatedComments = [...post.comments];
        if (replyToCommentId) {
          updatedComments = updatedComments.map(c => {
            if (c.id === replyToCommentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment],
              };
            }
            return c;
          });
        } else {
          updatedComments.push(newComment);
        }

        if (post.authorId !== currentUser.id) {
          const newNotif: NotificationItem = {
            id: `notif_${Date.now()}`,
            recipientId: post.authorId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatarUrl,
            senderUsername: currentUser.username,
            type: 'comment',
            targetPostId: post.id,
            targetPostThumbnail: post.thumbnailUrl || post.mediaUrl,
            message: `commented: "${text.slice(0, 35)}${text.length > 35 ? '...' : ''}"`,
            createdAt: 'Just now',
            read: false,
          };
          setNotifications(n => [newNotif, ...n]);
        }

        return {
          ...post,
          comments: updatedComments,
          commentsCount: post.commentsCount + 1,
        };
      })
    );
  };

  const likeComment = (postId: string, commentId: string) => {
    if (!currentUser) return;
    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;
        const updatedComments = post.comments.map(c => {
          if (c.id === commentId) {
            const liked = c.likedBy.includes(currentUser.id);
            return {
              ...c,
              likedBy: liked ? c.likedBy.filter(id => id !== currentUser.id) : [...c.likedBy, currentUser.id],
              likesCount: Math.max(0, c.likesCount + (liked ? -1 : 1)),
            };
          }
          if (c.replies) {
            const updatedReplies = c.replies.map(r => {
              if (r.id === commentId) {
                const liked = r.likedBy.includes(currentUser.id);
                return {
                  ...r,
                  likedBy: liked ? r.likedBy.filter(id => id !== currentUser.id) : [...r.likedBy, currentUser.id],
                  likesCount: Math.max(0, r.likesCount + (liked ? -1 : 1)),
                };
              }
              return r;
            });
            return { ...c, replies: updatedReplies };
          }
          return c;
        });
        return { ...post, comments: updatedComments };
      })
    );
  };

  const createPost = (postData: {
    type: 'photo' | 'video';
    mediaUrl: string;
    caption: string;
    hashtags: string[];
    visibility: 'public' | 'followers' | 'private';
    musicTitle?: string;
  }) => {
    if (!currentUser) return;

    const newPost: Post = {
      id: `post_${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.avatarUrl,
      type: postData.type,
      mediaUrl: postData.mediaUrl,
      thumbnailUrl: postData.type === 'photo' ? postData.mediaUrl : undefined,
      caption: postData.caption,
      hashtags: postData.hashtags,
      visibility: postData.visibility,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: new Date().toISOString(),
      musicTitle: postData.musicTitle || (postData.type === 'video' ? `Original Sound • ${currentUser.name}` : undefined),
      likedBy: [],
      savedBy: [],
      comments: [],
    };

    setPosts(prev => [newPost, ...prev]);
    updateProfile({ postsCount: (currentUser.postsCount || 0) + 1 });
  };

  // ============================================================
  // FOLLOWERS & FOLLOWING MANAGEMENT
  // ============================================================
  const followUser = (targetUserId: string) => {
    if (!currentUser || targetUserId === currentUser.id) return;
    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) return;

    if (targetUser.isPrivate) {
      const updatedPending = [...(targetUser.pendingFollowRequests || []), currentUser.id];
      updateUserById(targetUserId, { pendingFollowRequests: updatedPending });

      const newNotif: NotificationItem = {
        id: `req_${Date.now()}`,
        recipientId: targetUserId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatarUrl,
        senderUsername: currentUser.username,
        type: 'follow_request',
        message: 'requested to follow you.',
        createdAt: 'Just now',
        read: false,
        requestStatus: 'pending',
      };
      setNotifications(prev => [newNotif, ...prev]);
    } else {
      const updatedFollowing = [...(currentUser.following || []), targetUserId];
      updateProfile({
        following: updatedFollowing,
        followingCount: (currentUser.followingCount || 0) + 1,
      });

      const updatedFollowers = [...(targetUser.followers || []), currentUser.id];
      updateUserById(targetUserId, {
        followers: updatedFollowers,
        followersCount: (targetUser.followersCount || 0) + 1,
      });

      const newNotif: NotificationItem = {
        id: `notif_${Date.now()}`,
        recipientId: targetUserId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatarUrl,
        senderUsername: currentUser.username,
        type: 'follow',
        message: 'started following you.',
        createdAt: 'Just now',
        read: false,
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const unfollowUser = (targetUserId: string) => {
    if (!currentUser) return;
    const targetUser = users.find(u => u.id === targetUserId);

    const updatedFollowing = (currentUser.following || []).filter(id => id !== targetUserId);
    updateProfile({
      following: updatedFollowing,
      followingCount: Math.max(0, (currentUser.followingCount || 1) - 1),
    });

    if (targetUser) {
      const updatedFollowers = (targetUser.followers || []).filter(id => id !== currentUser.id);
      updateUserById(targetUserId, {
        followers: updatedFollowers,
        followersCount: Math.max(0, (targetUser.followersCount || 1) - 1),
      });
    }
  };

  const removeFollower = (userId: string, followerId: string) => {
    const ownerUser = users.find(u => u.id === userId);
    const followerUser = users.find(u => u.id === followerId);

    if (ownerUser) {
      const updatedFollowers = (ownerUser.followers || []).filter(id => id !== followerId);
      updateUserById(userId, {
        followers: updatedFollowers,
        followersCount: Math.max(0, (ownerUser.followersCount || 1) - 1),
      });
    }

    if (followerUser) {
      const updatedFollowing = (followerUser.following || []).filter(id => id !== userId);
      updateUserById(followerId, {
        following: updatedFollowing,
        followingCount: Math.max(0, (followerUser.followingCount || 1) - 1),
      });
    }
  };

  const acceptFollowRequest = (notificationId: string, requesterId: string) => {
    if (!currentUser) return;
    const requesterUser = users.find(u => u.id === requesterId);

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, requestStatus: 'accepted', read: true } : n))
    );

    const updatedFollowers = [...(currentUser.followers || []), requesterId];
    const updatedPending = (currentUser.pendingFollowRequests || []).filter(id => id !== requesterId);
    updateProfile({
      followers: updatedFollowers,
      followersCount: (currentUser.followersCount || 0) + 1,
      pendingFollowRequests: updatedPending,
    });

    if (requesterUser) {
      const updatedFollowing = [...(requesterUser.following || []), currentUser.id];
      updateUserById(requesterId, {
        following: updatedFollowing,
        followingCount: (requesterUser.followingCount || 0) + 1,
      });
    }
  };

  const rejectFollowRequest = (notificationId: string, requesterId: string) => {
    if (!currentUser) return;
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, requestStatus: 'rejected', read: true } : n))
    );
    const updatedPending = (currentUser.pendingFollowRequests || []).filter(id => id !== requesterId);
    updateProfile({ pendingFollowRequests: updatedPending });
  };

  // ============================================================
  // REAL-TIME CHAT SYSTEM
  // ============================================================
  const openOrCreateConversationWithUser = (targetUser: User): Conversation => {
    if (!currentUser) throw new Error('Must be logged in to chat');

    const chatId = getDeterministicChatId(currentUser.id, targetUser.id);
    const existing = conversations.find(c => c.id === chatId);

    if (existing) {
      setActiveConversation(existing);
      return existing;
    }

    const mutualFollow =
      (currentUser.following || []).includes(targetUser.id) &&
      (targetUser.following || []).includes(currentUser.id);

    const newConv: Conversation = {
      id: chatId,
      participantIds: [currentUser.id, targetUser.id].sort(),
      otherUser: targetUser,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
      lastMessageTime: new Date().toISOString(),
      isRequest: !mutualFollow,
    };

    setConversations(prev => [newConv, ...prev]);
    setActiveConversation(newConv);
    return newConv;
  };

  const getMessagesForChat = (chatId: string): Message[] => {
    const raw = messagesByChat[chatId] || [];
    return raw.filter(m => !(m.deletedFor || []).includes(currentUser?.id || ''));
  };

  const sendMessage = (chatId: string, text: string, mediaUrl?: string) => {
    if (!currentUser || (!text.trim() && !mediaUrl)) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId: chatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      text: text.trim(),
      mediaUrl,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      seen: false,
    };

    setMessagesByChat(prev => {
      const existing = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: [...existing, newMsg],
      };
    });

    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== chatId) return conv;
        return {
          ...conv,
          lastMessage: newMsg,
          lastMessageTime: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const deleteMessage = (chatId: string, messageId: string, scope: 'me' | 'everyone') => {
    setMessagesByChat(prev => {
      const list = prev[chatId] || [];
      const updated = list.map(m => {
        if (m.id !== messageId) return m;

        if (scope === 'everyone') {
          return {
            ...m,
            text: 'This message was deleted',
            mediaUrl: undefined,
            deletedForEveryone: true,
          };
        } else {
          const deletedFor = m.deletedFor || [];
          return {
            ...m,
            deletedFor: currentUser ? [...deletedFor, currentUser.id] : deletedFor,
          };
        }
      });
      return { ...prev, [chatId]: updated };
    });
  };

  const markConversationSeen = (chatId: string) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          unreadCount: 0,
          lastMessage: c.lastMessage ? { ...c.lastMessage, seen: true } : undefined,
        };
      })
    );

    setMessagesByChat(prev => {
      const list = prev[chatId] || [];
      const updated = list.map(m => ({ ...m, seen: true }));
      return { ...prev, [chatId]: updated };
    });
  };

  const acceptMessageRequest = (chatId: string) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== chatId) return c;
        return { ...c, isRequest: false };
      })
    );
  };

  // Stories
  const createStory = (mediaUrl: string, type: 'image' | 'video', caption?: string) => {
    if (!currentUser) return;
    const newStory: Story = {
      id: `story_${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.avatarUrl,
      mediaUrl,
      type,
      caption,
      createdAt: new Date().toISOString(),
      viewedBy: [currentUser.id],
    };
    setStories(prev => [newStory, ...prev]);
  };

  const viewStory = (storyId: string) => {
    if (!currentUser) return;
    setStories(prev =>
      prev.map(s => {
        if (s.id !== storyId) return s;
        if (s.viewedBy.includes(currentUser.id)) return s;
        return { ...s, viewedBy: [...s.viewedBy, currentUser.id] };
      })
    );
  };

  const openStoryViewer = (storyList: Story[], startIndex = 0) => {
    setActiveStoryUserStories(storyList);
    setActiveStoryIndex(startIndex);
  };

  const closeStoryViewer = () => {
    setActiveStoryUserStories([]);
    setActiveStoryIndex(null);
  };

  const markNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Content Reporting & Moderation
  const reportContent = (contentId: string, reason: string, targetType: 'post' | 'user' = 'post') => {
    if (!currentUser) return;
    let targetDetails: any = undefined;

    if (targetType === 'post') {
      const p = posts.find(item => item.id === contentId);
      if (p) {
        targetDetails = {
          caption: p.caption,
          mediaUrl: p.thumbnailUrl || p.mediaUrl,
          username: p.authorUsername,
        };
      }
    } else {
      const u = users.find(item => item.id === contentId);
      if (u) {
        targetDetails = {
          username: u.username,
          name: u.name,
        };
      }
    }

    const newReport: ReportItem = {
      id: `rep_${Date.now()}`,
      reporterId: currentUser.id,
      reporterUsername: currentUser.username,
      targetId: contentId,
      targetType,
      targetDetails,
      reason,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    setReports(prev => [newReport, ...prev]);
  };

  const dismissReport = (reportId: string) => {
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, status: 'dismissed' as const } : r))
    );
  };

  const actionReport = (reportId: string, actionType: 'delete_post' | 'ban_user') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    if (actionType === 'delete_post' && report.targetType === 'post') {
      adminDeletePost(report.targetId);
    } else if (actionType === 'ban_user') {
      const targetUserId = report.targetType === 'user'
        ? report.targetId
        : posts.find(p => p.id === report.targetId)?.authorId;
      if (targetUserId) {
        banUser(targetUserId, `Violated community guidelines: ${report.reason}`, 'permanent');
      }
    }

    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, status: 'actioned' as const } : r))
    );
  };

  return (
    <DataContext.Provider
      value={{
        posts,
        stories,
        conversations,
        notifications,
        reports,
        activeConversation,
        activePostId,
        activePostList,
        activeStoryIndex,
        activeStoryUserStories,
        unreadNotificationCount,
        unreadMessageCount,
        isTypingUserId,
        setActivePostId,
        getPostById,
        editPost,
        deletePost,
        adminDeletePost,
        adminDeleteComment,
        toggleLikePost,
        toggleSavePost,
        addComment,
        likeComment,
        createPost,
        followUser,
        unfollowUser,
        removeFollower,
        acceptFollowRequest,
        rejectFollowRequest,
        setActiveConversation,
        openOrCreateConversationWithUser,
        getMessagesForChat,
        sendMessage,
        deleteMessage,
        markConversationSeen,
        acceptMessageRequest,
        createStory,
        viewStory,
        openStoryViewer,
        closeStoryViewer,
        markNotificationsAsRead,
        reportContent,
        dismissReport,
        actionReport,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
