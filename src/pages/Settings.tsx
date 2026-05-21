import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Camera, Trash2, User as UserIcon, AlertTriangle, Mail, Monitor, LayoutGrid, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  const { user, userData, currentProfile, updateProfile } = useAuth();
  const { settings, updateSetting } = useSettings();
  const [name, setName] = useState(currentProfile?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Sync name with profile changes
  React.useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name);
    }
  }, [currentProfile?.id, currentProfile?.name]);

  const handleUpdateProfile = async () => {
    if (!user || !currentProfile) return;
    setIsUpdating(true);
    try {
      await updateProfile(currentProfile.id, { name });
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !currentProfile) return;

    if (file.size > 1024 * 1024) { // 1MB limit for base64
      toast.error('File too large. Please choose an image under 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          updateProfile(currentProfile.id, { avatar: compressedBase64 })
            .then(() => {
              toast.success('Profile picture updated successfully');
            })
            .catch((error: any) => {
              toast.error(error.message || 'Failed to update profile picture');
            });
        }
      };
      img.onerror = () => {
        toast.error('Failed to load selected image file.');
      };
    };
    reader.readAsDataURL(file);
  };

  const handleDeactivate = async () => {
    if (!user) return;
    setIsDeactivating(true);
    try {
      // Delete user data in Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete user in Auth
      await deleteUser(user);
      toast.success('Account deactivated');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message);
      // If re-authentication is needed, sign out instead
      if (error.code === 'auth/requires-recent-login') {
        toast.info('Please sign in again to deactivate your account.');
        await signOut(auth);
        navigate('/login');
      }
    } finally {
      setIsDeactivating(false);
      setShowDeactivateDialog(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-20 max-w-4xl mx-auto transition-colors duration-300">
      <h1 className="text-4xl font-black tracking-tighter text-foreground mb-8 transition-colors">Settings</h1>
      
      <div className="space-y-8">
        {/* Profile Settings */}
        <Card className="bg-card border-border text-foreground transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-brand" />
              Profile Settings
            </CardTitle>
            <CardDescription className="text-muted-foreground transition-colors">
              Update your profile information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-border group-hover:border-brand transition-all shadow-xl">
                  <img 
                    src={currentProfile?.avatar || undefined} 
                    alt={currentProfile?.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 p-2 bg-brand rounded-full text-white shadow-lg hover:bg-brand/80 transition-all"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
              
              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground transition-colors">Profile Name</label>
                  <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-muted border-border text-foreground transition-colors"
                  />
                </div>
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={isUpdating || name === currentProfile?.name}
                  className="bg-brand hover:bg-brand/80 text-white font-bold transition-all"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card className="bg-card border-border transition-colors duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Monitor className="w-5 h-5 text-brand" />
              App Preferences
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Customize your FlixLab experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Theme Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">Interface Theme</h4>
                  <p className="text-xs text-muted-foreground">Choose your preferred visual style</p>
                </div>
                <div className="flex bg-muted p-1 rounded-xl">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateSetting('theme', t)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        settings.theme === t 
                          ? 'bg-brand text-white shadow-lg' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Movie Card Size */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Movie Card Size</h4>
                    <p className="text-xs text-muted-foreground">Adjust the display size of media posters</p>
                  </div>
                </div>
                <div className="flex bg-muted p-1 rounded-xl">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSetting('cardSize', size)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        settings.cardSize === size 
                          ? 'bg-background text-foreground shadow-lg border border-border' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Autoplay Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">Autoplay Trailers</h4>
                  <p className="text-xs text-muted-foreground">Automatically play trailers on details pages</p>
                </div>
              </div>
              <Switch 
                checked={settings.autoplay}
                onCheckedChange={(checked) => updateSetting('autoplay', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="bg-card border-border transition-colors duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Mail className="w-5 h-5 text-brand" />
              Account Information
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your account details and verification status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted rounded-xl transition-colors">
              <div>
                <div className="text-muted-foreground text-xs uppercase font-bold mb-1 transition-colors">Email Address</div>
                <div className="text-foreground font-medium transition-colors">{user?.email}</div>
              </div>
              <div className="px-3 py-1 bg-green-500/20 text-green-500 text-[10px] font-black rounded-full uppercase tracking-widest transition-colors">
                Verified
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted rounded-xl transition-colors">
              <div>
                <div className="text-muted-foreground text-xs uppercase font-bold mb-1 transition-colors">Subscription Plan</div>
                <div className="text-foreground font-medium transition-colors">FlixLab Free Premium</div>
              </div>
              <div className="px-3 py-1 bg-brand text-white text-[10px] font-black rounded-full uppercase tracking-widest transition-colors">
                Active
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-card border-brand/30 text-foreground transition-colors overflow-hidden">
          <CardHeader className="bg-brand/5">
            <CardTitle className="text-brand">Danger Zone</CardTitle>
            <CardDescription className="text-muted-foreground transition-colors">
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between p-4 border border-brand/20 rounded-xl bg-brand/5 gap-4">
              <div>
                <h4 className="font-bold text-foreground transition-colors">Deactivate Account</h4>
                <p className="text-sm text-muted-foreground transition-colors">Permanently delete your account and all profiles</p>
              </div>
              
              <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
                <DialogTrigger
                  render={
                    <Button 
                      variant="destructive" 
                      className="bg-brand hover:bg-brand/80 text-white font-bold w-full md:w-auto transition-all"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deactivate
                    </Button>
                  }
                />
                <DialogContent className="bg-card border-border text-foreground transition-colors">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-brand transition-colors">
                      <AlertTriangle className="w-5 h-5" />
                      Are you absolutely sure?
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground transition-colors">
                      This action cannot be undone. This will permanently delete your
                      account and remove all your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="ghost"
                      onClick={() => setShowDeactivateDialog(false)}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeactivate}
                      disabled={isDeactivating}
                      className="bg-brand hover:bg-brand/80 text-white font-bold transition-all"
                    >
                      {isDeactivating ? 'Deactivating...' : 'Yes, Deactivate Account'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
