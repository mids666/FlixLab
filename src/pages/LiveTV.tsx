import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  Tv, 
  Search, 
  Play, 
  Info, 
  ChevronRight, 
  LayoutGrid, 
  List as ListIcon,
  Globe,
  Radio,
  Zap,
  Star,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TVChannel } from '../types';
import LivePlayer from '../components/LivePlayer';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'News', 'Entertainment', 'Movies', 'Sports', 'Music', 'Kids', 'Documentary', 'Lifestyle'];

const PLAYLIST_URLS = [
  'https://iptv-org.github.io/iptv/categories/news.m3u',
  'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
  'https://iptv-org.github.io/iptv/categories/music.m3u',
  'https://iptv-org.github.io/iptv/categories/movies.m3u',
  'https://iptv-org.github.io/iptv/categories/sports.m3u'
];

export default function LiveTV() {
  const [channels, setChannels] = useState<TVChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<TVChannel | null>(null);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const parseM3U = useCallback((data: string, category: string): TVChannel[] => {
    const lines = data.split('\n');
    const parsedChannels: TVChannel[] = [];
    let currentChannel: Partial<TVChannel> = {};

    for (const line of lines) {
      if (line.startsWith('#EXTINF:')) {
        // Parse Title - usually after the last comma
        const commaIndex = line.lastIndexOf(',');
        const name = line.substring(commaIndex + 1).trim();
        
        // Parse Logo - tvg-logo="..."
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const logo = logoMatch ? logoMatch[1] : undefined;

        // Parse ID - tvg-id="..."
        const idMatch = line.match(/tvg-id="([^"]+)"/);
        const id = idMatch ? idMatch[1] : Math.random().toString(36).substr(2, 9);

        currentChannel = { id, name, logo, category };
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
            const category = url.split('/').pop()?.replace('.m3u', '') || 'Other';
            const capitailzedCategory = category.charAt(0).toUpperCase() + category.slice(1);
            const response = await axios.get(url);
            return parseM3U(response.data, capitailzedCategory);
          } catch (e) {
            console.error(`Failed to fetch ${url}`, e);
            return [];
          }
        })
      );

      const flatChannels = allResults.flat();
      
      // Remove duplicates by URL or Name
      const uniqueChannels = Array.from(new Map(flatChannels.map(item => [item.url, item])).values());
      
      setChannels(uniqueChannels);
      if (uniqueChannels.length > 0 && !selectedChannel) {
        setSelectedChannel(uniqueChannels[0]);
      }
    } catch (error) {
      toast.error('Failed to load Live TV channels');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [parseM3U, selectedChannel]);

  useEffect(() => {
    fetchAllChannels();
  }, []);

  const filteredChannels = channels.filter(channel => {
    const matchesFilter = filter === 'All' || channel.category.toLowerCase() === filter.toLowerCase();
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleChannelSelect = (channel: TVChannel) => {
    setSelectedChannel(channel);
    toast.info(`Switching to: ${channel.name}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && channels.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center flex-col gap-6">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        <div className="text-xl font-black tracking-tighter text-white uppercase italic">Loading Live Streams...</div>
        <p className="text-zinc-500 text-sm animate-pulse">Connecting to global broadcast network</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-4 lg:px-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-600 rounded-lg">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Live TV</h1>
          </div>
          <p className="text-zinc-500 font-medium">{channels.length} channels available globally.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="icon" 
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
            onClick={fetchAllChannels}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Search channels..."
              className="bg-zinc-900 border-zinc-800 pl-10 h-10 w-full focus:ring-red-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Main Player Area */}
        <div className="lg:col-span-3 space-y-8">
          <AnimatePresence mode="wait">
            {selectedChannel ? (
              <motion.div
                key={selectedChannel.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <LivePlayer url={selectedChannel.url} />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white rounded-xl p-3 flex items-center justify-center overflow-hidden border-2 border-zinc-700 shadow-inner">
                      {selectedChannel.logo ? (
                        <img 
                          src={selectedChannel.logo} 
                          alt={selectedChannel.name} 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%2318181b%22/><text y=%2250%%22 x=%2250%%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%233f3f46%22>TV</text></svg>';
                          }}
                        />
                      ) : (
                        <Radio className="w-10 h-10 text-zinc-900" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-black tracking-tight line-clamp-1">{selectedChannel.name}</h2>
                        <Badge variant="secondary" className="bg-red-600/10 text-red-500 border-red-600/20 uppercase text-[10px] tracking-widest font-black shrink-0">
                          Live Now
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm font-bold text-zinc-500">
                        <span className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Global
                        </span>
                        <span className="w-1.5 h-1.5 bg-zinc-800 rounded-full" />
                        <span className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          HLS
                        </span>
                        <span className="w-1.5 h-1.5 bg-zinc-800 rounded-full" />
                        <span className="text-zinc-300 uppercase tracking-widest text-[10px]">{selectedChannel.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800 gap-2">
                      <Star className="w-4 h-4" />
                      Favorite
                    </Button>
                    <Button className="bg-white text-black hover:bg-zinc-200 gap-2 font-bold">
                      <Info className="w-4 h-4" />
                      Info
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 border-dashed">
                <div className="text-center space-y-4">
                  <Tv className="w-16 h-16 text-zinc-800 mx-auto" />
                  <p className="text-zinc-500 font-bold">Select a channel to start watching</p>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* More Channels / Categories Grid */}
          <div className="space-y-6 pt-8 border-t border-zinc-900">
            <h3 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
              Browse Categories
              <span className="w-12 h-1 bg-red-600 rounded-full" />
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {CATEGORIES.filter(c => c !== 'All').map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setFilter(cat);
                    const listElement = document.getElementById('channel-list');
                    if (listElement) listElement.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`p-6 rounded-2xl border transition-all duration-300 text-center space-y-3 group ${
                    filter === cat ? 'bg-red-600/10 border-red-600' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center transition-colors ${
                     filter === cat ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 group-hover:text-white'
                  }`}>
                    <Tv className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest">{cat}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Channel List */}
        <div className="space-y-8" id="channel-list">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl sticky top-24 h-[calc(100vh-120px)] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Channel Guide</h3>
              <Badge className="bg-zinc-800 text-zinc-400 border-none font-bold">{filteredChannels.length}</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {['All', ...CATEGORIES.filter(c => c !== 'All').slice(0, 4)].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === cat ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-1">
                {filteredChannels.length > 0 ? (
                  filteredChannels.map(channel => (
                    <button
                      key={channel.url}
                      onClick={() => handleChannelSelect(channel)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all border group ${
                        selectedChannel?.url === channel.url 
                          ? 'bg-red-600/10 border-red-600/40' 
                          : 'bg-transparent border-transparent hover:bg-zinc-800/40 hover:border-zinc-800'
                      }`}
                    >
                      <div className="w-8 h-8 aspect-square bg-white rounded-lg p-1 flex items-center justify-center flex-none border border-zinc-800 shadow-sm overflow-hidden">
                        {channel.logo ? (
                          <img 
                            src={channel.logo} 
                            alt={channel.name} 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%2318181b%22/><text y=%2250%%22 x=%2250%%22 font-size=%2260%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%233f3f46%22>?</text></svg>';
                            }}
                          />
                        ) : (
                          <Tv className="w-4 h-4 text-zinc-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`text-[11px] font-bold line-clamp-1 group-hover:text-red-500 transition-colors ${
                          selectedChannel?.url === channel.url ? 'text-red-500' : 'text-zinc-300'
                        }`}>
                          {channel.name}
                        </div>
                        <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1.5">
                          <span className={`w-1 h-1 rounded-full ${selectedChannel?.url === channel.url ? 'bg-red-600 animate-pulse' : 'bg-zinc-700'}`} />
                          {channel.category}
                        </div>
                      </div>
                      <ChevronRight className={`w-3 h-3 transition-all ${
                        selectedChannel?.url === channel.url ? 'text-red-500 translate-x-0' : 'text-zinc-800 opacity-0 -translate-x-2'
                      }`} />
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center text-zinc-600 text-sm">
                    {loading ? 'Fetching channels...' : 'No results found.'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

