import React, { useState, useEffect } from 'react';
import { User, Post, AppNotification } from './types';
import { api, getStoredToken, subscribeToLiveUpdates } from './lib/api';
import { AuthModal } from './components/AuthModal';
import { Header, MainTabType } from './components/Header';
import { FeedView } from './components/FeedView';
import { ForumsView } from './components/ForumsView';
import { QuizView } from './components/QuizView';
import { PollsView } from './components/PollsView';
import { SpacesView } from './components/SpacesView';
import { AdminView } from './components/AdminView';
import { DocumentSearchModal } from './components/DocumentSearchModal';
import { ReelsView } from './components/ReelsView';
import { ChatView } from './components/ChatView';
import { ProfileView } from './components/ProfileView';
import { FriendsModal } from './components/FriendsModal';
import { MenuPageView } from './components/SlidingPanel';
import { ValidationCodeModal } from './components/ValidationCodeModal';
import { TouchlessController } from './components/gesture/TouchlessController';
import {
  Film,
  MessageCircle,
  Sparkles,
  Users,
  MessageSquare,
  BookOpen,
  BarChart3,
  Bookmark,
  ShieldAlert,
  User as UserIcon,
  LogOut,
  Menu,
  Lock,
  Unlock,
  ShieldCheck,
  Laptop,
  Home,
  Bell,
  Plus,
  X,
  Camera
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTabType>('feed');
  const [tabHistory, setTabHistory] = useState<MainTabType[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [latestPushNotification, setLatestPushNotification] = useState<AppNotification | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [showGlobalDocSearch, setShowGlobalDocSearch] = useState(false);

  // Cross-device PC login states
  const [showValidationCodeModal, setShowValidationCodeModal] = useState(false);
  const [pendingPcAlert, setPendingPcAlert] = useState<{
    code: string;
    deviceInfo: string;
    sessionId: string;
  } | null>(null);

  // Quick Create Modal Sheet triggered by center (+) button
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);

  // Social Media Features State
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  const [isChatConversationOpen, setIsChatConversationOpen] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [unreadDirectMessagesCount, setUnreadDirectMessagesCount] = useState(0);
  const [pendingFriendRequestsCount, setPendingFriendRequestsCount] = useState(0);

  // Touchless Gesture Control State (Zoom & Screenshots)
  const [globalZoom, setGlobalZoom] = useState(1);
  const [showGestureModalFromHeader, setShowGestureModalFromHeader] = useState(false);
  const [sharedScreenshotUrl, setSharedScreenshotUrl] = useState<string | null>(null);

  // Notifications preference (persistent in localStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pulse_notifications_enabled');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const toggleNotificationsEnabled = () => {
    setNotificationsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('pulse_notifications_enabled', String(next));
      return next;
    });
  };

  // Executable Dark Mode state (defaults to true for Wavegram dark aesthetic)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pulse_theme');
      if (saved !== null) return saved === 'dark';
    }
    return true;
  });

  // Apply dark mode class to root html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pulse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pulse_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Check existing session token on startup
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const token = getStoredToken();
    if (!token) {
      setCurrentUser(null);
      setAuthChecking(false);
      return;
    }

    try {
      const res = await api.auth.getMe();
      setCurrentUser(res.user);
      if (res.user.role === 'admin') {
        setActiveTab('admin');
      }
    } catch {
      api.auth.logout();
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  // Fetch posts for feed
  const loadPosts = async () => {
    try {
      const res = await api.posts.getAll();
      setPosts(res.posts || []);
    } catch (err) {
      console.error('Failed to load posts', err);
    }
  };

  // Fetch notifications for user
  const loadNotifications = async () => {
    try {
      const res = await api.notifications.getAll();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  // Load Social badges (Direct messages unread count & pending friend requests)
  const loadSocialBadges = async () => {
    if (!currentUser) return;
    try {
      const [chatRes, friendsRes] = await Promise.all([
        api.chat.getConversations().catch(() => ({ conversations: [] })),
        api.friends.getAll().catch(() => ({ friends: [], pendingReceived: [], pendingSent: [] }))
      ]);

      const totalUnread = (chatRes.conversations || []).reduce(
        (acc: number, c: any) => acc + (c.unreadCount || 0),
        0
      );
      setUnreadDirectMessagesCount(totalUnread);
      setPendingFriendRequestsCount((friendsRes.pendingReceived || []).length);
    } catch {
      // Silent error in background badge fetch
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadPosts();
      loadNotifications();
      loadSocialBadges();

      // Poll social badges every 8 seconds
      const badgeInterval = setInterval(loadSocialBadges, 8000);

      // Subscribe to Server-Sent Events for instant real-time updates
      const unsubscribe = subscribeToLiveUpdates((event, payload) => {
        setIsLiveConnected(true);

        if (event === 'NEW_POST') {
          setPosts((prev) => {
            if (prev.some((p) => p.id === payload.id)) return prev;
            return [payload, ...prev];
          });
        } else if (event === 'UPDATE_POST') {
          setPosts((prev) => prev.map((p) => (p.id === payload.id ? payload : p)));
        } else if (event === 'DELETE_POST') {
          setPosts((prev) => prev.filter((p) => p.id !== payload.id));
        } else if (event === 'LIKE_POST') {
          setPosts((prev) =>
            prev.map((p) => (p.id === payload.postId ? { ...p, likes: payload.likes } : p))
          );
        } else if (event === 'COMMENT_POST') {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === payload.postId
                ? { ...p, comments: [...(p.comments || []), payload.comment] }
                : p
            )
          );
        } else if (event === 'NEW_NOTIFICATION') {
          if (payload.recipientId === currentUser.id) {
            setNotifications((prev) => [payload, ...prev]);
            setLatestPushNotification(payload);
            setTimeout(() => {
              setLatestPushNotification((curr) => (curr?.id === payload.id ? null : curr));
            }, 5000);
          }
        } else if (event === 'NEW_DIRECT_MESSAGE') {
          if (payload.receiverId === currentUser.id) {
            loadSocialBadges();
            if (activeTab !== 'chat') {
              const pushNotif: AppNotification = {
                id: `dm_${Date.now()}`,
                recipientId: currentUser.id,
                actorId: payload.senderId,
                actorName: payload.senderName,
                actorAvatar: payload.senderAvatar,
                actorPromo: 'Message',
                type: 'direct_message',
                title: 'Nouveau message',
                message: `${payload.senderName} vous a envoyé un message : "${payload.content || 'Pièce jointe'}"`,
                targetId: payload.senderId,
                targetType: 'message',
                isRead: false,
                createdAt: new Date().toISOString()
              };
              setLatestPushNotification(pushNotif);
              setTimeout(() => {
                setLatestPushNotification((curr) => (curr?.id === pushNotif.id ? null : curr));
              }, 5000);
            }
          }
        } else if (event === 'FRIEND_REQUEST') {
          if (payload.receiverId === currentUser.id) {
            loadSocialBadges();
          }
        } else if (event === 'USER_STATUS_CHANGED' && payload.userId === currentUser.id) {
          api.auth.getMe().then((res) => setCurrentUser(res.user)).catch(() => {
            handleLogout();
          });
        } else if (event === 'PC_LOGIN_ATTEMPT') {
          if (payload.userId === currentUser.id) {
            setPendingPcAlert({
              code: payload.code,
              deviceInfo: payload.deviceInfo,
              sessionId: payload.sessionId
            });
            setShowValidationCodeModal(true);
          }
        } else if (event === 'PC_LOGIN_APPROVED') {
          if (payload.userId === currentUser.id) {
            setPendingPcAlert(null);
          }
        }
      });

      return () => {
        clearInterval(badgeInterval);
        unsubscribe();
      };
    }
  }, [currentUser, activeTab]);

  const navigateToTab = (tab: MainTabType, keepHistory = true) => {
    if (tab !== activeTab && keepHistory) {
      setTabHistory((prev) => [...prev, activeTab]);
    }
    if (tab === 'profile') {
      setSelectedProfileUserId(currentUser?.id || null);
    }
    if (tab !== 'chat') {
      setChatPartnerId(null);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBack = () => {
    if (activeTab === 'chat' && chatPartnerId) {
      setChatPartnerId(null);
      return;
    }
    if (activeTab === 'profile' && selectedProfileUserId && selectedProfileUserId !== currentUser?.id) {
      setSelectedProfileUserId(currentUser?.id || null);
      return;
    }
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory((prev) => prev.slice(0, -1));
      setActiveTab(prevTab);
      if (prevTab !== 'chat') setChatPartnerId(null);
      if (prevTab !== 'profile') setSelectedProfileUserId(currentUser?.id || null);
    } else {
      setActiveTab('feed');
      setChatPartnerId(null);
      setSelectedProfileUserId(currentUser?.id || null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canGoBack =
    activeTab !== 'feed' ||
    (activeTab === 'chat' && chatPartnerId !== null) ||
    (activeTab === 'profile' && selectedProfileUserId !== currentUser?.id) ||
    tabHistory.length > 0;

  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
    setActiveTab('feed');
  };

  const handleOpenUserProfile = (userId: string) => {
    setTabHistory((prev) => [...prev, activeTab]);
    setSelectedProfileUserId(userId);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChatWithUser = (partnerId: string) => {
    setTabHistory((prev) => [...prev, activeTab]);
    setChatPartnerId(partnerId);
    setActiveTab('chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#060b18] flex flex-col items-center justify-center p-4">
        <div className="relative w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-[0_0_24px_rgba(251,191,36,0.4)] mb-4 flex items-center justify-center animate-pulse">
          <div className="w-full h-full rounded-full bg-gradient-to-b from-[#0e172e] via-[#091124] to-[#050914] flex flex-col items-center justify-center">
            <span className="text-[10px] text-amber-300 font-black leading-none">👑</span>
            <span className="text-base font-black text-white mt-1">MK</span>
          </div>
        </div>
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-sky-400 border-t-transparent mb-3" />
        <p className="text-sky-400 font-bold text-xs tracking-wider uppercase">Wavegram · Chargement...</p>
      </div>
    );
  }

  // If not logged in, display the login/registration page first and automatically
  if (!currentUser) {
    return (
      <AuthModal
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'admin') {
            setActiveTab('admin');
          } else {
            setActiveTab('feed');
          }
        }}
      />
    );
  }

  const isAdmin = currentUser.role === 'admin';

  const socialNavItems: {
    id: MainTabType;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }[] = [
    {
      id: 'feed',
      label: "Fil d'actualité",
      subtitle: 'Publications & cours',
      icon: Sparkles
    },
    {
      id: 'reels',
      label: 'Reels Vidéo',
      subtitle: 'Vidéos courtes < 60s',
      icon: Film
    },
    {
      id: 'chat',
      label: 'Messagerie Directe',
      subtitle: 'Discussions privées',
      icon: MessageCircle,
      badgeCount: unreadDirectMessagesCount
    }
  ];

  const collaborationNavItems: {
    id: MainTabType;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'forums',
      label: 'Communautés',
      subtitle: 'Salons & débats',
      icon: MessageSquare
    },
    {
      id: 'quizzes',
      label: 'Quiz & Studio IA',
      subtitle: 'PDF, QCM & classements',
      icon: BookOpen
    },
    {
      id: 'polls',
      label: 'Sondages',
      subtitle: 'Consultations & votes',
      icon: BarChart3
    },
    {
      id: 'spaces',
      label: 'Mes Espaces',
      subtitle: 'Ressources sauvegardées',
      icon: Bookmark
    }
  ];

  return (
    <div className="h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-slate-100 dark:bg-[#070d20] text-slate-900 dark:text-slate-100 flex flex-row transition-colors duration-200 relative">
      {/* PERMANENT LEFT WORKSPACE SIDEBAR (Desktop lg+) */}
      <aside className="hidden lg:flex w-64 xl:w-68 shrink-0 h-full bg-white dark:bg-[#0a1124] border-r border-slate-200/80 dark:border-slate-800/80 flex-col justify-between select-none z-40">
        {/* Top Brand & Navigation Sections */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-1.5">
            <button
              type="button"
              onClick={() => navigateToTab('feed')}
              className="flex items-center space-x-2.5 text-left cursor-pointer group"
            >
              <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.35)] shrink-0 flex items-center justify-center transition-transform group-hover:scale-105">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-[#0e172e] via-[#091124] to-[#050914] flex flex-col items-center justify-center relative overflow-hidden">
                  <span className="text-[7px] text-amber-300 drop-shadow-sm leading-none font-black">
                    👑
                  </span>
                  <span className="text-[11px] font-black tracking-tight text-white font-['Plus_Jakarta_Sans'] leading-none mt-0.5">
                    MK
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                  Wavegram
                </div>
                <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-1">
                  Connecte-toi · Partage · Explore
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigateToTab('menu')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title="Menu (3 tirets)"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* SECTION 1: Espace Social */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
              01. Espace Social
            </div>

            {socialNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  type="button"
                  onClick={() => navigateToTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{item.label}</div>
                      <div
                        className={`text-[10px] truncate ${
                          isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold shrink-0 ${
                        isActive
                          ? 'bg-white text-blue-600'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Network & Friends Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowFriendsModal(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Réseau & Amis</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    Contacts & invitations
                  </div>
                </div>
              </div>

              {pendingFriendRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-mono tabular-nums font-bold shrink-0">
                  {pendingFriendRequestsCount}
                </span>
              )}
            </button>
          </div>

          {/* SECTION 2: Collaboration & Savoir */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
              02. Collaboration & Savoir
            </div>

            {collaborationNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  type="button"
                  onClick={() => navigateToTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{item.label}</div>
                      <div
                        className={`text-[10px] truncate ${
                          isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SECTION 3: Compte & Supervision */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
              03. Compte & Préférences
            </div>

            <button
              id="nav-btn-profile"
              type="button"
              onClick={() => navigateToTab('profile')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <UserIcon
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'profile' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Mon Profil</div>
                <div
                  className={`text-[10px] truncate ${
                    activeTab === 'profile' ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  Publications & confidentialité
                </div>
              </div>
            </button>

            <button
              id="nav-btn-menu"
              type="button"
              onClick={() => navigateToTab('menu')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <Menu
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'menu' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Menu & Raccourcis</div>
                <div
                  className={`text-[10px] truncate ${
                    activeTab === 'menu' ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  Outils, thèmes & paramètres
                </div>
              </div>
            </button>

            {isAdmin && (
              <button
                id="nav-btn-admin"
                type="button"
                onClick={() => navigateToTab('admin')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-blue-800 text-white shadow-2xs'
                    : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Modération & Admin</div>
                  <div
                    className={`text-[10px] truncate ${
                      activeTab === 'admin' ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    Gestion de la plateforme
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Bottom User Profile & Session Dock */}
        <div className="shrink-0 p-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#080e1e] space-y-2.5">
          <div
            onClick={() => navigateToTab('profile')}
            className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800/80 transition cursor-pointer"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.prenom}
                className="w-9 h-9 rounded-full object-cover border border-blue-500 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center space-x-1">
                  <span className="truncate">
                    {currentUser.prenom} {currentUser.nom}
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 truncate">
                  <span>{currentUser.promo || 'Membre'}</span>
                  <span aria-hidden="true">·</span>
                  {currentUser.isLocked ? (
                    <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                  ) : (
                    <Unlock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-200/70 hover:bg-rose-600 hover:text-white dark:bg-slate-800 dark:hover:bg-rose-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* RIGHT WORKSPACE VIEWPORT (Header + Main Content + Mobile Bottom Bar) */}
      <div
        id="app-workspace-viewport"
        className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative transition-all duration-150 origin-top"
        style={globalZoom !== 1 ? { zoom: globalZoom } : undefined}
      >
        {/* Top Contextual Header - Hidden on mobile when inside an active chat conversation */}
        <div
          className={
            activeTab === 'chat' && isChatConversationOpen
              ? 'hidden md:block shrink-0'
              : 'block shrink-0'
          }
        >
          <Header
            currentUser={currentUser}
            activeTab={activeTab}
            canGoBack={canGoBack}
            onGoBack={handleGoBack}
            onTabChange={(tab) => navigateToTab(tab)}
            onLogout={handleLogout}
            isLiveConnected={isLiveConnected}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            onOpenDocSearch={() => setShowGlobalDocSearch(true)}
            notifications={notifications}
            onNotificationsChange={setNotifications}
            notificationsEnabled={notificationsEnabled}
            onToggleNotificationsEnabled={toggleNotificationsEnabled}
            latestPushNotification={latestPushNotification}
            onDismissPushNotification={() => setLatestPushNotification(null)}
            onOpenFriendsModal={() => setShowFriendsModal(true)}
            unreadMessagesCount={unreadDirectMessagesCount}
            pendingFriendRequestsCount={pendingFriendRequestsCount}
            onOpenValidationCodeModal={() => setShowValidationCodeModal(true)}
            onOpenGestureSettings={() => setShowGestureModalFromHeader(true)}
          />
        </div>

        {/* Global Floating Banner for Pending PC Login Attempt */}
        {pendingPcAlert && (
          <div className="shrink-0 px-3 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md z-20 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Laptop className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="min-w-0 text-xs">
                <span className="font-extrabold block truncate">
                  Connexion PC en attente de validation !
                </span>
                <span className="text-amber-100 text-[11px] truncate block">
                  Code : <strong className="font-mono text-white text-xs tracking-widest">{pendingPcAlert.code}</strong> · {pendingPcAlert.deviceInfo}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowValidationCodeModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white text-amber-700 font-extrabold text-xs shadow-sm hover:bg-amber-50 transition cursor-pointer"
              >
                Autoriser / Voir
              </button>
              <button
                type="button"
                onClick={() => setPendingPcAlert(null)}
                className="w-7 h-7 rounded-lg bg-black/10 hover:bg-black/20 text-white flex items-center justify-center text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Tab Content */}
        <main
          className={
            activeTab === 'chat'
              ? 'flex-1 min-h-0 min-w-0 w-full max-w-full flex flex-col overflow-hidden'
              : 'flex-1 min-h-0 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden overscroll-x-none pb-20 lg:pb-8'
          }
        >
          {activeTab === 'feed' && (
            <FeedView
              currentUser={currentUser}
              posts={posts}
              onRefresh={loadPosts}
              onOpenUserProfile={handleOpenUserProfile}
              onOpenChatWithUser={handleOpenChatWithUser}
              onNavigateTab={(tab) => navigateToTab(tab)}
              onOpenFriendsModal={() => setShowFriendsModal(true)}
              initialSharedImage={sharedScreenshotUrl}
              onClearInitialSharedImage={() => setSharedScreenshotUrl(null)}
            />
          )}

          {activeTab === 'reels' && (
            <ReelsView
              currentUser={currentUser}
              onOpenUserProfile={handleOpenUserProfile}
              onOpenChatWithUser={handleOpenChatWithUser}
              onGoBack={handleGoBack}
            />
          )}

          {activeTab === 'chat' && (
            <ChatView
              currentUser={currentUser}
              initialPartnerId={chatPartnerId}
              onOpenUserProfile={handleOpenUserProfile}
              onGoBack={handleGoBack}
              onConversationStateChange={setIsChatConversationOpen}
              onPartnerChange={setChatPartnerId}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              targetUserId={selectedProfileUserId || currentUser.id}
              currentUser={currentUser}
              onUpdateCurrentUser={(updated) => {
                setCurrentUser(updated);
              }}
              onOpenChatWithUser={handleOpenChatWithUser}
              onOpenUserProfile={handleOpenUserProfile}
              onOpenReelsView={() => navigateToTab('reels')}
              onGoBack={handleGoBack}
            />
          )}

          {activeTab === 'forums' && (
            <ForumsView currentUser={currentUser} onGoBack={handleGoBack} />
          )}

          {activeTab === 'quizzes' && (
            <QuizView currentUser={currentUser} onGoBack={handleGoBack} />
          )}

          {activeTab === 'polls' && (
            <PollsView currentUser={currentUser} onGoBack={handleGoBack} />
          )}

          {activeTab === 'spaces' && (
            <SpacesView
              currentUser={currentUser}
              allPosts={posts}
              onRefresh={loadPosts}
              onGoBack={handleGoBack}
            />
          )}

          {activeTab === 'admin' && (
            <AdminView currentUser={currentUser} onGoBack={handleGoBack} />
          )}

          {activeTab === 'menu' && (
            <MenuPageView
              currentUser={currentUser}
              activeTab={activeTab}
              onTabChange={(tab) => navigateToTab(tab)}
              onGoBack={handleGoBack}
              onLogout={handleLogout}
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
              notificationsEnabled={notificationsEnabled}
              onToggleNotificationsEnabled={toggleNotificationsEnabled}
              onOpenDocSearch={() => setShowGlobalDocSearch(true)}
              onOpenFriendsModal={() => setShowFriendsModal(true)}
              pendingFriendRequestsCount={pendingFriendRequestsCount}
              onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
              onRefreshPosts={loadPosts}
            />
          )}

          {/* Clean Footer inside scrollable main (Hidden when activeTab === 'chat') */}
          {activeTab !== 'chat' && (
            <footer className="mt-10 border-t border-slate-200/80 dark:border-slate-800/80 py-5 text-xs text-slate-500 dark:text-slate-400">
              <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  © {new Date().getFullYear()} MK Réseau · Plateforme Sociale & Collaborative
                </p>
                <div className="flex items-center space-x-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => navigateToTab('forums')}
                    className="hover:text-blue-600 transition cursor-pointer"
                  >
                    Communautés
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => navigateToTab('quizzes')}
                    className="hover:text-blue-600 transition cursor-pointer"
                  >
                    Quiz IA
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => navigateToTab('menu')}
                    className="hover:text-blue-600 transition cursor-pointer"
                  >
                    Menu
                  </button>
                </div>
              </div>
            </footer>
          )}
        </main>

        {/* Mobile-Only Bottom Navigation Dock — Matching Wavegram Screenshot with Elevated Central (+) Button */}
        <nav
          id="app-bottom-fixed-nav"
          className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 w-full bg-[#081024]/95 backdrop-blur-2xl border-t border-sky-500/15 py-1 px-3 h-16 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_25px_rgba(0,0,0,0.6)] ${
            activeTab === 'chat' && isChatConversationOpen ? 'hidden' : 'flex items-center justify-around'
          }`}
        >
          <div className="w-full max-w-md mx-auto grid grid-cols-5 items-center relative">
            {/* 1. Accueil */}
            <button
              id="bottom-nav-feed"
              type="button"
              onClick={() => navigateToTab('feed')}
              className={`flex flex-col items-center justify-center py-1 text-[10px] font-bold transition cursor-pointer ${
                activeTab === 'feed'
                  ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className={`w-5 h-5 mb-0.5 ${activeTab === 'feed' ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span>Accueil</span>
            </button>

            {/* 2. Discussions */}
            <button
              id="bottom-nav-chat"
              type="button"
              onClick={() => navigateToTab('chat')}
              className={`flex flex-col items-center justify-center py-1 text-[10px] font-bold transition relative cursor-pointer ${
                activeTab === 'chat'
                  ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <MessageCircle className={`w-5 h-5 mb-0.5 ${activeTab === 'chat' ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {unreadDirectMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 bg-pink-500 text-white text-[9px] font-mono tabular-nums font-bold rounded-full flex items-center justify-center px-1 shadow-[0_0_6px_#ec4899]">
                    {unreadDirectMessagesCount}
                  </span>
                )}
              </div>
              <span>Discussions</span>
            </button>

            {/* 3. Center Elevated Floating (+) Action Button */}
            <div className="flex flex-col items-center justify-center relative">
              <button
                id="bottom-nav-quick-create"
                type="button"
                onClick={() => setShowQuickCreateModal(true)}
                className="absolute -top-7 w-12 h-12 rounded-full bg-gradient-to-tr from-sky-400 via-cyan-400 to-blue-600 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.7)] ring-4 ring-[#081024] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Créer sur Wavegram"
                aria-label="Créer une publication ou une story"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
              </button>
            </div>

            {/* 4. Notifications */}
            <button
              id="bottom-nav-notifications"
              type="button"
              onClick={() => {
                const bellBtn = document.getElementById('notification-bell-btn');
                if (bellBtn) {
                  bellBtn.click();
                }
              }}
              className="flex flex-col items-center justify-center py-1 text-[10px] font-bold transition text-slate-400 hover:text-slate-200 relative cursor-pointer"
            >
              <div className="relative">
                <Bell className="w-5 h-5 mb-0.5 stroke-2" />
                {notifications.filter((n) => !n.isRead).length > 0 && (
                  <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full ring-2 ring-[#081024] shadow-[0_0_6px_#ec4899] animate-pulse" />
                )}
              </div>
              <span>Notifications</span>
            </button>

            {/* 5. Profil */}
            <button
              id="bottom-nav-profile"
              type="button"
              onClick={() => navigateToTab('profile')}
              className={`flex flex-col items-center justify-center py-1 text-[10px] font-bold transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full overflow-hidden mb-0.5 border ${
                  activeTab === 'profile'
                    ? 'border-sky-400 ring-2 ring-sky-400/40'
                    : 'border-slate-500'
                }`}
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.prenom}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span>Profil</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Quick Create Bottom Sheet Modal */}
      {showQuickCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fadeIn"
          onClick={() => setShowQuickCreateModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0a132c] border-t sm:border border-sky-500/20 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-sky-500/15">
              <div className="flex items-center space-x-2">
                <span className="text-xl">✨</span>
                <h3 className="font-extrabold text-white text-base">Créer sur Wavegram</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowQuickCreateModal(false);
                  navigateToTab('feed');
                  setTimeout(() => {
                    document.getElementById('post-content-input')?.focus();
                  }, 200);
                }}
                className="p-3.5 rounded-2xl bg-[#0f1d44] hover:bg-[#15275c] border border-sky-500/20 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition group"
              >
                <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">Nouvelle publication</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickCreateModal(false);
                  navigateToTab('reels');
                }}
                className="p-3.5 rounded-2xl bg-[#0f1d44] hover:bg-[#15275c] border border-sky-500/20 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition group"
              >
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Film className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">Vidéo / Reel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickCreateModal(false);
                  navigateToTab('polls');
                }}
                className="p-3.5 rounded-2xl bg-[#0f1d44] hover:bg-[#15275c] border border-sky-500/20 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition group"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">Lancer un Sondage</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickCreateModal(false);
                  navigateToTab('chat');
                }}
                className="p-3.5 rounded-2xl bg-[#0f1d44] hover:bg-[#15275c] border border-sky-500/20 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">Discussions directes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends & Invitations Modal */}
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => {
          setShowFriendsModal(false);
          loadSocialBadges();
        }}
        currentUser={currentUser}
        onOpenUserProfile={handleOpenUserProfile}
        onOpenChatWithUser={handleOpenChatWithUser}
      />

      {/* Global Search Modal */}
      <DocumentSearchModal
        isOpen={showGlobalDocSearch}
        onClose={() => setShowGlobalDocSearch(false)}
        posts={posts}
        currentUser={currentUser}
        onOpenUserProfile={handleOpenUserProfile}
        onOpenChatWithUser={handleOpenChatWithUser}
        onNavigateTab={(tab) => navigateToTab(tab)}
      />

      {/* Validation Code & PC Security Modal */}
      <ValidationCodeModal
        currentUser={currentUser}
        isOpen={showValidationCodeModal}
        onClose={() => {
          setShowValidationCodeModal(false);
          setPendingPcAlert(null);
        }}
      />

      {/* AI Touchless Gesture Controller (Remote Scrolling, Virtual Pointer, Remote Click, Zoom & Opposition Screenshots) */}
      <TouchlessController
        onShareScreenshotToFeed={(dataUrl) => {
          setSharedScreenshotUrl(dataUrl);
          navigateToTab('feed');
        }}
        onZoomChange={(zoom) => setGlobalZoom(zoom)}
        externalTriggerModal={showGestureModalFromHeader}
        onCloseExternalModal={() => setShowGestureModalFromHeader(false)}
      />
    </div>
  );
}
