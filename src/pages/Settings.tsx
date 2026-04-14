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
import { Camera, Trash2, User as UserIcon, AlertTriangle, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, userData, currentProfile } = useAuth();
  const [name, setName] = useState(currentProfile?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleUpdateProfile = async () => {
    if (!user || !currentProfile) return;
    setIsUpdating(true);
    try {
      const profileRef = doc(db, 'users', user.uid, 'profiles', currentProfile.id);
      await updateDoc(profileRef, { name });
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
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const profileRef = doc(db, 'users', user.uid, 'profiles', currentProfile.id);
        await updateDoc(profileRef, { avatar: base64String });
        toast.success('Profile picture updated');
      } catch (error: any) {
        toast.error(error.message);
      }
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
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-20 max-w-4xl mx-auto">
      <h1 className="text-4xl font-black tracking-tighter text-white mb-8">Settings</h1>
      
      <div className="space-y-8">
        {/* Profile Settings */}
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-red-600" />
              Profile Settings
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Update your profile information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-zinc-800 group-hover:border-red-600 transition-all">
                  <img 
                    src={currentProfile?.avatar || undefined} 
                    alt={currentProfile?.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 p-2 bg-red-600 rounded-full text-white shadow-lg hover:bg-red-700 transition-all"
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
                  <label className="text-sm font-medium text-zinc-400">Profile Name</label>
                  <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={isUpdating || name === currentProfile?.name}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-red-600" />
              Account Information
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Your account details and verification status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-xl">
              <div>
                <div className="text-zinc-500 text-xs uppercase font-bold mb-1">Email Address</div>
                <div className="text-white">{user?.email}</div>
              </div>
              <div className="px-3 py-1 bg-green-500/20 text-green-500 text-[10px] font-black rounded-full uppercase tracking-widest">
                Verified
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-xl">
              <div>
                <div className="text-zinc-500 text-xs uppercase font-bold mb-1">Subscription Plan</div>
                <div className="text-white">FlixLab Free Premium</div>
              </div>
              <div className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                Active
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-zinc-900 border-red-900/30 text-white">
          <CardHeader>
            <CardTitle className="text-red-500">Danger Zone</CardTitle>
            <CardDescription className="text-zinc-400">
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-red-900/20 rounded-xl bg-red-900/5">
              <div>
                <h4 className="font-bold">Deactivate Account</h4>
                <p className="text-sm text-zinc-500">Permanently delete your account and all profiles</p>
              </div>
              
              <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
                <DialogTrigger
                  render={
                    <Button 
                      variant="destructive" 
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deactivate
                    </Button>
                  }
                />
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="w-5 h-5" />
                      Are you absolutely sure?
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      This action cannot be undone. This will permanently delete your
                      account and remove all your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="ghost"
                      onClick={() => setShowDeactivateDialog(false)}
                      className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeactivate}
                      disabled={isDeactivating}
                      className="bg-red-600 hover:bg-red-700"
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
