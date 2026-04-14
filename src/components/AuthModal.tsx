import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '../hooks/useAuth';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal } = useAuth();
  const navigate = useNavigate();

  const features = [
    'Personal Watchlist to save your favorites',
    'Recently Watched history to resume playback',
    'Sync progress across all your devices',
    'Exclusive HD/FHD content access'
  ];

  return (
    <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader className="items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <DialogTitle className="text-3xl font-black tracking-tighter">JOIN FLIXLAB</DialogTitle>
          <div className="space-y-4 text-left w-full">
            <DialogDescription className="text-zinc-400 text-base text-center">
              Sign up for free to unlock premium features:
            </DialogDescription>
            <ul className="space-y-2">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-red-600 mt-0.5 flex-none" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <Button 
            className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg font-bold rounded-2xl"
            onClick={() => {
              setShowAuthModal(false);
              navigate('/login');
            }}
          >
            Sign In / Sign Up
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-zinc-500 hover:text-white"
            onClick={() => setShowAuthModal(false)}
          >
            Maybe Later
          </Button>
        </div>
        <div className="text-center text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
          Unlimited Entertainment Awaits
        </div>
      </DialogContent>
    </Dialog>
  );
}
