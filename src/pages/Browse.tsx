import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { TMDBItem, Genre } from '../types';
import {
  Search,
  Shuffle,
  ChevronDown,
  Play,
  Star,
  Check,
  X,
  Loader2,
} from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

const STREAMING_PROVIDERS: FilterOption[] = [
  { value: '', label: 'All Providers' },
  { value: '8', label: 'Netflix' },
  { value: '9', label: 'Prime Video' },
  { value: '337', label: 'Disney+' },
  { value: '1899', label: 'Max' },
  { value: '350', label: 'Apple TV+' },
  { value: '15', label: 'Hulu' },
  { value: '531', label: 'Paramount+' },
  { value: '386', label: 'Peacock' },
];

function FilterPillDropdown({
  label,
  options,
  currentValue,
  defaultValue = '',
  alwaysShowDot = false,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  currentValue: string;
  defaultValue?: string;
  alwaysShowDot?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const isFiltered = currentValue !== defaultValue;
  const activeOption = options.find((opt) => opt.value === currentValue);
  const displayLabel = isFiltered || alwaysShowDot ? activeOption?.label || label : label;

  return (
    <div ref={containerRef} className="relative flex-1 lg:flex-initial">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full lg:w-auto h-[38px] px-4 rounded-full border backdrop-blur-md flex items-center justify-between lg:justify-center gap-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
          isFiltered
            ? 'bg-foreground/10 dark:bg-white/15 border-foreground/20 dark:border-white/25 text-foreground dark:text-white'
            : 'bg-muted/70 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 border-border dark:border-white/10 text-foreground/85 dark:text-white/85 hover:text-foreground dark:hover:text-white'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {(isFiltered || alwaysShowDot) && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand dark:bg-white shrink-0" />
          )}
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground dark:text-white/60 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 lg:left-0 mt-2 w-52 max-h-72 overflow-y-auto bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50">
          {options.map((opt) => {
            const selected = opt.value === currentValue;
            return (
              <button
                key={opt.value || 'all'}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors cursor-pointer ${
                  selected
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {selected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Browse() {
  const { type } = useParams<{ type: 'movie' | 'tv' }>();
  const mediaType: 'movie' | 'tv' = type === 'tv' ? 'tv' : 'movie';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>(searchParams.get('genre') || '');
  const [selectedYear, setSelectedYear] = useState<string>(searchParams.get('year') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'popularity.desc');
  const [selectedProvider, setSelectedProvider] = useState<string>(searchParams.get('provider') || '');
  const [searchInput, setSearchInput] = useState<string>(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState<string>(searchParams.get('q') || '');

  const [items, setItems] = useState<TMDBItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);

  // Sync URL filters when navigating between /browse/movie and /browse/tv
  useEffect(() => {
    setSelectedGenre(searchParams.get('genre') || '');
    setSelectedYear(searchParams.get('year') || '');
    setSortBy(searchParams.get('sort') || 'popularity.desc');
    setSelectedProvider(searchParams.get('provider') || '');
    const q = searchParams.get('q') || '';
    setSearchInput(q);
    setDebouncedQuery(q);
  }, [mediaType]);

  // Debounce inline search input (300ms like watched.cx)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update URL params cleanly without cluttering history
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (selectedGenre) params.set('genre', selectedGenre);
    if (selectedYear) params.set('year', selectedYear);
    if (sortBy !== 'popularity.desc') params.set('sort', sortBy);
    if (selectedProvider) params.set('provider', selectedProvider);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, selectedGenre, selectedYear, sortBy, selectedProvider, setSearchParams]);

  // Fetch genre list for Movie or TV
  useEffect(() => {
    let active = true;
    tmdbService
      .getGenres(mediaType)
      .then((list) => {
        if (active) setGenres(list || []);
      })
      .catch((err) => console.error('Failed to fetch genres:', err));
    return () => {
      active = false;
    };
  }, [mediaType]);

  const fetchBatch = useCallback(
    async (pageNum: number, reset: boolean) => {
      const requestId = ++fetchIdRef.current;
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        let finalSort = sortBy;
        if (sortBy === 'newest') {
          finalSort = mediaType === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc';
        } else if (sortBy === 'oldest') {
          finalSort = mediaType === 'movie' ? 'primary_release_date.asc' : 'first_air_date.asc';
        }

        const data = debouncedQuery
          ? await tmdbService.searchTyped(mediaType, debouncedQuery, pageNum)
          : await tmdbService.getDiscover(mediaType, selectedGenre || undefined, finalSort, pageNum, {
              year: selectedYear ? Number(selectedYear) : undefined,
              watchProviderId: selectedProvider || undefined,
            });

        if (requestId !== fetchIdRef.current) return;

        const batch: TMDBItem[] = (data.results || []).map((item: any) => ({
          ...item,
          media_type: mediaType,
        }));

        setItems((prev) => {
          if (reset) return batch;
          const seen = new Set(prev.map((i) => i.id));
          const merged = [...prev];
          for (const item of batch) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              merged.push(item);
            }
          }
          return merged;
        });

        const maxPages = Math.min(data.total_pages || 1, 500);
        setHasMore(pageNum < maxPages && batch.length > 0);
        setPage(pageNum);
      } catch (err) {
        if (requestId === fetchIdRef.current) {
          console.error('Failed to load browse items:', err);
          if (reset) setItems([]);
          setHasMore(false);
        }
      } finally {
        if (requestId === fetchIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [mediaType, debouncedQuery, selectedGenre, selectedYear, sortBy, selectedProvider]
  );

  // Reload page 1 whenever filters or media type change
  useEffect(() => {
    fetchBatch(1, true);
  }, [fetchBatch]);

  // Infinite scroll sentinel matching watched.cx (600px rootMargin)
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMore) {
          fetchBatch(page + 1, false);
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchBatch]);

  const handleRandomPick = async () => {
    if (randomLoading) return;
    setRandomLoading(true);
    try {
      const randomPage = Math.floor(Math.random() * 5) + 1;
      let finalSort = sortBy;
      if (sortBy === 'newest') {
        finalSort = mediaType === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc';
      } else if (sortBy === 'oldest') {
        finalSort = mediaType === 'movie' ? 'primary_release_date.asc' : 'first_air_date.asc';
      }

      const data = await tmdbService.getDiscover(
        mediaType,
        selectedGenre || undefined,
        finalSort,
        randomPage,
        {
          year: selectedYear ? Number(selectedYear) : undefined,
          watchProviderId: selectedProvider || undefined,
        }
      );

      const pool = (data.results && data.results.length > 0 ? data.results : items) as TMDBItem[];
      if (pool.length > 0) {
        const picked = pool[Math.floor(Math.random() * pool.length)];
        navigate(`/watch/${mediaType}/${picked.id}`);
      }
    } catch (err) {
      console.error('Random pick failed:', err);
      if (items.length > 0) {
        const picked = items[Math.floor(Math.random() * items.length)];
        navigate(`/watch/${mediaType}/${picked.id}`);
      }
    } finally {
      setRandomLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedGenre('');
    setSelectedYear('');
    setSortBy('popularity.desc');
    setSelectedProvider('');
    setSearchInput('');
    setDebouncedQuery('');
  };

  const currentYear = new Date().getFullYear();
  const yearOptions: FilterOption[] = [
    { value: '', label: 'All Years' },
    ...Array.from({ length: currentYear - 1947 }, (_, i) => {
      const y = String(currentYear - i);
      return { value: y, label: y };
    }),
  ];

  const genreOptions: FilterOption[] = [
    { value: '', label: 'All Genres' },
    ...genres.map((g) => ({ value: String(g.id), label: g.name })),
  ];

  const sortOptions: FilterOption[] = [
    { value: 'popularity.desc', label: 'Popular' },
    { value: 'vote_average.desc', label: 'Top Rated' },
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
  ];

  const activeGenreName = genres.find((g) => String(g.id) === selectedGenre)?.name;
  const activeProviderName = STREAMING_PROVIDERS.find((p) => p.value === selectedProvider)?.label;

  const buildSubtitle = () => {
    if (debouncedQuery) {
      return `Showing ${mediaType === 'movie' ? 'movies' : 'shows'} matching "${debouncedQuery}"`;
    }
    if (!activeGenreName && !selectedProvider && !selectedYear) {
      return mediaType === 'movie'
        ? 'Discover new movies to watch'
        : 'Discover new shows to watch';
    }
    const parts = ['Discover'];
    if (activeGenreName) parts.push(activeGenreName);
    parts.push(mediaType === 'movie' ? 'movies' : 'shows');
    if (selectedProvider && activeProviderName) parts.push(`on ${activeProviderName}`);
    if (selectedYear) parts.push(`from ${selectedYear}`);
    parts.push('to watch');
    return parts.join(' ');
  };

  return (
    <div className="w-full min-h-screen px-4 pt-20 pb-24 sm:px-8 sm:pt-[88px] md:px-[60px] md:pt-24 lg:px-[100px]">
      {/* Header & Controls (watched.cx MoviesBrowser / ShowsBrowser layout) */}
      <div className="relative pb-8 flex flex-col gap-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-x-8 lg:gap-y-3 lg:pt-10">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground lg:col-start-1 lg:row-start-1">
          {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
        </h1>

        <p className="text-base sm:text-lg font-medium leading-relaxed text-muted-foreground max-w-xl lg:col-start-1 lg:row-start-2">
          {buildSubtitle()}
        </p>

        {/* Inline Pill Search */}
        <div className="relative w-full lg:w-80 lg:col-start-2 lg:row-start-1 lg:justify-self-end">
          <Search
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground dark:text-white/70"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={mediaType === 'movie' ? 'Search movies...' : 'Search shows...'}
            aria-label={mediaType === 'movie' ? 'Search movies' : 'Search shows'}
            className="relative w-full h-[38px] pl-11 pr-9 bg-muted/70 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 border border-border dark:border-white/10 backdrop-blur-md rounded-full text-sm font-normal text-foreground dark:text-white/90 placeholder:text-muted-foreground dark:placeholder:text-white/40 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-white/60"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setDebouncedQuery('');
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:justify-end items-stretch lg:items-center gap-2 lg:gap-3 lg:col-start-2 lg:row-start-2 lg:justify-self-end">
          <div className="flex w-full min-w-0 lg:w-auto items-center gap-2 lg:gap-3">
            {/* Expandable Random Button */}
            <button
              type="button"
              onClick={handleRandomPick}
              disabled={randomLoading}
              aria-label={mediaType === 'movie' ? 'Play random movie' : 'Play random show'}
              className="group/random flex items-center shrink-0 h-[38px] max-w-[38px] hover:max-w-[130px] bg-muted/70 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 border border-border dark:border-white/10 rounded-full overflow-hidden backdrop-blur-md transition-all duration-300 ease-out disabled:opacity-60 disabled:cursor-wait cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-white/60"
            >
              <span className="flex items-center justify-center w-[38px] h-[38px] shrink-0 text-muted-foreground dark:text-white/70 group-hover/random:text-foreground dark:group-hover/random:text-white transition-colors">
                {randomLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Shuffle size={15} />
                )}
              </span>
              <span className="whitespace-nowrap pr-4 text-sm font-medium text-foreground/90 dark:text-white/90">
                Random
              </span>
            </button>

            <FilterPillDropdown
              label="Genres"
              options={genreOptions}
              currentValue={selectedGenre}
              onChange={setSelectedGenre}
            />

            <FilterPillDropdown
              label="Years"
              options={yearOptions}
              currentValue={selectedYear}
              onChange={setSelectedYear}
            />
          </div>

          <div className="flex w-full min-w-0 lg:w-auto items-center gap-2 lg:gap-3">
            <FilterPillDropdown
              label="Sort"
              options={sortOptions}
              currentValue={sortBy}
              defaultValue="popularity.desc"
              alwaysShowDot={true}
              onChange={(val) => setSortBy(val || 'popularity.desc')}
            />

            <FilterPillDropdown
              label="Providers"
              options={STREAMING_PROVIDERS}
              currentValue={selectedProvider}
              onChange={setSelectedProvider}
            />
          </div>
        </div>
      </div>

      {/* Poster Grid (watched.cx 3 -> 5 -> 6 -> 7 column density & hover sheen/play/meta overlay) */}
      <div className="mt-4">
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-8">
            {Array.from({ length: 21 }).map((_, idx) => (
              <div
                key={`sk-${idx}`}
                className="aspect-[2/3] rounded-xl bg-muted dark:bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground space-y-4">
            <p className="text-base">
              {debouncedQuery
                ? `No ${mediaType === 'movie' ? 'movies' : 'shows'} match "${debouncedQuery}".`
                : `No ${mediaType === 'movie' ? 'movies' : 'shows'} match these filters.`}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-foreground/80 hover:text-foreground underline underline-offset-4 min-h-[44px] inline-flex items-center justify-center px-4 cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-8">
              {items.map((item) => {
                const title = item.title || item.name || 'Untitled';
                const poster = getImageUrl(item.poster_path || item.backdrop_path, 'w500');
                const releaseYear = (item.release_date || item.first_air_date)?.slice(0, 4) || '';
                const rating =
                  item.vote_average && item.vote_average > 0
                    ? item.vote_average.toFixed(1)
                    : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/watch/${mediaType}/${item.id}`)}
                    aria-label={`${title}${releaseYear ? ` (${releaseYear})` : ''}`}
                    className="group/card relative block w-full text-left cursor-pointer rounded-xl transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    <div className="relative isolate aspect-[2/3] overflow-hidden rounded-xl bg-white/5 transition-shadow duration-200 group-hover/card:shadow-[0_12px_28px_rgba(0,0,0,0.5)]">
                      {poster ? (
                        <img
                          src={poster}
                          alt={title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-white/40">
                          {title}
                        </div>
                      )}

                      {/* Dark Hover Sheen */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 z-[1] bg-gradient-to-t from-black/65 via-black/30 to-black/35 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none"
                      />

                      {/* Centered Play Circle + Frosted Year/Rating Pill */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 z-[2] hidden lg:flex flex-col items-center justify-center gap-3 p-4 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
                      >
                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/55 text-white shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition-transform duration-150 group-hover/card:scale-105 group-hover/card:bg-white/25">
                          <Play size={18} fill="currentColor" strokeWidth={0} className="ml-0.5" />
                        </span>

                        {(releaseYear || rating) && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/60 backdrop-blur-md border border-white/15 text-xs font-semibold text-white tabular-nums">
                            {releaseYear && <span>{releaseYear}</span>}
                            {releaseYear && rating && (
                              <span className="w-[3px] h-[3px] rounded-full bg-white/50" />
                            )}
                            {rating && (
                              <span className="inline-flex items-center gap-1">
                                <Star size={12} fill="currentColor" className="text-[#f5c518]" />
                                {rating}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {loadingMore &&
                Array.from({ length: 14 }).map((_, idx) => (
                  <div
                    key={`more-sk-${idx}`}
                    className="aspect-[2/3] rounded-xl bg-muted dark:bg-white/5 animate-pulse"
                  />
                ))}
            </div>

            <div ref={loadMoreRef} className="h-10" aria-hidden="true" />
          </>
        )}
      </div>
    </div>
  );
}
