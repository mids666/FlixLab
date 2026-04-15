import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RecentlyWatchedItem, TMDBItem } from '../types';
import MovieCard from '../components/MovieCard';
import { History, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function RecentlyWatched() {
  const { user, currentProfile } = useAuth();
  const [items, setItems] = useState<RecentlyWatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !currentProfile) return;

    const recentlyWatchedRef = collection(db, 'users', user.uid, 'profiles', currentProfile.id, 'recentlyWatched');
    const q = query(recentlyWatchedRef, orderBy('watchedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recentlyWatchedData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RecentlyWatchedItem[];
      setItems(recentlyWatchedData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentProfile]);

  const handleRemove = async (item: TMDBItem) => {
    if (!user || !currentProfile) return;

    try {
      // Find the document ID in the items array that matches this tmdbId
      const watchedItem = items.find(i => i.tmdbId === item.id.toString());
      if (!watchedItem) return;

      const docRef = doc(db, 'users', user.uid, 'profiles', currentProfile.id, 'recentlyWatched', watchedItem.id);
      await deleteDoc(docRef);
      toast.success('Removed from history');
    } catch (error: any) {
      toast.error('Failed to remove from history');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-20">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">Recently Watched</h1>
        <p className="text-zinc-500 mt-2">Pick up where you left off</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-md animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
                vote_average: item.voteAverage || 0,
                media_type: item.type,
                genre_ids: [],
              }} 
              onSelect={() => navigate(`/watch/${item.type}/${item.tmdbId}`)} 
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
            <History className="w-10 h-10 text-zinc-700" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No history yet</h2>
          <p className="text-zinc-500 mb-8 max-w-md">
            Movies and TV shows you watch will appear here so you can easily find them again.
          </p>
          <Link to="/">
            <Button className="bg-red-600 hover:bg-red-700 px-8 h-12 font-bold">
              Start Watching
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
