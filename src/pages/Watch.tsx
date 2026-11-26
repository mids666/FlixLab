import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { useAuth } from '../hooks/useAuth';
import MovieRow from '../components/MovieRow';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Star, Clock, User, ChevronLeft, Youtube, Plus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from 'motion/react';

export default function Watch() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { user, currentProfile, setShowAuthModal, watchlist, toggleWatchlist, addToRecentlyWatched: addHistory } = useAuth();
  
  const [details, setDetails] = useState<any>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(() => {
    if (typeof window !== 'undefined' && id) {
      const saved = localStorage.getItem(`last_watched_${id}`);
      if (saved) {
        try {
          const { season } = JSON.parse(saved);
          return season || 1;
        } catch (e) {}
      }
    }
    return 1;
  });
  const [selectedEpisode, setSelectedEpisode] = useState<number>(() => {
    if (typeof window !== 'undefined' && id) {
      const saved = localStorage.getItem(`last_watched_${id}`);
      if (saved) {
        try {
          const { episode } = JSON.parse(saved);
          return episode || 1;
        } catch (e) {}
      }
    }
    return 1;
  });
  const [episodes, setEpisodes] = useState<any[]>([]);

  const isInWatchlist = watchlist.some(w => w.tmdbId === id?.toString());

  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`last_watched_${id}`);
      if (saved) {
        try {
          const { season, episode } = JSON.parse(saved);
          setSelectedSeason(season || 1);
          setSelectedEpisode(episode || 1);
        } catch (e) {
          setSelectedSeason(1);
          setSelectedEpisode(1);
        }
      } else {
        setSelectedSeason(1);
        setSelectedEpisode(1);
      }
    }
  }, [id]);

  useEffect(() => {
    if (id && type) {
      tmdbService.getDetails(type as 'movie' | 'tv', id).then(setDetails);
    }
  }, [id, type]);

  useEffect(() => {
    if (details && (details.number_of_seasons || !details.title)) {
      // Small delay to ensure we've had time to load from localStorage first if we just mounted
      const timer = setTimeout(() => {
        localStorage.setItem(`last_watched_${details.id}`, JSON.stringify({
          season: selectedSeason,
          episode: selectedEpisode
        }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedSeason, selectedEpisode, details?.id]);

  useEffect(() => {
    if (details && details.number_of_seasons) {
      tmdbService.getTVShowEpisodes(details.id.toString(), selectedSeason).then(setEpisodes);
    }
  }, [details, selectedSeason]);

  const addToRecentlyWatched = async (episodeOverride?: number) => {
    if (!user || !currentProfile || !details) return;
    const ep = episodeOverride ?? selectedEpisode;
    await addHistory(details, details.number_of_seasons ? selectedSeason : undefined, details.number_of_seasons ? ep : undefined);
  };

  const handleToggleWatchlist = async () => {
    if (!user || !currentProfile) {
      setShowAuthModal(true);
      return;
    }
    if (!details) return;
    await toggleWatchlist(details);
  };

  const handlePersonClick = (personId: number) => {
    navigate(`/person/${personId}`);
  };

  if (!details) return (
    <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
      <div className="animate-pulse text-4xl font-black tracking-tighter text-brand">FLIXLAB</div>
    </div>
  );

  const getWatchedUrl = (episodeOverride?: number) => {
    if (type === 'movie') {
      return `https://watched.cx/movie/${id}`;
    }
    const ep = episodeOverride ?? selectedEpisode;
    return `https://watched.cx/tv/${id}?s=${selectedSeason}&e=${ep}`;
  };

  const trailer = details?.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || details?.videos?.results?.find((v: any) => v.site === 'YouTube');

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="relative w-full flex flex-col">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-32 left-8 z-[100] rounded-full w-14 h-14 bg-black/60 backdrop-blur-xl text-white hover:bg-brand hover:text-white transition-all shadow-2xl border border-white/20"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="w-10 h-10" />
        </Button>

        <div className="relative w-full h-[70vh] md:h-[90vh] bg-black">
          <div className="relative w-full h-full">
            <img 
              src={getImageUrl(details.backdrop_path, 'original') || undefined} 
              alt={details.title || details.name}
              className="w-full h-full object-cover opacity-60"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent transition-colors duration-500" />
            
            <div className="absolute inset-0 flex flex-col justify-end pb-12 md:pb-24 px-4 md:px-12 max-w-7xl mx-auto z-10">
              <div className="max-w-3xl space-y-6">
                <div className="flex items-center gap-4 text-white drop-shadow-md font-bold">
                  <div className="flex items-center gap-1 text-yellow-500 bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{details.vote_average.toFixed(1)}</span>
                  </div>
                  <span className="text-white/80 transition-colors">
                    {new Date(details.release_date || details.first_air_date).getFullYear()}
                  </span>
                  {details.runtime && (
                    <span className="text-white/80 flex items-center gap-1 transition-colors">
                      <Clock className="w-4 h-4" />
                      {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-black/40 backdrop-blur-md rounded text-[10px] uppercase tracking-widest text-white border border-white/20 transition-colors">
                    {type === 'movie' ? 'Movie' : 'TV Show'}
                  </span>
                </div>

                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-[0.85] drop-shadow-2xl">
                  {details.title || details.name}
                </h1>

                <p className="text-base text-white/90 leading-relaxed line-clamp-3 md:line-clamp-none max-w-2xl drop-shadow-xl font-medium">
                  {details.overview}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <a
                    href={getWatchedUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => addToRecentlyWatched()}
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      "bg-brand text-white dark:bg-white dark:text-black hover:bg-brand/80 dark:hover:bg-zinc-200 px-8 h-14 text-lg font-bold rounded-md gap-3 shadow-lg transition-all"
                    )}
                  >
                    <Play className="w-6 h-6 fill-current" />
                    {type === 'tv' ? `Play S${selectedSeason} E${selectedEpisode}` : 'Play'}
                  </a>
                  
                  {trailer && (
                    <Button 
                      size="lg"
                      variant="outline"
                      className="bg-muted/30 backdrop-blur-md border-border hover:bg-muted/50 text-foreground px-8 h-14 text-lg font-bold rounded-md gap-3 transition-all"
                      onClick={() => setShowTrailer(true)}
                    >
                      <Youtube className="w-6 h-6 text-brand" />
                      Trailer
                    </Button>
                  )}

                  <motion.button
                    initial={{ width: 56 }}
                    animate={{ 
                      width: details && !isInWatchlist ? [56, 260, 260, 56] : 56 
                    }}
                    transition={{ 
                      duration: 3, 
                      times: [0, 0.15, 0.85, 1],
                      delay: 1,
                      ease: "easeInOut"
                    }}
                    className={`h-14 flex items-center justify-center gap-2 rounded-md border transition-all overflow-hidden group backdrop-blur-md ${
                      isInWatchlist 
                        ? 'bg-brand border-brand text-white w-14 shadow-lg' 
                        : 'bg-muted/30 border-border text-foreground hover:bg-muted/50 px-4'
                    }`}
                    onClick={handleToggleWatchlist}
                  >
                    <div className="flex-none flex items-center justify-center w-6 h-6">
                      {isInWatchlist ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                    </div>
                    {!isInWatchlist && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ 
                          opacity: [0, 1, 1, 0],
                          width: [0, "auto", "auto", 0]
                        }}
                        transition={{ 
                          duration: 3, 
                          times: [0, 0.15, 0.85, 1],
                          delay: 1,
                          ease: "easeInOut"
                        }}
                        className="text-sm font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden"
                      >
                        Add to Watchlist
                      </motion.span>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full px-4 md:px-12 py-12">
          <div className="space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">
                <div className="flex flex-wrap gap-2">
                  {details.genres?.map((genre: any) => (
                    <span key={genre.id} className="text-xs text-muted-foreground border border-border px-3 py-1 rounded-full transition-colors">
                      {genre.name}
                    </span>
                  ))}
                </div>

                {/* Cast Section - Now under overview */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Cast
                    <span className="w-8 h-0.5 bg-brand rounded-full" />
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-4">
                    {details.credits?.cast?.slice(0, 10).map((person: any, index: number) => (
                      <button 
                        key={`${person.id}-${index}`} 
                        className="flex flex-col items-center gap-3 group text-center"
                        onClick={() => handlePersonClick(person.id)}
                      >
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-muted border-2 border-border group-hover:border-brand transition-all duration-300 shadow-xl">
                          {person.profile_path ? (
                            <img 
                              src={getImageUrl(person.profile_path, 'w185') || undefined} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-bold text-foreground group-hover:text-brand transition-colors truncate w-full">{person.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate w-full">{person.character}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details Section - Now under cast */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border transition-colors">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest transition-colors">Production Info</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Status</span>
                        <span className="text-foreground font-bold transition-colors">{details.status}</span>
                      </div>
                      <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Original Title</span>
                        <span className="text-foreground font-bold transition-colors">{details.original_title || details.original_name}</span>
                      </div>
                      <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Original Language</span>
                        <span className="text-foreground font-bold uppercase transition-colors">{details.original_language}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest transition-colors">Financials & Networks</h3>
                    <div className="space-y-3">
                      {details.budget > 0 && (
                        <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="text-foreground font-bold transition-colors">${(details.budget / 1000000).toFixed(1)}M</span>
                        </div>
                      )}
                      {details.revenue > 0 && (
                        <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="text-foreground font-bold transition-colors">${(details.revenue / 1000000).toFixed(1)}M</span>
                        </div>
                      )}
                      {details.production_companies?.length > 0 && (
                        <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                          <span className="text-muted-foreground">Production</span>
                          <div className="flex flex-wrap justify-end gap-2 max-w-[200px]">
                            {details.production_companies.slice(0, 2).map((company: any, index: number) => (
                              <span key={`${company.id}-${index}`} className="text-[10px] text-foreground font-bold transition-colors">
                                {company.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Episodes Section - Priority for TV Shows */}
                {details.number_of_seasons && (
                  <div className="space-y-6 pt-12 border-t border-border transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-foreground">
                        Episodes
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Season</span>
                        <Select 
                          value={selectedSeason.toString()} 
                          onValueChange={(val) => {
                            setSelectedSeason(parseInt(val));
                            setSelectedEpisode(1);
                          }}
                        >
                          <SelectTrigger className="w-[140px] bg-muted border-border text-foreground font-bold transition-colors">
                            <SelectValue placeholder="Select Season" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground">
                            {Array.from({ length: details.number_of_seasons }).map((_, i) => (
                              <SelectItem 
                                key={i} 
                                value={(i + 1).toString()}
                                className="focus:bg-brand focus:text-white cursor-pointer"
                              >
                                Season {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {episodes.map((ep) => (
                        <a
                          key={ep.id}
                          href={getWatchedUrl(ep.episode_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex gap-4 p-3 rounded-xl transition-all text-left group ${
                            selectedEpisode === ep.episode_number 
                              ? 'bg-brand/10 border border-brand/50' 
                              : 'bg-muted/50 border border-transparent hover:bg-muted transition-colors'
                          }`}
                          onClick={() => {
                            setSelectedEpisode(ep.episode_number);
                            addToRecentlyWatched(ep.episode_number);
                          }}
                        >
                          <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-none bg-muted">
                            {ep.still_path ? (
                              <img 
                                src={getImageUrl(ep.still_path, 'w300') || undefined} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center transition-colors">
                                <Play className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                            {selectedEpisode === ep.episode_number && (
                              <div className="absolute inset-0 flex items-center justify-center bg-brand/20">
                                <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center shadow-lg">
                                  <Play className="w-4 h-4 fill-current text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                            <div className="text-xs font-bold text-muted-foreground mb-1 transition-colors">
                              Episode {ep.episode_number}
                            </div>
                            <div className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-brand transition-colors">
                              {ep.name}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-1 transition-colors">
                              {ep.overview || 'No description available.'}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trailer Section - Only for Movies or below episodes for TV */}
                {trailer && type === 'movie' && (
                  <div className="pt-12 border-t border-border">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      Official Trailer
                      <span className="w-8 h-0.5 bg-brand rounded-full" />
                    </h3>
                    <div className="relative aspect-video w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-border bg-muted">
                      <iframe
                        src={`https://www.youtube.com/embed/${trailer.key}`}
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                        frameBorder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar - Now used for extra metadata or empty for better focus */}
              <div className="space-y-8 hidden lg:block">
                {details.networks?.length > 0 && (
                  <div className="bg-card rounded-2xl p-6 border border-border transition-colors">
                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-4 transition-colors">Available On</h3>
                    <div className="flex flex-wrap gap-3">
                      {details.networks.map((network: any, index: number) => (
                        <div key={`${network.id}-${index}`} className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-lg p-2 flex items-center justify-center overflow-hidden border border-border shadow-sm">
                            {network.logo_path ? (
                              <img 
                                src={getImageUrl(network.logo_path, 'w185') || undefined} 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-[8px] text-black font-black text-center">{network.name}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-bold transition-colors">{network.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations Section */}
            {details.recommendations?.results?.length > 0 && (
              <div className="pt-12 border-t border-border">
                <MovieRow 
                  title="You May Also Like" 
                  items={details.recommendations.results} 
                  onSelect={(item) => {
                    const type = item.media_type || (item.title ? 'movie' : 'tv');
                    navigate(`/watch/${type}/${item.id}`);
                    window.scrollTo(0, 0);
                  }} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      <Dialog open={showTrailer} onOpenChange={setShowTrailer}>
        <DialogContent className="bg-card border-border text-foreground max-w-4xl p-0 overflow-hidden transition-colors">
          <DialogHeader className="p-4 border-b border-border transition-colors">
            <DialogTitle className="flex items-center gap-2 transition-colors">
              <Youtube className="w-5 h-5 text-brand" />
              {details.title || details.name} - Official Trailer
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full transition-colors">
            {trailer && (
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay"
                frameBorder="0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
