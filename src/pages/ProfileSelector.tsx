import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, User, Check, Mail, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { signOut, sendEmailVerification } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar',
];

const THEME_COLORS = [
  { name: 'Red', value: 'oklch(0.6 0.25 25)' },
  { name: 'Blue', value: 'oklch(0.588 0.158 241.966)' },
  { name: 'Green', value: 'oklch(0.727 0.192 149.313)' },
  { name: 'Yellow', value: 'oklch(0.795 0.184 86.047)' },
  { name: 'Purple', value: 'oklch(0.536 0.222 316.037)' },
];

export default function ProfileSelector() {
  const { user, userData, profiles, setCurrentProfile, addProfile } = useAuth();
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(THEME_COLORS[0].value);
  const [isAdding, setIsAdding] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setIsResending(true);
    try {
      await sendEmailVerification(user);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsResending(false);
    }
  };

  const handleAddProfile = async () => {
    if (!user || !newProfileName) return;
    
    try {
      await addProfile(newProfileName, selectedAvatar, selectedColor);
      setNewProfileName('');
      setIsAdding(false);
      toast.success('Profile created');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-foreground mb-12"
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
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-transparent group-hover:border-foreground transition-all duration-300">
                <img src={profile.avatar || undefined} alt={profile.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-muted-foreground group-hover:text-foreground text-xl font-medium transition-colors">
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
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl flex items-center justify-center border-4 border-dashed border-border group-hover:border-muted-foreground transition-all duration-300">
                      <Plus className="w-12 h-12 text-border group-hover:text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground text-xl font-medium transition-colors">
                      Add Profile
                    </span>
                  </motion.div>
                }
              />
              <DialogContent className="bg-card border-border text-foreground">
                <DialogHeader>
                  <DialogTitle>Add Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="flex justify-center gap-4">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all`}
                        style={{ borderColor: selectedAvatar === avatar ? selectedColor : 'transparent', transform: selectedAvatar === avatar ? 'scale(1.1)' : 'scale(1)' }}
                      >
                        <img src={avatar || undefined} alt="Avatar option" className="w-full h-full object-cover" />
                        {selectedAvatar === avatar && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${selectedColor}33` }}>
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Theme Color</label>
                    <div className="flex justify-center gap-3">
                      {THEME_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedColor(color.value)}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            selectedColor === color.value ? 'border-foreground scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color.value }}
                        >
                          {selectedColor === color.value && (
                            <Check className="w-5 h-5 text-white mx-auto shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Profile Name</label>
                    <Input
                      placeholder="Enter name"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      className="bg-muted border-border"
                    />
                  </div>
                  <Button 
                    className="w-full text-white font-bold h-12"
                    style={{ backgroundColor: selectedColor }}
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
        className="mt-16 border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-all px-8 py-6"
        onClick={() => {
          // Manage profiles logic
        }}
      >
        Manage Profiles
      </Button>
    </div>
  );
}
