import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  LogOut, 
  User, 
  Settings, 
  PlusCircle,
  Menu,
  X,
  Film
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'motion/react';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { TMDBItem } from '../types';

export default function Navbar() {
  const { user, currentProfile, profiles, setCurrentProfile, setShowAuthModal } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<TMDBItem[]>([]);
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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Movies', path: '/browse/movie' },
    { name: 'TV Shows', path: '/browse/tv' },
    { name: 'Live TV', path: '/live' },
    { name: 'Watchlist', path: '/watchlist', protected: true },
    { name: 'Recently Watched', path: '/recently-watched', protected: true },
  ];

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 px-4 lg:px-12 py-4 flex items-center justify-between ${
        isScrolled ? 'bg-[#0a0a0a]/90 backdrop-blur-md border-b border-zinc-800' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center gap-8">
        <Link to="/" className="text-3xl font-black tracking-tighter text-red-600">
          FLIXLAB
        </Link>
        
        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => {
                if (link.protected && !user) {
                  setShowAuthModal(true);
                } else {
                  navigate(link.path);
                }
              }}
              className={`text-sm font-medium transition-colors hover:text-red-500 ${
                location.pathname === link.path ? 'text-white' : 'text-zinc-400'
              }`}
            >
              {link.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        {/* Search */}
        <div className="relative flex items-center">
          <AnimatePresence>
            {isSearchOpen && (
              <motion.form
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                onSubmit={handleSearch}
                className="absolute right-0 mr-10"
              >
                <Input
                  autoFocus
                  placeholder="Titles, people, genres..."
                  className="bg-zinc-900/50 border-zinc-700 text-white h-9 focus:ring-red-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </motion.form>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="text-white hover:text-red-500 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden lg:block text-white hover:text-red-500 transition-colors relative">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white w-80 mt-2 p-0 overflow-hidden">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <span>New Releases</span>
                <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded-full uppercase font-black">Live</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((movie) => (
                  <DropdownMenuItem 
                    key={movie.id} 
                    className="p-3 focus:bg-zinc-800 cursor-pointer border-b border-zinc-800/50 last:border-0"
                    onClick={() => {
                      const type = movie.media_type || (movie.title ? 'movie' : 'tv');
                      navigate(`/watch/${type}/${movie.id}`);
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-24 flex-none rounded-md overflow-hidden bg-zinc-800">
                        <img 
                          src={getImageUrl(movie.poster_path, 'w185') || undefined} 
                          alt={movie.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col justify-center gap-1">
                        <div className="font-bold text-sm line-clamp-1">{movie.title}</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          {new Date(movie.release_date || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-zinc-400 line-clamp-2 leading-tight">
                          {movie.overview}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No new notifications
                </div>
              )}
            </div>
            <DropdownMenuSeparator className="bg-zinc-800 m-0" />
            <button 
              className="w-full p-3 text-center text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              onClick={() => navigate('/browse/movie')}
            >
              View All Movies
            </button>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 group outline-none">
              <div className="w-8 h-8 rounded-md overflow-hidden border border-zinc-700 group-hover:border-white transition-all">
                <img src={currentProfile?.avatar || undefined} alt={currentProfile?.name} className="w-full h-full object-cover" />
              </div>
              <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white transition-all" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white w-56 mt-2">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Profiles</DropdownMenuLabel>
                {profiles.map((profile) => (
                  <DropdownMenuItem 
                    key={profile.id}
                    className={`flex items-center gap-3 cursor-pointer ${profile.id === currentProfile?.id ? 'bg-zinc-800' : ''}`}
                    onClick={() => setCurrentProfile(profile)}
                  >
                    <img src={profile.avatar || undefined} alt={profile.name} className="w-6 h-6 rounded-sm object-cover" />
                    <span>{profile.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentProfile(null)}>
                  <PlusCircle className="w-6 h-6 text-zinc-500" />
                  <span>Manage Profiles</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate('/settings')}
              >
                <Settings className="w-4 h-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 cursor-pointer text-red-500 focus:text-red-400" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            className="bg-red-600 hover:bg-red-700 font-bold px-6"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        )}

        {/* Mobile Menu Toggle */}
        <button 
          className="lg:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-[#0a0a0a] border-b border-zinc-800 p-6 flex flex-col gap-4 lg:hidden"
          >
            <form onSubmit={handleSearch} className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search..."
                className="bg-zinc-900 border-zinc-800 pl-10 h-12 text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (link.protected && !user) {
                    setShowAuthModal(true);
                  } else {
                    navigate(link.path);
                  }
                }}
                className={`text-lg font-medium text-left ${
                  location.pathname === link.path ? 'text-red-600' : 'text-zinc-400'
                }`}
              >
                {link.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
