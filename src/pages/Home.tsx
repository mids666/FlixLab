import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { TMDBItem } from '../types';
import MovieRow from '../components/MovieRow';
import { Button } from '@/components/ui/button';
import { Play, Info, Star, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trending, setTrending] = useState<TMDBItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBItem[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBItem[]>([]);
  const [topRated, setTopRated] = useState<TMDBItem[]>([]);
  const [featured, setFeatured] = useState<TMDBItem | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [trendingData, moviesData, tvData, topData] = await Promise.all([
        tmdbService.getTrending(),
        tmdbService.getPopular('movie'),
        tmdbService.getPopular('tv'),
        tmdbService.getTopRated('movie'),
      ]);

      // Filter trending for the banner to only show recently released items (last 6 months)
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      const recentlyReleasedTrending = trendingData.filter(item => {
        const releaseDate = item.release_date || item.first_air_date;
        if (!releaseDate) return false;
        const date = new Date(releaseDate);
        return date >= sixMonthsAgo && date <= now;
      });

      // Fallback to original trending if filter is too restrictive, but sort by date
      const finalTrending = recentlyReleasedTrending.length >= 3 
        ? recentlyReleasedTrending 
        : [...trendingData].sort((a, b) => {
            const dateA = new Date(a.release_date || a.first_air_date || 0).getTime();
            const dateB = new Date(b.release_date || b.first_air_date || 0).getTime();
            return dateB - dateA;
          });

      setTrending(finalTrending);
      setPopularMovies(moviesData);
      setPopularTV(tvData);
      setTopRated(topData);
      
      if (finalTrending.length > 0) {
        setFeatured(finalTrending[0]);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (trending.length === 0) return;

    const interval = setInterval(() => {
      setFeaturedIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % trending.length;
        setFeatured(trending[nextIndex]);
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [trending]);

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        setShowAuthModal(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleSelect = (item: TMDBItem) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const type = item.media_type || (item.title ? 'movie' : 'tv');
    navigate(`/watch/${type}/${item.id}`);
  };

  return (
    <div className="relative pb-20">
      {/* Hero Section */}
      <AnimatePresence mode="wait">
        {featured && (
          <motion.div 
            key={featured.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="relative h-[80vh] md:h-[95vh] w-full overflow-hidden"
          >
            <div className="absolute inset-0">
              <img 
                src={getImageUrl(featured.backdrop_path, 'original') || undefined} 
                alt={featured.title || featured.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 md:p-12 md:pb-20 space-y-6 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-yellow-500 font-bold">
                    <Star className="w-5 h-5 fill-current" />
                    <span>{featured.vote_average.toFixed(1)}</span>
                  </div>
                  <span className="text-zinc-300 font-medium">
                    {new Date(featured.release_date || featured.first_air_date || '').getFullYear()}
                  </span>
                  <span className="px-2 py-0.5 bg-zinc-800/80 rounded text-xs font-bold text-white uppercase tracking-wider">
                    {featured.media_type || 'trending'}
                  </span>
                  {(() => {
                    const releaseDate = featured.release_date || featured.first_air_date;
                    if (!releaseDate) return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white">HD</span>;
                    
                    const diffDays = Math.floor((new Date().getTime() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24));
                    
                    let quality: 'HD' | 'FHD' | null = null;
                    if (featured.media_type === 'tv') {
                      quality = diffDays < 30 ? 'HD' : 'FHD';
                    } else {
                      if (diffDays >= 45 && diffDays < 120) quality = 'HD';
                      else if (diffDays >= 120) quality = 'FHD';
                    }

                    if (!quality) return null;

                    return (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        quality === 'HD' ? 'bg-blue-500 text-white' : 'bg-green-600 text-white'
                      }`}>
                        {quality}
                      </span>
                    );
                  })()}
                </div>
                
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white leading-[0.9] max-w-4xl text-balance">
                  {featured.title || featured.name}
                </h1>
                
                <p className="text-base md:text-lg text-zinc-300 line-clamp-2 md:line-clamp-3 max-w-2xl leading-relaxed">
                  {featured.overview}
                </p>

                <div className="flex items-center gap-4 pt-4">
                  <Button 
                    size="lg" 
                    className="bg-white text-black hover:bg-zinc-200 h-14 px-8 rounded-full text-lg font-bold gap-2"
                    onClick={() => handleSelect(featured)}
                  >
                    <Play className="w-6 h-6 fill-current" />
                    Play Now
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="bg-zinc-900/40 backdrop-blur-md border-zinc-700 hover:bg-zinc-800 h-14 px-8 rounded-full text-lg font-bold gap-2 text-white"
                    onClick={() => handleSelect(featured)}
                  >
                    <Info className="w-6 h-6" />
                    More Info
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Rows */}
      <div className="space-y-8 -mt-20 md:-mt-32 relative z-10">
        <MovieRow title="Trending Now" items={trending} onSelect={handleSelect} />
        <MovieRow title="Popular Movies" items={popularMovies} onSelect={handleSelect} />
        <MovieRow title="Popular TV Shows" items={popularTV} onSelect={handleSelect} />
        <MovieRow title="Top Rated" items={topRated} onSelect={handleSelect} />
      </div>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader className="items-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tighter">JOIN NEOFLIX</DialogTitle>
            <DialogDescription className="text-zinc-400 text-lg">
              Sign in to watch thousands of movies and TV shows, and sync your progress across all devices.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Button 
              className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg font-bold rounded-2xl"
              onClick={() => navigate('/login')}
            >
              Sign In / Sign Up
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-zinc-500 hover:text-white"
              onClick={() => setShowAuthModal(false)}
            >
              Maybe Later
            </Button>
          </div>
          <div className="text-center text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
            Unlimited Entertainment Awaits
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
