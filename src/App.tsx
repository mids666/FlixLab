/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Search from './pages/Search';
import Watchlist from './pages/Watchlist';
import RecentlyWatched from './pages/RecentlyWatched';
import Watch from './pages/Watch';
import Person from './pages/Person';
import Settings from './pages/Settings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import HelpCenter from './pages/HelpCenter';
import Login from './pages/Login';
import ProfileSelector from './pages/ProfileSelector';
import Layout from './components/Layout';

function AppRoutes() {
  const { user, currentProfile, loading, isAuthReady } = useAuth();

  if (!isAuthReady || loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="animate-pulse text-4xl font-black tracking-tighter text-red-600">FLIXLAB</div>
      </div>
    );
  }

  // If user is logged in but has no profile, force profile selection
  if (user && !currentProfile) {
    return <ProfileSelector />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/browse/:type" element={user ? <Browse /> : <Navigate to="/login" replace />} />
        <Route path="/search" element={<Search />} />
        <Route path="/watchlist" element={user ? <Watchlist /> : <Navigate to="/login" replace />} />
        <Route path="/recently-watched" element={user ? <RecentlyWatched /> : <Navigate to="/login" replace />} />
        <Route path="/watch/:type/:id" element={user ? <Watch /> : <Navigate to="/login" replace />} />
        <Route path="/person/:id" element={user ? <Person /> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" replace />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster position="top-center" richColors />
      </Router>
    </AuthProvider>
  );
}
