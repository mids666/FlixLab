export interface UserData {
  email: string;
  name?: string;
  country?: string;
  subscriptionStatus: 'active' | 'trialing' | 'canceled' | 'none';
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  createdAt: string;
}

export interface WatchlistItem {
  id: string;
  tmdbId: string;
  type: 'movie' | 'tv';
  title: string;
  posterPath: string;
  addedAt: string;
}

export interface RecentlyWatchedItem {
  id: string;
  tmdbId: string;
  type: 'movie' | 'tv';
  title: string;
  posterPath: string;
  watchedAt: string;
  season?: number;
  episode?: number;
}

export interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv';
  genre_ids: number[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface TVChannel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  category: string;
}
