import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { TMDBItem } from '../types';
import MovieRow from '../components/MovieRow';
import { Button } from '@/components/ui/button';
import { Play, Info, Star, Lock, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export default function Home() {
  const { user, currentProfile, setShowAuthModal } = useAuth();
  const navigate = useNavigate();
  const [trending, setTrending] = useState<TMDBItem[]>([]);
  const [suggestedType, setSuggestedType] = useState<'movie' | 'tv'>('movie');
  const [suggestedMovies, setSuggestedMovies] = useState<TMDBItem[]>([]);
  const [suggestedTV, setSuggestedTV] = useState<TMDBItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBItem[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBItem[]>([]);
  const [topRated, setTopRated] = useState<TMDBItem[]>([]);
  const [featured, setFeatured] = useState<TMDBItem | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const handleNotInterested = async (item: TMDBItem, index: number) => {
    try {
      // Fetch a new suggestion based on the item being rejected or just a random top rated one
      const type = suggestedType;
      const { results } = await tmdbService.getDiscover(type, undefined, 'vote_average.desc', Math.floor(Math.random() * 5) + 1);
      
      // Find an item not already in the list
      const currentList = type === 'movie' ? suggestedMovies : suggestedTV;
      const newItem = results.find((r: TMDBItem) => 
        r.vote_average > 7 && !currentList.some(existing => existing.id === r.id)
      ) || results[0];

      if (type === 'movie') {
        const newList = [...suggestedMovies];
        newList[index] = newItem;
        setSuggestedMovies(newList);
      } else {
        const newList = [...suggestedTV];
        newList[index] = newItem;
        setSuggestedTV(newList);
      }
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error replacing suggestion:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const [trendingData, suggestedMoviesData, suggestedTVData, moviesData, tvData, topData] = await Promise.all([
        tmdbService.getTrending(),
        tmdbService.getTopRated('movie'),
        tmdbService.getTopRated('tv'),
        tmdbService.getPopular('movie'),
        tmdbService.getPopular('tv'),
        tmdbService.getTopRated('movie'),
      ]);

      // Filter trending for the banner
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      const recentlyReleasedTrending = trendingData.filter(item => {
        const releaseDate = item.release_date || item.first_air_date;
        if (!releaseDate) return false;
        const date = new Date(releaseDate);
        return date >= sixMonthsAgo && date <= now;
      });

      const finalTrending = recentlyReleasedTrending.length >= 3 
        ? recentlyReleasedTrending 
        : [...trendingData].sort((a, b) => {
            const dateA = new Date(a.release_date || a.first_air_date || 0).getTime();
            const dateB = new Date(b.release_date || b.first_air_date || 0).getTime();
            return dateB - dateA;
          });

      setTrending(finalTrending);
      
      // Personalization logic
      let finalSuggestedMovies: TMDBItem[] = [];
      let finalSuggestedTV: TMDBItem[] = [];

      try {
        if (user && currentProfile) {
          const recentlyWatchedRef = collection(db, 'users', user.uid, 'profiles', currentProfile.id, 'recentlyWatched');
          const q = query(recentlyWatchedRef, orderBy('watchedAt', 'desc'), limit(5));
          const snapshot = await getDocs(q);
          const history = snapshot.docs.map(doc => doc.data());

          if (history.length > 0) {
            const movieHistory = history.filter(h => h.type === 'movie');
            const tvHistory = history.filter(h => h.type === 'tv');

            if (movieHistory.length > 0) {
              const recs = await tmdbService.getRecommendations('movie', movieHistory[0].tmdbId);
              finalSuggestedMovies = recs.filter((item: any) => item.vote_average > 7).slice(0, 5);
            }
            if (tvHistory.length > 0) {
              const recs = await tmdbService.getRecommendations('tv', tvHistory[0].tmdbId);
              finalSuggestedTV = recs.filter((item: any) => item.vote_average > 7).slice(0, 5);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching personalized suggestions:', error);
      }

      // Fallback values
      if (finalSuggestedMovies.length < 5) {
        finalSuggestedMovies = [...finalSuggestedMovies, ...suggestedMoviesData.slice(10, 20)].slice(0, 5);
      }
      if (finalSuggestedTV.length < 5) {
        finalSuggestedTV = [...finalSuggestedTV, ...suggestedTVData.slice(10, 20)].slice(0, 5);
      }

      setSuggestedMovies(finalSuggestedMovies);
      setSuggestedTV(finalSuggestedTV);
      setPopularMovies(moviesData);
      setPopularTV(tvData);
      setTopRated(topData);
      
      if (finalTrending.length > 0) {
        setFeatured(finalTrending[0]);
      }
    };

    fetchData();
  }, [user, currentProfile]);

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

        {/* Suggested for you Section */}
        {(suggestedType === 'movie' ? suggestedMovies : suggestedTV).length >= 5 && (() => {
          const suggested = suggestedType === 'movie' ? suggestedMovies : suggestedTV;
          return (
            <div className="px-4 md:px-12 py-12 relative overflow-hidden">
              {/* Contextual Backdrop Text */}
              <div className="absolute top-0 left-12 opacity-[0.03] dark:opacity-[0.05] select-none pointer-events-none transition-colors">
                <h1 className="text-[6rem] md:text-[8rem] font-black tracking-tighter leading-none uppercase">
                  RECOMMENDED
                </h1>
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 relative z-10 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-red-600 rounded-full" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-0.5">
                      {suggestedType === 'movie' ? 'Movie' : 'TV Show'} spotlight
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground leading-none lowercase first-letter:uppercase">Suggested for you</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-full border border-border/50">
                  <Button 
                    variant={suggestedType === 'movie' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className={`rounded-full font-bold px-6 transition-all ${suggestedType === 'movie' ? 'bg-red-600 text-white hover:bg-red-700' : ''}`}
                    onClick={() => setSuggestedType('movie')}
                  >
                    Movies
                  </Button>
                  <Button 
                    variant={suggestedType === 'tv' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className={`rounded-full font-bold px-6 transition-all ${suggestedType === 'tv' ? 'bg-red-600 text-white hover:bg-red-700' : ''}`}
                    onClick={() => setSuggestedType('tv')}
                  >
                    TV Shows
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Main Spotlight Card */}
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ scale: 0.995 }}
                  className="lg:col-span-7 relative aspect-[16/9] lg:aspect-auto lg:h-[480px] rounded-[3rem] overflow-hidden group cursor-pointer shadow-2xl border border-white/5"
                  onClick={() => handleSelect(suggested[0])}
                >
                  <img 
                    src={getImageUrl(suggested[0].backdrop_path, 'original') || ''} 
                    alt={suggested[0].title || suggested[0].name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block z-10" />
                  
                  {/* Not Interested Button */}
                  <div className="absolute top-8 right-8 z-30">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-red-600 transition-all text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === suggested[0].id ? null : suggested[0].id);
                        }}
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                      
                      {openMenuId === suggested[0].id && (
                        <div className="absolute top-12 right-0 bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-2 min-w-[160px] z-50 animate-in fade-in zoom-in duration-200">
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-sm font-bold hover:bg-red-600 hover:text-white rounded-xl gap-2 h-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotInterested(suggested[0], 0);
                            }}
                          >
                            <Info className="w-4 h-4" />
                            Not interested
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 p-8 md:p-12 flex items-end text-white z-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end w-full">
                      <div className="relative group/poster hidden md:block max-w-[200px]">
                        <motion.img 
                          layoutId={`poster-${suggested[0].id}`}
                          initial={{ y: 30, opacity: 0 }}
                          whileInView={{ y: 0, opacity: 1 }}
                          src={getImageUrl(suggested[0].poster_path, 'w500') || ''}
                          className="rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/20"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter leading-[0.9] drop-shadow-2xl">
                          {suggested[0].title || suggested[0].name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs font-black">
                          <div className="flex items-center gap-1 text-yellow-500 bg-white/10 backdrop-blur-md px-2 py-1 rounded-md">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{suggested[0].vote_average.toFixed(1)}</span>
                          </div>
                          <span className="bg-red-600 text-white px-2 py-0.5 rounded-md uppercase text-[10px]">Must Watch</span>
                          <span className="text-white/60">{new Date(suggested[0].release_date || suggested[0].first_air_date || '').getFullYear()}</span>
                        </div>
                        <p className="text-xs md:text-sm text-white/80 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-sm drop-shadow-md">
                          {suggested[0].overview}
                        </p>
                        <Button 
                          className="bg-red-600 text-white dark:bg-white dark:text-black hover:bg-red-700 dark:hover:bg-zinc-200 rounded-full px-6 py-4 h-auto font-black text-base gap-2 shadow-2xl transition-all hover:scale-105 active:scale-95 group/btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(suggested[0]);
                          }}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          Watch Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Sidebar Grid */}
                <div className="lg:col-span-5 grid grid-cols-2 grid-rows-2 gap-4 lg:h-[480px]">
                  {suggested.slice(1, 5).map((item, index) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      key={item.id}
                      whileHover={{ y: -8 }}
                      className="relative aspect-video lg:aspect-auto h-full rounded-[2rem] overflow-hidden group cursor-pointer shadow-xl border border-border/50 bg-muted"
                      onClick={() => handleSelect(item)}
                    >
                      <img 
                        src={getImageUrl(item.backdrop_path, 'w500') || ''} 
                        alt={item.title || item.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10" />
                      
                      {/* Small Card Menu */}
                      <div className="absolute top-3 right-3 z-30">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-red-600 transition-all text-white opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === item.id ? null : item.id);
                            }}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                          
                          {openMenuId === item.id && (
                            <div className="absolute top-10 right-0 bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl p-1 min-w-[140px] z-50 animate-in fade-in zoom-in duration-200">
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-xs font-bold hover:bg-red-600 hover:text-white rounded-lg gap-2 h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotInterested(item, index + 1);
                                }}
                              >
                                Not interested
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 w-full p-5 space-y-2 z-20">
                        <div className="flex items-center gap-1.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
                            <Play className="w-3 h-3 text-white fill-current ml-0.5" />
                          </div>
                          <span className="text-[10px] font-black text-white uppercase tracking-tighter">Play now</span>
                        </div>
                        <h4 className="text-white font-black text-base md:text-lg leading-snug line-clamp-2 drop-shadow-xl group-hover:text-red-500 transition-colors">
                          {item.title || item.name}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] font-black text-white/50">
                          <div className="flex items-center gap-1 text-yellow-500 bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{item.vote_average.toFixed(1)}</span>
                          </div>
                          <span>{new Date(item.release_date || item.first_air_date || '').getFullYear()}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        <MovieRow title="Popular Movies" items={popularMovies} onSelect={handleSelect} />
        <MovieRow title="Popular TV Shows" items={popularTV} onSelect={handleSelect} />
        <MovieRow title="Top Rated" items={topRated} onSelect={handleSelect} />
      </div>
    </div>
  );
}
