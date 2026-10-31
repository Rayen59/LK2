import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Plus, X, Heart, Send, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export interface StoryItem {
  id: string;
  categoryKey: string;
  categoryLabel: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  caption?: string;
  timestamp: string;
  isCurrentUser?: boolean;
}

interface StoriesBarProps {
  currentUser: User;
  onOpenCreateStory?: () => void;
}

const DEFAULT_STORIES: StoryItem[] = [
  {
    id: 'story_amis',
    categoryKey: 'amis',
    categoryLabel: 'Amis',
    userName: 'Amis de la promo',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80',
    caption: 'Retrouvailles après les cours ! Toujours une super ambiance ensemble ✨',
    timestamp: 'Il y a 1h'
  },
  {
    id: 'story_etudes',
    categoryKey: 'etudes',
    categoryLabel: 'Etudes',
    userName: 'Club Études & Révisions',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
    caption: 'Session intensive de révision à la bibliothèque. Fiches prêtes pour les examens 📚💡',
    timestamp: 'Il y a 3h'
  },
  {
    id: 'story_voyages',
    categoryKey: 'voyages',
    categoryLabel: 'Voyages',
    userName: 'Cap sur l’aventure',
    userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    caption: 'Coucher de soleil inoubliable sur la côte méditerranéenne 🌊🌅',
    timestamp: 'Il y a 5h'
  },
  {
    id: 'story_sport',
    categoryKey: 'sport',
    categoryLabel: 'Sport',
    userName: 'Team Training MK',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    caption: 'Séance de crossfit matinale terminée. Discipline et régularité ! 💪🔥',
    timestamp: 'Il y a 7h'
  }
];

export const StoriesBar: React.FC<StoriesBarProps> = ({ currentUser, onOpenCreateStory }) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [userStory, setUserStory] = useState<StoryItem | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wavegram_user_story');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [replyText, setReplyText] = useState('');
  const [reactionSent, setReactionSent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // All displayed stories (user's story if any + default categories)
  const allStories: StoryItem[] = [
    ...(userStory
      ? [
          {
            ...userStory,
            categoryLabel: 'Ta story',
            isCurrentUser: true
          }
        ]
      : []),
    ...DEFAULT_STORIES
  ];

  // Story progress timer
  useEffect(() => {
    if (activeStoryIndex === null) {
      setStoryProgress(0);
      return;
    }

    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          if (activeStoryIndex < allStories.length - 1) {
            setActiveStoryIndex((curr) => (curr !== null ? curr + 1 : null));
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIndex, allStories.length]);

  const handleUploadUserStory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const newStory: StoryItem = {
        id: 'user_story_' + Date.now(),
        categoryKey: 'my_story',
        categoryLabel: 'Ta story',
        userName: currentUser.prenom + ' ' + currentUser.nom,
        userAvatar: currentUser.avatarUrl,
        mediaUrl: result,
        caption: 'En direct sur Wavegram ✨',
        timestamp: 'À l’instant',
        isCurrentUser: true
      };
      setUserStory(newStory);
      localStorage.setItem('wavegram_user_story', JSON.stringify(newStory));
      setActiveStoryIndex(0);
    };
    reader.readAsDataURL(file);
  };

  const handleSendReaction = (emoji: string) => {
    setReactionSent(emoji);
    setTimeout(() => setReactionSent(null), 1500);
  };

  const currentActiveStory = activeStoryIndex !== null ? allStories[activeStoryIndex] : null;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleUploadUserStory}
        className="hidden"
      />

      {/* Horizontal Stories Carousel */}
      <div className="w-full overflow-hidden select-none py-2 px-1">
        <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth px-1">
          {/* 1. TA STORY BUTTON */}
          <div className="flex flex-col items-center shrink-0 cursor-pointer group">
            <div
              className="relative w-16 h-16 sm:w-17 sm:h-17 rounded-full p-[2.5px] bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 transition-transform duration-200 group-hover:scale-105"
              onClick={() => {
                if (userStory) {
                  setActiveStoryIndex(0);
                } else if (onOpenCreateStory) {
                  onOpenCreateStory();
                } else {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="w-full h-full rounded-full p-[2px] bg-[#070e24]">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.prenom}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Glowing Cyan Plus Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="absolute bottom-0 right-0 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-gradient-to-tr from-sky-400 to-cyan-400 text-slate-950 flex items-center justify-center ring-2 ring-[#070e24] shadow-[0_0_10px_rgba(56,189,248,0.7)] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                title="Ajouter une photo à ta story"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-300 group-hover:text-white transition-colors mt-1.5 tracking-tight">
              Ta story
            </span>
          </div>

          {/* 2. CATEGORY STORIES (Amis, Etudes, Voyages, Sport) */}
          {DEFAULT_STORIES.map((story, idx) => {
            const actualIndex = userStory ? idx + 1 : idx;
            return (
              <div
                key={story.id}
                onClick={() => setActiveStoryIndex(actualIndex)}
                className="flex flex-col items-center shrink-0 cursor-pointer group"
              >
                <div className="w-16 h-16 sm:w-17 sm:h-17 rounded-full p-[2.5px] bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-transform duration-200 group-hover:scale-105">
                  <div className="w-full h-full rounded-full p-[2px] bg-[#070e24]">
                    <img
                      src={story.userAvatar}
                      alt={story.categoryLabel}
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-300 group-hover:text-white transition-colors mt-1.5 tracking-tight">
                  {story.categoryLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FULLSCREEN / MODAL STORY VIEWER */}
      {currentActiveStory && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="relative w-full h-full sm:h-[88vh] sm:max-w-md sm:rounded-3xl overflow-hidden bg-slate-950 flex flex-col justify-between shadow-2xl border border-sky-500/20">
            {/* Top Controls & Story Progress */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent space-y-3">
              {/* Progress Bars */}
              <div className="flex items-center gap-1.5 w-full">
                {allStories.map((s, idx) => {
                  let progress = 0;
                  if (idx < (activeStoryIndex || 0)) progress = 100;
                  else if (idx === activeStoryIndex) progress = storyProgress;
                  return (
                    <div
                      key={s.id}
                      className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-white transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Story Author & Close */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <img
                    src={currentActiveStory.userAvatar}
                    alt={currentActiveStory.userName}
                    className="w-9 h-9 rounded-full object-cover border border-white/50"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5">
                      <span>{currentActiveStory.userName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-300 border border-sky-400/30">
                        {currentActiveStory.categoryLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/70">
                      {currentActiveStory.timestamp}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStoryIndex(null)}
                  className="w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/70 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tap Navigation Zones (Left / Right) */}
            <button
              type="button"
              onClick={() => {
                if (activeStoryIndex > 0) setActiveStoryIndex(activeStoryIndex - 1);
              }}
              className="absolute left-0 top-20 bottom-24 w-1/3 z-10 opacity-0 hover:opacity-100 flex items-center justify-start pl-2 text-white/60 hover:text-white transition"
              aria-label="Story précédente"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeStoryIndex < allStories.length - 1)
                  setActiveStoryIndex(activeStoryIndex + 1);
                else setActiveStoryIndex(null);
              }}
              className="absolute right-0 top-20 bottom-24 w-1/3 z-10 opacity-0 hover:opacity-100 flex items-center justify-end pr-2 text-white/60 hover:text-white transition"
              aria-label="Story suivante"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            {/* Story Image / Background Media */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <img
                src={currentActiveStory.mediaUrl}
                alt={currentActiveStory.categoryLabel}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

              {/* Heart reaction burst animation */}
              {reactionSent && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-heart-burst">
                  <span className="text-7xl">{reactionSent}</span>
                </div>
              )}
            </div>

            {/* Bottom Caption & Interactive Reply Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent space-y-3">
              {currentActiveStory.caption && (
                <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium drop-shadow-md">
                  {currentActiveStory.caption}
                </p>
              )}

              {/* Quick Reactions + Reply input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Répondre à cette story..."
                  className="flex-1 bg-white/15 border border-white/20 rounded-full px-4 py-2 text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-sky-400"
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  {['❤️', '🔥', '👏', '🚀'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendReaction(emoji)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 active:scale-125 text-base flex items-center justify-center transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
