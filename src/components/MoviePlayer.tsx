import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TMDBItem } from '../types';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, X, Star, Calendar, Clock, User, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface MoviePlayerProps {
  item: TMDBItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MoviePlayer({ item, isOpen, onClose }: MoviePlayerProps) {
  const [details, setDetails] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(() => {
    if (typeof window !== 'undefined' && item?.id) {
      const saved = localStorage.getItem(`last_watched_${item.id}`);
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
    if (typeof window !== 'undefined' && item?.id) {
      const saved = localStorage.getItem(`last_watched_${item.id}`);
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

  useEffect(() => {
    if (item?.id) {
      const saved = localStorage.getItem(`last_watched_${item.id}`);
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
  }, [item?.id]);

  useEffect(() => {
    if (item) {
      const type = item.media_type || (item.title ? 'movie' : 'tv');
      tmdbService.getDetails(type as 'movie' | 'tv', item.id.toString()).then(setDetails);
    }
  }, [item]);

  // Save last watched episode to localStorage
  useEffect(() => {
    if (details && (details.number_of_seasons || !details.title)) {
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

  if (!item || !details) return null;

  const type = item.media_type || (item.title ? 'movie' : 'tv');

  const getWatchedUrl = (episodeOverride?: number) => {
    if (type === 'movie') {
      return `https://watched.cx/movie/${item.id}`;
    }
    const ep = episodeOverride ?? selectedEpisode;
    return `https://watched.cx/tv/${item.id}?s=${selectedSeason}&e=${ep}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="max-w-none sm:max-w-none w-screen h-screen bg-background border-none p-0 overflow-y-auto rounded-none translate-x-0 translate-y-0 top-0 left-0 block! scrollbar-hide"
      >
        <div className="relative w-full min-h-screen flex flex-col">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-32 left-8 text-white hover:bg-brand z-[100] rounded-full w-14 h-14 bg-black/60 backdrop-blur-xl hover:text-white border border-white/20 shadow-2xl transition-all"
            onClick={onClose}
          >
            <ChevronLeft className="w-10 h-10" />
          </Button>

          {/* Close Button - Fixed to stay visible while scrolling */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-6 right-6 text-white hover:bg-white/20 z-[100] rounded-full w-12 h-12 bg-black/40 backdrop-blur-md hover:text-white"
            onClick={onClose}
          >
            <X className="w-8 h-8" />
          </Button>

          <div className="relative w-full h-[60vh] md:h-[80vh] bg-black flex-none transition-colors">
            <div className="relative w-full h-full">
              <img 
                src={getImageUrl(details.backdrop_path, 'original') || undefined} 
                className="w-full h-full object-cover opacity-40"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl md:text-8xl font-black tracking-tighter text-white max-w-4xl"
                >
                  {details.title || details.name}
                </motion.h2>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <a
                    href={getWatchedUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      "bg-brand text-white dark:bg-white dark:text-black hover:bg-brand/80 dark:hover:bg-zinc-200 h-20 px-16 rounded-full text-2xl font-bold gap-4 shadow-2xl shadow-white/10"
                    )}
                  >
                    <Play className="w-10 h-10 fill-current" />
                    {type === 'tv' ? `Play S${selectedSeason} E${selectedEpisode}` : 'Watch Now'}
                  </a>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-background transition-colors">
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-16">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex flex-wrap items-center gap-6 text-base text-muted-foreground">
                    <div className="flex items-center gap-2 text-yellow-500 font-black text-xl">
                      <Star className="w-6 h-6 fill-current" />
                      <span>{details.vote_average.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span>{new Date(details.release_date || details.first_air_date).getFullYear()}</span>
                    </div>
                    {details.runtime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span>{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {details.genres?.map((g: any) => (
                        <span key={g.id} className="px-3 py-1 bg-muted border border-border rounded-full text-sm text-foreground font-medium">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-foreground">Overview</h3>
                    <p className="text-muted-foreground leading-relaxed text-xl">
                      {details.overview}
                    </p>
                  </div>

                  {details.tagline && (
                    <p className="text-2xl text-muted-foreground font-medium italic">
                      "{details.tagline}"
                    </p>
                  )}
                </div>

                <div className="space-y-8 bg-muted/30 p-8 rounded-3xl border border-border transition-colors">
                  <h3 className="text-xl font-bold text-foreground uppercase tracking-widest">Details</h3>
                  <div className="space-y-6">
                    {details.status && (
                      <div>
                        <div className="text-muted-foreground text-sm uppercase font-bold mb-1">Status</div>
                        <div className="text-foreground">{details.status}</div>
                      </div>
                    )}
                    {details.budget > 0 && (
                      <div>
                        <div className="text-muted-foreground text-sm uppercase font-bold mb-1">Budget</div>
                        <div className="text-foreground">${details.budget.toLocaleString()}</div>
                      </div>
                    )}
                    {details.revenue > 0 && (
                      <div>
                        <div className="text-muted-foreground text-sm uppercase font-bold mb-1">Revenue</div>
                        <div className="text-foreground">${details.revenue.toLocaleString()}</div>
                      </div>
                    )}
                    {details.production_companies?.length > 0 && (
                      <div>
                        <div className="text-muted-foreground text-sm uppercase font-bold mb-1">Production</div>
                        <div className="text-foreground">
                          {details.production_companies.map((c: any) => c.name).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {type === 'tv' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-bold text-foreground">Episodes</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground font-bold uppercase text-sm">Season</span>
                      <select 
                        className="bg-muted border border-border text-foreground rounded-xl px-6 py-3 outline-none focus:ring-2 focus:ring-brand appearance-none min-w-[140px] text-center font-bold transition-colors"
                        value={selectedSeason}
                        onChange={(e) => {
                          setSelectedSeason(Number(e.target.value));
                          setSelectedEpisode(1);
                        }}
                      >
                        {Array.from({ length: details.number_of_seasons }, (_, i) => i + 1).map(s => (
                          <option key={s} value={s}>Season {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {episodes.map((ep) => (
                      <a
                        key={ep.id}
                        href={getWatchedUrl(ep.episode_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex flex-col gap-4 p-6 rounded-3xl transition-all text-left group/ep ${
                          selectedEpisode === ep.episode_number 
                            ? 'bg-brand/10 border-2 border-brand' 
                            : 'bg-muted/40 border-2 border-border hover:border-brand/50 hover:bg-muted/60'
                        }`}
                        onClick={() => {
                          setSelectedEpisode(ep.episode_number);
                        }}
                      >
                        <div className="w-full aspect-video rounded-2xl overflow-hidden flex-none bg-muted relative">
                          {ep.still_path ? (
                            <img 
                              src={getImageUrl(ep.still_path) || undefined} 
                              className="w-full h-full object-cover group-hover/ep:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 group-hover/ep:bg-transparent transition-colors" />
                        </div>
                        <div className="space-y-2">
                          <div className="text-lg font-bold text-foreground flex justify-between items-start gap-4 transition-colors">
                            <span>{ep.episode_number}. {ep.name}</span>
                            {ep.runtime && <span className="text-xs text-muted-foreground whitespace-nowrap">{ep.runtime}m</span>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed transition-colors">
                            {ep.overview || "No overview available for this episode."}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <h3 className="text-3xl font-bold text-foreground transition-colors">Cast</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-6">
                  {details.credits?.cast?.slice(0, 12).map((person: any) => (
                    <div key={person.id} className="group/cast space-y-4">
                      <div className="aspect-square rounded-full overflow-hidden bg-muted border-2 border-border group-hover/cast:border-brand transition-all duration-300 shadow-xl">
                        {person.profile_path ? (
                          <img 
                            src={getImageUrl(person.profile_path, 'w185') || undefined} 
                            className="w-full h-full object-cover group-hover/cast:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <User className="w-12 h-12" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-foreground group-hover/cast:text-brand transition-colors">{person.name}</div>
                        <div className="text-sm text-muted-foreground">{person.character}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {details.recommendations?.results?.length > 0 && (
                <div className="space-y-8">
                  <h3 className="text-3xl font-bold text-foreground transition-colors">More Like This</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {details.recommendations.results.slice(0, 6).map((rec: any) => (
                      <button 
                        key={rec.id}
                        className="group/rec text-left space-y-3"
                        onClick={() => {
                          const type = rec.media_type || (rec.title ? 'movie' : 'tv');
                          tmdbService.getDetails(type as 'movie' | 'tv', rec.id.toString()).then(setDetails);
                          const scrollContainer = document.querySelector('[data-slot="dialog-content"]');
                          if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-muted border-2 border-border group-hover/rec:border-brand transition-all">
                          <img 
                            src={getImageUrl(rec.poster_path) || undefined} 
                            className="w-full h-full object-cover group-hover/rec:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="font-bold text-foreground line-clamp-1 group-hover/rec:text-brand transition-colors">
                          {rec.title || rec.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
