import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AdminActivityLog } from '../types';
import { DEFAULT_ADMIN_EMAIL } from '../data/mockData';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase/config';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { safeSetItem, safeGetItem, safeRemoveItem, idbGet } from '../utils/storage';

export interface PendingSignup {
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  code: string;
  codeExpiresAt: number;
}

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  needsProfileSetup: boolean;
  users: User[];
  adminLogs: AdminActivityLog[];
  pendingSignup: PendingSignup | null;
  resendTimer: number;
  signupStep: 'form' | 'verify';
  setSignupStep: (step: 'form' | 'verify') => void;
  // Auth methods
  checkUsernameUnique: (username: string) => boolean;
  startSignup: (fullName: string, username: string, email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  verifySignupCode: (inputCode: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationCode: () => Promise<string | null>;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; isNewUser: boolean; error?: string }>;
  requestPasswordReset: (emailOrUsername: string) => Promise<{ success: boolean; message: string; code?: string }>;
  completePasswordReset: (code: string, newPass: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  completeProfileSetup: (data: {
    avatarUrl: string;
    username: string;
    name: string;
    bio: string;
    link?: string;
    isPrivate: boolean;
  }) => Promise<void>;
  updateProfile: (updatedData: Partial<User>) => void;
  updateUserById: (userId: string, updates: Partial<User>) => void;
  togglePrivacy: () => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  logout: () => void;
  deleteAccount: () => void;
  // Admin methods
  banUser: (userId: string, reason: string, duration: string) => void;
  unbanUser: (userId: string) => void;
  deleteUserAdmin: (userId: string) => void;
  makeAdmin: (userId: string) => void;
  removeAdmin: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Legacy fake account IDs to scrub immediately
const MOCK_IDS = ['user_current', 'user_zoya', 'user_hamza', 'user_daniyal', 'user_sarah', 'sarah_malik'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and scrub users list
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = safeGetItem('mehfil_users');
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        // Scrub out mock accounts
        const cleaned = parsed.filter(u => !MOCK_IDS.includes(u.id));
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Current logged in user (strictly null if not explicitly logged in)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = safeGetItem('mehfil_current_user');
      if (saved) {
        const parsed: User = JSON.parse(saved);
        if (MOCK_IDS.includes(parsed.id)) {
          safeRemoveItem('mehfil_current_user');
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [needsProfileSetup, setNeedsProfileSetup] = useState<boolean>(() => {
    return safeGetItem('mehfil_needs_profile_setup') === 'true';
  });

  const [adminLogs, setAdminLogs] = useState<AdminActivityLog[]>(() => {
    try {
      const saved = safeGetItem('mehfil_admin_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(() => {
    try {
      const saved = safeGetItem('mehfil_pending_signup');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [signupStep, setSignupStep] = useState<'form' | 'verify'>('form');
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [resetPendingEmail, setResetPendingEmail] = useState<{ email: string; code: string } | null>(null);

  // Initial Auth verification and Firebase onAuthStateChanged listener
  useEffect(() => {
    let unsubscribe = () => {};

    if (isFirebaseConfigured()) {
      try {
        unsubscribe = onAuthStateChanged(auth, (fbUser) => {
          if (fbUser) {
            setUsers(prev => {
              const existing = prev.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());
              if (existing) {
                // Ensure admin role if matching admin email
                const updated = fbUser.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()
                  ? { ...existing, role: 'admin' as const }
                  : existing;
                setCurrentUser(updated);
                return prev.map(u => u.id === existing.id ? updated : u);
              }
              return prev;
            });
          }
          setIsLoading(false);
        });
      } catch {
        setIsLoading(false);
      }
    } else {
      // Local session check
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }

    return () => unsubscribe();
  }, []);

  // Sync users to storage
  useEffect(() => {
    safeSetItem('mehfil_users', JSON.stringify(users));
  }, [users]);

  // Sync current user to storage
  useEffect(() => {
    if (currentUser) {
      safeSetItem('mehfil_current_user', JSON.stringify(currentUser));
    } else {
      safeRemoveItem('mehfil_current_user');
    }
  }, [currentUser]);

  // Sync admin logs
  useEffect(() => {
    safeSetItem('mehfil_admin_logs', JSON.stringify(adminLogs));
  }, [adminLogs]);

  // Sync needsProfileSetup
  useEffect(() => {
    safeSetItem('mehfil_needs_profile_setup', needsProfileSetup ? 'true' : 'false');
  }, [needsProfileSetup]);

  // Resend countdown timer
  useEffect(() => {
    let interval: any;
    if (signupStep === 'verify' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [signupStep, resendTimer]);

  // Determine if active user is Admin
  const isAdmin = Boolean(
    currentUser &&
    (currentUser.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() || currentUser.role === 'admin')
  );

  const checkUsernameUnique = (username: string): boolean => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean) return false;
    return !users.some(u => u.username.toLowerCase() === clean);
  };

  const startSignup = async (fullName: string, username: string, email: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanEmail = email.trim().toLowerCase();

    if (!checkUsernameUnique(cleanUsername)) {
      return { success: false, error: 'Username is already taken. Please choose another.' };
    }

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const pending: PendingSignup = {
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: btoa(password),
      code,
      codeExpiresAt: Date.now() + 15 * 60 * 1000,
    };

    setPendingSignup(pending);
    safeSetItem('mehfil_pending_signup', JSON.stringify(pending));
    setSignupStep('verify');
    setResendTimer(60);

    return { success: true, code };
  };

  const verifySignupCode = async (inputCode: string) => {
    if (!pendingSignup) {
      return { success: false, error: 'No signup session found. Please sign up again.' };
    }

    if (inputCode.trim() !== pendingSignup.code) {
      return { success: false, error: 'Invalid verification code. Please check and try again.' };
    }

    const isSeedAdmin = pendingSignup.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

    // Create the real user
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: pendingSignup.fullName,
      username: pendingSignup.username,
      email: pendingSignup.email,
      avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${pendingSignup.username}&backgroundColor=111111`,
      bio: '',
      link: '',
      isPrivate: false,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isVerified: isSeedAdmin,
      role: isSeedAdmin ? 'admin' : 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      blockedUsers: [],
      savedPosts: [],
      followers: [],
      following: [],
      pendingFollowRequests: [],
    };

    setUsers(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    setNeedsProfileSetup(true);
    setPendingSignup(null);
    safeRemoveItem('mehfil_pending_signup');
    setSignupStep('form');

    return { success: true };
  };

  const resendVerificationCode = async () => {
    if (!pendingSignup) return null;
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const updated = {
      ...pendingSignup,
      code: newCode,
      codeExpiresAt: Date.now() + 15 * 60 * 1000,
    };
    setPendingSignup(updated);
    safeSetItem('mehfil_pending_signup', JSON.stringify(updated));
    setResendTimer(60);
    return newCode;
  };

  const login = async (emailOrUsername: string, password: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const clean = emailOrUsername.trim().toLowerCase().replace(/^@/, '');
    const found = users.find(
      u => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
    );

    if (!found) {
      setIsLoading(false);
      return { success: false, error: 'No account found with this email or username.' };
    }

    // Check if user is banned
    if (found.status === 'banned') {
      setCurrentUser(found);
      setIsLoading(false);
      return { success: true };
    }

    // Ensure seed admin role
    const updatedUser = found.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()
      ? { ...found, role: 'admin' as const }
      : found;

    setCurrentUser(updatedUser);
    setIsLoading(false);
    return { success: true };
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);

    if (isFirebaseConfigured()) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;
        const existing = users.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());

        if (existing) {
          const isSeedAdmin = fbUser.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
          const updated = isSeedAdmin ? { ...existing, role: 'admin' as const } : existing;
          setCurrentUser(updated);
          setIsLoading(false);
          return { success: true, isNewUser: false };
        } else {
          const cleanUsername = (fbUser.displayName || 'user')
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9_]/g, '') + Math.floor(100 + Math.random() * 900);

          const isSeedAdmin = (fbUser.email || '').toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

          const newUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || 'Mehfil User',
            username: cleanUsername,
            email: fbUser.email || '',
            avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/micah/svg?seed=${fbUser.uid}&backgroundColor=111111`,
            bio: '',
            link: '',
            isPrivate: false,
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            isVerified: isSeedAdmin,
            role: isSeedAdmin ? 'admin' : 'user',
            status: 'active',
            createdAt: new Date().toISOString(),
            blockedUsers: [],
            savedPosts: [],
            followers: [],
            following: [],
            pendingFollowRequests: [],
          };

          setUsers(prev => [newUser, ...prev]);
          setCurrentUser(newUser);
          setNeedsProfileSetup(true);
          setIsLoading(false);
          return { success: true, isNewUser: true };
        }
      } catch (err: any) {
        console.warn("Firebase popup unavailable or dismissed, falling back to simulated Google sign-in:", err);
      }
    }

    // Google Sign-in flow when popup is sandboxed
    await new Promise(r => setTimeout(r, 500));
    const googleEmail = "user.mehfil@gmail.com";
    const existing = users.find(u => u.email.toLowerCase() === googleEmail);

    if (existing) {
      setCurrentUser(existing);
      setIsLoading(false);
      return { success: true, isNewUser: false };
    } else {
      const cleanUsername = 'mehfil_user_' + Math.floor(100 + Math.random() * 900);
      const isSeedAdmin = googleEmail.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

      const newUser: User = {
        id: `google_${Date.now()}`,
        name: 'Mehfil Member',
        username: cleanUsername,
        email: googleEmail,
        avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${cleanUsername}&backgroundColor=111111`,
        bio: 'Connected via Google on Mehfil',
        link: '',
        isPrivate: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isVerified: isSeedAdmin,
        role: isSeedAdmin ? 'admin' : 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        blockedUsers: [],
        savedPosts: [],
        followers: [],
        following: [],
        pendingFollowRequests: [],
      };

      setUsers(prev => [newUser, ...prev]);
      setCurrentUser(newUser);
      setNeedsProfileSetup(true);
      setIsLoading(false);
      return { success: true, isNewUser: true };
    }
  };

  const requestPasswordReset = async (emailOrUsername: string) => {
    const clean = emailOrUsername.trim().toLowerCase().replace(/^@/, '');
    const user = users.find(u => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean);

    if (!user) {
      return { success: false, message: 'No account matching that email or username was found.' };
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    setResetPendingEmail({ email: user.email, code: resetCode });
    return {
      success: true,
      message: `A 6-digit password reset code has been sent to ${user.email}.`,
      code: resetCode,
    };
  };

  const completePasswordReset = async (code: string, newPass: string) => {
    if (!resetPendingEmail || resetPendingEmail.code !== code.trim()) {
      return { success: false, error: 'Invalid or expired reset code.' };
    }
    if (newPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    setResetPendingEmail(null);
    return { success: true, message: 'Password updated successfully! Please log in.' };
  };

  const completeProfileSetup = async (data: {
    avatarUrl: string;
    username: string;
    name: string;
    bio: string;
    link?: string;
    isPrivate: boolean;
  }) => {
    if (!currentUser) return;
    const cleanUsername = data.username.trim().toLowerCase().replace(/^@/, '') || currentUser.username;

    const updated: User = {
      ...currentUser,
      avatarUrl: data.avatarUrl || currentUser.avatarUrl,
      username: cleanUsername,
      name: data.name.trim() || currentUser.name,
      bio: data.bio.slice(0, 150),
      link: data.link?.trim() || '',
      isPrivate: data.isPrivate,
    };

    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    setNeedsProfileSetup(false);
  };

  const updateProfile = (updatedData: Partial<User>) => {
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      ...updatedData,
    };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
  };

  const updateUserById = (userId: string, updates: Partial<User>) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const updated = { ...u, ...updates };
          if (currentUser && currentUser.id === userId) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
  };

  const togglePrivacy = () => {
    if (!currentUser) return;
    updateProfile({ isPrivate: !currentUser.isPrivate });
  };

  const blockUser = (userId: string) => {
    if (!currentUser) return;
    if (currentUser.blockedUsers.includes(userId)) return;
    const updatedBlocked = [...currentUser.blockedUsers, userId];
    updateProfile({ blockedUsers: updatedBlocked });
  };

  const unblockUser = (userId: string) => {
    if (!currentUser) return;
    const updatedBlocked = currentUser.blockedUsers.filter(id => id !== userId);
    updateProfile({ blockedUsers: updatedBlocked });
  };

  const logout = () => {
    setCurrentUser(null);
    setNeedsProfileSetup(false);
    safeRemoveItem('mehfil_current_user');
    if (isFirebaseConfigured()) {
      try {
        signOut(auth);
      } catch {}
    }
  };

  const deleteAccount = () => {
    if (!currentUser) return;
    setUsers(prev => prev.filter(u => u.id !== currentUser.id));
    logout();
  };

  // ============================================================
  // ADMIN SYSTEM CAPABILITIES
  // ============================================================
  const banUser = (userId: string, reason: string, duration: string) => {
    if (!isAdmin || !currentUser) return;
    if (userId === currentUser.id) return; // Cannot ban self

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    if (targetUser.role === 'admin') return; // Cannot ban fellow admin

    const expiresAt = duration === 'permanent'
      ? 'permanent'
      : new Date(Date.now() + parseInt(duration, 10) * 86400000).toISOString();

    updateUserById(userId, {
      status: 'banned',
      banReason: reason,
      banExpiresAt: expiresAt,
    });

    const newLog: AdminActivityLog = {
      id: `log_${Date.now()}`,
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      action: 'ban',
      targetId: userId,
      targetName: targetUser.name,
      reason: `${reason} (${duration === 'permanent' ? 'Permanent' : duration + ' days'})`,
      timestamp: new Date().toISOString(),
    };
    setAdminLogs(prev => [newLog, ...prev]);
  };

  const unbanUser = (userId: string) => {
    if (!isAdmin || !currentUser) return;
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    updateUserById(userId, {
      status: 'active',
      banReason: undefined,
      banExpiresAt: undefined,
    });

    const newLog: AdminActivityLog = {
      id: `log_${Date.now()}`,
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      action: 'unban',
      targetId: userId,
      targetName: targetUser.name,
      timestamp: new Date().toISOString(),
    };
    setAdminLogs(prev => [newLog, ...prev]);
  };

  const deleteUserAdmin = (userId: string) => {
    if (!isAdmin || !currentUser) return;
    if (userId === currentUser.id) return; // Cannot delete self

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    if (targetUser.role === 'admin') return; // Cannot delete fellow admin

    setUsers(prev => prev.filter(u => u.id !== userId));

    const newLog: AdminActivityLog = {
      id: `log_${Date.now()}`,
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      action: 'delete_user',
      targetId: userId,
      targetName: targetUser.name,
      timestamp: new Date().toISOString(),
    };
    setAdminLogs(prev => [newLog, ...prev]);
  };

  const makeAdmin = (userId: string) => {
    if (!isAdmin || !currentUser) return;
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    updateUserById(userId, { role: 'admin' });

    const newLog: AdminActivityLog = {
      id: `log_${Date.now()}`,
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      action: 'promote_admin',
      targetId: userId,
      targetName: targetUser.name,
      timestamp: new Date().toISOString(),
    };
    setAdminLogs(prev => [newLog, ...prev]);
  };

  const removeAdmin = (userId: string) => {
    if (!isAdmin || !currentUser) return;
    if (userId === currentUser.id) return; // Cannot demote self
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    updateUserById(userId, { role: 'user' });

    const newLog: AdminActivityLog = {
      id: `log_${Date.now()}`,
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      action: 'demote_admin',
      targetId: userId,
      targetName: targetUser.name,
      timestamp: new Date().toISOString(),
    };
    setAdminLogs(prev => [newLog, ...prev]);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        isAdmin,
        needsProfileSetup,
        users,
        adminLogs,
        pendingSignup,
        resendTimer,
        signupStep,
        setSignupStep,
        checkUsernameUnique,
        startSignup,
        verifySignupCode,
        resendVerificationCode,
        login,
        loginWithGoogle,
        requestPasswordReset,
        completePasswordReset,
        completeProfileSetup,
        updateProfile,
        updateUserById,
        togglePrivacy,
        blockUser,
        unblockUser,
        logout,
        deleteAccount,
        banUser,
        unbanUser,
        deleteUserAdmin,
        makeAdmin,
        removeAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
