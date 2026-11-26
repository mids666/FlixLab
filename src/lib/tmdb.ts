import axios from 'axios';

const TMDB_API_KEY = '26f2931a4085cca0519d862cbd1c85e2';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const tmdb = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
});

export const getImageUrl = (path: string | null | undefined, size: 'w500' | 'original' | 'w185' | 'w300' | 'h632' | 'w342' = 'w500') => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const tmdbService = {
  getTrending: async (type: 'movie' | 'tv' | 'all' = 'all') => {
    const { data } = await tmdb.get(`/trending/${type}/week`);
    return data.results;
  },
  getPopular: async (type: 'movie' | 'tv') => {
    const { data } = await tmdb.get(`/${type}/popular`);
    return data.results;
  },
  getTopRated: async (type: 'movie' | 'tv') => {
    const { data } = await tmdb.get(`/${type}/top_rated`);
    return data.results;
  },
  getDetails: async (type: 'movie' | 'tv', id: string) => {
    const { data } = await tmdb.get(`/${type}/${id}`, {
      params: { append_to_response: 'videos,recommendations,credits' },
    });
    return data;
  },
  search: async (query: string, page: number = 1) => {
    const { data } = await tmdb.get('/search/multi', {
      params: { query, page },
    });
    return {
      results: data.results,
      total_pages: data.total_pages
    };
  },
  smartSearch: async (rawQuery: string, page: number = 1) => {
    const normalized = rawQuery.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) {
      return { results: [], total_pages: 1 };
    }

    const normalizeText = (text: string) =>
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const damerauLevenshtein = (a: string, b: string): number => {
      const m = a.length;
      const n = b.length;
      if (m === 0) return n;
      if (n === 0) return m;
      const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
          }
        }
      }
      return dp[m][n];
    };

    const scoreCandidate = (queryNorm: string, item: any): number => {
      const titleRaw = item.title || item.name || item.original_title || item.original_name || '';
      const title = normalizeText(titleRaw);
      if (!title) return 0;

      const queryWords = queryNorm.split(' ').filter(Boolean);
      const titleWords = title.split(' ').filter(Boolean);

      let textScore = 0;
      if (title === queryNorm) {
        textScore = 1.0;
      } else if (title.startsWith(queryNorm)) {
        textScore = 0.96;
      } else if (titleWords.some((w) => w.startsWith(queryNorm))) {
        textScore = 0.92;
      } else if (title.includes(queryNorm)) {
        textScore = 0.88;
      } else if (queryWords.length > 0) {
        let totalWordScore = 0;
        for (const qw of queryWords) {
          let bestWord = 0;
          for (const tw of titleWords) {
            if (tw === qw) {
              bestWord = 1.0;
              break;
            }
            if (tw.startsWith(qw)) {
              bestWord = Math.max(bestWord, 0.93);
              continue;
            }
            if (qw.length >= 3 && tw.includes(qw)) {
              bestWord = Math.max(bestWord, 0.85);
              continue;
            }
            const maxLen = Math.max(qw.length, tw.length);
            if (maxLen > 0) {
              const dist = damerauLevenshtein(qw, tw);
              const sim = 1 - dist / maxLen;
              bestWord = Math.max(bestWord, sim);
            }
          }
          totalWordScore += bestWord;
        }
        textScore = totalWordScore / queryWords.length;
      }

      const popularityBoost = Math.min(0.18, Math.log10((item.popularity || 1) + 1) * 0.055);
      return textScore + popularityBoost;
    };

    const queryNorm = normalizeText(normalized);
    const primaryRes = await tmdb.get('/search/multi', {
      params: { query: normalized, page },
    });

    const primaryResults: any[] = primaryRes.data?.results || [];
    const totalPages: number = primaryRes.data?.total_pages || 1;

    const dedupe = new Map<string, any>();
    for (const item of primaryResults) {
      const key = `${item.media_type || (item.title ? 'movie' : 'tv')}-${item.id}`;
      if (!dedupe.has(key)) dedupe.set(key, item);
    }

    // If page 1 has few or no results (e.g., typo like "vampre diaries"), run tolerant fallback queries
    if (page === 1 && dedupe.size < 6 && queryNorm.length >= 3) {
      const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into']);
      const tokens = queryNorm.split(' ').filter((t) => t.length >= 3 && !stopWords.has(t));
      const fallbackQueries = new Set<string>();

      for (const token of tokens.slice(0, 3)) {
        if (token !== queryNorm) fallbackQueries.add(token);
        if (token.length >= 5) {
          fallbackQueries.add(token.slice(0, 4));
          fallbackQueries.add(token.slice(0, 3));
        } else if (token.length === 4) {
          fallbackQueries.add(token.slice(0, 3));
        }
      }

      if (tokens.length === 1 && tokens[0].length >= 6) {
        fallbackQueries.add(tokens[0].slice(Math.floor(tokens[0].length * 0.35)));
      }

      const extraCalls = Array.from(fallbackQueries)
        .filter((q) => q && q !== normalized)
        .slice(0, 4)
        .map((q) =>
          tmdb
            .get('/search/multi', { params: { query: q, page: 1 } })
            .then((res) => res.data?.results || [])
            .catch(() => [])
        );

      const extraBatches = await Promise.all(extraCalls);
      for (const batch of extraBatches) {
        for (const item of batch) {
          const key = `${item.media_type || (item.title ? 'movie' : 'tv')}-${item.id}`;
          if (!dedupe.has(key)) dedupe.set(key, item);
        }
      }
    }

    const candidates = Array.from(dedupe.values());
    const scored = candidates
      .map((item) => ({ item, score: scoreCandidate(queryNorm, item) }))
      .filter(({ score }) => (primaryResults.length > 0 ? score >= 0.35 : score >= 0.5))
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);

    return {
      results: scored,
      total_pages: totalPages,
    };
  },
  searchTyped: async (type: 'movie' | 'tv', rawQuery: string, page: number = 1) => {
    const normalized = rawQuery.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) {
      return { results: [], total_pages: 1 };
    }

    const normalizeText = (text: string) =>
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const damerauLevenshtein = (a: string, b: string): number => {
      const m = a.length;
      const n = b.length;
      if (m === 0) return n;
      if (n === 0) return m;
      const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
          }
        }
      }
      return dp[m][n];
    };

    const scoreCandidate = (queryNorm: string, item: any): number => {
      const titleRaw = item.title || item.name || item.original_title || item.original_name || '';
      const title = normalizeText(titleRaw);
      if (!title) return 0;

      const queryWords = queryNorm.split(' ').filter(Boolean);
      const titleWords = title.split(' ').filter(Boolean);

      let textScore = 0;
      if (title === queryNorm) {
        textScore = 1.0;
      } else if (title.startsWith(queryNorm)) {
        textScore = 0.96;
      } else if (titleWords.some((w) => w.startsWith(queryNorm))) {
        textScore = 0.92;
      } else if (title.includes(queryNorm)) {
        textScore = 0.88;
      } else if (queryWords.length > 0) {
        let totalWordScore = 0;
        for (const qw of queryWords) {
          let bestWord = 0;
          for (const tw of titleWords) {
            if (tw === qw) {
              bestWord = 1.0;
              break;
            }
            if (tw.startsWith(qw)) {
              bestWord = Math.max(bestWord, 0.93);
              continue;
            }
            if (qw.length >= 3 && tw.includes(qw)) {
              bestWord = Math.max(bestWord, 0.85);
              continue;
            }
            const maxLen = Math.max(qw.length, tw.length);
            if (maxLen > 0) {
              const dist = damerauLevenshtein(qw, tw);
              bestWord = Math.max(bestWord, 1 - dist / maxLen);
            }
          }
          totalWordScore += bestWord;
        }
        textScore = totalWordScore / queryWords.length;
      }

      const popularityBoost = Math.min(0.18, Math.log10((item.popularity || 1) + 1) * 0.055);
      return textScore + popularityBoost;
    };

    const queryNorm = normalizeText(normalized);
    const primaryRes = await tmdb.get(`/search/${type}`, {
      params: { query: normalized, page },
    });

    const primaryResults: any[] = primaryRes.data?.results || [];
    const totalPages: number = primaryRes.data?.total_pages || 1;

    const dedupe = new Map<number, any>();
    for (const item of primaryResults) {
      if (!dedupe.has(item.id)) dedupe.set(item.id, { ...item, media_type: type });
    }

    if (page === 1 && dedupe.size < 6 && queryNorm.length >= 3) {
      const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into']);
      const tokens = queryNorm.split(' ').filter((t) => t.length >= 3 && !stopWords.has(t));
      const fallbackQueries = new Set<string>();

      for (const token of tokens.slice(0, 3)) {
        if (token !== queryNorm) fallbackQueries.add(token);
        if (token.length >= 5) {
          fallbackQueries.add(token.slice(0, 4));
          fallbackQueries.add(token.slice(0, 3));
        } else if (token.length === 4) {
          fallbackQueries.add(token.slice(0, 3));
        }
      }

      if (tokens.length === 1 && tokens[0].length >= 6) {
        fallbackQueries.add(tokens[0].slice(Math.floor(tokens[0].length * 0.35)));
      }

      const extraCalls = Array.from(fallbackQueries)
        .filter((q) => q && q !== normalized)
        .slice(0, 4)
        .map((q) =>
          tmdb
            .get(`/search/${type}`, { params: { query: q, page: 1 } })
            .then((res) => res.data?.results || [])
            .catch(() => [])
        );

      const extraBatches = await Promise.all(extraCalls);
      for (const batch of extraBatches) {
        for (const item of batch) {
          if (!dedupe.has(item.id)) dedupe.set(item.id, { ...item, media_type: type });
        }
      }
    }

    const candidates = Array.from(dedupe.values());
    const scored = candidates
      .map((item) => ({ item, score: scoreCandidate(queryNorm, item) }))
      .filter(({ score }) => (primaryResults.length > 0 ? score >= 0.35 : score >= 0.5))
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);

    return {
      results: scored,
      total_pages: totalPages,
    };
  },
  getGenres: async (type: 'movie' | 'tv') => {
    const { data } = await tmdb.get(`/genre/${type}/list`);
    return data.genres;
  },
  getDiscover: async (
    type: 'movie' | 'tv',
    genreId?: string,
    sortBy: string = 'popularity.desc',
    page: number = 1,
    options?: { year?: number; watchProviderId?: string }
  ) => {
    const params: Record<string, any> = {
      with_genres: genreId || undefined,
      sort_by: sortBy,
      page,
      'vote_count.gte': sortBy === 'vote_average.desc' ? 100 : undefined,
    };

    if (options?.year) {
      if (type === 'movie') {
        params.primary_release_year = options.year;
      } else {
        params.first_air_date_year = options.year;
      }
    }

    if (options?.watchProviderId) {
      params.with_watch_providers = options.watchProviderId;
      params.watch_region = 'US';
      params.with_watch_monetization_types = 'flatrate|free|ads';
    }

    const { data } = await tmdb.get(`/discover/${type}`, { params });
    return {
      results: data.results,
      total_pages: data.total_pages
    };
  },
  getByProvider: async (providerId: string, page: number = 1) => {
    const commonParams = {
      with_watch_providers: providerId,
      watch_region: 'US',
      with_watch_monetization_types: 'flatrate|free|ads',
      page 
    };

    const [{ data: movieData }, { data: tvData }] = await Promise.all([
      tmdb.get('/discover/movie', { params: commonParams }),
      tmdb.get('/discover/tv', { params: commonParams })
    ]);
    
    return {
      results: [...movieData.results, ...tvData.results].sort((a, b) => b.popularity - a.popularity),
      total_pages: Math.max(movieData.total_pages, tvData.total_pages)
    };
  },
  getTVShowEpisodes: async (id: string, season: number) => {
    const { data } = await tmdb.get(`/tv/${id}/season/${season}`);
    return data.episodes;
  },
  getRecommendations: async (type: 'movie' | 'tv', id: string) => {
    const { data } = await tmdb.get(`/${type}/${id}/recommendations`);
    return data.results;
  },
  getUpcoming: async () => {
    const { data } = await tmdb.get('/movie/upcoming');
    return data.results;
  },
  searchPeople: async (query: string, page: number = 1) => {
    const { data } = await tmdb.get('/search/person', {
      params: { query, page },
    });
    return {
      results: data.results,
      total_pages: data.total_pages
    };
  },
  getPersonDetails: async (id: number) => {
    const { data } = await tmdb.get(`/person/${id}`, {
      params: { append_to_response: 'combined_credits,images' },
    });
    return data;
  },
};
