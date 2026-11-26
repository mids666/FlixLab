import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import {
  Search,
  Bell,
  ChevronDown,
  ChevronUp,
  LogOut,
  Settings,
  PlusCircle,
  Menu,
  X,
  Film,
  Tv,
  User,
  Bookmark,
  History,
  ArrowRight,
  LogIn,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'motion/react';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { TMDBItem } from '../types';

export default function Navbar() {
  const { user, currentProfile, profiles, setCurrentProfile, setShowAuthModal } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TMDBItem[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<TMDBItem[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchSeqRef = useRef(0);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await tmdbService.getUpcoming();
        setNotifications(data.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };
    fetchNotifications();
  }, []);

  // Global Cmd/Ctrl+K or '/' shortcut to open Search Overlay
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      if (!isInputFocused && e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSearchOpen]);

  // Focus input when Search Overlay opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isSearchOpen]);

  // Debounced instant Google-style search suggestions
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!isSearchOpen || !trimmed) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setHighlightedIndex(-1);
      return;
    }

    const seq = ++searchSeqRef.current;
    setSuggestionsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await tmdbService.smartSearch(trimmed, 1);
        if (seq !== searchSeqRef.current) return;
        const items = (data.results || []).slice(0, 8);
        setSuggestions(items);
        setHighlightedIndex(-1);
      } catch (error) {
        if (seq === searchSeqRef.current) {
          console.error('Navbar live search failed:', error);
          setSuggestions([]);
        }
      } finally {
        if (seq === searchSeqRef.current) {
          setSuggestionsLoading(false);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, isSearchOpen]);

  const navigateToItem = (item: TMDBItem) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSuggestions([]);
    if (item.media_type === 'person') {
      navigate(`/person/${item.id}`);
    } else {
      const type = item.media_type || (item.title ? 'movie' : 'tv');
      navigate(`/watch/${type}/${item.id}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      navigateToItem(suggestions[highlightedIndex]);
      return;
    }
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setIsSearchOpen(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  const handleProtectedNav = (path: string) => {
    setIsMobileMenuOpen(false);
    if (!user) {
      setShowAuthModal(true);
    } else {
      navigate(path);
    }
  };

  const primaryTabs = [
    { name: 'Home', path: '/', protected: false },
    { name: 'Movies', path: '/browse/movie', protected: false },
    { name: 'TV Shows', path: '/browse/tv', protected: false },
    { name: 'Watchlist', path: '/watchlist', protected: true },
    { name: 'Recently Watched', path: '/recently-watched', protected: true },
    { name: 'Discover', path: '/discover', protected: false },
  ];

  const isTabActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const formatYear = (item: TMDBItem) => {
    const date = item.release_date || item.first_air_date;
    return date ? date.slice(0, 4) : null;
  };

  const formatMediaLabel = (item: TMDBItem) => {
    if (item.media_type === 'person') return 'Person';
    if (item.media_type === 'tv' || (!item.title && item.name)) return 'TV Show';
    return 'Movie';
  };

  return (
    <>
      {/* Desktop Top-Left Brand Wordmark */}
      <Link
        to="/"
        className="hidden lg:flex fixed top-6 left-8 z-50 items-center text-2xl font-black tracking-tighter text-brand whitespace-nowrap drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] hover:opacity-90 transition-opacity"
      >
        FLIXLAB
      </Link>

      {/* Floating Frosted Glass Top Pill (watched.cx style) */}
      <nav
        aria-label="Primary"
        className="fixed top-3 lg:top-5 left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100vw-1.5rem)]"
      >
        <div className="w-full bg-zinc-950/75 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.45)] rounded-full px-2.5 py-1.5 flex items-center gap-1 xl:gap-1.5 overflow-x-auto lg:overflow-visible scrollbar-hide">
          {/* Navigation Tabs */}
          {primaryTabs.map((tab) => {
            const active = isTabActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={(e) => {
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest',
                  });
                  if (tab.protected && !user) {
                    setShowAuthModal(true);
                  } else {
                    navigate(tab.path);
                  }
                }}
                className={`whitespace-nowrap shrink-0 rounded-full px-3 xl:px-4 py-2 text-xs xl:text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.name}
              </button>
            );
          })}

          {/* Desktop Integrated Pill Tools */}
          <div className="hidden lg:flex items-center shrink-0 gap-0.5 pr-0.5">
            <div className="w-px h-5 bg-white/15 mx-1.5 shrink-0" />

            {/* Search Overlay Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search movies and TV shows"
              title="Search (Ctrl+K)"
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications / New Releases Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="New Releases"
                  className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors relative cursor-pointer outline-none"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand rounded-full" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-950/90 backdrop-blur-2xl border border-white/15 text-white w-80 mt-3 p-0 rounded-2xl overflow-hidden shadow-2xl"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-4 border-b border-white/10 flex items-center justify-between text-white">
                    <span className="font-bold">New Releases</span>
                    <span className="text-[10px] text-brand uppercase font-black tracking-widest">
                      Upcoming
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <div className="max-h-[380px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((movie) => (
                      <DropdownMenuItem
                        key={movie.id}
                        className="p-3 focus:bg-white/10 text-white cursor-pointer border-b border-white/10 last:border-0"
                        onClick={() => {
                          const type = movie.media_type || (movie.title ? 'movie' : 'tv');
                          navigate(`/watch/${type}/${movie.id}`);
                        }}
                      >
                        <div className="flex gap-3 w-full">
                          <div className="w-12 h-18 flex-none rounded-lg overflow-hidden bg-white/10">
                            {movie.poster_path ? (
                              <img
                                src={getImageUrl(movie.poster_path, 'w185') || undefined}
                                alt={movie.title || movie.name || 'Release poster'}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/40">
                                <Film className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-center gap-0.5 min-w-0">
                            <div className="font-semibold text-sm truncate text-white">
                              {movie.title || movie.name}
                            </div>
                            <div className="text-[11px] text-white/55 font-medium">
                              {movie.release_date
                                ? new Date(movie.release_date).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Coming Soon'}
                            </div>
                            <div className="text-xs text-white/70 line-clamp-2 leading-snug">
                              {movie.overview}
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-8 text-center text-white/50 text-sm">
                      No new releases right now
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator className="bg-white/10 m-0" />
                <button
                  type="button"
                  className="w-full p-3 text-center text-xs font-bold text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate('/browse/movie')}
                >
                  View All Movies
                </button>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu / Account Glass Popover */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account and menu"
                  className="ml-1 shrink-0 flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer outline-none"
                >
                  {user && currentProfile?.avatar ? (
                    <img
                      src={currentProfile.avatar}
                      alt={currentProfile.name}
                      className="w-7 h-7 rounded-full object-cover border border-white/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                      <Menu className="w-4 h-4" />
                    </div>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-white/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-950/90 backdrop-blur-2xl border border-white/15 text-white w-72 mt-3 p-2 rounded-3xl shadow-2xl"
              >
                {user ? (
                  <>
                    <div className="px-3 py-2.5 flex items-center gap-3 border-b border-white/10 mb-1.5">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-white/10 flex-none">
                        {currentProfile?.avatar ? (
                          <img
                            src={currentProfile.avatar}
                            alt={currentProfile.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/70">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {currentProfile?.name || 'FlixLab Profile'}
                        </div>
                        <div className="text-xs text-white/50 truncate">{user.email}</div>
                      </div>
                    </div>

                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-white/45 px-3 py-1">
                        Switch Profile
                      </DropdownMenuLabel>
                      {profiles.map((profile) => (
                        <DropdownMenuItem
                          key={profile.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer focus:bg-white/10 text-white ${
                            profile.id === currentProfile?.id ? 'bg-white/10 font-semibold' : ''
                          }`}
                          onClick={() => setCurrentProfile(profile)}
                        >
                          <img
                            src={profile.avatar || undefined}
                            alt={profile.name}
                            className="w-6 h-6 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="truncate">{profile.name}</span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer focus:bg-white/10 text-white/85"
                        onClick={() => setCurrentProfile(null)}
                      >
                        <PlusCircle className="w-4 h-4 text-white/60" />
                        <span>Manage Profiles</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator className="bg-white/10 my-1.5" />

                    <DropdownMenuItem
                      className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer focus:bg-white/10 text-white"
                      onClick={() => navigate('/live')}
                    >
                      <Tv className="w-4 h-4 text-white/70" />
                      <span>Live TV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer focus:bg-white/10 text-white"
                      onClick={() => navigate('/settings')}
                    >
                      <Settings className="w-4 h-4 text-white/70" />
                      <span>Settings</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/10 my-1.5" />

                    <DropdownMenuItem
                      className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer focus:bg-brand/20 text-brand font-semibold"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <div className="p-2 mb-1.5">
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white text-zinc-950 font-bold text-sm hover:bg-white/90 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <LogIn className="w-4 h-4" />
                          Sign In to FlixLab
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    <DropdownMenuItem
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer focus:bg-white/10 text-white/90"
                      onClick={() => navigate('/live')}
                    >
                      <Tv className="w-4 h-4 text-white/70" />
                      <span>Live TV</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Dock (watched.cx style) */}
      <div className="lg:hidden fixed bottom-3 left-4 right-4 mx-auto max-w-[420px] z-50 flex flex-col items-center pointer-events-none">
        <button
          type="button"
          onClick={() => setIsDockCollapsed((prev) => !prev)}
          aria-label={isDockCollapsed ? 'Show bottom controls' : 'Minimize bottom controls'}
          className="w-12 h-6 rounded-full mb-2 bg-zinc-950/85 backdrop-blur-2xl border border-white/15 text-white/80 flex items-center justify-center shadow-lg pointer-events-auto cursor-pointer"
        >
          {isDockCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {!isDockCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18 }}
              className="w-full p-1.5 rounded-full bg-zinc-950/85 backdrop-blur-2xl border border-white/15 shadow-2xl flex items-center gap-1 pointer-events-auto"
            >
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-semibold text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
              <div className="w-px h-5 bg-white/15" />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                  isMobileMenuOpen
                    ? 'bg-white text-zinc-950'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                <span>Menu</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Glass Menu Sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/65 backdrop-blur-md flex items-end justify-center pb-24 px-4"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-2xl text-white space-y-3"
            >
              <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10">
                <span className="text-xl font-black tracking-tighter text-brand">FLIXLAB</span>
                {user && currentProfile ? (
                  <div className="flex items-center gap-2 text-xs text-white/75">
                    <img
                      src={currentProfile.avatar || undefined}
                      alt={currentProfile.name}
                      className="w-6 h-6 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-medium">{currentProfile.name}</span>
                  </div>
                ) : null}
              </div>

              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white text-zinc-950 font-bold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In to FlixLab
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/live');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-left text-sm font-medium"
                >
                  <Tv className="w-4 h-4 text-white/70" />
                  <span>Live TV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProtectedNav('/watchlist')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-left text-sm font-medium"
                >
                  <Bookmark className="w-4 h-4 text-white/70" />
                  <span>Watchlist</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProtectedNav('/recently-watched')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-left text-sm font-medium"
                >
                  <History className="w-4 h-4 text-white/70" />
                  <span>Recently Watched</span>
                </button>
                {user && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setCurrentProfile(null);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-left text-sm font-medium"
                    >
                      <PlusCircle className="w-4 h-4 text-white/70" />
                      <span>Switch / Manage Profiles</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-left text-sm font-medium"
                    >
                      <Settings className="w-4 h-4 text-white/70" />
                      <span>Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand/20 text-left text-sm font-semibold text-brand"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frosted Glass Search Overlay (watched.cx style + instant Google-style thumbnails) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setIsSearchOpen(false)}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-zinc-950/92 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden"
            >
              <form onSubmit={handleSearchSubmit} className="relative flex items-center border-b border-white/10 px-5">
                <Search className="w-5 h-5 text-white/60 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search movies, TV shows, people..."
                  className="w-full bg-transparent text-white placeholder:text-white/40 text-base sm:text-lg py-4 px-4 outline-none"
                />
                {suggestionsLoading && (
                  <Loader2 className="w-4 h-4 text-white/50 animate-spin mr-2 shrink-0" />
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer mr-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-[11px] font-semibold text-white/50 hover:text-white px-2 py-1 rounded-md border border-white/15 cursor-pointer shrink-0"
                >
                  ESC
                </button>
              </form>

              {searchQuery.trim() ? (
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
                  {suggestions.length > 0 ? (
                    <>
                      {suggestions.map((item, idx) => {
                        const thumbPath = item.poster_path || item.profile_path || item.backdrop_path;
                        const year = formatYear(item);
                        const label = formatMediaLabel(item);
                        const rating =
                          item.vote_average !== undefined && item.vote_average > 0
                            ? `★ ${item.vote_average.toFixed(1)}`
                            : null;
                        const metaParts = [label, year, rating].filter(Boolean);
                        const isHighlighted = idx === highlightedIndex;

                        return (
                          <button
                            key={`${item.media_type || 'item'}-${item.id}`}
                            type="button"
                            onClick={() => navigateToItem(item)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`w-full flex items-center gap-3.5 px-5 py-3 text-left transition-colors cursor-pointer ${
                              isHighlighted ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="w-11 h-16 rounded-lg overflow-hidden bg-white/10 flex-none flex items-center justify-center">
                              {thumbPath ? (
                                <img
                                  src={getImageUrl(thumbPath, 'w185') || undefined}
                                  alt={item.title || item.name || 'Poster'}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : item.media_type === 'person' ? (
                                <User className="w-5 h-5 text-white/40" />
                              ) : item.media_type === 'tv' ? (
                                <Tv className="w-5 h-5 text-white/40" />
                              ) : (
                                <Film className="w-5 h-5 text-white/40" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm sm:text-base font-semibold text-white truncate">
                                {item.title || item.name}
                              </div>
                              <div className="text-xs text-white/55 mt-0.5 truncate">
                                {metaParts.join(' · ')}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/35 shrink-0" />
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="w-full px-5 py-3.5 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>See all results for &ldquo;{searchQuery.trim()}&rdquo;</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : !suggestionsLoading ? (
                    <div className="px-6 py-10 text-center text-white/55 text-sm">
                      No instant matches found for &ldquo;{searchQuery.trim()}&rdquo;. Press Enter to search all titles.
                    </div>
                  ) : (
                    <div className="px-6 py-10 text-center text-white/55 text-sm">
                      Searching FlixLab...
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-6 py-6 text-xs text-white/45 flex items-center justify-between">
                  <span>Start typing a title — typos and partial words work automatically.</span>
                  <span className="hidden sm:inline">Press Enter for full results</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
