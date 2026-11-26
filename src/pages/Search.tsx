import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tmdbService } from '../lib/tmdb';
import { TMDBItem } from '../types';
import MovieCard from '../components/MovieCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';

export default function Search() {
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const query = searchParams.get('q') || '';
  const providerId = searchParams.get('providerId') || '';
  const pageParam = searchParams.get('page');
  const [results, setResults] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(pageParam ? parseInt(pageParam) : 1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const currentPage = pageParam ? parseInt(pageParam) : 1;
    if (currentPage !== page) {
      setPage(currentPage);
    }
  }, [pageParam]);

  useEffect(() => {
    // Only reset page if query or providerId actually changed, not when navigating back
    const isInitialMount = !results.length && !loading;
    if (!isInitialMount && !pageParam) {
       setPage(1);
    }
  }, [query, providerId]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query && !providerId) return;
      setLoading(true);
      
      let data;
      if (providerId) {
        data = await tmdbService.getByProvider(providerId, page);
      } else {
        data = await tmdbService.smartSearch(query, page);
      }

      // Filter out items without posters or backdrops or profile path (for people)
      setResults(data.results.filter((item: any) => (item.poster_path || item.profile_path || item.backdrop_path) && (item.media_type === 'movie' || item.media_type === 'tv' || item.media_type === 'person' || (!item.media_type && (item.title || item.name)))));
      setTotalPages(Math.min(data.total_pages, 500));
      setLoading(false);
      
      // Update URL with page if not present or different
      const currentSearchParams = new URLSearchParams(window.location.hash.split('?')[1]);
      if (page > 1 || currentSearchParams.get('page')) {
        currentSearchParams.set('page', page.toString());
        navigate(`/search?${currentSearchParams.toString()}`, { replace: true });
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    fetchResults();
  }, [query, providerId, page]);

  const handleSelect = (item: TMDBItem) => {
    if (item.media_type === 'person') {
      navigate(`/person/${item.id}`);
    } else {
      const type = item.media_type || (item.title ? 'movie' : 'tv');
      navigate(`/watch/${type}/${item.id}`);
    }
  };

  const setPageAndNavigate = (newPage: number) => {
    setPage(newPage);
    const currentSearchParams = new URLSearchParams(window.location.hash.split('?')[1]);
    currentSearchParams.set('page', newPage.toString());
    navigate(`/search?${currentSearchParams.toString()}`);
  };

  const gridClasses = {
    small: 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10',
    medium: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8',
    large: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
  };

  return (
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-20">
      <div className="mb-12">
        <h1 className="text-2xl md:text-3xl font-bold text-muted-foreground">
          Search results for: <span className="text-foreground">"{query}"</span>
        </h1>
      </div>

      {loading ? (
        <div className={`grid ${gridClasses[settings.cardSize]} gap-4 md:gap-6`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] bg-muted rounded-md" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <div className={`grid ${gridClasses[settings.cardSize]} gap-4 md:gap-6`}>
            {results.map((item, index) => (
              <MovieCard key={`${item.id}-${index}`} item={item} onSelect={handleSelect} className="w-full h-full" />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setPageAndNavigate(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
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
                      onClick={() => setPageAndNavigate(pageNum)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${
                        page === pageNum 
                          ? 'bg-brand text-white' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPageAndNavigate(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
              >
                Next
              </button>
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="mt-4 text-center text-muted-foreground text-sm font-medium">
              Page {page} of {totalPages}
            </div>
          )}
        </>
      ) : query ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <SearchIcon className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No results found</h2>
          <p className="text-muted-foreground">Try searching for something else</p>
        </div>
      ) : null}
    </div>
  );
}
