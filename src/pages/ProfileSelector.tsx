import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, User, Check, Lock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import CreditCardForm from '../components/CreditCardForm';

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar',
];

export default function ProfileSelector() {
  const { user, userData, profiles, setCurrentProfile } = useAuth();
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const handleAddProfile = async () => {
    if (!user || !newProfileName) return;
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'profiles'), {
        name: newProfileName,
        avatar: selectedAvatar,
        createdAt: serverTimestamp(),
      });
      setNewProfileName('');
      setIsAdding(false);
      toast.success('Profile created');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          subscriptionStatus: 'active',
          subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastTransactionId: transactionId,
        }, { merge: true });
        toast.success('Subscription activated!');
        setShowSubscription(false);
        setShowPayment(false);
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const hasSubscription = userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'trialing';

  if (!hasSubscription && !showSubscription && !showPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Unlock NeoFlix</h2>
          <p className="text-zinc-400 mb-8">
            Get unlimited access to thousands of movies and TV shows for just $1/month. 
            Start your premium experience today!
          </p>
          <div className="space-y-4">
            <Button 
              className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg font-bold"
              onClick={() => setShowSubscription(true)}
            >
              Get Started
            </Button>
            <p className="text-xs text-zinc-500">Only $1/month. Cancel anytime.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <CreditCardForm 
          amount={1} 
          onSuccess={handlePaymentSuccess} 
          onCancel={() => setShowPayment(false)} 
        />
      </div>
    );
  }

  if (showSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden"
        >
          <div className="p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Select Plan</h2>
            <p className="text-zinc-400 mb-8">Secure checkout via NeoPay Gateway</p>
            
            <div className="bg-zinc-800/50 rounded-2xl p-6 mb-8 border border-red-600/30">
              <div className="flex justify-between items-center mb-4">
                <span className="text-white font-bold text-lg">Premium Monthly</span>
                <span className="text-red-600 font-black text-2xl">$1.00</span>
              </div>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> 4K Ultra HD Streaming
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> Unlimited Movies & TV
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> Watch on 4 Screens
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg font-bold rounded-2xl"
                onClick={() => {
                  setShowSubscription(false);
                  setShowPayment(true);
                }}
              >
                Continue to Payment
              </Button>
              <Button 
                variant="ghost"
                className="w-full text-zinc-500 hover:text-white"
                onClick={() => setShowSubscription(false)}
              >
                Back
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-center gap-4 opacity-50">
              <ShieldCheck className="w-5 h-5 text-zinc-400" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Secure 256-bit SSL Encryption</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-white mb-12"
      >
        Who's watching?
      </motion.h1>

      <div className="flex flex-wrap justify-center gap-8 max-w-4xl">
        <AnimatePresence>
          {profiles.map((profile) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-4 cursor-pointer group"
              onClick={() => setCurrentProfile(profile)}
            >
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-transparent group-hover:border-white transition-all duration-300">
                <img src={profile.avatar || undefined} alt={profile.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-zinc-400 group-hover:text-white text-xl font-medium transition-colors">
                {profile.name}
              </span>
            </motion.div>
          ))}

          {profiles.length < 5 && (
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger 
                nativeButton={false}
                render={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center gap-4 cursor-pointer group"
                  >
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl flex items-center justify-center border-4 border-dashed border-zinc-700 group-hover:border-zinc-500 transition-all duration-300">
                      <Plus className="w-12 h-12 text-zinc-700 group-hover:text-zinc-500" />
                    </div>
                    <span className="text-zinc-500 group-hover:text-zinc-400 text-xl font-medium transition-colors">
                      Add Profile
                    </span>
                  </motion.div>
                }
              />
              <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                  <DialogTitle>Add Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="flex justify-center gap-4">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                          selectedAvatar === avatar ? 'border-red-600 scale-110' : 'border-transparent'
                        }`}
                      >
                        <img src={avatar || undefined} alt="Avatar option" className="w-full h-full object-cover" />
                        {selectedAvatar === avatar && (
                          <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Profile Name</label>
                    <Input
                      placeholder="Enter name"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={handleAddProfile}
                    disabled={!newProfileName}
                  >
                    Create Profile
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </div>

      <Button 
        variant="outline" 
        className="mt-16 border-zinc-700 text-zinc-500 hover:text-white hover:border-white transition-all px-8 py-6"
        onClick={() => {
          // Manage profiles logic
        }}
      >
        Manage Profiles
      </Button>
    </div>
  );
}
