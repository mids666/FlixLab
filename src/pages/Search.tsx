import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tmdbService } from '../lib/tmdb';
import { TMDBItem } from '../types';
import MovieCard from '../components/MovieCard';
import MoviePlayer from '../components/MoviePlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon } from 'lucide-react';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return;
      setLoading(true);
      const data = await tmdbService.search(query, page);
      // Filter out items without posters or backdrops
      setResults(data.results.filter((item: any) => item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv')));
      setTotalPages(Math.min(data.total_pages, 500));
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    fetchResults();
  }, [query, page]);

  const handleSelect = (item: TMDBItem) => {
    setSelectedItem(item);
    setIsPlayerOpen(true);
  };

  return (
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-20">
      <div className="mb-12">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-400">
          Search results for: <span className="text-white">"{query}"</span>
        </h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] bg-zinc-900 rounded-md" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {results.map((item) => (
              <MovieCard key={item.id} item={item} onSelect={handleSelect} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
              >
                Prev
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${
                        page === pageNum 
                          ? 'bg-red-600 text-white' 
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
              >
                Next
              </button>
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="mt-4 text-center text-zinc-500 text-sm font-medium">
              Page {page} of {totalPages}
            </div>
          )}
        </>
      ) : query ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
            <SearchIcon className="w-10 h-10 text-zinc-700" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No results found</h2>
          <p className="text-zinc-500">Try searching for something else</p>
        </div>
      ) : null}

      <MoviePlayer 
        item={selectedItem} 
        isOpen={isPlayerOpen} 
        onClose={() => setIsPlayerOpen(false)} 
      />
    </div>
  );
}
