import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Plus, Check, Info, Star } from 'lucide-react';
import { TMDBItem } from '../types';
import { getImageUrl } from '../lib/tmdb';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, deleteDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface MovieCardProps {
  item: TMDBItem;
  onSelect: (item: TMDBItem) => void;
  key?: any;
}

export default function MovieCard({ item, onSelect }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const { user, currentProfile } = useAuth();

  useEffect(() => {
    if (!user || !currentProfile) return;

    const watchlistRef = collection(db, 'users', user.uid, 'profiles', currentProfile.id, 'watchlist');
    const q = query(watchlistRef, where('tmdbId', '==', item.id.toString()));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsInWatchlist(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [user, currentProfile, item.id]);

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !currentProfile) return;

    const watchlistRef = doc(db, 'users', user.uid, 'profiles', currentProfile.id, 'watchlist', item.id.toString());

    try {
      if (isInWatchlist) {
        await deleteDoc(watchlistRef);
        toast.success('Removed from watchlist');
      } else {
        await setDoc(watchlistRef, {
          tmdbId: item.id.toString(),
          type: item.media_type || (item.title ? 'movie' : 'tv'),
          title: item.title || item.name,
          posterPath: item.poster_path,
          addedAt: new Date().toISOString(),
        });
        toast.success('Added to watchlist');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getQuality = () => {
    const releaseDate = item.release_date || item.first_air_date;
    if (!releaseDate) return 'HD';

    const date = new Date(releaseDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (item.media_type === 'tv' || !item.title) {
      return diffDays < 30 ? 'HD' : 'FHD';
    }

    if (diffDays < 45) return null; // Don't show CAM
    if (diffDays < 120) return 'HD';
    return 'FHD';
  };

  const quality = getQuality();

  return (
    <div 
      className="relative flex-none w-[160px] md:w-[240px] aspect-[2/3] cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(item)}
    >
      <img 
        src={getImageUrl(item.poster_path) || undefined} 
        alt={item.title || item.name}
        className="w-full h-full object-cover rounded-md transition-transform duration-300 group-hover:scale-105"
        referrerPolicy="no-referrer"
      />

      {/* Quality Badge */}
      {quality && (
        <div className="absolute top-2 left-2 z-20">
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-lg ${
            quality === 'HD' ? 'bg-blue-500 text-white' : 'bg-green-600 text-white'
          }`}>
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
            className="absolute inset-0 z-10 bg-black/80 rounded-md p-4 flex flex-col justify-end gap-3"
          >
            <h3 className="text-sm md:text-base font-bold line-clamp-2">
              {item.title || item.name}
            </h3>
            
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-3 h-3 fill-current" />
                <span>{item.vote_average.toFixed(1)}</span>
              </div>
              <span className="text-zinc-400 capitalize">
                {item.media_type || (item.title ? 'movie' : 'tv')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                className="w-8 h-8 rounded-full bg-white text-black hover:bg-zinc-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item);
                }}
              >
                <Play className="w-4 h-4 fill-current" />
              </Button>
              <Button 
                size="icon" 
                variant="outline" 
                className="w-8 h-8 rounded-full border-zinc-600 hover:border-white text-white"
                onClick={toggleWatchlist}
              >
                {isInWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </Button>
              <Button 
                size="icon" 
                variant="outline" 
                className="w-8 h-8 rounded-full border-zinc-600 hover:border-white text-white ml-auto"
              >
                <Info className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
