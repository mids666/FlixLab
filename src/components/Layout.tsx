import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import AuthModal from './AuthModal';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isQuotaExceeded } = useAuth();
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 selection:bg-brand selection:text-white pb-safe">
      <Navbar />
      <AuthModal />
      
      {isQuotaExceeded && !isBannerDismissed && (
        <div className="fixed top-[72px] inset-x-0 z-40 bg-amber-950/90 backdrop-blur-md border-b border-amber-500/30 text-amber-200 py-3 px-4 text-xs md:text-sm flex items-center justify-between gap-4 shadow-xl transition-all duration-300">
          <div className="flex items-center gap-2.5 max-w-5xl mx-auto w-full justify-center">
            <span className="flex-none bg-amber-500/20 text-amber-400 p-1.5 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <p className="font-medium text-center balance leading-relaxed">
              <strong className="text-amber-400 font-extrabold mr-1">Local Sandbox Mode Active:</strong>
              FlixLab's cloud database reached its daily capacity. Your watchlist, history, and profiles are fully saved locally on your device.
            </p>
          </div>
          <button 
            onClick={() => setIsBannerDismissed(true)} 
            className="p-1 text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 rounded-full transition-all focus:outline-none flex-none"
            aria-label="Dismiss alert"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <main className="pt-0">
        {children}
      </main>
      <footer className="py-12 px-4 md:px-12 border-t border-border mt-20 bg-background transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-brand font-black tracking-tighter text-2xl">FLIXLAB</h3>
            <p className="text-muted-foreground text-sm">
              The ultimate streaming experience. Unlimited movies, TV shows, and more.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-foreground font-bold">Platform</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><Link to="/browse/movie" className="hover:text-brand transition-colors">Movies</Link></li>
              <li><Link to="/browse/tv" className="hover:text-brand transition-colors">TV Shows</Link></li>
              <li><Link to="/search" className="hover:text-brand transition-colors">Search</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-foreground font-bold">Support</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><Link to="/help" className="hover:text-brand transition-colors">Help Center</Link></li>
              <li><Link to="/terms" className="hover:text-brand transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-brand transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-foreground font-bold">Connect</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><a href="#" className="hover:text-brand transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Facebook</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-border text-center text-muted-foreground text-xs">
          © {new Date().getFullYear()} FlixLab. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
