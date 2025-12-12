import React, { useState, useEffect } from 'react';
import { AvatarEditor } from './components/AvatarEditor';
import { GameCanvas } from './components/GameCanvas';
import { ChatBox } from './components/ChatBox';
import { VirtualGamepad } from './components/VirtualGamepad';
import { MinigameOverlay } from './components/MinigameOverlay';
import { PixelAvatar } from './components/PixelAvatar';
import { Player, GameState, RoomId, ChatMessage, getRoomDetails, UserProfile, Direction, NPC, QUESTION_BANK, Quiz, COURSE_CATALOG, Course, DormConfig } from './types';
import { socketService } from './services/socket';
import { geminiService } from './services/gemini';
import { audioService } from './services/audio';
import { Users, LogOut, MessageCircle, Wifi, WifiOff, X, UserPlus, Home, BookOpen, Edit2, Save, UserCheck, Loader2, Star, Trophy, Sparkles, CheckSquare, Square, BedDouble, Palette, User, Smile, Volume2, VolumeX } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './services/firebase';

const PLAYER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#64748b', '#1f2937'
];

export default function App() {
  const [isInGame, setIsInGame] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    currentUser: null,
    players: {},
    currentRoom: RoomId.ENTRANCE,
    messages: [],
    isConnected: false,
  });
  
  // Overlay States
  const [showChat, setShowChat] = useState(false);
  const [showNear, setShowNear] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const [connectionError, setConnectionError] = useState('');
  
  // Mobile Input
  const [inputDirection, setInputDirection] = useState<Direction | null>(null);
  const [interactionTrigger, setInteractionTrigger] = useState(0);
  
  // UI States
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  
  // NPC Dialogue
  const [activeDialogue, setActiveDialogue] = useState<{name: string, text: string} | null>(null);
  
  // Friends & Editing
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Extended Edit Form
  const [editForm, setEditForm] = useState({ 
      bio: '', 
      major: '', 
      year: '', 
      enrolledCourses: [] as string[],
      hat: '',
      glasses: '',
      color: '#3b82f6',
      dormFloorColor: '#fef3c7',
      dormBedColor: '#3b82f6'
  });

  // Learning & Quizzes
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'study' | 'quiz' | null>(null);
  
  // Study State
  const [studyMaterial, setStudyMaterial] = useState<string | null>(null);
  
  // Quiz State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  
  // Minigame State
  const [activeMinigame, setActiveMinigame] = useState<'penalty' | 'sprint' | null>(null);
  
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);

  // Setup Socket Listeners
  useEffect(() => {
    socketService.on('connect', () => {
      setGameState(prev => ({ ...prev, isConnected: true }));
      setConnectionError('');
      // Set my profile initially
      if (socketService.currentUserProfile) {
        setMyProfile(socketService.currentUserProfile);
        loadFriends(socketService.currentUserProfile.friends);
      }
      audioService.playSFX('join');
    });

    socketService.on('error', (err: { message: string }) => {
      setConnectionError(err.message);
    });

    socketService.on('gameState', (data: { players: Record<string, Player>; room: string }) => {
      setGameState(prev => ({
        ...prev,
        players: data.players,
        currentRoom: data.room,
        currentUser: Object.values(data.players).find(p => p.id === socketService.currentUserId) || prev.currentUser
      }));
    });

    socketService.on('chatMessage', (msg: ChatMessage) => {
      audioService.playSFX('chat');
      setGameState(prev => {
        if (prev.messages.some(m => m.id === msg.id)) return prev;
        
        const players = { ...prev.players };
        if (players[msg.playerId]) {
            players[msg.playerId] = {
                ...players[msg.playerId],
                lastMessage: { text: msg.text, timestamp: msg.timestamp }
            };
        }

        return {
          ...prev,
          players,
          messages: [...prev.messages, msg].slice(-50)
        };
      });
    });

    socketService.on('roomJoined', (data: { roomId: string, players: Record<string, Player> }) => {
      setGameState(prev => ({
        ...prev,
        currentRoom: data.roomId,
        players: data.players,
        messages: [] 
      }));
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Keyboard shortcut for Chat and ESC
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isInGame) return;
          
          if (e.key === 'y' && !showChat) {
              e.preventDefault(); 
              closeAllOverlays();
              setShowChat(true);
          } else if (e.key === 'Escape') {
              e.preventDefault();
              closeAllOverlays();
              setActiveDialogue(null);
              // Only close minigame/profile if explicitly open, escape is "back"
              if (selectedPlayerProfile) setSelectedPlayerProfile(null);
              if (isEditingProfile) setIsEditingProfile(false);
              if (activeDepartment) closeLearning();
              if (activeMinigame) setActiveMinigame(null);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInGame, showChat, activeDepartment, activeMinigame, selectedPlayerProfile, isEditingProfile]);

  const loadFriends = async (friendIds: string[]) => {
    if (!friendIds || friendIds.length === 0) {
      setFriendsList([]);
      return;
    }
    const friendsData = await socketService.getUsers(friendIds);
    setFriendsList(friendsData);
  };

  const handleLoginSuccess = async (token: string, user: UserProfile) => {
    try {
      // Initialize Audio Context on user interaction (login button click)
      audioService.init();
      audioService.playBGM();
      
      setConnectionError('');
      await socketService.connect(token);
      
      socketService.emit('joinRoom', RoomId.ENTRANCE);
      setMyProfile(user);
      loadFriends(user.friends);
      
      const spawn = getRoomDetails(RoomId.ENTRANCE).spawn;
      setGameState(prev => ({
        ...prev,
        currentUser: {
          id: user.id,
          name: user.name,
          color: user.color || user.photoURL || '#3b82f6', 
          room: RoomId.ENTRANCE,
          x: spawn.x,
          y: spawn.y,
          facing: 'down',
          isMoving: false,
          hat: user.hat,
          glasses: user.glasses,
          emote: null
        }
      }));
      setIsInGame(true);
    } catch (e: any) {
      setConnectionError(e.message || 'Failed to connect to campus server.');
    }
  };

  const handleLogout = async () => {
      socketService.disconnect();
      audioService.stopBGM();
      if (auth) await signOut(auth);
      
      setIsInGame(false);
      setGameState({
        currentUser: null,
        players: {},
        currentRoom: RoomId.ENTRANCE,
        messages: [],
        isConnected: false,
      });
      setMyProfile(null);
      setFriendsList([]);
      closeAllOverlays();
  };

  const handleMove = (x: number, y: number, facing: Direction) => {
    socketService.emit('move', { x, y, facing });
    if (activeDialogue) setActiveDialogue(null); 
    if (activeDepartment) {
        closeLearning();
    }
    // Close overlays on move if needed, or keep them? Keeping them is fine.
  };

  const closeLearning = () => {
      setActiveDepartment(null);
      setActiveAction(null);
      setStudyMaterial(null);
      setActiveQuiz(null);
      setIsContentLoading(false);
  };

  const handleChat = (text: string) => {
    socketService.emit('chat', text);
  };

  const handleWarp = (targetRoom: string, targetX: number, targetY: number, facing: Direction) => {
      let finalTarget = targetRoom;
      
      // Redirect to own dorm if targeting generic hostel
      if (targetRoom === RoomId.HOSTEL) {
          finalTarget = `hostel_${socketService.currentUserId}`;
      }

      socketService.emit('joinRoom', { roomId: finalTarget, spawn: { x: targetX, y: targetY }, facing });
  };

  const handleRoomChange = (roomId: string) => {
    socketService.emit('joinRoom', roomId);
  };

  const handlePlayerClick = async (playerId: string) => {
    if (playerId === socketService.currentUserId && myProfile) {
        setSelectedPlayerProfile(myProfile);
        return;
    }

    setIsProfileLoading(true);
    const profile = await socketService.fetchUserProfile(playerId);
    
    if (!profile) {
        const p = gameState.players[playerId];
        if (p) {
            setSelectedPlayerProfile({
                id: p.id,
                name: p.name,
                major: 'Student',
                year: 'Unknown',
                bio: 'Profile unavailable.',
                enrolledCourses: [],
                friends: [],
                xp: 0,
                level: 1
            });
        }
    } else {
        setSelectedPlayerProfile(profile);
    }
    
    setIsProfileLoading(false);
  };

  const handleInteractNPC = (npc: NPC) => {
     audioService.playSFX('chat');
     const text = npc.dialogues[Math.floor(Math.random() * npc.dialogues.length)];
     setActiveDialogue({ name: npc.name, text });
  };

  const handleStartStudy = (dept: string) => {
      setActiveDepartment(dept);
      setActiveAction('study');
  };

  const handleStartQuiz = (dept: string) => {
      setActiveDepartment(dept);
      setActiveAction('quiz');
  };

  const handlePlayMinigame = (game: 'penalty' | 'sprint') => {
      if (!myProfile) return;
      setActiveMinigame(game);
  };

  const handleMinigameComplete = async (xpReward: number) => {
    if (!myProfile || xpReward <= 0) return;
    
    audioService.playSFX('success');
    const newXp = (myProfile.xp || 0) + xpReward;
    const calculatedLevel = Math.floor(newXp / 100) + 1;
    const updates = { xp: newXp, level: calculatedLevel };
    
    await socketService.updateUserProfile(updates);
    setMyProfile({ ...myProfile, ...updates });
    
    if (calculatedLevel > (myProfile.level || 1)) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
    }
  };

  const handleEmote = (emote: string) => {
      audioService.playSFX('chat');
      socketService.sendEmote(emote);
      setShowEmotes(false);
  };

  const toggleMute = () => {
      const muted = audioService.toggleMute();
      setIsMuted(muted);
  };

  // --- Content Generation Logic ---
  const generateLocalQuiz = (topic: string, userLevel: number): Quiz => {
      const deptKey = topic.toLowerCase();
      const allQuestions = QUESTION_BANK[deptKey] || [];
      
      let tier = 1;
      if (userLevel >= 3) tier = 2;
      if (userLevel >= 6) tier = 3;

      const eligibleQuestions = allQuestions.filter(q => q.tier === tier);
      const shuffled = [...eligibleQuestions].sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, 5);
      const xpPerQ = 10 * tier; 
      
      return {
          topic: topic.toUpperCase(),
          questions: selectedQuestions,
          xpReward: selectedQuestions.length * xpPerQ,
          difficulty: tier === 1 ? 'Easy' : tier === 2 ? 'Medium' : 'Hard'
      };
  };

  const startContentSession = async (courseName: string) => {
      if (!myProfile || !activeAction) return;
      
      setIsContentLoading(true);
      const userLevel = myProfile.level || 1;

      // Find the course details
      const course = COURSE_CATALOG.find(c => c.name === courseName);
      let currentTopic = courseName;
      
      // Calculate syllabus topic based on level (academic progression)
      if (course && course.syllabus && course.syllabus.length > 0) {
          const topicIndex = (userLevel - 1) % course.syllabus.length;
          currentTopic = course.syllabus[topicIndex];
      }

      if (activeAction === 'study') {
          const notes = await geminiService.generateStudyMaterial(courseName, currentTopic, userLevel);
          setStudyMaterial(notes);
      } else {
          // Quiz logic
          let questions = [];
          let difficultyStr: 'Easy' | 'Medium' | 'Hard' = 'Easy';
          let xpPerQ = 10;
          
          try {
            questions = await geminiService.generateQuizQuestions(courseName, currentTopic, userLevel);
          } catch (e) {
            console.warn("Gemini Failed, falling back to local.");
          }

          if (questions.length === 0) {
             // Fallback uses department generic questions
             const localQuiz = generateLocalQuiz(activeDepartment || 'cs', userLevel);
             questions = localQuiz.questions;
             difficultyStr = localQuiz.difficulty;
             xpPerQ = localQuiz.xpReward / (questions.length || 1);
          }

          if (userLevel >= 3 && userLevel < 6) { difficultyStr = 'Medium'; xpPerQ = 20; }
          else if (userLevel >= 6) { difficultyStr = 'Hard'; xpPerQ = 30; }

          setActiveQuiz({
              topic: currentTopic.toUpperCase(),
              questions: questions,
              xpReward: questions.length * xpPerQ,
              difficulty: difficultyStr
          });
          setCurrentQuestionIndex(0);
          setQuizScore(0);
          setQuizCompleted(false);
      }

      setIsContentLoading(false);
  };

  const handleQuizAnswer = (optionIndex: number) => {
      if (!activeQuiz) return;
      
      const isCorrect = optionIndex === activeQuiz.questions[currentQuestionIndex].correct;
      if (isCorrect) {
          setQuizScore(prev => prev + 1);
      }
      
      if (currentQuestionIndex < activeQuiz.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
      } else {
          // Finished
          const finalScore = isCorrect ? quizScore + 1 : quizScore;
          setQuizScore(finalScore);
          setQuizCompleted(true);
          if (finalScore >= Math.ceil(activeQuiz.questions.length * 0.6)) {
              audioService.playSFX('success');
          }
      }
  };

  const claimRewards = async () => {
      if (!activeQuiz || !myProfile) return;

      const passed = quizScore >= Math.ceil(activeQuiz.questions.length * 0.6); 
      
      if (passed) {
          const newXp = (myProfile.xp || 0) + activeQuiz.xpReward;
          const calculatedLevel = Math.floor(newXp / 100) + 1;
          
          if (calculatedLevel > (myProfile.level || 1)) {
              setShowLevelUp(true);
              setTimeout(() => setShowLevelUp(false), 3000);
          }
          
          const updates = { xp: newXp, level: calculatedLevel };
          await socketService.updateUserProfile(updates);
          setMyProfile({ ...myProfile, ...updates });
      }
      closeLearning();
  };

  const handleAddFriend = async () => {
    if (selectedPlayerProfile) {
      await socketService.addFriend(selectedPlayerProfile.id);
      if (myProfile) {
        const updatedFriends = [...(myProfile.friends || []), selectedPlayerProfile.id];
        setMyProfile({ ...myProfile, friends: updatedFriends });
        loadFriends(updatedFriends);
      }
    }
  };

  const openEditProfile = () => {
    if (myProfile) {
      setEditForm({
        bio: myProfile.bio,
        major: myProfile.major,
        year: myProfile.year,
        enrolledCourses: myProfile.enrolledCourses || [],
        hat: myProfile.hat || '',
        glasses: myProfile.glasses || '',
        color: myProfile.color || '#3b82f6',
        dormFloorColor: myProfile.dormConfig?.floorColor || '#fef3c7',
        dormBedColor: myProfile.dormConfig?.bedColor || '#3b82f6'
      });
      setIsEditingProfile(true);
      setSelectedPlayerProfile(null);
    }
  };

  const saveProfile = async () => {
    const updates = {
        ...editForm,
        dormConfig: {
            floorColor: editForm.dormFloorColor,
            bedColor: editForm.dormBedColor
        }
    };
    
    // Flatten for sending logic
    const visualUpdates = {
        hat: editForm.hat,
        glasses: editForm.glasses,
        color: editForm.color
    };

    // Remove temp dorm fields
    delete (updates as any).dormFloorColor;
    delete (updates as any).dormBedColor;

    await socketService.updateUserProfile(updates);
    // Instant visual update for peers in the room
    await socketService.updatePlayerVisuals(visualUpdates);

    // Instant local update
    if (myProfile) {
      setMyProfile({ ...myProfile, ...updates });
    }
    
    // Force local player state update for instant feedback
    setGameState(prev => {
        const currentId = socketService.currentUserId;
        if (!currentId || !prev.players[currentId]) return prev;
        
        return {
            ...prev,
            players: {
                ...prev.players,
                [currentId]: {
                    ...prev.players[currentId],
                    hat: editForm.hat,
                    glasses: editForm.glasses,
                    color: editForm.color
                }
            },
            currentUser: {
                ...prev.currentUser!,
                hat: editForm.hat,
                glasses: editForm.glasses,
                color: editForm.color
            }
        };
    });

    setIsEditingProfile(false);
  };

  const toggleCourseEnrollment = (courseId: string) => {
    setEditForm(prev => {
        const exists = prev.enrolledCourses.includes(courseId);
        if (exists) return { ...prev, enrolledCourses: prev.enrolledCourses.filter(id => id !== courseId) };
        else return { ...prev, enrolledCourses: [...prev.enrolledCourses, courseId] };
    });
  };

  const getMyCoursesForDept = (dept: string) => {
      if (!myProfile) return [];
      if (dept === 'general') {
          // Return all courses for general study
          return COURSE_CATALOG.filter(c => myProfile.enrolledCourses.includes(c.id));
      }
      return COURSE_CATALOG.filter(c => c.department === dept && myProfile.enrolledCourses.includes(c.id));
  };

  if (!isInGame) {
    return (
      <>
        <AvatarEditor onJoin={handleLoginSuccess} />
        {connectionError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-none border-4 border-red-800 shadow-xl z-50 flex items-center gap-3 pixel-text text-xs">
            <span className="font-bold">{connectionError}</span>
          </div>
        )}
      </>
    );
  }

  // --- XP BAR CALCULATIONS ---
  const xp = myProfile?.xp || 0;
  const level = Math.floor(xp / 100) + 1; 
  const xpForCurrentLevel = (level - 1) * 100;
  const xpProgressInLevel = xp - xpForCurrentLevel;
  const xpPercent = Math.min(100, Math.max(0, (xpProgressInLevel / 100) * 100));

  // Overlay Helpers
  const closeAllOverlays = () => {
      setShowChat(false);
      setShowNear(false);
      setShowFriends(false);
      setShowEmotes(false);
  };

  // Determine current player dorm config for rendering own room
  const myDormConfig = (gameState.currentRoom === `hostel_${socketService.currentUserId}`) 
    ? myProfile?.dormConfig 
    : undefined;

  return (
    <div className="h-screen w-full bg-slate-900 overflow-hidden relative font-['Press_Start_2P']">
      
      {/* 1. Game Canvas (Full Screen) */}
      <GameCanvas 
        players={gameState.players} 
        currentRoom={gameState.currentRoom}
        currentUserId={socketService.currentUserId}
        onMove={handleMove}
        onPlayerClick={handlePlayerClick}
        onInteractNPC={handleInteractNPC}
        onStartStudy={handleStartStudy}
        onStartQuiz={handleStartQuiz}
        onPlayMinigame={handlePlayMinigame}
        onWarp={handleWarp}
        inputDirection={inputDirection}
        interactionTrigger={interactionTrigger}
        disableControls={showChat || showNear || showFriends || !!activeDepartment || !!selectedPlayerProfile || isEditingProfile || !!activeMinigame || showEmotes}
        dormConfig={myDormConfig}
      />

      {/* 2. HUD Layer (Pointer events pass through unless on specific element) */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
          
          {/* Top Bar */}
          <div className="flex justify-between items-start pointer-events-auto">
              {/* Left: Profile Summary with Detailed XP */}
              <div 
                className="bg-slate-800/95 border-2 border-white p-3 flex items-center gap-3 shadow-xl cursor-pointer hover:bg-slate-700 transition-colors rounded-lg"
                onClick={() => handlePlayerClick(socketService.currentUserId!)}
              >
                  <div className="w-10 h-10 bg-slate-700 border-2 border-white flex items-center justify-center rounded overflow-hidden relative">
                      <div className="scale-[2]">
                          <PixelAvatar color={myProfile?.color || '#3b82f6'} hat={myProfile?.hat} glasses={myProfile?.glasses} />
                      </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div className="text-yellow-400 text-xs font-bold truncate max-w-[100px]">{gameState.currentUser?.name}</div>
                      <div className="bg-yellow-900/50 border border-yellow-600 px-1.5 py-0.5 rounded text-[8px] text-yellow-200">
                        LVL {level}
                      </div>
                    </div>
                    
                    {/* XP Progress */}
                    <div className="flex flex-col gap-1">
                      <div className="w-32 h-3 bg-slate-950 border border-slate-500 rounded-full overflow-hidden relative">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${xpPercent}%` }}
                        ></div>
                      </div>
                      <div className="text-[8px] text-slate-400 text-right">
                         {xp} / {level * 100} XP
                      </div>
                    </div>
                  </div>
              </div>

              {/* Right: Floating Action Buttons */}
              <div className="flex gap-2">
                 <button
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isMuted ? 'bg-red-500' : 'bg-slate-800'} text-white hover:bg-slate-700`}
                 >
                     {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                 </button>
                 <button 
                    onClick={() => { closeAllOverlays(); setShowEmotes(!showEmotes); }}
                    className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform active:scale-95 ${showEmotes ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                 >
                     <Smile size={20} />
                 </button>
                 <button 
                    onClick={() => { closeAllOverlays(); setShowChat(!showChat); }}
                    className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform active:scale-95 ${showChat ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                 >
                     <MessageCircle size={20} />
                 </button>
                 <button 
                    onClick={() => { closeAllOverlays(); setShowNear(!showNear); }}
                    className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform active:scale-95 ${showNear ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                 >
                     <Users size={20} />
                 </button>
                 <button 
                    onClick={() => { closeAllOverlays(); setShowFriends(!showFriends); }}
                    className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform active:scale-95 ${showFriends ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                 >
                     <UserPlus size={20} />
                 </button>
                 <button 
                    onClick={handleLogout}
                    className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform active:scale-95 bg-red-600 text-white hover:bg-red-500"
                 >
                     <LogOut size={20} />
                 </button>
              </div>
          </div>

          {/* Bottom Bar: Helper Text & Gamepad */}
          <div className="pointer-events-none">
             {/* Center Helper Text */}
             {!showChat && !activeDepartment && !activeMinigame && (
                 <div className="text-center mb-4">
                     <span className="bg-black/50 text-white px-2 py-1 text-[8px] rounded backdrop-blur-sm border border-white/20">
                         WASD / ARROWS TO MOVE • 'Y' TO CHAT
                     </span>
                 </div>
             )}
             {/* Gamepad is absolute positioned inside VirtualGamepad component, we just render it */}
          </div>
      </div>

      {/* 3. Gamepad Layer (Visible only if controls enabled and not chatting) */}
      {!showChat && !activeDepartment && !selectedPlayerProfile && !isEditingProfile && !activeMinigame && !showEmotes && (
          <VirtualGamepad 
            onDirectionChange={setInputDirection} 
            onInteract={() => setInteractionTrigger(n => n + 1)}
          />
      )}

      {/* 4. Minigame Overlay */}
      {activeMinigame && (
        <MinigameOverlay 
          gameType={activeMinigame}
          onComplete={handleMinigameComplete}
          onClose={() => setActiveMinigame(null)}
        />
      )}

      {/* 5. Chat Overlay */}
      {showChat && (
          <div className="absolute top-20 right-4 bottom-24 w-80 z-40 flex flex-col animate-in fade-in slide-in-from-right-4 duration-200 pointer-events-auto">
              <div className="bg-slate-900/90 backdrop-blur-md border-2 border-white flex-1 flex flex-col shadow-2xl rounded-lg overflow-hidden">
                  <div className="bg-slate-800 p-2 flex justify-between items-center border-b border-slate-700">
                      <span className="text-[10px] text-yellow-400 font-bold">CAMPUS CHAT</span>
                      <button onClick={() => setShowChat(false)}><X size={14} className="text-slate-400 hover:text-white"/></button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <ChatBox messages={gameState.messages} onSend={handleChat} />
                  </div>
              </div>
          </div>
      )}

      {/* 6. Emotes Overlay */}
      {showEmotes && (
          <div className="absolute top-20 right-4 w-40 z-40 bg-slate-900/95 border-2 border-white shadow-xl rounded-lg overflow-hidden pointer-events-auto animate-in fade-in slide-in-from-right-4">
               <div className="bg-slate-800 p-2 border-b border-slate-700 flex justify-between items-center">
                   <span className="text-[10px] text-yellow-400 font-bold">EMOTES</span>
                   <button onClick={() => setShowEmotes(false)}><X size={14} className="text-slate-400 hover:text-white"/></button>
               </div>
               <div className="p-2 grid grid-cols-2 gap-2">
                   <button onClick={() => handleEmote('wave')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-[10px] text-white flex flex-col items-center">👋<span>Wave</span></button>
                   <button onClick={() => handleEmote('dance')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-[10px] text-white flex flex-col items-center">🕺<span>Dance</span></button>
                   <button onClick={() => handleEmote('heart')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-[10px] text-white flex flex-col items-center">❤<span>Love</span></button>
                   <button onClick={() => handleEmote('exclaim')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-[10px] text-white flex flex-col items-center">❗<span>Hey!</span></button>
               </div>
          </div>
      )}

      {/* 7. Near/Friends Lists Overlays */}
      {(showNear || showFriends) && (
          <div className="absolute top-20 right-4 w-64 z-40 bg-slate-900/95 border-2 border-white shadow-xl rounded-lg overflow-hidden pointer-events-auto">
               <div className="bg-slate-800 p-2 border-b border-slate-700 flex justify-between items-center">
                   <span className="text-[10px] text-yellow-400 font-bold">{showNear ? 'NEARBY' : 'FRIENDS'}</span>
                   <button onClick={closeAllOverlays}><X size={14} className="text-slate-400 hover:text-white"/></button>
               </div>
               <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                   {(showNear ? Object.values(gameState.players) : friendsList).length === 0 && (
                       <div className="text-[8px] text-slate-500 text-center py-4">NO ONE FOUND</div>
                   )}
                   {(showNear ? Object.values(gameState.players) : friendsList).map((p: any) => (
                       <div 
                          key={p.id} 
                          onClick={() => { closeAllOverlays(); handlePlayerClick(p.id); }}
                          className="flex items-center gap-2 p-2 hover:bg-slate-700 cursor-pointer rounded border border-transparent hover:border-slate-500"
                       >
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#fff' }}></div>
                           <span className="text-[10px] text-white truncate">{p.name}</span>
                       </div>
                   ))}
               </div>
          </div>
      )}

      {/* 8. Modals (Level Up, Profile, NPC, Course) */}
      {showLevelUp && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[90] animate-bounce pointer-events-none">
              <div className="bg-yellow-400 border-4 border-white p-4 shadow-xl text-center">
                  <Trophy size={48} className="mx-auto mb-2 text-yellow-800" />
                  <div className="text-xl text-black font-bold mb-1">LEVEL UP!</div>
                  <div className="text-xs text-yellow-900">YOU ARE NOW LEVEL {level}</div>
              </div>
          </div>
      )}

      {activeDialogue && (
         <div className="absolute bottom-20 left-4 right-4 md:left-1/3 md:right-1/3 z-[60] pointer-events-auto">
             <div className="bg-blue-900/90 backdrop-blur border-4 border-white p-4 shadow-xl text-white rounded-lg">
                 <div className="text-yellow-400 text-xs mb-2 font-bold">{activeDialogue.name}</div>
                 <div className="text-sm leading-relaxed tracking-wide typing-effect">
                    {activeDialogue.text}
                 </div>
                 <button 
                    onClick={() => setActiveDialogue(null)}
                    className="mt-2 text-[8px] text-blue-300 w-full text-right hover:text-white"
                 >
                    TAP TO CLOSE
                 </button>
             </div>
         </div>
      )}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 pointer-events-auto">
           <div className="bg-slate-200 border-4 border-white shadow-none max-w-lg w-full p-6 text-xs flex flex-col max-h-[90vh]">
              <h2 className="text-sm font-bold mb-4 text-slate-900 uppercase">Edit Student Record</h2>
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                
                {/* Character Customization */}
                <div className="bg-white p-4 border-2 border-slate-400 mb-4">
                    <h3 className="text-[10px] font-bold text-slate-600 mb-3 flex items-center gap-2"><User size={12}/> APPEARANCE</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[8px] text-slate-500 mb-1">HAT</label>
                            <select 
                                value={editForm.hat}
                                onChange={e => setEditForm({...editForm, hat: e.target.value})}
                                className="w-full border-2 border-slate-300 p-1 text-[10px] text-slate-900 bg-white"
                            >
                                <option value="">None</option>
                                <option value="cap_red">Red Cap</option>
                                <option value="cap_blue">Blue Cap</option>
                                <option value="top_hat">Top Hat</option>
                                <option value="beanie">Orange Beanie</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[8px] text-slate-500 mb-1">GLASSES</label>
                            <select 
                                value={editForm.glasses}
                                onChange={e => setEditForm({...editForm, glasses: e.target.value})}
                                className="w-full border-2 border-slate-300 p-1 text-[10px] text-slate-900 bg-white"
                            >
                                <option value="">None</option>
                                <option value="sunglasses">Sunglasses</option>
                            </select>
                        </div>
                    </div>
                    {/* Body Color */}
                    <div>
                        <label className="block text-[8px] text-slate-500 mb-1">BODY COLOR</label>
                        <div className="flex gap-2 flex-wrap">
                            {PLAYER_COLORS.map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setEditForm({...editForm, color: c})}
                                    className={`w-6 h-6 border-2 ${editForm.color === c ? 'border-black' : 'border-gray-300'}`}
                                    style={{backgroundColor: c}}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dorm Customization */}
                <div className="bg-white p-4 border-2 border-slate-400 mb-4">
                    <h3 className="text-[10px] font-bold text-slate-600 mb-3 flex items-center gap-2"><BedDouble size={12}/> DORM DECOR</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[8px] text-slate-500 mb-1">FLOOR COLOR</label>
                            <div className="flex gap-2">
                                {['#fef3c7', '#e2e8f0', '#dcfce7', '#fce7f3'].map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setEditForm({...editForm, dormFloorColor: c})}
                                        className={`w-6 h-6 border-2 ${editForm.dormFloorColor === c ? 'border-black' : 'border-gray-300'}`}
                                        style={{backgroundColor: c}}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[8px] text-slate-500 mb-1">BED COLOR</label>
                            <div className="flex gap-2">
                                {['#3b82f6', '#ef4444', '#10b981', '#f59e0b'].map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setEditForm({...editForm, dormBedColor: c})}
                                        className={`w-6 h-6 border-2 ${editForm.dormBedColor === c ? 'border-black' : 'border-gray-300'}`}
                                        style={{backgroundColor: c}}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">MAJOR</label>
                    <select 
                        value={editForm.major} 
                        onChange={e => setEditForm({...editForm, major: e.target.value})}
                        className="w-full border-2 border-slate-500 bg-white p-2 font-['Press_Start_2P'] text-[10px] text-slate-900"
                    >
                        {['Computer Science', 'Fine Arts', 'History', 'Mathematics', 'Physics', 'Biology', 'Literature'].map(m => (
                        <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    </div>
                    <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">YEAR</label>
                    <select 
                        value={editForm.year} 
                        onChange={e => setEditForm({...editForm, year: e.target.value})}
                        className="w-full border-2 border-slate-500 bg-white p-2 font-['Press_Start_2P'] text-[10px] text-slate-900"
                    >
                        {['Freshman', 'Sophomore', 'Junior', 'Senior'].map(y => (
                        <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">BIO</label>
                  <textarea 
                    value={editForm.bio}
                    onChange={e => setEditForm({...editForm, bio: e.target.value})}
                    className="w-full border-2 border-slate-500 bg-white p-2 h-16 resize-none font-['Press_Start_2P'] text-[10px] text-slate-900"
                    maxLength={50}
                  />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-2">ENROLLED COURSES</label>
                    <div className="border-2 border-slate-400 bg-white p-2 h-40 overflow-y-auto grid grid-cols-1 gap-2">
                        {COURSE_CATALOG.map(course => (
                            <div 
                                key={course.id} 
                                onClick={() => toggleCourseEnrollment(course.id)}
                                className={`cursor-pointer flex items-center gap-2 p-2 border border-dashed ${editForm.enrolledCourses.includes(course.id) ? 'bg-blue-100 border-blue-500' : 'border-gray-300 hover:bg-gray-50'}`}
                            >
                                {editForm.enrolledCourses.includes(course.id) ? (
                                    <CheckSquare size={14} className="text-blue-600" />
                                ) : (
                                    <Square size={14} className="text-gray-400" />
                                )}
                                <div>
                                    <div className="text-[10px] font-bold text-slate-900">{course.name}</div>
                                    <div className="text-[8px] text-gray-500 uppercase">{course.department}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 mt-auto border-t border-slate-300">
                   <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-red-500 text-white border-b-4 border-red-800 active:border-b-0 active:mt-1 py-2">CANCEL</button>
                   <button onClick={saveProfile} className="flex-1 bg-blue-500 text-white border-b-4 border-blue-800 active:border-b-0 active:mt-1 py-2 flex items-center justify-center gap-2">SAVE RECORD</button>
                </div>
           </div>
        </div>
      )}

      {/* Profile Popup */}
      {selectedPlayerProfile && !isProfileLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 pointer-events-auto">
          <div className="bg-slate-100 border-4 border-black max-w-sm w-full relative rounded-lg">
            <button 
                onClick={() => setSelectedPlayerProfile(null)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 hover:bg-red-600 rounded"
            >
                <X size={16} />
            </button>
            <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-blue-200 border-2 border-black mx-auto mb-4 flex items-center justify-center rounded-full relative">
                    <div className="scale-[3]">
                        <PixelAvatar color={selectedPlayerProfile.photoURL || selectedPlayerProfile.color || '#3b82f6'} hat={selectedPlayerProfile.hat} glasses={selectedPlayerProfile.glasses} />
                    </div>
                 </div>
                 <h2 className="text-sm font-bold text-black mb-1">{selectedPlayerProfile.name}</h2>
                 <p className="text-blue-700 text-[10px] mb-4">{selectedPlayerProfile.major} - {selectedPlayerProfile.year}</p>
                 <div className="bg-white border-2 border-gray-300 p-2 text-[10px] text-gray-600 mb-4 font-mono leading-tight rounded">
                    {selectedPlayerProfile.bio}
                 </div>
                 <div className="flex items-center justify-center gap-2 mb-4 text-[10px]">
                     <div className="bg-yellow-100 px-2 py-1 border border-yellow-400 text-yellow-800 rounded">LVL {selectedPlayerProfile.level || 1}</div>
                     <div className="bg-green-100 px-2 py-1 border border-green-400 text-green-800 rounded">{selectedPlayerProfile.xp || 0} XP</div>
                 </div>
                 <div className="flex flex-col gap-2 justify-center">
                   {selectedPlayerProfile.id === socketService.currentUserId ? (
                     <button onClick={openEditProfile} className="bg-gray-700 text-white border-b-4 border-gray-900 active:border-b-0 py-2 text-[10px] rounded">EDIT PROFILE</button>
                   ) : (
                     <button onClick={handleAddFriend} disabled={myProfile?.friends?.includes(selectedPlayerProfile.id)} className="bg-green-600 text-white border-b-4 border-green-800 active:border-b-0 py-2 text-[10px] rounded">{myProfile?.friends?.includes(selectedPlayerProfile.id) ? 'ALREADY FRIENDS' : 'ADD FRIEND'}</button>
                   )}
                   <button onClick={() => { handleRoomChange(`hostel_${selectedPlayerProfile.id}`); setSelectedPlayerProfile(null); }} className="bg-purple-600 text-white border-b-4 border-purple-800 active:border-b-0 py-2 text-[10px] rounded">VISIT DORM</button>
                 </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Action Modal (Study or Quiz) */}
      {activeDepartment && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 pointer-events-auto">
              <div className="bg-slate-800 border-4 border-slate-400 text-white w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto rounded-lg">
                  <button onClick={closeLearning} className="absolute top-2 right-2 hover:text-red-400"><X size={20}/></button>
                  {/* ... (Existing Logic for Course Modal Content) ... */}
                  {/* For brevity, inserting the same content logic as before */}
                  {!studyMaterial && !activeQuiz && !isContentLoading && (
                      <>
                        <h2 className="text-lg text-yellow-400 mb-4 flex items-center gap-2"><BookOpen /> {activeAction === 'study' ? 'Self Study' : 'Quiz'}</h2>
                        <div className="space-y-4">
                            <div className="text-xs text-slate-300 mb-4">{activeAction === 'study' ? 'Select a course to review notes.' : 'Select a course to take a quiz.'}</div>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {getMyCoursesForDept(activeDepartment).length > 0 ? (
                                    getMyCoursesForDept(activeDepartment).map(course => (
                                        <button key={course.id} onClick={() => startContentSession(course.name)} className="w-full bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 p-3 text-left group transition-all rounded">
                                            <div className="flex justify-between mb-1"><span className="text-xs font-bold group-hover:text-blue-300">{course.name}</span><span className="text-[10px] text-green-400">BEGIN</span></div>
                                            <div className="text-[10px] text-slate-400 italic">{course.description}</div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center p-4 border-2 border-dashed border-slate-600"><div className="text-xs text-red-400 mb-2">NOT ENROLLED</div><button onClick={() => { closeLearning(); openEditProfile(); }} className="mt-4 bg-blue-600 px-4 py-2 text-[10px] text-white rounded">MANAGE COURSES</button></div>
                                )}
                            </div>
                        </div>
                      </>
                  )}
                  {isContentLoading && (
                      <div className="text-center py-12"><Loader2 size={48} className="animate-spin text-yellow-400 mx-auto mb-4" /><div className="text-sm text-yellow-400">CONSULTING ARCHIVES...</div></div>
                  )}
                  {studyMaterial && (
                      <div>
                          <h2 className="text-lg text-yellow-400 mb-4 flex items-center gap-2"><BookOpen /> Notes</h2>
                          <div className="bg-white text-black p-4 text-xs leading-relaxed font-mono border-2 border-gray-400 mb-6 rounded">{studyMaterial}</div>
                          <button onClick={closeLearning} className="w-full bg-blue-600 text-white py-3 border-b-4 border-blue-800 active:border-b-0 rounded">FINISH</button>
                      </div>
                  )}
                  {activeQuiz && !isContentLoading && (
                      <div className="text-center">
                          {!quizCompleted && (
                              <>
                                <div className="flex justify-between items-center mb-4 border-b border-slate-600 pb-2"><div className="text-[10px] text-slate-400">Question {currentQuestionIndex + 1} / {activeQuiz.questions.length}</div><div className="text-[10px] text-yellow-400 flex items-center gap-1"><Sparkles size={10} /> AI</div></div>
                                <h3 className="text-sm mb-2 text-blue-300">{activeQuiz.topic}</h3>
                                <h3 className="text-xs mb-6 leading-relaxed">{activeQuiz.questions[currentQuestionIndex].q}</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {activeQuiz.questions[currentQuestionIndex].options.map((opt, idx) => (
                                        <button key={idx} onClick={() => handleQuizAnswer(idx)} className="bg-slate-700 hover:bg-blue-600 border-2 border-slate-500 py-3 px-4 text-xs text-left transition-colors rounded">{idx + 1}. {opt}</button>
                                    ))}
                                </div>
                              </>
                          )}
                          {quizCompleted && (
                              <div className="py-8">
                                  <div className="text-4xl mb-4">{quizScore >= Math.ceil(activeQuiz.questions.length * 0.6) ? '🎓' : '📚'}</div>
                                  <h2 className="text-lg mb-2">{quizScore >= Math.ceil(activeQuiz.questions.length * 0.6) ? 'COMPLETE!' : 'NEEDS STUDY'}</h2>
                                  <p className="text-xs text-slate-300 mb-6">Score: {quizScore} / {activeQuiz.questions.length}</p>
                                  {quizScore >= Math.ceil(activeQuiz.questions.length * 0.6) && <div className="bg-green-900/50 border border-green-500 p-2 mb-6 text-green-400 text-xs rounded">+{activeQuiz.xpReward} XP</div>}
                                  <button onClick={claimRewards} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 border-b-4 border-blue-800 active:border-b-0 rounded">{quizScore >= Math.ceil(activeQuiz.questions.length * 0.6) ? 'CLAIM XP' : 'CLOSE'}</button>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}