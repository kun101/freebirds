
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { api } from '../services/api';
import { auth } from '../services/firebase';
import { UserProfile } from '../types';

interface AvatarEditorProps {
  onJoin: (token: string, user: UserProfile) => void;
}

const COLORS = [
  { name: 'Freshman Blue', hex: '#3b82f6' },
  { name: 'Varsity Red', hex: '#ef4444' },
  { name: 'Science Green', hex: '#10b981' },
  { name: 'Arts Yellow', hex: '#f59e0b' },
  { name: 'Royal Purple', hex: '#8b5cf6' },
  { name: 'Preppy Pink', hex: '#ec4899' },
  { name: 'Senior Gray', hex: '#64748b' },
  { name: 'Midnight', hex: '#1f2937' },
];

type AuthMode = 'guest' | 'login' | 'register';

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ onJoin }) => {
  const [activeTab, setActiveTab] = useState<AuthMode>('guest');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Start loading to check auth
  const [authChecked, setAuthChecked] = useState(false);
  const isSubmitting = useRef(false);

  // Check for persistent login
  useEffect(() => {
    if (!auth) {
        setLoading(false);
        setAuthChecked(true);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If we are in the middle of a manual submission (Guest/Login click), ignore this auto-trigger
      // to prevent race conditions where we load an old profile before the new one is created.
      if (isSubmitting.current) return;

      if (user) {
        setLoading(true);
        try {
          const data = await api.resumeSession(user);
          onJoin(data.token, data.user);
        } catch (err) {
          console.error("Auto-login failed", err);
          setLoading(false);
          setAuthChecked(true);
        }
      } else {
        setLoading(false);
        setAuthChecked(true);
      }
    });

    return () => unsubscribe();
  }, [onJoin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    isSubmitting.current = true;

    try {
      if (!name.trim()) {
        throw new Error('NAME REQUIRED');
      }

      let data;
      
      if (activeTab === 'guest') {
          // Guest Logic
          const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)].hex;
          data = await api.signup(name, null, randomColor);
      } else if (activeTab === 'login') {
          // Login Logic
          if (!password) throw new Error("PASSWORD REQUIRED");
          data = await api.login(name, password);
      } else {
          // Register Logic
          if (!password) throw new Error("PASSWORD REQUIRED");
          data = await api.signup(name, password, selectedColor);
      }

      onJoin(data.token, data.user);
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      
      if (msg.includes('auth/')) {
        msg = msg.split('/')[1].replace(/-/g, ' ').toUpperCase();
      }
      setError(msg || 'ERROR STARTING GAME');
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const switchTab = (tab: AuthMode) => {
      setActiveTab(tab);
      setError('');
  };

  if (loading && !authChecked) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center font-['Press_Start_2P']">
              <div className="text-yellow-400 text-2xl animate-pulse">LOADING CAMPUS...</div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-['Press_Start_2P'] relative overflow-hidden">
      {/* Retro Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111),linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111)]" 
           style={{ backgroundSize: '20px 20px', backgroundColor: '#1a202c', backgroundPosition: '0 0, 10px 10px' }}>
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        
        {/* Game Title */}
        <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl text-yellow-400 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] leading-tight mb-2" 
                style={{ textShadow: '4px 4px 0 #b45309' }}>
                FREEBIRDS
            </h1>
            <p className="text-white text-xs mt-4 animate-pulse">WELCOME TO BIRDIE UNIVERSITY</p>
        </div>

        <div className="bg-blue-800 border-4 border-white p-1 shadow-[8px_8px_0_rgba(0,0,0,0.5)]">
            <div className="border-4 border-blue-900 bg-blue-700 p-6">
                
                {/* 3-Way Tabs */}
                <div className="flex mb-6 border-b-4 border-blue-900 pb-2 gap-2 justify-center">
                    <button 
                        type="button"
                        onClick={() => switchTab('guest')}
                        className={`text-[10px] uppercase py-2 px-2 transition-colors ${activeTab === 'guest' ? 'text-yellow-400 border-b-4 border-yellow-400' : 'text-blue-300 hover:text-white'}`}
                    >
                        Guest
                    </button>
                    <button 
                        type="button"
                        onClick={() => switchTab('login')}
                        className={`text-[10px] uppercase py-2 px-2 transition-colors ${activeTab === 'login' ? 'text-yellow-400 border-b-4 border-yellow-400' : 'text-blue-300 hover:text-white'}`}
                    >
                        Login
                    </button>
                    <button 
                        type="button"
                        onClick={() => switchTab('register')}
                        className={`text-[10px] uppercase py-2 px-2 transition-colors ${activeTab === 'register' ? 'text-yellow-400 border-b-4 border-yellow-400' : 'text-blue-300 hover:text-white'}`}
                    >
                        Register
                    </button>
                </div>

                {activeTab === 'register' && (
                    <div className="flex justify-center mb-6">
                        <div className="bg-black border-4 border-white w-24 h-24 flex items-center justify-center relative">
                            <div className="w-16 h-16" style={{ backgroundColor: selectedColor }}>
                                <div className="w-full h-2 bg-black/20 mt-2"></div>
                                <div className="absolute top-8 left-6 w-2 h-2 bg-black"></div>
                                <div className="absolute top-8 right-6 w-2 h-2 bg-black"></div>
                                <div className="absolute top-10 left-8 w-2 h-2 bg-orange-500"></div>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Header based on Tab */}
                    <div className="text-center text-xs text-blue-200 mb-4 h-4">
                        {activeTab === 'guest' && "QUICK PLAY - NO SAVE"}
                        {activeTab === 'login' && "WELCOME BACK STUDENT"}
                        {activeTab === 'register' && "NEW STUDENT ENROLLMENT"}
                    </div>

                    <div>
                        <label className="block text-[10px] text-white mb-2 uppercase tracking-widest">Student Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-blue-900 text-white border-4 border-blue-500 p-3 outline-none focus:border-yellow-400 font-['Press_Start_2P'] text-xs placeholder-blue-600"
                            placeholder="PLAYER 1"
                        />
                    </div>

                    {activeTab !== 'guest' && (
                        <div>
                            <label className="block text-[10px] text-white mb-2 uppercase tracking-widest">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-blue-900 text-white border-4 border-blue-500 p-3 outline-none focus:border-yellow-400 font-['Press_Start_2P'] text-xs placeholder-blue-600"
                                placeholder="*****"
                            />
                        </div>
                    )}

                    {activeTab === 'register' && (
                        <div>
                            <label className="block text-[10px] text-white mb-2 uppercase tracking-widest">Outfit Color</label>
                            <div className="grid grid-cols-4 gap-2">
                                {COLORS.map((c) => (
                                    <button
                                        key={c.hex}
                                        type="button"
                                        onClick={() => setSelectedColor(c.hex)}
                                        className={`w-full aspect-square border-4 ${selectedColor === c.hex ? 'border-white' : 'border-black/30 hover:border-white/50'}`}
                                        style={{ backgroundColor: c.hex }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-600 text-white text-[10px] p-2 border-2 border-red-800 text-center uppercase leading-relaxed">
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        {activeTab === 'guest' ? (
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-500 hover:bg-green-400 text-white border-b-8 border-green-700 active:border-b-0 active:mt-2 text-sm py-4 uppercase tracking-widest transition-all shadow-lg"
                                style={{ textShadow: '2px 2px 0 #000' }}
                            >
                                {loading ? 'LOADING...' : 'CONTINUE AS GUEST'}
                            </button>
                        ) : activeTab === 'login' ? (
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-800 hover:bg-blue-600 text-white border-b-4 border-blue-950 active:border-b-0 active:mt-1 text-xs py-3 uppercase tracking-widest transition-all"
                            >
                                {loading ? 'LOADING...' : 'LOGIN'}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white border-b-4 border-purple-800 active:border-b-0 active:mt-1 text-xs py-3 uppercase tracking-widest transition-all"
                            >
                                {loading ? 'LOADING...' : 'CREATE ACCOUNT'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
        
        <div className="text-center mt-8 text-blue-500 text-[10px]">
            &copy; 2025 BIRDIE UNIVERSITY
        </div>
      </div>
    </div>
  );
};
