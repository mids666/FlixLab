import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

export default function PatreonConnect() {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/patreon/url?userId=${user.uid}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get auth URL');
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'patreon_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        toast.error('Popup blocked. Please allow popups for this site.');
      }
    } catch (error) {
      console.error('Patreon connect error:', error);
      toast.error('Failed to connect to Patreon');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;

      if (event.data?.type === 'PATREON_AUTH_SUCCESS') {
        toast.success(event.data.isPatron ? 'Patreon connected! Premium active.' : 'Patreon connected! No active subscription found.');
      } else if (event.data?.type === 'PATREON_AUTH_ERROR') {
        toast.error(event.data.message || 'Authentication failed');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const isActive = userData?.subscriptionStatus === 'active';

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-2xl border transition-all ${
        isActive 
          ? 'bg-green-500/10 border-green-500/20' 
          : 'bg-zinc-800/50 border-zinc-700'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-600/20 text-red-600'
            }`}>
              {isActive ? <CheckCircle2 className="w-6 h-6" /> : <ExternalLink className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Patreon Membership</h3>
              <p className="text-zinc-400 text-sm">
                {isActive ? 'Your premium subscription is active' : 'Connect your Patreon to unlock premium features'}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${
            isActive ? 'bg-green-500 text-white' : 'bg-zinc-700 text-zinc-400'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {!isActive && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-900/50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
              <p>Make sure you have an active subscription on our Patreon page before connecting.</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleConnect}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 font-bold"
              >
                {loading ? 'Connecting...' : 'Connect Patreon'}
              </Button>
              <Button 
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800 text-white"
                onClick={() => window.open('https://www.patreon.com', '_blank')}
              >
                Visit Patreon Page
              </Button>
            </div>
          </div>
        )}

        {isActive && (
          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800 text-white"
              onClick={handleConnect}
            >
              Refresh Status
            </Button>
            <Button 
              variant="ghost"
              className="text-zinc-500 hover:text-red-500"
              onClick={() => window.open('https://www.patreon.com/settings/memberships', '_blank')}
            >
              Manage on Patreon
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
