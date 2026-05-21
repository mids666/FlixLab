import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, orderBy, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserData, Profile, WatchlistItem, RecentlyWatchedItem } from '../types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  profiles: Profile[];
  currentProfile: Profile | null;
  setCurrentProfile: (profile: Profile | null) => void;
  loading: boolean;
  isAuthReady: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  watchlist: WatchlistItem[];
  isWatchlistLoading: boolean;
  isQuotaExceeded: boolean;
  recentlyWatched: RecentlyWatchedItem[];
  isRecentlyWatchedLoading: boolean;
  addToRecentlyWatched: (item: any, season?: number, episode?: number) => Promise<void>;
  removeFromRecentlyWatched: (itemId: string) => Promise<void>;
  toggleWatchlist: (item: any) => Promise<void>;
  addProfile: (name: string, avatar: string, themeColor: string) => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(true);
  
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [recentlyWatched, setRecentlyWatched] = useState<RecentlyWatchedItem[]>([]);
  const [isRecentlyWatchedLoading, setIsRecentlyWatchedLoading] = useState(true);

  const currentProfile = profiles.find(p => p.id === currentProfileId) || null;

  // Track authentication states
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      
      if (!firebaseUser) {
        setUserData(null);
        setProfiles([]);
        setCurrentProfileId(null);
        setWatchlist([]);
        setRecentlyWatched([]);
        setLoading(false);
        setIsWatchlistLoading(false);
        setIsRecentlyWatchedLoading(false);
      } else {
        // Load last profile ID from localStorage
        const savedProfileId = localStorage.getItem(`currentProfile_${firebaseUser.uid}`);
        if (savedProfileId) {
          setCurrentProfileId(savedProfileId);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Fetch / Sync profiles and user doc
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const localUserDataKey = `local_userData_${user.uid}`;
    const localProfilesKey = `local_profiles_${user.uid}`;

    // Eager seed from localStorage
    const savedUserData = localStorage.getItem(localUserDataKey);
    if (savedUserData) {
      try { setUserData(JSON.parse(savedUserData)); } catch (e) {}
    } else {
      setUserData({ email: user.email || '', subscriptionStatus: 'active' });
    }

    const savedProfiles = localStorage.getItem(localProfilesKey);
    let loadedProfiles: Profile[] = [];
    if (savedProfiles) {
      try {
        loadedProfiles = JSON.parse(savedProfiles);
        setProfiles(loadedProfiles);
      } catch (e) {}
    }

    if (loadedProfiles.length === 0) {
      const defaultProfile: Profile = {
        id: 'p_default',
        name: user.displayName || 'Me',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
        themeColor: '#ef4444',
        createdAt: new Date().toISOString()
      };
      loadedProfiles = [defaultProfile];
      setProfiles(loadedProfiles);
      localStorage.setItem(localProfilesKey, JSON.stringify(loadedProfiles));
    }

    const savedProfileId = localStorage.getItem(`currentProfile_${user.uid}`);
    let activeProfileId = savedProfileId || loadedProfiles[0].id;
    if (!loadedProfiles.some(p => p.id === activeProfileId)) {
      activeProfileId = loadedProfiles[0].id;
    }
    setCurrentProfileId(activeProfileId);
    localStorage.setItem(`currentProfile_${user.uid}`, activeProfileId);
    setLoading(false);

    // Set up doc listeners (try online Firestore with automatic quota fallback)
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const uData = docSnap.data() as UserData;
        setUserData(uData);
        localStorage.setItem(localUserDataKey, JSON.stringify(uData));
      } else {
        const uData: UserData = {
          email: user.email || '',
          subscriptionStatus: 'active'
        };
        setDoc(userDocRef, uData).catch(() => {});
        setUserData(uData);
        localStorage.setItem(localUserDataKey, JSON.stringify(uData));
      }
    }, (error: any) => {
      if (error?.message?.includes('quota') || error?.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
      console.warn("User document live snapshot error (falling back to safely cached memory):", error);
    });

    const profilesRef = collection(db, 'users', user.uid, 'profiles');
    const qProfiles = query(profilesRef, orderBy('createdAt', 'asc'));
    const unsubscribeProfiles = onSnapshot(qProfiles, (snapshot) => {
      if (!snapshot.empty) {
        const profilesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Profile[];
        setProfiles(profilesData);
        localStorage.setItem(localProfilesKey, JSON.stringify(profilesData));
        
        const currentSaved = localStorage.getItem(`currentProfile_${user.uid}`);
        if (!currentSaved || !profilesData.some(p => p.id === currentSaved)) {
          const firstProfileId = profilesData[0].id;
          setCurrentProfileId(firstProfileId);
          localStorage.setItem(`currentProfile_${user.uid}`, firstProfileId);
        }
      } else {
        const defaultProfile: Profile = {
          id: 'p_default',
          name: user.displayName || 'Me',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
          themeColor: '#ef4444',
          createdAt: new Date().toISOString()
        };
        setDoc(doc(db, 'users', user.uid, 'profiles', 'p_default'), defaultProfile).catch(() => {});
      }
    }, (error: any) => {
      if (error?.message?.includes('quota') || error?.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
      console.warn("Profiles collection live snapshot error (falling back to safely cached memory):", error);
    });

    return () => {
      unsubscribeUser();
      unsubscribeProfiles();
    };
  }, [user]);

  // Fetch / Sync watchlist and history for current profile
  useEffect(() => {
    if (!user || !currentProfileId) {
      setWatchlist([]);
      setRecentlyWatched([]);
      setIsWatchlistLoading(false);
      setIsRecentlyWatchedLoading(false);
      return;
    }

    setIsWatchlistLoading(true);
    setIsRecentlyWatchedLoading(true);

    const localWatchlistKey = `local_watchlist_${user.uid}_${currentProfileId}`;
    const localRecentlyKey = `local_recentlyWatched_${user.uid}_${currentProfileId}`;

    // Eager local seed
    const savedWatchlist = localStorage.getItem(localWatchlistKey);
    if (savedWatchlist) {
      try { setWatchlist(JSON.parse(savedWatchlist)); } catch (e) {}
    } else {
      setWatchlist([]);
    }

    const savedRecently = localStorage.getItem(localRecentlyKey);
    if (savedRecently) {
      try { setRecentlyWatched(JSON.parse(savedRecently)); } catch (e) {}
    } else {
      setRecentlyWatched([]);
    }

    setIsWatchlistLoading(false);
    setIsRecentlyWatchedLoading(false);

    // Subscribe online with sandbox fallback
    const wlRef = collection(db, 'users', user.uid, 'profiles', currentProfileId, 'watchlist');
    const unsubscribeWatchlist = onSnapshot(wlRef, (snapshot) => {
      const wlData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as WatchlistItem[];
      setWatchlist(wlData);
      localStorage.setItem(localWatchlistKey, JSON.stringify(wlData));
    }, (error: any) => {
      if (error?.message?.includes('quota') || error?.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
      console.warn("Watchlist snapshot error (safely reading from local database):", error);
    });

    const rwRef = collection(db, 'users', user.uid, 'profiles', currentProfileId, 'recentlyWatched');
    const qRecently = query(rwRef, orderBy('watchedAt', 'desc'));
    const unsubscribeRecently = onSnapshot(qRecently, (snapshot) => {
      const rwData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as RecentlyWatchedItem[];
      setRecentlyWatched(rwData);
      localStorage.setItem(localRecentlyKey, JSON.stringify(rwData));
    }, (error: any) => {
      if (error?.message?.includes('quota') || error?.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
      console.warn("Recently watched snapshot error (safely reading from local database):", error);
    });

    return () => {
      unsubscribeWatchlist();
      unsubscribeRecently();
    };
  }, [user, currentProfileId]);

  // Handle active theme color shifts
  useEffect(() => {
    if (currentProfile?.themeColor) {
      document.documentElement.style.setProperty('--brand', currentProfile.themeColor);
    } else {
      document.documentElement.style.setProperty('--brand', 'oklch(0.6 0.25 25)');
    }
  }, [currentProfile?.themeColor]);

  // Actions
  const handleSetCurrentProfile = (profile: Profile | null) => {
    const profileId = profile?.id || null;
    setCurrentProfileId(profileId);
    if (user && profileId) {
      localStorage.setItem(`currentProfile_${user.uid}`, profileId);
    } else if (user) {
      localStorage.removeItem(`currentProfile_${user.uid}`);
    }
  };

  const addProfile = async (name: string, avatar: string, themeColor: string) => {
    if (!user) return;
    const newProfile: Profile = {
      id: 'p_' + Math.random().toString(36).substring(2, 11),
      name: name.substring(0, 48),
      avatar,
      themeColor,
      createdAt: new Date().toISOString()
    };

    const localProfilesKey = `local_profiles_${user.uid}`;
    const updatedProfiles = [...profiles, newProfile];
    setProfiles(updatedProfiles);
    localStorage.setItem(localProfilesKey, JSON.stringify(updatedProfiles));

    const profileRef = doc(db, 'users', user.uid, 'profiles', newProfile.id);
    try {
      await setDoc(profileRef, {
        name: newProfile.name,
        avatar: newProfile.avatar,
        themeColor: newProfile.themeColor,
        createdAt: newProfile.createdAt
      });
    } catch (err: any) {
      if (err?.message?.includes('quota') || err?.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
      console.warn("Firestore add profile failed (using local sandbox sync):", err);
    }
  };

  const updateProfile = async (profileId: string, updates: Partial<Profile>) => {
    if (!user) return;
    const existingProfile = profiles.find(p => p.id === profileId);
    if (!existingProfile) return;

    const updatedProfile = { ...existingProfile, ...updates };
    const localProfilesKey = `local_profiles_${user.uid}`;
    const updatedProfiles = profiles.map(p => p.id === profileId ? updatedProfile : p);
    
    setProfiles(updatedProfiles);
    localStorage.setItem(localProfilesKey, JSON.stringify(updatedProfiles));

    if (currentProfileId === profileId) {
      // Force change to update any state tracking active colors
      setCurrentProfileId(null);
      setTimeout(() => setCurrentProfileId(profileId), 10);
    }

    const profileRef = doc(db, 'users', user.uid, 'profiles', profileId);
    try {
      await setDoc(profileRef, {
        name: updatedProfile.name,
        avatar: updatedProfile.avatar,
        themeColor: updatedProfile.themeColor,
        createdAt: updatedProfile.createdAt || new Date().toISOString()
      });
    } catch (err: any) {
      if (err?.message?.includes('quota') || err?.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
      console.warn("Firestore update profile failed (using local sandbox sync):", err);
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!user) return;
    const localProfilesKey = `local_profiles_${user.uid}`;
    const updatedProfiles = profiles.filter(p => p.id !== profileId);
    
    setProfiles(updatedProfiles);
    localStorage.setItem(localProfilesKey, JSON.stringify(updatedProfiles));

    if (currentProfileId === profileId) {
      const nextProfileId = updatedProfiles.length > 0 ? updatedProfiles[0].id : null;
      setCurrentProfileId(nextProfileId);
      if (nextProfileId) {
        localStorage.setItem(`currentProfile_${user.uid}`, nextProfileId);
      } else {
        localStorage.removeItem(`currentProfile_${user.uid}`);
      }
    }

    const profileRef = doc(db, 'users', user.uid, 'profiles', profileId);
    try {
      await deleteDoc(profileRef);
    } catch (err: any) {
      if (err?.message?.includes('quota') || err?.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
      console.warn("Firestore delete profile failed (using local sandbox sync):", err);
    }
  };

  const toggleWatchlist = async (item: any) => {
    if (!user || !currentProfileId) {
      setShowAuthModal(true);
      return;
    }

    const tmdbIdStr = item.id ? item.id.toString() : (item.tmdbId ? item.tmdbId.toString() : '');
    if (!tmdbIdStr) return;

    const isPresent = watchlist.some(w => w.tmdbId === tmdbIdStr);
    const localWatchlistKey = `local_watchlist_${user.uid}_${currentProfileId}`;

    let updatedList: WatchlistItem[];
    if (isPresent) {
      updatedList = watchlist.filter(w => w.tmdbId !== tmdbIdStr);
      setWatchlist(updatedList);
      localStorage.setItem(localWatchlistKey, JSON.stringify(updatedList));
      toast.success('Removed from watchlist');

      const wlDocRef = doc(db, 'users', user.uid, 'profiles', currentProfileId, 'watchlist', tmdbIdStr);
      deleteDoc(wlDocRef).catch((err) => {
        if (err?.message?.includes('quota') || err?.code === 'resource-exhausted') {
          setIsQuotaExceeded(true);
        }
        console.warn("Firestore delete from watchlist failed (using local sandbox sync):", err);
      });
    } else {
      const type = item.media_type || (item.title ? 'movie' : 'tv') || item.type;
      const newItem: WatchlistItem = {
        id: tmdbIdStr,
        tmdbId: tmdbIdStr,
        type: type === 'movie' ? 'movie' : 'tv',
        title: item.title || item.name,
        posterPath: item.poster_path || item.posterPath || '',
        addedAt: new Date().toISOString()
      };
      
      updatedList = [newItem, ...watchlist];
      setWatchlist(updatedList);
      localStorage.setItem(localWatchlistKey, JSON.stringify(updatedList));
      toast.success('Added to watchlist');

      const wlDocRef = doc(db, 'users', user.uid, 'profiles', currentProfileId, 'watchlist', tmdbIdStr);
      setDoc(wlDocRef, {
        tmdbId: newItem.tmdbId,
        type: newItem.type,
        title: newItem.title,
        posterPath: newItem.posterPath,
        addedAt: newItem.addedAt
      }).catch((err) => {
        if (err?.message?.includes('quota') || err?.code === 'resource-exhausted') {
          setIsQuotaExceeded(true);
        }
        console.warn("Firestore set to watchlist failed (using local sandbox sync):", err);
      });
    }
  };

  const addToRecentlyWatched = async (item: any, season?: number, episode?: number) => {
    if (!user || !currentProfileId) return;

    const tmdbIdStr = item.id ? item.id.toString() : (item.tmdbId ? item.tmdbId.toString() : '');
    if (!tmdbIdStr) return;

    const type = item.media_type || (item.title ? 'movie' : 'tv') || item.type;
    const itemTitle = item.title || item.name;
    const pPath = item.poster_path || item.posterPath || '';

    const newItem: RecentlyWatchedItem = {
      id: tmdbIdStr,
      tmdbId: tmdbIdStr,
      type: type === 'movie' ? 'movie' : 'tv',
      title: itemTitle,
      posterPath: pPath,
      watchedAt: new Date().toISOString(),
      ...(season !== undefined ? { season } : {}),
      ...(episode !== undefined ? { episode } : {})
    };

    const localRecentlyKey = `local_recentlyWatched_${user.uid}_${currentProfileId}`;
    const filteredList = recentlyWatched.filter(r => r.tmdbId !== tmdbIdStr);
    const updatedList = [newItem, ...filteredList];
    setRecentlyWatched(updatedList);
    localStorage.setItem(localRecentlyKey, JSON.stringify(updatedList));

    const rwDocRef = doc(db, 'users', user.uid, 'profiles', currentProfileId, 'recentlyWatched', tmdbIdStr);
    setDoc(rwDocRef, {
      tmdbId: newItem.tmdbId,
      type: newItem.type,
      title: newItem.title,
      posterPath: newItem.posterPath,
      watchedAt: newItem.watchedAt,
      ...(newItem.season !== undefined ? { season: newItem.season } : {}),
      ...(newItem.episode !== undefined ? { episode: newItem.episode } : {})
    }).catch((err) => {
      if (err?.message?.includes('quota') || err?.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
      console.warn("Firestore set recently watched failed (using local sandbox sync):", err);
    });
  };

  const removeFromRecentlyWatched = async (itemId: string) => {
    if (!user || !currentProfileId) return;

    const localRecentlyKey = `local_recentlyWatched_${user.uid}_${currentProfileId}`;
    const updatedList = recentlyWatched.filter(r => r.id !== itemId && r.tmdbId !== itemId);
    setRecentlyWatched(updatedList);
    localStorage.setItem(localRecentlyKey, JSON.stringify(updatedList));
    toast.success('Removed from history');

    const rwDocRef = doc(db, 'users', user.uid, 'profiles', currentProfileId, 'recentlyWatched', itemId);
    deleteDoc(rwDocRef).catch((err) => {
      if (err?.message?.includes('quota') || err?.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
      console.warn("Firestore delete from recently watched failed (using local sandbox sync):", err);
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      profiles, 
      currentProfile, 
      setCurrentProfile: handleSetCurrentProfile, 
      loading, 
      isAuthReady,
      showAuthModal,
      setShowAuthModal,
      watchlist,
      isWatchlistLoading,
      isQuotaExceeded,
      recentlyWatched,
      isRecentlyWatchedLoading,
      addToRecentlyWatched,
      removeFromRecentlyWatched,
      toggleWatchlist,
      addProfile,
      updateProfile,
      deleteProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
