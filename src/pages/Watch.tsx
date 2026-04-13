import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { TMDBItem } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import MovieRow from '../components/MovieRow';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Star, Calendar, Clock, User, Server, ChevronLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'motion/react';

type ServerOption = 'vidsrc' | 'videasy' | 'vidlink';

export default function Watch() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { user, currentProfile } = useAuth();
  
  const [details, setDetails] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerOption>('vidsrc');

  useEffect(() => {
    if (id && type) {
      tmdbService.getDetails(type as 'movie' | 'tv', id).then(setDetails);
    }
  }, [id, type]);

  useEffect(() => {
    if (details) {
      const itemType = details.title ? 'movie' : 'tv';
      
      if (itemType === 'tv' || details.number_of_seasons) {
        const saved = localStorage.getItem(`last_watched_${details.id}`);
        if (saved) {
          try {
            const { season, episode } = JSON.parse(saved);
            setSelectedSeason(season || 1);
            setSelectedEpisode(episode || 1);
          } catch (e) {
            setSelectedSeason(1);
            setSelectedEpisode(1);
          }
        }
      }
    }
  }, [details?.id]);

  useEffect(() => {
    if (details && (details.number_of_seasons || !details.title)) {
      localStorage.setItem(`last_watched_${details.id}`, JSON.stringify({
        season: selectedSeason,
        episode: selectedEpisode
      }));
    }
  }, [selectedSeason, selectedEpisode, details?.id]);

  useEffect(() => {
    if (details && details.number_of_seasons) {
      tmdbService.getTVShowEpisodes(details.id.toString(), selectedSeason).then(setEpisodes);
    }
  }, [details, selectedSeason]);

  const addToRecentlyWatched = async () => {
    if (!user || !currentProfile || !details) return;

    const recentlyWatchedRef = doc(db, 'users', user.uid, 'profiles', currentProfile.id, 'recentlyWatched', details.id.toString());
    
    try {
      await setDoc(recentlyWatchedRef, {
        tmdbId: details.id.toString(),
        type: details.title ? 'movie' : 'tv',
        title: details.title || details.name,
        posterPath: details.poster_path,
        voteAverage: details.vote_average,
        watchedAt: new Date().toISOString(),
        season: details.number_of_seasons ? selectedSeason : undefined,
        episode: details.number_of_seasons ? selectedEpisode : undefined,
      });
    } catch (error) {
      console.error('Failed to add to recently watched:', error);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    addToRecentlyWatched();
  };

  const handlePersonClick = (personId: number) => {
    navigate(`/person/${personId}`);
  };

  if (!details) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a] text-white">
      <div className="animate-pulse text-4xl font-black tracking-tighter text-red-600">NEOFLIX</div>
    </div>
  );

  const getEmbedUrl = () => {
    if (selectedServer === 'vidsrc') {
      return type === 'movie' 
        ? `https://vidsrc.ru/movie/${id}`
        : `https://vidsrc.ru/tv/${id}/${selectedSeason}/${selectedEpisode}`;
    } else if (selectedServer === 'videasy') {
      return type === 'movie'
        ? `https://player.videasy.net/movie/${id}`
        : `https://player.videasy.net/tv/${id}/${selectedSeason}/${selectedEpisode}`;
    } else {
      return type === 'movie'
        ? `https://vidlink.pro/movie/${id}`
        : `https://vidlink.pro/tv/${id}/${selectedSeason}/${selectedEpisode}`;
    }
  };

  const embedUrl = getEmbedUrl();

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="relative w-full flex flex-col">
        <div className="relative w-full h-[60vh] md:h-[80vh] bg-black">
          {isPlaying ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={embedUrl}
                className="w-full flex-1"
                allowFullScreen
                frameBorder="0"
              />
              <div className="bg-zinc-900/80 backdrop-blur-md p-4 flex items-center justify-center gap-4 border-t border-zinc-800">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Server className="w-3 h-3" />
                  Switch Server:
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedServer === 'vidsrc' ? 'default' : 'outline'}
                    className={`h-8 px-4 rounded-full text-xs font-bold ${selectedServer === 'vidsrc' ? 'bg-red-600 hover:bg-red-700' : 'border-zinc-700 text-zinc-400'}`}
                    onClick={() => setSelectedServer('vidsrc')}
                  >
                    VidSrc (Main)
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedServer === 'videasy' ? 'default' : 'outline'}
                    className={`h-8 px-4 rounded-full text-xs font-bold ${selectedServer === 'videasy' ? 'bg-red-600 hover:bg-red-700' : 'border-zinc-700 text-zinc-400'}`}
                    onClick={() => setSelectedServer('videasy')}
                  >
                    VidEasy (Backup)
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedServer === 'vidlink' ? 'default' : 'outline'}
                    className={`h-8 px-4 rounded-full text-xs font-bold ${selectedServer === 'vidlink' ? 'bg-red-600 hover:bg-red-700' : 'border-zinc-700 text-zinc-400'}`}
                    onClick={() => setSelectedServer('vidlink')}
                  >
                    VidLink (Backup 2)
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <img 
                src={getImageUrl(details.backdrop_path, 'original') || undefined} 
                alt={details.title || details.name}
                className="w-full h-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Button 
                  size="lg" 
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                  onClick={handlePlay}
                >
                  <Play className="w-10 h-10 fill-current ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto w-full px-4 md:px-12 py-12">
          <div className="space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{details.vote_average.toFixed(1)}</span>
                    </div>
                    <span className="text-zinc-500">
                      {new Date(details.release_date || details.first_air_date).getFullYear()}
                    </span>
                    {details.runtime && (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] uppercase tracking-widest">
                      {type === 'movie' ? 'Movie' : 'TV Show'}
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
                    {details.title || details.name}
                  </h1>
                  <div className="flex flex-wrap gap-2">
                    {details.genres?.map((genre: any) => (
                      <span key={genre.id} className="text-xs text-zinc-400 border border-zinc-800 px-3 py-1 rounded-full">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-lg text-zinc-400 leading-relaxed max-w-4xl">
                    {details.overview}
                  </p>
                </div>

                {/* Cast Section - Now under overview */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Cast
                    <span className="w-8 h-0.5 bg-red-600 rounded-full" />
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {details.credits?.cast?.slice(0, 10).map((person: any, index: number) => (
                      <button 
                        key={`${person.id}-${index}`} 
                        className="flex flex-col items-center gap-3 group text-center"
                        onClick={() => handlePersonClick(person.id)}
                      >
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-zinc-900 border-2 border-zinc-800 group-hover:border-red-600 transition-all duration-300 shadow-xl">
                          {person.profile_path ? (
                            <img 
                              src={getImageUrl(person.profile_path, 'w185') || undefined} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-8 h-8 text-zinc-700" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-bold text-white group-hover:text-red-500 transition-colors truncate w-full">{person.name}</div>
                          <div className="text-[10px] text-zinc-500 truncate w-full">{person.character}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details Section - Now under cast */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-900">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Production Info</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Status</span>
                        <span className="text-white font-bold">{details.status}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Original Title</span>
                        <span className="text-white font-bold">{details.original_title || details.original_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Original Language</span>
                        <span className="text-white font-bold uppercase">{details.original_language}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Financials & Networks</h3>
                    <div className="space-y-3">
                      {details.budget > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Budget</span>
                          <span className="text-white font-bold">${(details.budget / 1000000).toFixed(1)}M</span>
                        </div>
                      )}
                      {details.revenue > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Revenue</span>
                          <span className="text-white font-bold">${(details.revenue / 1000000).toFixed(1)}M</span>
                        </div>
                      )}
                      {details.production_companies?.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Production</span>
                          <div className="flex flex-wrap justify-end gap-2 max-w-[200px]">
                            {details.production_companies.slice(0, 2).map((company: any, index: number) => (
                              <span key={`${company.id}-${index}`} className="text-[10px] text-white font-bold">
                                {company.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {details.number_of_seasons && (
                  <div className="space-y-6 pt-12 border-t border-zinc-900">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">
                        Episodes
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Season</span>
                        <Select 
                          value={selectedSeason.toString()} 
                          onValueChange={(val) => {
                            setSelectedSeason(parseInt(val));
                            setSelectedEpisode(1);
                          }}
                        >
                          <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-800 text-white font-bold">
                            <SelectValue placeholder="Select Season" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            {Array.from({ length: details.number_of_seasons }).map((_, i) => (
                              <SelectItem 
                                key={i} 
                                value={(i + 1).toString()}
                                className="focus:bg-red-600 focus:text-white cursor-pointer"
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
                        <button
                          key={ep.id}
                          className={`flex gap-4 p-3 rounded-xl transition-all text-left group ${
                            selectedEpisode === ep.episode_number 
                              ? 'bg-red-600/10 border border-red-600/50' 
                              : 'bg-zinc-900/50 border border-transparent hover:bg-zinc-900'
                          }`}
                          onClick={() => {
                            setSelectedEpisode(ep.episode_number);
                            setIsPlaying(true);
                            addToRecentlyWatched();
                          }}
                        >
                          <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-none bg-zinc-800">
                            {ep.still_path ? (
                              <img 
                                src={getImageUrl(ep.still_path, 'w300') || undefined} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-6 h-6 text-zinc-700" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                            {selectedEpisode === ep.episode_number && (
                              <div className="absolute inset-0 flex items-center justify-center bg-red-600/20">
                                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                                  <Play className="w-4 h-4 fill-current" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                            <div className="text-xs font-bold text-zinc-500 mb-1">
                              Episode {ep.episode_number}
                            </div>
                            <div className="font-bold text-sm text-white line-clamp-1 group-hover:text-red-500 transition-colors">
                              {ep.name}
                            </div>
                            <div className="text-xs text-zinc-500 line-clamp-2 mt-1">
                              {ep.overview || 'No description available.'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar - Now used for extra metadata or empty for better focus */}
              <div className="space-y-8 hidden lg:block">
                {details.networks?.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800/50">
                    <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Available On</h3>
                    <div className="flex flex-wrap gap-3">
                      {details.networks.map((network: any, index: number) => (
                        <div key={`${network.id}-${index}`} className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-lg p-2 flex items-center justify-center overflow-hidden">
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
                          <span className="text-[10px] text-zinc-500 font-bold">{network.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations Section */}
            {details.recommendations?.results?.length > 0 && (
              <div className="pt-12 border-t border-zinc-900">
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
    </div>
  );
}
