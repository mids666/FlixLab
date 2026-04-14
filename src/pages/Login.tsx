import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut
} from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, Chrome, User, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const countries = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", 
  "France", "Japan", "Brazil", "India", "Mexico", "Italy", "Spain", "Other"
];

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
          toast.error('Please verify your email before signing in. Check your inbox.');
          await signOut(auth);
          return;
        }
        
        toast.success('Logged in successfully');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send verification email
        await sendEmailVerification(user);
        
        // Update profile with name
        await updateProfile(user, { displayName: name });
        
        // Save extra data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          name: name,
          country: country,
          subscriptionStatus: 'active',
          createdAt: new Date().toISOString()
        });

        toast.success('Account created! Please check your email to verify your account.');
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Logged in with Google');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tighter text-red-600 mb-2">FLIXLAB</h1>
          <p className="text-gray-400">Your gateway to infinite entertainment</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl text-white">
          <CardHeader>
            <CardTitle>{isLogin ? 'Welcome Back' : 'Create Account'}</CardTitle>
            <CardDescription className="text-zinc-400">
              {isLogin ? 'Enter your credentials to access your library' : 'Join NeoFlix and start streaming for free'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <Input
                        type="text"
                        placeholder="Full Name"
                        className="bg-zinc-800/50 border-zinc-700 pl-10 focus:ring-red-600"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                      />
                    </div>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <select
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 appearance-none text-zinc-300"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required={!isLogin}
                      >
                        <option value="" disabled>Select Country</option>
                        {countries.map(c => (
                          <option key={c} value={c} className="bg-zinc-900">{c}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    className="bg-zinc-800/50 border-zinc-700 pl-10 focus:ring-red-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="Password"
                    className="bg-zinc-800/50 border-zinc-700 pl-10 focus:ring-red-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {isLogin && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-zinc-500 hover:text-red-500 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6" disabled={loading}>
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-zinc-700 bg-transparent hover:bg-zinc-800 text-white py-6"
              onClick={handleGoogleLogin}
            >
              <Chrome className="mr-2 h-4 w-4" />
              Google
            </Button>

            <div className="mt-4">
              <Button
                variant="ghost"
                className="w-full text-zinc-500 hover:text-white"
                onClick={() => navigate('/')}
              >
                Browse as Guest
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
