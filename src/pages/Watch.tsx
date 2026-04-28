import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { TMDBItem } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, setDoc, collection, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import MovieRow from '../components/MovieRow';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSettings } from '../hooks/useSettings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Star, Calendar, Clock, User, Server, ChevronLeft, ChevronRight, Youtube, Plus, Check, SkipForward, ChevronDown, Download, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'motion/react';

type ServerOption = 'vidcore' | 'peachify' | 'videasy' | 'vidsrc' | 'vidlink' | '111movies' | 'vidfast' | 'vidnest';

export default function Watch() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { user, currentProfile, setShowAuthModal } = useAuth();
  const { settings } = useSettings();
  
  const [details, setDetails] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showDownloadInfo, setShowDownloadInfo] = useState(false);
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
  const [selectedServer, setSelectedServer] = useState<ServerOption>('vidcore');
  const [isInWatchlist, setIsInWatchlist] = useState(false);

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
    if (!user || !currentProfile || !id) return;

    const watchlistRef = collection(db, 'users', user.uid, 'profiles', currentProfile.id, 'watchlist');
    const q = query(watchlistRef, where('tmdbId', '==', id.toString()));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsInWatchlist(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [user, currentProfile, id]);

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

  const addToRecentlyWatched = async () => {
    if (!user || !currentProfile || !details) return;

    const recentlyWatchedRef = doc(db, 'users', user.uid, 'profiles', currentProfile.id, 'recentlyWatched', details.id.toString());
    
    const data: any = {
      tmdbId: details.id.toString(),
      type: details.title ? 'movie' : 'tv',
      title: details.title || details.name,
      posterPath: details.poster_path,
      voteAverage: details.vote_average,
      watchedAt: new Date().toISOString(),
    };

    if (details.number_of_seasons) {
      data.season = selectedSeason;
      data.episode = selectedEpisode;
    }
    
    try {
      await setDoc(recentlyWatchedRef, data);
    } catch (error) {
      console.error('Failed to add to recently watched:', error);
    }
  };

  const toggleWatchlist = async () => {
    if (!user || !currentProfile) {
      setShowAuthModal(true);
      return;
    }

    if (!details) return;

    const watchlistRef = doc(db, 'users', user.uid, 'profiles', currentProfile.id, 'watchlist', details.id.toString());

    try {
      if (isInWatchlist) {
        await deleteDoc(watchlistRef);
        toast.success('Removed from watchlist');
      } else {
        await setDoc(watchlistRef, {
          tmdbId: details.id.toString(),
          type: details.title ? 'movie' : 'tv',
          title: details.title || details.name,
          posterPath: details.poster_path,
          addedAt: new Date().toISOString(),
        });
        toast.success('Added to watchlist');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    addToRecentlyWatched();
  };

  const hasNextEpisode = () => {
    if (!details || type !== 'tv') return false;
    const nextEpisodeNum = selectedEpisode + 1;
    // Check current season
    const episodesInCurrentSeason = episodes.length;
    if (episodesInCurrentSeason > 0 && nextEpisodeNum <= episodesInCurrentSeason) return true;
    // Check if there is a next season
    if (selectedSeason < details.number_of_seasons) return true;
    return false;
  };

  const handleNextEpisode = () => {
    const nextEpisodeNum = selectedEpisode + 1;
    const episodesInCurrentSeason = episodes.length;
    
    if (nextEpisodeNum <= episodesInCurrentSeason) {
      setSelectedEpisode(nextEpisodeNum);
      scrollTo(0, 0);
    } else if (selectedSeason < details.number_of_seasons) {
      setSelectedSeason(prev => prev + 1);
      setSelectedEpisode(1);
      scrollTo(0, 0);
    } else {
      toast.info("You've reached the end of the show!");
    }
  };

  const handlePersonClick = (personId: number) => {
    navigate(`/person/${personId}`);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const nextEvents = ['next_episode', 'video_next', 'vidsrc_next', 'vidsrc_event_next', 'next', 'video_ended', 'ended'];
      const data = event.data;

      if (typeof data === 'string') {
        if (nextEvents.includes(data) || data.includes('next_episode') || data.includes('vidsrc_next')) {
          handleNextEpisode();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (
            nextEvents.includes(parsed.event) || 
            nextEvents.includes(parsed.type) || 
            (parsed.event === 'vidsrc_event' && parsed.data === 'next_episode') ||
            parsed.method === 'nextEpisode'
          ) {
            handleNextEpisode();
          }
        } catch (e) {
          // Ignore parse errors
        }
      } else if (data && typeof data === 'object') {
        if (
          nextEvents.includes(data.event) || 
          nextEvents.includes(data.type) || 
          (data.event === 'vidsrc_event' && data.data === 'next_episode') ||
          data.method === 'nextEpisode'
        ) {
          handleNextEpisode();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedEpisode, selectedSeason, episodes.length, details?.number_of_seasons]);

  if (!details) return (
    <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
      <div className="animate-pulse text-4xl font-black tracking-tighter text-brand">FLIXLAB</div>
    </div>
  );

  const getEmbedUrl = () => {
    const params = settings.autoplay ? 'autoPlay=true&nextButton=false' : 'autoPlay=false&nextButton=false';
    const tmdbParams = settings.autoplay ? '?autoplay=1' : '?autoplay=0';
    
    if (selectedServer === 'vidcore') {
      return type === 'movie'
        ? `https://vidcore.net/movie/${id}?${params}`
        : `https://vidcore.net/tv/${id}/${selectedSeason}/${selectedEpisode}?${params}`;
    } else if (selectedServer === 'peachify') {
      return type === 'movie'
        ? `https://peachify.top/embed/movie/${id}`
        : `https://peachify.top/embed/tv/${id}/${selectedSeason}/${selectedEpisode}`;
    } else if (selectedServer === 'videasy') {
      return type === 'movie'
        ? `https://player.videasy.net/movie/${id}${tmdbParams}`
        : `https://player.videasy.net/tv/${id}/${selectedSeason}/${selectedEpisode}${tmdbParams}`;
    } else if (selectedServer === 'vidsrc') {
      return type === 'movie' 
        ? `https://vidsrc.ru/movie/${id}${tmdbParams}`
        : `https://vidsrc.ru/tv/${id}/${selectedSeason}/${selectedEpisode}${tmdbParams}`;
    } else if (selectedServer === 'vidlink') {
      return type === 'movie'
        ? `https://vidlink.pro/movie/${id}${tmdbParams}`
        : `https://vidlink.pro/tv/${id}/${selectedSeason}/${selectedEpisode}${tmdbParams}`;
    } else if (selectedServer === '111movies') {
      return type === 'movie'
        ? `https://111movies.net/movie/${id}`
        : `https://111movies.net/tv/${id}/${selectedSeason}/${selectedEpisode}`;
    } else if (selectedServer === 'vidfast') {
      return type === 'movie'
        ? `https://vidfast.pro/movie/${id}`
        : `https://vidfast.pro/tv/${id}/${selectedSeason}/${selectedEpisode}`;
    } else {
      return type === 'movie'
        ? `https://vidnest.fun/movie/${id}`
        : `https://vidnest.fun/tv/${id}/${selectedSeason}/${selectedEpisode}`;
    }
  };

  const embedUrl = getEmbedUrl();
  const trailer = details?.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || details?.videos?.results?.find((v: any) => v.site === 'YouTube');

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className={`relative w-full flex flex-col ${isPlaying ? 'pt-20' : ''}`}>
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
          {isPlaying ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={embedUrl}
                className="w-full flex-1"
                allowFullScreen
                allow="autoplay; fullscreen"
                frameBorder="0"
                referrerPolicy="no-referrer"
              />
              <div className="bg-muted/80 backdrop-blur-md p-4 flex items-center justify-center gap-4 border-t border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Server className="w-3 h-3" />
                  Switch Server:
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedServer === 'vidcore' ? 'default' : 'outline'}
                    className={`h-8 px-4 rounded-full text-xs font-bold gap-2 ${selectedServer === 'vidcore' ? 'bg-brand hover:bg-brand/80 text-white' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setSelectedServer('vidcore')}
                  >
                    Primary Server
                    <span className="bg-white/20 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-tighter">Ad-Free</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedServer === 'videasy' ? 'default' : 'outline'}
                    className={`h-8 px-4 rounded-full text-xs font-bold ${selectedServer === 'videasy' ? 'bg-brand hover:bg-brand/80 text-white' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setSelectedServer('videasy')}
                  >
                    Secondary Server
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedServer === 'peachify' ? 'default' : 'outline'}
                    className={`h-8 px-4 rounded-full text-xs font-bold ${selectedServer === 'peachify' ? 'bg-brand hover:bg-brand/80 text-white' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setSelectedServer('peachify')}
                  >
                    Alternative Server
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant={['vidsrc', 'vidlink', '111movies', 'vidfast', 'vidnest'].includes(selectedServer) ? 'default' : 'outline'}
                        className={`h-8 px-4 rounded-full text-xs font-bold gap-2 ${['vidsrc', 'vidlink', '111movies', 'vidfast', 'vidnest'].includes(selectedServer) ? 'bg-foreground text-background hover:bg-foreground/90' : 'border-border text-muted-foreground hover:text-foreground'}`}
                      >
                        Additional Servers
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card border-border text-foreground">
                      <DropdownMenuItem 
                        className={`cursor-pointer focus:bg-brand focus:text-white ${selectedServer === 'vidsrc' ? 'bg-brand text-white' : ''}`}
                        onClick={() => setSelectedServer('vidsrc')}
                      >
                        VidSrc Server
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`cursor-pointer focus:bg-brand focus:text-white ${selectedServer === 'vidlink' ? 'bg-brand text-white' : ''}`}
                        onClick={() => setSelectedServer('vidlink')}
                      >
                        VidLink Server
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`cursor-pointer focus:bg-brand focus:text-white ${selectedServer === '111movies' ? 'bg-brand text-white' : ''}`}
                        onClick={() => setSelectedServer('111movies')}
                      >
                        111Movies Server
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`cursor-pointer focus:bg-brand focus:text-white ${selectedServer === 'vidfast' ? 'bg-brand text-white' : ''}`}
                        onClick={() => setSelectedServer('vidfast')}
                      >
                        VidFast Server
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`cursor-pointer focus:bg-brand focus:text-white ${selectedServer === 'vidnest' ? 'bg-brand text-white' : ''}`}
                        onClick={() => setSelectedServer('vidnest')}
                      >
                        VidNest Server
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="h-4 w-[1px] bg-border mx-2 hidden md:block" />

                {type === 'tv' && hasNextEpisode() && (
                  <>
                    <Button
                      size="sm"
                      className="h-8 px-4 rounded-full text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-2"
                      onClick={handleNextEpisode}
                    >
                      <SkipForward className="w-3 h-3 fill-current" />
                      Next Episode
                    </Button>
                    <div className="h-4 w-[1px] bg-border mx-2 hidden md:block" />
                  </>
                )}
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
                    <Button 
                      size="lg" 
                      className="bg-brand text-white dark:bg-white dark:text-black hover:bg-brand/80 dark:hover:bg-zinc-200 px-8 h-14 text-lg font-bold rounded-md gap-3 shadow-lg transition-all"
                      onClick={handlePlay}
                    >
                      <Play className="w-6 h-6 fill-current" />
                      Play
                    </Button>
                    
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

                    <Button 
                      size="lg"
                      variant="outline"
                      className="bg-muted/30 backdrop-blur-md border-border hover:bg-muted/50 text-foreground px-8 h-14 text-lg font-bold rounded-md gap-3 transition-all"
                      onClick={() => setShowDownloadInfo(true)}
                    >
                      <Download className="w-6 h-6 text-blue-500" />
                      Download
                    </Button>

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
                      onClick={toggleWatchlist}
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
          )}
        </div>

        <div className="max-w-7xl mx-auto w-full px-4 md:px-12 py-12">
          <div className="space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">
                {isPlaying && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-sm font-bold">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span>{details.vote_average.toFixed(1)}</span>
                      </div>
                      <span className="text-muted-foreground transition-colors">
                        {new Date(details.release_date || details.first_air_date).getFullYear()}
                      </span>
                      {details.runtime && (
                        <span className="text-muted-foreground flex items-center gap-1 transition-colors">
                          <Clock className="w-4 h-4" />
                          {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] uppercase tracking-widest text-foreground border border-border transition-colors">
                        {type === 'movie' ? 'Movie' : 'TV Show'}
                      </span>
                      <motion.button
                        initial={{ width: 32 }}
                        animate={{ 
                          width: details && !isInWatchlist ? [32, 220, 220, 32] : 32 
                        }}
                        transition={{ 
                          duration: 3, 
                          times: [0, 0.15, 0.85, 1],
                          delay: 1,
                          ease: "easeInOut"
                        }}
                        className={`h-8 flex items-center justify-center gap-2 rounded-full border transition-all overflow-hidden group ${
                          isInWatchlist 
                            ? 'bg-brand border-brand text-white w-8' 
                            : 'border-border text-muted-foreground hover:text-foreground px-2'
                        }`}
                        onClick={toggleWatchlist}
                      >
                        <div className="flex-none flex items-center justify-center w-4 h-4">
                          {isInWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
                            className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap overflow-hidden"
                          >
                            Add to Watchlist
                          </motion.span>
                        )}
                      </motion.button>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground transition-colors">
                      {details.title || details.name}
                    </h1>
                    <div className="flex flex-wrap gap-2">
                      {details.genres?.map((genre: any) => (
                        <span key={genre.id} className="text-xs text-muted-foreground border border-border px-3 py-1 rounded-full transition-colors">
                          {genre.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-4xl transition-colors">
                      {details.overview}
                    </p>
                  </div>
                )}
                
                {!isPlaying && (
                  <div className="flex flex-wrap gap-2">
                    {details.genres?.map((genre: any) => (
                      <span key={genre.id} className="text-xs text-muted-foreground border border-border px-3 py-1 rounded-full transition-colors">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

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
                        <button
                          key={ep.id}
                          className={`flex gap-4 p-3 rounded-xl transition-all text-left group ${
                            selectedEpisode === ep.episode_number 
                              ? 'bg-brand/10 border border-brand/50' 
                              : 'bg-muted/50 border border-transparent hover:bg-muted transition-colors'
                          }`}
                          onClick={() => {
                            setSelectedEpisode(ep.episode_number);
                            setIsPlaying(true);
                            addToRecentlyWatched();
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
                        </button>
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
      {/* Download Info Modal */}
      <Dialog open={showDownloadInfo} onOpenChange={setShowDownloadInfo}>
        <DialogContent className="bg-card border-border text-foreground max-w-md p-6 transition-colors">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2 transition-colors">
              <Download className="w-6 h-6 text-blue-500" />
              Download Video
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 transition-colors">
            <p className="text-muted-foreground transition-colors">
              To download this video, we recommend using the <span className="text-foreground font-bold transition-colors">CocoCut Video Downloader</span> browser extension.
            </p>
            <div className="bg-muted p-4 rounded-xl space-y-2 border border-border transition-colors">
              <h4 className="font-bold text-sm text-foreground transition-colors">How to use:</h4>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside transition-colors">
                <li>Install the CocoCut extension from their website.</li>
                <li>Play the video on this page.</li>
                <li>Click the CocoCut icon in your browser toolbar.</li>
                <li>Select the video quality and download!</li>
              </ol>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 gap-2 transition-all"
              onClick={() => window.open('https://cococut.net/', '_blank')}
            >
              Get CocoCut Extension
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
