import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TMDBItem, WatchlistItem } from '../types';
import MovieCard from '../components/MovieCard';
import { Bookmark, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';

export default function Watchlist() {
  const { watchlist, isWatchlistLoading: loading } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const sortedItems = [...watchlist].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );

  const handleSelect = (item: WatchlistItem) => {
    navigate(`/watch/${item.type}/${item.tmdbId}`);
  };

  const gridClasses = {
    small: 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10',
    medium: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8',
    large: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
  };

  return (
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-20">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">My Watchlist</h1>
        <p className="text-muted-foreground mt-2">Movies and TV shows you've saved to watch later</p>
      </div>

      {loading ? (
        <div className={`grid ${gridClasses[settings.cardSize]} gap-4 md:gap-6`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      ) : sortedItems.length > 0 ? (
        <div className={`grid ${gridClasses[settings.cardSize]} gap-4 md:gap-6`}>
          {sortedItems.map((item) => (
            <MovieCard 
              key={item.id} 
              className="w-full h-full"
              item={{
                id: Number(item.tmdbId),
                title: item.type === 'movie' ? item.title : undefined,
                name: item.type === 'tv' ? item.title : undefined,
                overview: '',
                poster_path: item.posterPath,
                backdrop_path: '',
                vote_average: 0,
                media_type: item.type,
                genre_ids: [],
              }} 
              onSelect={() => handleSelect(item)} 
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Bookmark className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Your watchlist is empty</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Add movies and TV shows to your watchlist to keep track of what you want to watch.
          </p>
          <Link to="/">
            <Button className="bg-brand hover:bg-brand/80 px-8 h-12 font-bold">
              Browse Content
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
