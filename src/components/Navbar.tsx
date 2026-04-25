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
  Film,
  Compass
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
    { name: 'Watchlist', path: '/watchlist', protected: true },
    { name: 'Recently Watched', path: '/recently-watched', protected: true },
    { name: 'Live TV', path: '/live' },
  ];

  const isDiscoverPage = location.pathname === '/discover';

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 px-4 lg:px-12 py-4 flex items-center justify-between ${
        isScrolled ? 'bg-background/90 backdrop-blur-md border-b border-border' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center gap-8">
        <Link to="/" className="text-3xl font-black tracking-tighter text-red-600">
          FLIXLAB
        </Link>
        
        {/* Desktop Nav */}
        {!isDiscoverPage && (
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
                  location.pathname === link.path ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {link.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        {/* Discover Button */}
        {!isDiscoverPage && (
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground hover:bg-muted gap-2 font-bold px-4 transition-colors"
            onClick={() => navigate('/discover')}
          >
            <Compass className="w-5 h-5 text-red-600" />
            <span className="hidden sm:inline uppercase tracking-tighter">Discover</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden lg:block text-foreground hover:text-red-500 transition-colors relative">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full" />
              )}
            </button>
          </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card border-border text-foreground w-80 mt-2 p-0 overflow-hidden">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-4 border-b border-border flex items-center justify-between">
              <span>New Releases</span>
              <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded-full uppercase font-black text-white">Live</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((movie) => (
                <DropdownMenuItem 
                  key={movie.id} 
                  className="p-3 focus:bg-muted cursor-pointer border-b border-border/50 last:border-0"
                  onClick={() => {
                    const type = movie.media_type || (movie.title ? 'movie' : 'tv');
                    navigate(`/watch/${type}/${movie.id}`);
                  }}
                >
                  <div className="flex gap-3">
                    <div className="w-16 h-24 flex-none rounded-md overflow-hidden bg-muted">
                      <img 
                        src={getImageUrl(movie.poster_path, 'w185') || undefined} 
                        alt={movie.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center gap-1">
                      <div className="font-bold text-sm line-clamp-1">{movie.title}</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        {new Date(movie.release_date || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                        {movie.overview}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No new notifications
              </div>
            )}
          </div>
          <DropdownMenuSeparator className="bg-border m-0" />
          <button 
            className="w-full p-3 text-center text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => navigate('/browse/movie')}
          >
            View All Movies
          </button>
        </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile & Settings */}
        {user ? (
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 group outline-none">
                <div className="w-8 h-8 rounded-md overflow-hidden border border-border group-hover:border-red-600 transition-all shadow-lg active:scale-95 duration-200">
                  <img src={currentProfile?.avatar || undefined} alt={currentProfile?.name} className="w-full h-full object-cover" />
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border text-foreground w-56 mt-2">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Profiles</DropdownMenuLabel>
                  {profiles.map((profile) => (
                    <DropdownMenuItem 
                      key={profile.id}
                      className={`flex items-center gap-3 cursor-pointer ${profile.id === currentProfile?.id ? 'bg-muted' : ''}`}
                      onClick={() => setCurrentProfile(profile)}
                    >
                      <img src={profile.avatar || undefined} alt={profile.name} className="w-6 h-6 rounded-sm object-cover" />
                      <span>{profile.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentProfile(null)}>
                    <PlusCircle className="w-6 h-6 text-muted-foreground" />
                    <span>Manage Profiles</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-3 cursor-pointer text-red-500 focus:text-red-400" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          className={`${isDiscoverPage ? 'flex' : 'lg:hidden'} text-foreground transition-colors`}
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
            className={`absolute top-full left-0 w-full bg-background border-b border-border p-6 flex flex-col gap-4 ${!isDiscoverPage ? 'lg:hidden' : ''}`}
          >
            {!isDiscoverPage && (
              <Button
                className="bg-muted border border-border h-12 text-foreground gap-3 justify-center font-bold mb-2 rounded-xl"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/discover');
                }}
              >
                <Compass className="w-5 h-5 text-red-600" />
                DISCOVER NEW MOVIES
              </Button>
            )}
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
                  location.pathname === link.path ? 'text-red-600' : 'text-muted-foreground'
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
