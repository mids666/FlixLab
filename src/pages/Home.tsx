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
  const { user, setShowAuthModal } = useAuth();
  const navigate = useNavigate();
  const [trending, setTrending] = useState<TMDBItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBItem[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBItem[]>([]);
  const [topRated, setTopRated] = useState<TMDBItem[]>([]);
  const [featured, setFeatured] = useState<TMDBItem | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);

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

  const handleSelect = (item: TMDBItem) => {
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
              {/* Overlays for contrast and blending */}
              <div className="absolute inset-0 bg-black/30 dark:bg-black/50 transition-colors duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent dark:from-black/80" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent transition-colors duration-500" />
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 md:p-12 pb-24 md:pb-40 space-y-6 max-w-4xl z-10">
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
                  <span className="text-white/80 font-bold">
                    {new Date(featured.release_date || featured.first_air_date || '').getFullYear()}
                  </span>
                  <span className="px-2 py-0.5 bg-black/40 backdrop-blur-md rounded text-xs font-bold text-white uppercase tracking-wider border border-white/20">
                    {featured.media_type || 'trending'}
                  </span>
                  {(() => {
                    const releaseDate = featured.release_date || featured.first_air_date;
                    if (!releaseDate) return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-green-600 text-white">FHD</span>;
                    
                    const diffDays = Math.floor((new Date().getTime() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24));
                    
                    let quality: 'FHD' | null = null;
                    if (featured.media_type === 'tv') {
                      quality = 'FHD';
                    } else {
                      if (diffDays >= 45) quality = 'FHD';
                    }

                    if (!quality) return null;

                    return (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-green-600 text-white">
                        {quality}
                      </span>
                    );
                  })()}
                </div>
                
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-[0.9] max-w-3xl text-balance drop-shadow-xl">
                  {featured.title || featured.name}
                </h1>
                
                <p className="text-sm md:text-base text-white/80 line-clamp-2 md:line-clamp-3 max-w-xl leading-relaxed drop-shadow-md">
                  {featured.overview}
                </p>

                <div className="flex items-center gap-4 pt-4">
                  <Button 
                    size="lg" 
                    className="bg-red-600 text-white dark:bg-white dark:text-black hover:bg-red-700 dark:hover:bg-zinc-200 h-14 px-8 rounded-full text-lg font-bold gap-2 shadow-lg"
                    onClick={() => handleSelect(featured)}
                  >
                    <Play className="w-6 h-6 fill-current" />
                    Play Now
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="bg-muted/40 backdrop-blur-md border-border hover:bg-muted/60 h-14 px-8 rounded-full text-lg font-bold gap-2 text-foreground"
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
      <div className="space-y-12 -mt-12 md:-mt-20 relative z-10">
        {/* Streaming Platforms Section */}
        <div className="px-4 md:px-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-red-600 rounded-full" />
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-foreground">Streaming Platforms</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Netflix', id: '8', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', color: 'bg-red-600/20 dark:bg-red-600/10 hover:bg-muted', border: 'border-red-600/30 dark:border-red-600/20' },
              { name: 'HBO', id: '1899|27|384', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/de/HBO_logo.svg', color: 'bg-indigo-600/20 dark:bg-indigo-600/10 hover:bg-muted', border: 'border-indigo-600/30 dark:border-indigo-600/20' },
              { name: 'Disney+', id: '337', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', color: 'bg-blue-600/20 dark:bg-blue-600/10 hover:bg-muted', border: 'border-blue-600/30 dark:border-blue-600/20' },
              { name: 'Prime Video', id: '9|119', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', color: 'bg-cyan-600/20 dark:bg-cyan-600/10 hover:bg-muted', border: 'border-cyan-600/30 dark:border-cyan-600/20' },
              { name: 'Apple TV+', id: '350', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg', color: 'bg-zinc-600/20 dark:bg-zinc-600/10 hover:bg-muted', border: 'border-zinc-600/30 dark:border-zinc-600/20' },
              { name: 'Paramount+', id: '531', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg', color: 'bg-blue-400/20 dark:bg-blue-400/10 hover:bg-muted', border: 'border-blue-400/30 dark:border-blue-400/20' }
            ].map((service) => (
              <motion.button
                key={service.name}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center justify-center p-6 rounded-2xl border ${service.border} ${service.color} transition-all duration-300 group`}
                onClick={() => {
                  navigate(`/search?providerId=${service.id}&q=${encodeURIComponent(service.name)}`);
                }}
              >
                <img 
                  src={service.logo} 
                  alt={service.name} 
                  className={`max-h-8 md:max-h-10 w-auto object-contain transition-all duration-300 ${['Apple TV+', 'HBO'].includes(service.name) ? 'dark:brightness-0 dark:invert transition-all' : 'group-hover:brightness-125 dark:group-hover:brightness-125 hover:scale-110'}`} 
                />
              </motion.button>
            ))}
          </div>
        </div>

        <MovieRow title="Trending Now" items={trending} onSelect={handleSelect} />
        <MovieRow title="Popular Movies" items={popularMovies} onSelect={handleSelect} />
        <MovieRow title="Popular TV Shows" items={popularTV} onSelect={handleSelect} />
        <MovieRow title="Top Rated" items={topRated} onSelect={handleSelect} />
      </div>
    </div>
  );
}
