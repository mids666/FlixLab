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
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProfileSelector from './pages/ProfileSelector';
import Layout from './components/Layout';

function AppRoutes() {
  const { user, currentProfile, loading, isAuthReady } = useAuth();

  if (!isAuthReady || loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="animate-pulse text-2xl font-bold tracking-tighter">CINESTREAM</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!currentProfile) {
    return <ProfileSelector />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse/:type" element={<Browse />} />
        <Route path="/search" element={<Search />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/settings" element={<Settings />} />
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
