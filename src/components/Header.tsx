import React from 'react';
import { User, AppNotification } from '../types';
import {
  Moon,
  Sun,
  Users,
  ArrowLeft,
  Search,
  Sparkles
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

export type MainTabType =
  | 'feed'
  | 'reels'
  | 'chat'
  | 'profile'
  | 'forums'
  | 'quizzes'
  | 'polls'
  | 'spaces'
  | 'admin'
  | 'menu';

interface HeaderProps {
  currentUser: User;
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  onLogout: () => void;
  isLiveConnected: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenDocSearch: () => void;
  // Notifications
  notifications: AppNotification[];
  onNotificationsChange: (notifications: AppNotification[]) => void;
  notificationsEnabled: boolean;
  onToggleNotificationsEnabled: () => void;
  latestPushNotification: AppNotification | null;
  onDismissPushNotification: () => void;
  // Friends & Chat badges
  onOpenFriendsModal?: () => void;
  unreadMessagesCount?: number;
  pendingFriendRequestsCount?: number;
  onOpenValidationCodeModal?: () => void;
  onOpenGestureSettings?: () => void;
}

const PAGE_METADATA: Record<
  MainTabType,
  { category: string; title: string; subtitle: string }
> = {
  feed: {
    category: 'Espace Social',
    title: "Fil d'actualité",
    subtitle: 'Publications, documents partagés et actualités des membres'
  },
  reels: {
    category: 'Médias Courts',
    title: 'Reels Vidéo',
    subtitle: 'Créations et vidéos verticales de moins de 60 secondes'
  },
  chat: {
    category: 'Communication',
    title: 'Messagerie Directe',
    subtitle: 'Discussions privées instantanées et partage multimédia'
  },
  forums: {
    category: 'Collaboration',
    title: 'Communautés & Salons',
    subtitle: 'Espaces de discussion thématiques publics et privés'
  },
  quizzes: {
    category: 'Apprentissage & IA',
    title: 'Quiz & Studio IA (PDF)',
    subtitle: 'Évaluations QCM interactives, lecture PDF par IA et classement'
  },
  polls: {
    category: 'Consultations',
    title: 'Sondages',
    subtitle: 'Votes en temps réel et avis de la communauté'
  },
  spaces: {
    category: 'Bibliothèque',
    title: 'Mes Espaces',
    subtitle: 'Dossiers personnels et publications enregistrées'
  },
  profile: {
    category: 'Compte Membre',
    title: 'Profil & Publications',
    subtitle: 'Informations personnelles, amis et paramètres de confidentialité'
  },
  admin: {
    category: 'Supervision',
    title: 'Administration & Signalements',
    subtitle: 'Gestion des membres, signalements et sécurité du réseau'
  },
  menu: {
    category: 'Navigation & Compte',
    title: 'Menu & Paramètres',
    subtitle: 'Raccourcis, activité, sécurité et préférences du compte'
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onGoBack,
  canGoBack = false,
  darkMode,
  onToggleDarkMode,
  onOpenDocSearch,
  notifications,
  onNotificationsChange,
  notificationsEnabled,
  onToggleNotificationsEnabled,
  latestPushNotification,
  onDismissPushNotification,
  onOpenFriendsModal,
  pendingFriendRequestsCount = 0,
  onOpenValidationCodeModal,
  onOpenGestureSettings
}) => {
  const [isNotificationBoxOpen, setIsNotificationBoxOpen] = React.useState(false);
  const currentMeta = PAGE_METADATA[activeTab] || PAGE_METADATA.feed;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#0a1124]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-7">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
          {/* LEFT: Wavegram Brand Lockup / Back Button */}
          <div className="flex items-center space-x-3 min-w-0">
            {canGoBack && onGoBack ? (
              <button
                id="header-back-arrow-btn"
                type="button"
                onClick={onGoBack}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Revenir à la page précédente"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onTabChange('feed')}
                className="flex items-center space-x-2.5 text-left shrink-0 cursor-pointer group"
                title="Wavegram Accueil"
              >
                {/* Circular Gold Rim Medallion with Crown & MK Monogram */}
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

                <div className="flex flex-col min-w-0">
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                    Wavegram
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-sky-600 dark:text-sky-400 tracking-wide truncate">
                    Connecte-toi · Partage · Explore
                  </span>
                </div>
              </button>
            )}

            {canGoBack && (
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {currentMeta.title}
                  </h1>
                </div>
                <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {currentMeta.subtitle}
                </p>
              </div>
            )}
          </div>

          {/* CENTER: Search Bar (Desktop md+) */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <button
              type="button"
              onClick={onOpenDocSearch}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 transition cursor-pointer"
            >
              <span className="flex items-center space-x-2 truncate">
                <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">
                  Rechercher un membre, un cours PDF, une publication...
                </span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-2 shrink-0">
                Explorer
              </span>
            </button>
          </div>

          {/* RIGHT: Compact Action Icons (Search on mobile, Friends, Notifications, Theme) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              type="button"
              onClick={onOpenDocSearch}
              className="md:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer"
              title="Rechercher"
            >
              <Search className="w-4 h-4" />
            </button>

            {onOpenFriendsModal && (
              <button
                type="button"
                onClick={onOpenFriendsModal}
                className="relative h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center space-x-1.5 text-xs font-bold shrink-0 cursor-pointer"
                title="Réseau, amis et invitations"
              >
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Amis</span>
                {pendingFriendRequestsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono tabular-nums font-bold">
                    {pendingFriendRequestsCount}
                  </span>
                )}
              </button>
            )}

            <NotificationCenter
              currentUser={currentUser}
              notifications={notifications}
              onNotificationsChange={onNotificationsChange}
              onNavigateTab={(tab) => onTabChange(tab as MainTabType)}
              notificationsEnabled={notificationsEnabled}
              onToggleNotificationsEnabled={onToggleNotificationsEnabled}
              latestPushNotification={latestPushNotification}
              onDismissPushNotification={onDismissPushNotification}
              isOpen={isNotificationBoxOpen}
              onToggleOpen={() => setIsNotificationBoxOpen((prev) => !prev)}
              onClose={() => setIsNotificationBoxOpen(false)}
              onOpenValidationCodeModal={onOpenValidationCodeModal}
            />

            {onOpenGestureSettings && (
              <button
                id="gesture-control-btn"
                type="button"
                onClick={onOpenGestureSettings}
                className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center space-x-1.5 text-xs font-bold shrink-0 cursor-pointer group"
                title="Contrôle Gestuel IA & Touche Virtuelle"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline">Gestes IA</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}

            <button
              id="theme-toggle-btn"
              type="button"
              onClick={onToggleDarkMode}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition shrink-0 cursor-pointer"
              title={darkMode ? 'Passer en mode clair' : 'Activer le mode sombre'}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
