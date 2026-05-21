import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import AuthModal from './AuthModal';
import { useAuth } from '../hooks/useAuth';
import { AlertCircle } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isQuotaExceeded } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 selection:bg-brand selection:text-white">
      {isQuotaExceeded && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black text-xs py-1.5 px-4 text-center font-extrabold flex items-center justify-center gap-2 shadow-md uppercase tracking-wider">
          <AlertCircle className="w-4 h-4 flex-none animate-bounce" />
          <span>Notice: Firestore Free Tier Quota Exceeded. Switched to secure Local Sandbox. Lists & history saving fine!</span>
        </div>
      )}
      <div className={isQuotaExceeded ? 'pt-7' : ''}>
        <Navbar />
        <AuthModal />
        <main className="pt-0">
          {children}
        </main>
      </div>
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
