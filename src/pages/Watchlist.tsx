import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TMDBItem, WatchlistItem } from '../types';
import MovieCard from '../components/MovieCard';
import { Bookmark, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

export default function Watchlist() {
  const { user, currentProfile } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !currentProfile) return;

    const watchlistRef = collection(db, 'users', user.uid, 'profiles', currentProfile.id, 'watchlist');
    const q = query(watchlistRef, orderBy('addedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const watchlistData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WatchlistItem[];
      setItems(watchlistData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentProfile]);

  const handleSelect = (item: WatchlistItem) => {
    navigate(`/watch/${item.type}/${item.tmdbId}`);
  };

  return (
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-20">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">My Watchlist</h1>
        <p className="text-zinc-500 mt-2">Movies and TV shows you've saved to watch later</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-md animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-6">
          {items.map((item) => (
            <MovieCard 
              key={item.id} 
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
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
            <Bookmark className="w-10 h-10 text-zinc-700" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Your watchlist is empty</h2>
          <p className="text-zinc-500 mb-8 max-w-md">
            Add movies and TV shows to your watchlist to keep track of what you want to watch.
          </p>
          <Link to="/">
            <Button className="bg-red-600 hover:bg-red-700 px-8 h-12 font-bold">
              Browse Content
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
