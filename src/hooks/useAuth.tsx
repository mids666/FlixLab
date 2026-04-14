import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserData, Profile } from '../types';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      
      if (!firebaseUser) {
        setUserData(null);
        setProfiles([]);
        setCurrentProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Check if email is verified
    if (!user.emailVerified) {
      setUserData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      } else {
        const newUserData: UserData = {
          email: user.email || '',
          subscriptionStatus: 'active', // Everyone is active by default
        };
        setDoc(userDocRef, newUserData);
        setUserData(newUserData);
      }
    });

    const profilesRef = collection(db, 'users', user.uid, 'profiles');
    const q = query(profilesRef, orderBy('createdAt', 'asc'));
    const unsubscribeProfiles = onSnapshot(q, (snapshot) => {
      const profilesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Profile[];
      setProfiles(profilesData);
      
      // If there's only one profile and none selected, select it
      if (profilesData.length > 0 && !currentProfile) {
        // Try to get from localStorage
        const savedProfileId = localStorage.getItem(`currentProfile_${user.uid}`);
        const savedProfile = profilesData.find(p => p.id === savedProfileId);
        if (savedProfile) {
          setCurrentProfile(savedProfile);
        } else if (profilesData.length === 1) {
          setCurrentProfile(profilesData[0]);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribeProfiles();
    };
  }, [user]);

  const handleSetCurrentProfile = (profile: Profile | null) => {
    setCurrentProfile(profile);
    if (user && profile) {
      localStorage.setItem(`currentProfile_${user.uid}`, profile.id);
    }
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
      setShowAuthModal
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
