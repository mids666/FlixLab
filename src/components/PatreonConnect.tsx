import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function PatreonConnect() {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [campaignUrl, setCampaignUrl] = useState('https://www.patreon.com');
  const [redirectUri, setRedirectUri] = useState('');

  const handleConnect = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/patreon/url?userId=${user.uid}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get auth URL');
      }
      
      const { url, campaignUrl: fetchedUrl } = data;
      if (fetchedUrl) setCampaignUrl(fetchedUrl);

      const authWindow = window.open(
        url,
        'patreon_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        toast.error('Popup blocked. Please allow popups for this site.');
      }
    } catch (error: any) {
      console.error('Patreon connect error:', error);
      toast.error(error.message || 'Failed to connect to Patreon');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Pre-fetch campaign URL and redirect info
    fetch(`/api/auth/patreon/url?userId=guest`)
      .then(res => res.json())
      .then(data => {
        if (data.campaignUrl) setCampaignUrl(data.campaignUrl);
        if (data.redirectUri) setRedirectUri(data.redirectUri);
      })
      .catch(() => {});

    const handleMessage = async (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;

      if (event.data?.type === 'PATREON_AUTH_SUCCESS') {
        const { isPatron, userId } = event.data;
        
        try {
          if (userId) {
            const userDocRef = doc(db, 'users', userId);
            await setDoc(userDocRef, {
              subscriptionStatus: isPatron ? 'active' : 'none',
              patreonConnected: true,
              lastPatreonCheck: serverTimestamp(),
            }, { merge: true });
          }
          
          toast.success(isPatron ? 'Patreon connected! Premium active.' : 'Patreon connected! No active subscription found.');
        } catch (error: any) {
          console.error('Failed to update subscription status:', error);
          toast.error('Connected to Patreon, but failed to update your account status.');
        }
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
              <div className="space-y-1">
                <p>Make sure you have an active subscription on our Patreon page before connecting.</p>
                {redirectUri && (
                  <div className="pt-2 border-t border-zinc-800 mt-2 space-y-2">
                    <div>
                      <span className="text-zinc-400 block mb-1">Patreon Redirect URI:</span>
                      <code className="bg-black px-2 py-1 rounded text-red-500 break-all select-all">{redirectUri}</code>
                      <p className="text-[10px] mt-1 text-zinc-600">Copy this into your Patreon Client settings.</p>
                    </div>
                  </div>
                )}
              </div>
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
                onClick={() => window.open(campaignUrl, '_blank')}
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
