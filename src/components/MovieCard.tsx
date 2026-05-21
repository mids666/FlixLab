import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Plus, Check, Info, Star, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TMDBItem } from '../types';
import { getImageUrl } from '../lib/tmdb';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, deleteDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { useSettings } from '../hooks/useSettings';

interface MovieCardProps {
  item: TMDBItem;
  onSelect?: (item: TMDBItem) => void;
  onRemove?: (item: TMDBItem) => void;
  className?: string;
  key?: React.Key;
}

export default function MovieCard({ item, onSelect, onRemove, className }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { user, currentProfile, setShowAuthModal, watchlist, toggleWatchlist } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const isInWatchlist = watchlist.some(w => w.tmdbId === item.id.toString());

  const sizeClasses = {
    small: 'w-[100px] md:w-[150px]',
    medium: 'w-[140px] md:w-[200px]',
    large: 'w-[180px] md:w-[260px]'
  };

  const handleSelect = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (item.media_type === 'person') {
      navigate(`/person/${item.id}`);
    } else {
      const type = item.media_type || (item.title ? 'movie' : 'tv');
      navigate(`/watch/${type}/${item.id}`);
    }
    if (onSelect) onSelect(item);
  };

  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleWatchlist(item);
  };

  const getQuality = () => {
    const releaseDate = item.release_date || item.first_air_date;
    if (!releaseDate) return 'FHD';

    const date = new Date(releaseDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (item.media_type === 'tv' || !item.title) {
      return 'FHD';
    }

    if (diffDays < 45) return null; // Don't show CAM
    return 'FHD';
  };

  const quality = getQuality();

  return (
    <div 
      className={`relative flex-none aspect-[2/3] cursor-pointer group transition-all duration-300 ${sizeClasses[settings.cardSize]} ${className || ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => handleSelect()}
    >
      <img 
        src={getImageUrl(item.poster_path || item.profile_path) || undefined} 
        alt={item.title || item.name}
        className="w-full h-full object-cover rounded-md transition-transform duration-300 group-hover:scale-105"
        referrerPolicy="no-referrer"
      />

      {/* Quality Badge */}
      {quality && (
        <div className="absolute top-2 left-2 z-20">
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-lg bg-green-600 text-white">
            {quality}
          </span>
        </div>
      )}
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-10 bg-black/70 rounded-md p-4 flex flex-col justify-end gap-3 backdrop-blur-sm"
          >
            <h3 className="text-sm md:text-base font-bold line-clamp-2 text-white">
              {item.title || item.name}
            </h3>
            
            <div className="flex items-center gap-2 text-[10px] md:text-xs">
              {item.vote_average !== undefined && item.vote_average > 0 && (
                <div className="flex items-center gap-1 text-yellow-500">
                  <span className="text-[8px] border border-yellow-500 px-1 rounded font-black tracking-tighter leading-none">IMDb</span>
                  <span className="font-bold">{item.vote_average.toFixed(1)}</span>
                </div>
              )}
              <span className="text-white/70 capitalize">
                {item.media_type || (item.title ? 'movie' : 'tv')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                className="w-8 h-8 rounded-full bg-brand text-white hover:bg-brand/80 border-none"
                onClick={handleSelect}
              >
                <Play className="w-4 h-4 fill-current" />
              </Button>
              <Button 
                size="icon" 
                className="w-8 h-8 rounded-full border border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white"
                onClick={handleToggleWatchlist}
              >
                {isInWatchlist ? <Check className="w-4 h-4 text-brand" /> : <Plus className="w-4 h-4 text-white" />}
              </Button>
              {onRemove ? (
                <Button 
                  size="icon" 
                  className="w-8 h-8 rounded-full border border-white/20 hover:border-brand hover:text-brand text-white bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item);
                  }}
                >
                   <Trash2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  size="icon" 
                  className="w-8 h-8 rounded-full border border-white/20 hover:border-white hover:text-white text-white ml-auto bg-transparent"
                >
                  <Info className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
