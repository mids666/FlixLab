import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  Tv, 
  Search, 
  Play, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeft,
  Globe,
  Star,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TVChannel } from '../types';
import LivePlayer from '../components/LivePlayer';
import { toast } from 'sonner';

const CATEGORIES = ['News', 'Entertainment', 'Movies', 'Sports', 'Music', 'Kids', 'Lifestyle'];

const PLAYLIST_URLS = [
  'https://iptv-org.github.io/iptv/categories/news.m3u',
  'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
  'https://iptv-org.github.io/iptv/categories/music.m3u',
  'https://iptv-org.github.io/iptv/categories/movies.m3u',
  'https://iptv-org.github.io/iptv/categories/sports.m3u',
  'https://iptv-org.github.io/iptv/languages/eng.m3u'
];

function ChannelCard({ channel, isSelected, onClick }: { channel: TVChannel, isSelected: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-none w-48 md:w-64 group relative rounded-xl overflow-hidden border transition-all duration-300 ${
        isSelected ? 'border-red-600 ring-2 ring-red-600/20' : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="aspect-video relative overflow-hidden bg-zinc-900 flex items-center justify-center p-4">
        {channel.logo ? (
          <img 
            src={channel.logo} 
            alt={channel.name} 
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%2318181b%22/><text y=%2250%%22 x=%2250%%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%233f3f46%22>TV</text></svg>';
            }}
          />
        ) : (
          <Tv className="w-12 h-12 text-zinc-800" />
        )}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors" />
        <div className="absolute top-2 left-2">
          <Badge className="bg-red-600 py-0.5 px-2 text-[8px] font-black uppercase tracking-widest border-none">Live</Badge>
        </div>
      </div>
      <div className="p-3 bg-zinc-900 border-t border-zinc-800 text-left">
        <div className="text-xs font-bold truncate text-zinc-200 group-hover:text-white transition-colors">{channel.name}</div>
        <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mt-1 flex items-center gap-1">
          <Globe className="w-2.5 h-2.5" />
          {channel.category}
        </div>
      </div>
    </button>
  );
}

interface ChannelRowProps {
  title: string;
  channels: TVChannel[];
  selectedId?: string;
  onChannelSelect: (c: TVChannel) => void;
}

const ChannelRow: React.FC<ChannelRowProps> = ({ title, channels, selectedId, onChannelSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = window.innerWidth * 0.6;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (channels.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between group/row">
        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
          {title}
          <span className="w-8 h-[1px] bg-red-600/30" />
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800" onClick={() => scroll('left')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800" onClick={() => scroll('right')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {channels.map(channel => (
          <div key={channel.url} className="snap-start pt-1 pl-1">
            <ChannelCard 
              channel={channel} 
              isSelected={selectedId === channel.url} 
              onClick={() => onChannelSelect(channel)} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default function LiveTV() {
  const [channels, setChannels] = useState<TVChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<TVChannel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEnglishOnly, setShowEnglishOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('tv-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('tv-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (url: string) => {
    setFavorites(prev => 
      prev.includes(url) ? prev.filter(f => f !== url) : [...prev, url]
    );
    const isNowFavorite = !favorites.includes(url);
    toast.success(isNowFavorite ? 'Added to Favorites' : 'Removed from Favorites');
  };

  const parseM3U = useCallback((data: string, category: string): TVChannel[] => {
    const lines = data.split('\n');
    const parsedChannels: TVChannel[] = [];
    let currentChannel: Partial<TVChannel> = {};

    for (const line of lines) {
      if (line.startsWith('#EXTINF:')) {
        const commaIndex = line.lastIndexOf(',');
        const name = line.substring(commaIndex + 1).trim();
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const logo = logoMatch ? logoMatch[1] : undefined;
        const idMatch = line.match(/tvg-id="([^"]+)"/);
        const id = idMatch ? idMatch[1] : Math.random().toString(36).substr(2, 9);
        const langMatch = line.match(/tvg-language="([^"]+)"/);
        const language = langMatch ? langMatch[1] : (category === 'Global' ? 'eng' : undefined);

        if (name.toLowerCase().includes('geo-blocked') || name.toLowerCase().includes('offline')) {
          continue;
        }

        currentChannel = { id, name, logo, category, language };
      } else if (line.startsWith('http')) {
        currentChannel.url = line.trim();
        if (currentChannel.name && currentChannel.url) {
          parsedChannels.push(currentChannel as TVChannel);
        }
        currentChannel = {};
      }
    }
    return parsedChannels;
  }, []);

  const fetchAllChannels = useCallback(async () => {
    setLoading(true);
    try {
      const allResults = await Promise.all(
        PLAYLIST_URLS.map(async (url) => {
          try {
            const fileName = url.split('/').pop() || '';
            const categoryBase = fileName.replace('.m3u', '');
            const category = categoryBase === 'eng' ? 'Global' : categoryBase.charAt(0).toUpperCase() + categoryBase.slice(1);
            const response = await axios.get(url);
            return parseM3U(response.data, category);
          } catch (e) {
            return [];
          }
        })
      );

      const flatChannels = allResults.flat();
      const uniqueChannels = Array.from(new Map(flatChannels.map(item => [item.url, item])).values());
      
      setChannels(uniqueChannels);
      
      // Set initial selected channel if none selected
      if (uniqueChannels.length > 0 && !selectedChannel) {
        setSelectedChannel(uniqueChannels[0]);
      }
    } catch (error) {
      toast.error('Failed to load Live TV channels');
    } finally {
      setLoading(false);
    }
  }, [parseM3U]);

  useEffect(() => {
    fetchAllChannels();
  }, []);

  const handleChannelSelect = (channel: TVChannel) => {
    setSelectedChannel(channel);
    toast.info(`Now playing: ${channel.name}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getChannelsByCategory = (category: string) => {
    let filtered = channels.filter(c => c.category.toLowerCase() === category.toLowerCase());
    
    if (showEnglishOnly) {
      filtered = filtered.filter(c => 
        c.language?.toLowerCase().includes('eng') || 
        c.name.toLowerCase().includes('(english)') ||
        c.name.toLowerCase().includes(' en') ||
        c.category === 'Global'
      );
    }

    return filtered.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const searchResults = searchQuery ? channels.filter(c => {
    const matchesQuery = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (showEnglishOnly) {
      return matchesQuery && (
        c.language?.toLowerCase().includes('eng') || 
        c.name.toLowerCase().includes('(english)') ||
        c.name.toLowerCase().includes(' en') ||
        c.category === 'Global'
      );
    }
    return matchesQuery;
  }) : [];

  if (loading && channels.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center flex-col gap-6">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        <div className="text-xl font-black tracking-tighter text-white uppercase italic">Initializing Guide...</div>
        <p className="text-zinc-500 text-sm animate-pulse text-center">Filtering dozens of global streams for you</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-20 px-4 lg:px-12">
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.3)]">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Live TV</h1>
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold mt-1">
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Auto-Updating Guide</span>
                <span>•</span>
                <span>{channels.length} Global Channels</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <AnimatePresence>
              {searchQuery && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Button 
                    variant="ghost" 
                    className="gap-2 text-zinc-400 hover:text-white h-12 px-4 rounded-xl border border-zinc-800 bg-zinc-900/50"
                    onClick={() => setSearchQuery('')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl h-12 px-3">
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${!showEnglishOnly ? 'text-white' : 'text-zinc-600'}`}>Global</span>
              <button 
                onClick={() => setShowEnglishOnly(!showEnglishOnly)}
                className={`w-10 h-5 rounded-full relative transition-colors duration-300 focus:outline-none ${showEnglishOnly ? 'bg-red-600' : 'bg-zinc-800'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${showEnglishOnly ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${showEnglishOnly ? 'text-white' : 'text-zinc-600'}`}>English</span>
            </div>

            <div className="relative flex-1 md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <Input 
                placeholder="Search TV Channels..."
                className="bg-zinc-900 border-zinc-800 pl-11 h-12 w-full focus:ring-red-600 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-12 w-12 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 rounded-xl"
              onClick={fetchAllChannels}
              disabled={loading}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-12 flex items-center gap-4">
          <div className="p-2 bg-yellow-500/10 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">
            Streams are provided by public community lists. Some content may be <span className="text-white font-bold underline">Geo-Blocked</span> based on your current location. We filter most broken links automatically.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {selectedChannel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 mb-20"
            >
              <LivePlayer url={selectedChannel.url} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800/50">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white rounded-2xl p-4 flex items-center justify-center border-2 border-zinc-800">
                    {selectedChannel.logo ? (
                      <img 
                        src={selectedChannel.logo} 
                        alt={selectedChannel.name} 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Tv className="w-10 h-10 text-zinc-900" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-4xl font-black tracking-tight line-clamp-1">{selectedChannel.name}</h2>
                      <Badge className="bg-red-600 animate-pulse uppercase text-[10px] font-black tracking-widest border-none shrink-0">Live</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-500 text-sm font-bold">
                      <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> Global</span>
                      <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                      <span className="flex items-center gap-1.5 uppercase tracking-widest text-[10px] text-zinc-400">{selectedChannel.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-start md:justify-end gap-3">
                  <Button 
                    variant="outline" 
                    className={`gap-2 h-12 rounded-xl transition-all ${
                      favorites.includes(selectedChannel.url) 
                        ? 'border-red-600 bg-red-600/10 text-red-500' 
                        : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
                    }`}
                    onClick={() => toggleFavorite(selectedChannel.url)}
                  >
                    <Star className={`w-4 h-4 ${favorites.includes(selectedChannel.url) ? 'fill-current' : ''}`} />
                    {favorites.includes(selectedChannel.url) ? 'Favorited' : 'Favorite'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-16">
          {searchQuery ? (
            <ChannelRow 
               title={`Search Results (${searchResults.length})`}
               channels={searchResults} 
               selectedId={selectedChannel?.url}
               onChannelSelect={handleChannelSelect}
            />
          ) : (
            <>
              {favorites.length > 0 && (
                <ChannelRow 
                  title="Your Favorites" 
                  channels={channels.filter(c => favorites.includes(c.url))} 
                  selectedId={selectedChannel?.url}
                  onChannelSelect={handleChannelSelect}
                />
              )}

              <ChannelRow 
                title="Global English Streams" 
                channels={getChannelsByCategory('Global')} 
                selectedId={selectedChannel?.url}
                onChannelSelect={handleChannelSelect}
              />

              {CATEGORIES.map(category => (
                <ChannelRow 
                  key={category}
                  title={`${category} Channels`}
                  channels={getChannelsByCategory(category)}
                  selectedId={selectedChannel?.url}
                  onChannelSelect={handleChannelSelect}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
