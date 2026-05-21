import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { TMDBItem } from '../types';
import { 
  Play, 
  Search as SearchIcon, 
  X,
  Plus,
  Check,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, setDoc, collection, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface GenreWithPoster extends TMDBItem {
  genreId: number;
  genreName: string;
}

export default function Discover() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryParam = searchParams.get('q') || '';
  const { user, currentProfile, setShowAuthModal, watchlist, toggleWatchlist } = useAuth();
  const [items, setItems] = useState<TMDBItem[]>([]);
  const [genres, setGenres] = useState<GenreWithPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [isSearching, setIsSearching] = useState(!!queryParam);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearchInternal = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await tmdbService.search(q);
      setSearchResults(data.results.filter((i: any) => i.poster_path || i.profile_path));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (queryParam) {
      setSearchQuery(queryParam);
      setIsSearching(true);
      handleSearchInternal(queryParam);
    } else {
      setIsSearching(false);
      setSearchQuery('');
    }
  }, [queryParam, handleSearchInternal]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      navigate('/discover');
      return;
    }
    navigate(`/discover?q=${encodeURIComponent(searchQuery)}`);
  };
  const [activeGenre, setActiveGenre] = useState<number | null>(null);
  const [featuredTrailer, setFeaturedTrailer] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const watchlistIds = new Set(watchlist.map(w => w.tmdbId));

  const genreScrollRef = useRef<HTMLDivElement>(null);

  // Fetch Genres with Representative Posters
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const [movieGenres, tvGenres] = await Promise.all([
          tmdbService.getGenres('movie'),
          tmdbService.getGenres('tv')
        ]);
        
        // Merge and unique genres
        const allGenres = [...movieGenres];
        tvGenres.forEach((tg: any) => {
          if (!allGenres.find(mg => mg.id === tg.id)) {
            allGenres.push(tg);
          }
        });

        // For each genre, fetch a top movie to use as a preview, avoiding duplicates
        const usedIds = new Set<number>();
        const genresWithPosters: GenreWithPoster[] = [];

        for (const genre of allGenres.slice(0, 20)) {
          try {
            const { results } = await tmdbService.getDiscover('movie', genre.id.toString(), 'popularity.desc', 1);
            // Try to find a movie that hasn't been used yet in the first 5 results
            const uniqueMovie = results.find((m: any) => !usedIds.has(m.id)) || results[0];
            
            if (uniqueMovie) {
              usedIds.add(uniqueMovie.id);
              genresWithPosters.push({
                ...uniqueMovie,
                genreId: genre.id,
                genreName: genre.name
              });
            }
          } catch (error) {
            console.error(`Failed to fetch poster for genre ${genre.name}:`, error);
          }
        }

        setGenres(genresWithPosters);
      } catch (error) {
        console.error('Failed to fetch genres:', error);
      }
    };
    fetchGenres();
  }, []);

  // Fetch Discovery Content
  const fetchDiscoveryContent = useCallback(async (genreId?: number) => {
    try {
      setLoading(true);
      const [movies, tv] = await Promise.all([
        tmdbService.getDiscover('movie', genreId?.toString()),
        tmdbService.getDiscover('tv', genreId?.toString())
      ]);
      
      // Shuffle/Interleave
      const combined = [];
      const maxLength = Math.max(movies.results.length, tv.results.length);
      for (let i = 0; i < maxLength; i++) {
        if (movies.results[i]) combined.push({ ...movies.results[i], media_type: 'movie' });
        if (tv.results[i]) combined.push({ ...tv.results[i], media_type: 'tv' });
      }

      setItems(combined.sort(() => Math.random() - 0.5));
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    }
  }, []);

  useEffect(() => {
    fetchDiscoveryContent(activeGenre || undefined);
  }, [activeGenre, fetchDiscoveryContent]);

  // Handle Featured Trailer
  useEffect(() => {
    const fetchTrailer = async () => {
      if (items.length > 0) {
        const featured = items[0];
        try {
          const details = await tmdbService.getDetails(featured.media_type as any || 'movie', featured.id.toString());
          const trailer = details.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
          setFeaturedTrailer(trailer?.key || null);
        } catch (error) {
          setFeaturedTrailer(null);
        }
      }
    };
    fetchTrailer();
  }, [items]);

  // Auto-Rotation (Every 10 seconds)
  useEffect(() => {
    if (items.length > 5 && !isSearching) {
      const interval = setInterval(() => {
        setItems(prev => {
          const next = [...prev];
          const first = next.shift();
          if (first) next.push(first);
          return next;
        });
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [items, isSearching]);

  const handleToggleWatchlist = async (e: React.MouseEvent, item: TMDBItem) => {
    e.stopPropagation();
    await toggleWatchlist(item);
  };


  const handleNotInterested = (index: number) => {
    setItems(prev => {
      const next = [...prev];
      const itemsToKeep = next.splice(index, 1);
      next.push(...itemsToKeep);
      return next;
    });
    setOpenMenuId(null);
  };

  const scrollGenres = (direction: 'left' | 'right') => {
    if (genreScrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      genreScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const currentFeatured = items[0];

  return (
    <div className="min-h-screen bg-background pt-16 pb-20">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-8">
        
        {/* Header with Search */}
        <div className="flex flex-col items-center justify-center gap-6 pb-2">
          <form className="relative group max-w-2xl w-full" onSubmit={handleSearch}>
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-brand transition-colors" />
            <Input 
              placeholder="Search movies, tv shows..."
              className="bg-muted/50 border-none pl-16 h-16 rounded-[2rem] w-full text-lg focus:ring-2 focus:ring-brand/20 shadow-xl"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) setIsSearching(false);
              }}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearching(false);
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </form>
        </div>

        {/* Genre Selection Bar */}
        <div className="relative group/genres">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none opacity-0 group-hover/genres:opacity-100 transition-opacity" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none opacity-0 group-hover/genres:opacity-100 transition-opacity" />
          
          <div 
            ref={genreScrollRef}
            className="flex gap-3 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
          >
            <Button
              variant={activeGenre === null ? "default" : "secondary"}
              className={`flex-shrink-0 h-16 px-8 rounded-2xl font-bold uppercase tracking-tighter transition-all ${
                activeGenre === null ? 'bg-brand hover:bg-brand/80 text-white shadow-lg shadow-brand/20' : ''
              }`}
              onClick={() => setActiveGenre(null)}
            >
              All Genres
            </Button>
            {genres.map((genre) => (
              <button
                key={genre.genreId}
                onClick={() => setActiveGenre(genre.genreId)}
                className={`group relative flex-shrink-0 w-40 h-16 rounded-2xl overflow-hidden border-2 transition-all active:scale-95 ${
                  activeGenre === genre.genreId 
                    ? 'border-brand ring-2 ring-brand/20' 
                    : 'border-transparent hover:border-white/20'
                }`}
              >
                <img 
                  src={getImageUrl(genre.backdrop_path || genre.poster_path, 'w500') || undefined} 
                  alt={genre.genreName}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-60"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <span className="text-xs font-black uppercase tracking-widest text-white drop-shadow-md text-center">{genre.genreName}</span>
                </div>
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-xl z-20 opacity-0 group-hover/genres:opacity-100 transition-all pointer-events-auto"
            onClick={() => scrollGenres('left')}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-xl z-20 opacity-0 group-hover/genres:opacity-100 transition-all pointer-events-auto"
            onClick={() => scrollGenres('right')}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Discovery Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {isSearching ? (
            <div className="lg:col-span-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {searchResults.map((item) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id}
                  className="relative aspect-[2/3] rounded-[2rem] overflow-hidden cursor-pointer group bg-muted border border-border"
                  onClick={() => {
                    if (item.media_type === 'person') {
                      navigate(`/person/${item.id}`);
                    } else {
                      navigate(`/watch/${item.media_type || 'movie'}/${item.id}`);
                    }
                  }}
                >
                  <img 
                    src={getImageUrl(item.poster_path || item.profile_path, 'w500') || undefined} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt={item.title || item.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-6">
                    <h3 className="font-black text-white uppercase tracking-tighter text-lg leading-tight">{item.title || item.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-zinc-300 font-black uppercase tracking-widest">{item.media_type || (item.profile_path ? 'Person' : 'Unknown')}</p>
                      {item.vote_average !== undefined && item.vote_average > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] border border-yellow-500 text-yellow-500 px-1 rounded font-black tracking-tighter leading-none">IMDb</span>
                          <span className="text-[10px] text-yellow-500 font-bold">{item.vote_average?.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <>
              {/* Featured Banner */}
              <motion.div 
                layout
                className="lg:col-span-7 relative aspect-[16/9] lg:aspect-auto lg:h-[450px] rounded-[3rem] overflow-hidden group cursor-pointer shadow-2xl border border-white/5 bg-muted"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentFeatured?.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                  >
                    {featuredTrailer ? (
                      <div className="w-full h-full relative">
                        <iframe
                          src={`https://www.youtube.com/embed/${featuredTrailer}?autoplay=1&controls=0&mute=1&loop=1&playlist=${featuredTrailer}&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&disablekb=1&fs=0&autohide=1`}
                          className="w-full h-full object-cover scale-[1.5] pointer-events-none"
                          allow="autoplay"
                        />
                      </div>
                    ) : (
                      <img 
                        src={getImageUrl(currentFeatured?.backdrop_path, 'original') || undefined} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                
                {/* Actions */}
                <div className="absolute top-8 right-8 z-30 flex items-center gap-3">
                   <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-brand transition-all text-white hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === currentFeatured?.id ? null : currentFeatured?.id);
                        }}
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                      
                      {openMenuId === currentFeatured?.id && (
                        <div className="absolute top-12 right-0 bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-2 min-w-[160px] z-50 animate-in fade-in zoom-in duration-200">
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-sm font-bold hover:bg-brand hover:text-white rounded-xl gap-2 h-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotInterested(0);
                            }}
                          >
                            Not interested
                          </Button>
                        </div>
                      )}
                    </div>
                </div>

                <div className="absolute inset-0 p-6 lg:p-10 flex items-end text-white z-20">
                  <div className="max-w-xl space-y-3">
                    <div className="flex items-center gap-2">
                       <span className="px-3 py-1 bg-brand text-[10px] font-black uppercase rounded-full tracking-widest">Featured</span>
                    </div>
                    <h2 className="text-xl lg:text-3xl font-black tracking-tighter uppercase leading-[0.8] drop-shadow-2xl">
                      {currentFeatured?.title || currentFeatured?.name}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-white/80 uppercase tracking-widest">{currentFeatured?.media_type}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] border border-yellow-500 text-yellow-500 px-1 rounded font-black tracking-tighter">IMDb</span>
                        <span className="text-sm font-black text-yellow-500">
                          {currentFeatured?.vote_average?.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-white/80 font-medium line-clamp-2 max-w-sm text-xs lg:text-sm">
                      {currentFeatured?.overview}
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <Button 
                        size="lg"
                        className="bg-white text-black hover:bg-zinc-200 h-11 px-6 rounded-2xl font-black uppercase tracking-tighter gap-2 text-sm"
                        onClick={() => navigate(`/watch/${currentFeatured?.media_type || 'movie'}/${currentFeatured?.id}`)}
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Watch Now
                      </Button>
                      <Button 
                        size="icon"
                        className={`w-11 h-11 rounded-2xl border border-white/20 backdrop-blur-md transition-colors hover:text-white bg-transparent ${
                          watchlistIds.has(currentFeatured?.id.toString()) ? 'bg-brand border-brand text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                        onClick={(e) => handleToggleWatchlist(e, currentFeatured)}
                      >
                        {watchlistIds.has(currentFeatured?.id.toString()) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Sidebar Grid */}
              <div className="lg:col-span-5 grid grid-cols-2 grid-rows-2 gap-4 lg:h-[450px]">
                {items.slice(1, 5).map((item, index) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="relative lg:h-full rounded-[2.5rem] overflow-hidden group cursor-pointer shadow-xl border border-border/50 bg-muted aspect-video lg:aspect-auto"
                    onClick={() => navigate(`/watch/${item.media_type || 'movie'}/${item.id}`)}
                  >
                    <img 
                      src={getImageUrl(item.backdrop_path || item.poster_path, 'w500') || undefined} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={item.title || item.name}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10" />
                    
                    {/* Actions */}
                    <div className="absolute top-4 right-4 z-30">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-brand transition-all text-white hover:text-white lg:opacity-0 lg:group-hover:opacity-100"
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
                              className="w-full justify-start text-xs font-bold hover:bg-brand hover:text-white rounded-lg gap-2 h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotInterested(index + 1);
                              }}
                            >
                              Not interested
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                      <div className="translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center mb-3">
                          <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                        </div>
                      </div>
                      <h3 className="font-black text-white uppercase tracking-tighter text-lg leading-tight line-clamp-1">{item.title || item.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-400 font-black tracking-widest uppercase">{item.media_type}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] border border-yellow-500 text-yellow-500 px-1 rounded font-black tracking-tighter leading-none">IMDb</span>
                          <span className="text-[10px] text-yellow-500 font-bold">{item.vote_average?.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Browsing Grid (Rest of items) */}
        {!isSearching && items.length > 5 && (
          <div className="pt-12 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-tighter">More to Discover</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
              {items.slice(5, 21).map((item) => (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  key={item.id}
                  className="relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer group bg-muted border border-border"
                  onClick={() => navigate(`/watch/${item.media_type || 'movie'}/${item.id}`)}
                >
                  <img 
                    src={getImageUrl(item.poster_path, 'w500') || undefined} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt={item.title || item.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <p className="font-black text-white uppercase tracking-tighter text-sm line-clamp-1">{item.title || item.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{item.media_type}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] border border-yellow-500 text-yellow-500 px-1 rounded font-black tracking-tighter leading-none">IMDb</span>
                        <span className="text-[10px] text-yellow-500 font-bold">{item.vote_average?.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
