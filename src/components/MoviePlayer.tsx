import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TMDBItem } from '../types';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { Button } from '@/components/ui/button';
import { Play, X, Star, Calendar, Clock, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'motion/react';

interface MoviePlayerProps {
  item: TMDBItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MoviePlayer({ item, isOpen, onClose }: MoviePlayerProps) {
  const [details, setDetails] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<any[]>([]);

  useEffect(() => {
    if (item) {
      const type = item.media_type || (item.title ? 'movie' : 'tv');
      tmdbService.getDetails(type as 'movie' | 'tv', item.id.toString()).then(setDetails);
      setIsPlaying(false);
      setSelectedSeason(1);
      setSelectedEpisode(1);
    }
  }, [item]);

  useEffect(() => {
    if (details && details.number_of_seasons) {
      tmdbService.getTVShowEpisodes(details.id.toString(), selectedSeason).then(setEpisodes);
    }
  }, [details, selectedSeason]);

  if (!item || !details) return null;

  const type = item.media_type || (item.title ? 'movie' : 'tv');
  const embedUrl = type === 'movie' 
    ? `https://vidsrc.ru/movie/${item.id}`
    : `https://vidsrc.ru/tv/${item.id}/${selectedSeason}/${selectedEpisode}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="max-w-none sm:max-w-none w-screen h-screen bg-zinc-950 border-none p-0 overflow-y-auto rounded-none translate-x-0 translate-y-0 top-0 left-0 block! scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
      >
        <div className="relative w-full min-h-screen flex flex-col">
          {/* Close Button - Fixed to stay visible while scrolling */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-6 right-6 text-white hover:bg-white/20 z-[100] rounded-full w-12 h-12 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          >
            <X className="w-8 h-8" />
          </Button>

          <div className="relative w-full h-[60vh] md:h-[80vh] bg-black flex-none">
            {isPlaying ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allowFullScreen
                frameBorder="0"
              />
            ) : (
              <div className="relative w-full h-full">
                <img 
                  src={getImageUrl(details.backdrop_path, 'original') || undefined} 
                  className="w-full h-full object-cover opacity-40"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
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
                    <Button 
                      size="lg" 
                      className="bg-white text-black hover:bg-zinc-200 h-20 px-16 rounded-full text-2xl font-bold gap-4 shadow-2xl shadow-white/10"
                      onClick={() => setIsPlaying(true)}
                    >
                      <Play className="w-10 h-10 fill-current" />
                      Watch Now
                    </Button>
                  </motion.div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 bg-zinc-950">
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-16">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex flex-wrap items-center gap-6 text-base text-zinc-400">
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
                        <span key={g.id} className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-white font-medium">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-white">Overview</h3>
                    <p className="text-zinc-400 leading-relaxed text-xl">
                      {details.overview}
                    </p>
                  </div>

                  {details.tagline && (
                    <p className="text-2xl italic text-zinc-500 font-medium">
                      "{details.tagline}"
                    </p>
                  )}
                </div>

                <div className="space-y-8 bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800/50">
                  <h3 className="text-xl font-bold text-white uppercase tracking-widest">Details</h3>
                  <div className="space-y-6">
                    {details.status && (
                      <div>
                        <div className="text-zinc-500 text-sm uppercase font-bold mb-1">Status</div>
                        <div className="text-white">{details.status}</div>
                      </div>
                    )}
                    {details.budget > 0 && (
                      <div>
                        <div className="text-zinc-500 text-sm uppercase font-bold mb-1">Budget</div>
                        <div className="text-white">${details.budget.toLocaleString()}</div>
                      </div>
                    )}
                    {details.revenue > 0 && (
                      <div>
                        <div className="text-zinc-500 text-sm uppercase font-bold mb-1">Revenue</div>
                        <div className="text-white">${details.revenue.toLocaleString()}</div>
                      </div>
                    )}
                    {details.production_companies?.length > 0 && (
                      <div>
                        <div className="text-zinc-500 text-sm uppercase font-bold mb-1">Production</div>
                        <div className="text-white">
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
                    <h3 className="text-3xl font-bold text-white">Episodes</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-500 font-bold uppercase text-sm">Season</span>
                      <select 
                        className="bg-zinc-800 border-zinc-700 text-white rounded-xl px-6 py-3 outline-none focus:ring-2 focus:ring-red-600 appearance-none min-w-[140px] text-center font-bold"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(Number(e.target.value))}
                      >
                        {Array.from({ length: details.number_of_seasons }, (_, i) => i + 1).map(s => (
                          <option key={s} value={s}>Season {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {episodes.map((ep) => (
                      <button
                        key={ep.id}
                        className={`flex flex-col gap-4 p-6 rounded-3xl transition-all text-left group/ep ${
                          selectedEpisode === ep.episode_number 
                            ? 'bg-red-600/20 border-2 border-red-600' 
                            : 'bg-zinc-900/50 border-2 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                        }`}
                        onClick={() => {
                          setSelectedEpisode(ep.episode_number);
                          setIsPlaying(true);
                          const scrollContainer = document.querySelector('[data-slot="dialog-content"]');
                          if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="w-full aspect-video rounded-2xl overflow-hidden flex-none bg-zinc-800 relative">
                          {ep.still_path ? (
                            <img 
                              src={getImageUrl(ep.still_path) || undefined} 
                              className="w-full h-full object-cover group-hover/ep:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-12 h-12 text-zinc-700" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 group-hover/ep:bg-transparent transition-colors" />
                        </div>
                        <div className="space-y-2">
                          <div className="text-lg font-bold text-white flex justify-between items-start gap-4">
                            <span>{ep.episode_number}. {ep.name}</span>
                            {ep.runtime && <span className="text-xs text-zinc-500 whitespace-nowrap">{ep.runtime}m</span>}
                          </div>
                          <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                            {ep.overview || "No overview available for this episode."}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <h3 className="text-3xl font-bold text-white">Cast</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                  {details.credits?.cast?.slice(0, 12).map((person: any) => (
                    <div key={person.id} className="group/cast space-y-4">
                      <div className="aspect-square rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-800 group-hover/cast:border-red-600 transition-all duration-300 shadow-xl">
                        {person.profile_path ? (
                          <img 
                            src={getImageUrl(person.profile_path, 'w185') || undefined} 
                            className="w-full h-full object-cover group-hover/cast:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <User className="w-12 h-12" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-white group-hover/cast:text-red-500 transition-colors">{person.name}</div>
                        <div className="text-sm text-zinc-500">{person.character}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {details.recommendations?.results?.length > 0 && (
                <div className="space-y-8">
                  <h3 className="text-3xl font-bold text-white">More Like This</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {details.recommendations.results.slice(0, 5).map((rec: any) => (
                      <button 
                        key={rec.id}
                        className="group/rec text-left space-y-3"
                        onClick={() => {
                          const type = rec.media_type || (rec.title ? 'movie' : 'tv');
                          tmdbService.getDetails(type as 'movie' | 'tv', rec.id.toString()).then(setDetails);
                          setIsPlaying(false);
                          const scrollContainer = document.querySelector('[data-slot="dialog-content"]');
                          if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-800 border-2 border-zinc-800 group-hover/rec:border-white transition-all">
                          <img 
                            src={getImageUrl(rec.poster_path) || undefined} 
                            className="w-full h-full object-cover group-hover/rec:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="font-bold text-white line-clamp-1 group-hover/rec:text-red-500 transition-colors">
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
