
import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy } from 'lucide-react';

interface MinigameOverlayProps {
  gameType: 'penalty' | 'sprint';
  onComplete: (score: number) => void;
  onClose: () => void;
}

// Reusable Pixel Character for consistency with GameCanvas
const PixelAvatar = ({ color, facing = 'down', isMoving = false, scale = 1 }: { color: string, facing?: 'down' | 'left' | 'right' | 'up', isMoving?: boolean, scale?: number }) => {
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }} className="relative w-0 h-0">
        <div className={`relative ${isMoving ? 'animate-[bounce_0.3s_infinite]' : ''}`}>
             {/* Body Base (Head) */}
             <div className="absolute -top-[10px] -left-[5px] w-[10px] h-[8px]" style={{ backgroundColor: color }}></div>
             {/* Body Main */}
             <div className="absolute -top-[4px] -left-[6px] w-[12px] h-[10px]" style={{ backgroundColor: color }}></div>
             {/* Belly */}
             {facing !== 'up' && <div className="absolute -top-[3px] -left-[3px] w-[6px] h-[8px] bg-white"></div>}
             
             {/* Face Down */}
             {facing === 'down' && (
                 <>
                    <div className="absolute -top-[8px] -left-[3px] w-[2px] h-[2px] bg-black"></div>
                    <div className="absolute -top-[8px] left-[1px] w-[2px] h-[2px] bg-black"></div>
                    <div className="absolute -top-[6px] -left-[1px] w-[2px] h-[2px] bg-orange-500"></div>
                 </>
             )}
             
             {/* Face Right */}
             {facing === 'right' && (
                 <>
                    <div className="absolute -top-[8px] left-[2px] w-[2px] h-[2px] bg-black"></div>
                    <div className="absolute -top-[6px] left-[4px] w-[2px] h-[2px] bg-orange-500"></div>
                 </>
             )}

              {/* Face Left */}
             {facing === 'left' && (
                 <>
                    <div className="absolute -top-[8px] -left-[4px] w-[2px] h-[2px] bg-black"></div>
                    <div className="absolute -top-[6px] -left-[6px] w-[2px] h-[2px] bg-orange-500"></div>
                 </>
             )}

              {/* Face Up */}
              {facing === 'up' && (
                 <>
                    {/* Back of head detail if needed */}
                 </>
             )}
        </div>
    </div>
  );
};

export const MinigameOverlay: React.FC<MinigameOverlayProps> = ({ gameType, onComplete, onClose }) => {
  // Common State
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');
  const [message, setMessage] = useState('');
  const [xpWon, setXpWon] = useState(0);

  // --- Penalty State ---
  const [keeperPos, setKeeperPos] = useState(50); // 0-100% of goal width
  const [ballPos, setBallPos] = useState({ x: 50, y: 80 });
  const [aimDirection, setAimDirection] = useState<'left' | 'center' | 'right'>('center');
  const [isKicking, setIsKicking] = useState(false);

  // --- Sprint State ---
  const [sprintProgress, setSprintProgress] = useState(0); // 0 to 100
  const [sprintTime, setSprintTime] = useState(0);
  const [lastPress, setLastPress] = useState<'left' | 'right' | null>(null);
  
  // Refs for animation loops
  const penaltyLoopRef = useRef<number>(0);
  const sprintTimerRef = useRef<number>(0);

  // Cleanup
  useEffect(() => {
    return () => {
        if (penaltyLoopRef.current) cancelAnimationFrame(penaltyLoopRef.current);
        if (sprintTimerRef.current) clearInterval(sprintTimerRef.current);
    };
  }, []);

  // Keyboard Controls
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (gameState !== 'playing') return;

          if (gameType === 'penalty') {
              if (e.key === 'ArrowLeft') setAimDirection('left');
              if (e.key === 'ArrowRight') setAimDirection('right');
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') setAimDirection('center');
              if (e.key === ' ') handleKick();
          } else if (gameType === 'sprint') {
              if (e.key === 'ArrowLeft') handleSprintTap('left');
              if (e.key === 'ArrowRight') handleSprintTap('right');
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, gameType, aimDirection, lastPress]); // Dependencies matter for closure

  // Penalty Logic - Idle Animation
  useEffect(() => {
      if (gameType === 'penalty' && gameState === 'playing' && !isKicking) {
          let direction = 1;
          const animateKeeper = () => {
              setKeeperPos(prev => {
                  let next = prev + direction * 0.5; // Slow idle movement
                  if (next > 60) { next = 60; direction = -1; }
                  if (next < 40) { next = 40; direction = 1; }
                  return next;
              });
              penaltyLoopRef.current = requestAnimationFrame(animateKeeper);
          };
          penaltyLoopRef.current = requestAnimationFrame(animateKeeper);
          return () => cancelAnimationFrame(penaltyLoopRef.current);
      }
  }, [gameType, gameState, isKicking]);

  const handleKick = () => {
      if (gameState !== 'playing' || isKicking) return;
      setIsKicking(true);
      if (penaltyLoopRef.current) cancelAnimationFrame(penaltyLoopRef.current);

      let targetX = 50;
      if (aimDirection === 'left') targetX = 20;
      if (aimDirection === 'right') targetX = 80;

      // Animate Ball
      setBallPos({ x: targetX, y: 20 });
      
      // Keeper Logic - Random Dive
      // Keeper randomly chooses a zone to dive to: Left (20), Center (50), Right (80)
      const diveZones = [20, 50, 80];
      const keeperTargetX = diveZones[Math.floor(Math.random() * diveZones.length)];
      
      // Set keeper position to the target zone (triggers CSS transition)
      setKeeperPos(keeperTargetX);

      // Check Save condition
      // A save happens if the keeper dives to the same zone as the ball target
      const isSave = keeperTargetX === targetX;

      setTimeout(() => {
        if (isSave) {
            setMessage("SAVED! The keeper blocked it.");
            setXpWon(10);
        } else {
            setMessage("GOAL!!! What a strike!");
            setXpWon(100);
        }
        setGameState('result');
        setIsKicking(false);
      }, 1000);
  };

  // Sprint Logic
  const startSprint = () => {
      setGameState('playing');
      setSprintProgress(0);
      setSprintTime(0);
      sprintTimerRef.current = window.setInterval(() => {
          setSprintTime(t => t + 0.1);
      }, 100);
  };

  const handleSprintTap = (side: 'left' | 'right') => {
      // Functional update to avoid stale state in closure if necessary, but here directly using state ref pattern would be better or deps array
      // Due to closure in useEffect, we need to be careful.
      // However, for React 18 batching, this simplistic check might fail if not updating 'lastPress' fast enough in closure.
      // A better way is using functional state update logic entirely:
      
      setLastPress((prevLastPress) => {
          if (side === prevLastPress) return prevLastPress; // Must alternate
          
          setSprintProgress(prev => {
              const next = prev + 5;
              if (next >= 100) {
                  // We need to call finishSprint, but we can't call it inside setState easily without side effects.
                  // Instead, we'll check it in a useEffect or just trigger it here via timeout to break stack.
                  // For simplicity in this minigame:
                  if (next === 100 || next > 100) {
                      setTimeout(finishSprint, 0); 
                      return 100;
                  }
                  return next;
              }
              return next;
          });
          
          return side;
      });
  };

  const finishSprint = () => {
      if (sprintTimerRef.current) clearInterval(sprintTimerRef.current);
      setGameState('result');
      
      // Calculate score based on current time value (need ref for accurate closure access or just let render handle it)
      // Since `sprintTime` state might be stale in a callback, we use a functional update hack or just read the ref if we had one.
      // But `finishSprint` is called from `handleSprintTap` which is called from event.
      // Let's rely on setXpWon doing the calculation logic based on a ref to be safe.
      
      setSprintTime(finalTime => {
          let xp = 0;
          if (finalTime < 8) { setMessage("LIGHTNING FAST!"); xp = 100; }
          else if (finalTime < 12) { setMessage("Great Run!"); xp = 50; }
          else { setMessage("Good Effort!"); xp = 20; }
          setXpWon(xp);
          return finalTime;
      });
  };
  
  const handleClaim = () => {
      onComplete(xpWon);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 font-['Press_Start_2P']">
        <div className="relative bg-slate-800 border-4 border-white p-6 max-w-md w-full rounded-lg shadow-2xl overflow-hidden">
            <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-white"><X /></button>
            
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-yellow-400 text-lg uppercase mb-2" style={{ textShadow: '2px 2px 0 #000' }}>{gameType === 'penalty' ? 'Penalty Shootout' : '100m Dash'}</h2>
                {gameType !== 'penalty' && <div className="h-1 w-full bg-slate-600 rounded-full"></div>}
            </div>

            {/* Content Container */}
            <div className="aspect-video bg-green-700 relative overflow-hidden border-4 border-black mb-6 shadow-inner rounded">
                
                {/* --- PENALTY GAME VIEW --- */}
                {gameType === 'penalty' && (
                    <>
                        {/* Goal */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 h-24 border-t-4 border-x-4 border-white"></div>
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-white/10"></div>
                        
                        {/* Keeper */}
                        <div 
                            className={`absolute top-16 transition-all ease-out ${isKicking ? 'duration-500' : 'duration-100'}`}
                            style={{ 
                                left: `${keeperPos}%`, 
                                transform: `translateX(-50%) ${isKicking && keeperPos !== 50 ? (keeperPos < 50 ? 'rotate(-45deg)' : 'rotate(45deg)') : ''}` 
                            }}
                        >
                            <PixelAvatar color="#ef4444" facing="down" scale={2} />
                        </div>

                        {/* Ball */}
                        <div 
                            className="absolute w-4 h-4 bg-white rounded-full transition-all duration-500 ease-out shadow-lg"
                            style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%`, transform: 'translateX(-50%)' }}
                        ></div>

                        {/* Player (Shooter) */}
                        {gameState === 'playing' && !isKicking && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                <PixelAvatar color="#3b82f6" facing="up" scale={2} />
                            </div>
                        )}
                        
                        {/* Aim Indicator */}
                        {gameState === 'playing' && !isKicking && (
                             <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-8">
                                 <div className={`w-4 h-4 border-2 ${aimDirection === 'left' ? 'bg-yellow-400 border-white' : 'border-white/50'}`}></div>
                                 <div className={`w-4 h-4 border-2 ${aimDirection === 'center' ? 'bg-yellow-400 border-white' : 'border-white/50'}`}></div>
                                 <div className={`w-4 h-4 border-2 ${aimDirection === 'right' ? 'bg-yellow-400 border-white' : 'border-white/50'}`}></div>
                             </div>
                        )}
                    </>
                )}

                {/* --- SPRINT GAME VIEW --- */}
                {gameType === 'sprint' && (
                    <>
                         {/* Track Lines */}
                         <div className="absolute inset-0 flex flex-col justify-center opacity-30">
                             <div className="w-full h-1 bg-white mb-8"></div>
                             <div className="w-full h-1 bg-white mb-8"></div>
                             <div className="w-full h-1 bg-white"></div>
                         </div>
                         
                         {/* Finish Line */}
                         <div className="absolute right-8 top-0 bottom-0 w-4 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+/Pszs+2EAAAAnSURBVHjaYmRgYPgPxIwkGlABjEAGw8RABqOqgJGBRANAAGAAEGAA8bwI8+sD8V8AAAAASUVORK5CYII=')] opacity-80"></div>

                         {/* Runner */}
                         <div 
                             className="absolute top-1/2 -translate-y-1/2 transition-all duration-100"
                             style={{ left: `${10 + (sprintProgress * 0.7)}%` }}
                         >
                              <PixelAvatar color="#3b82f6" facing="right" isMoving={gameState === 'playing'} scale={3} />
                              <div className="absolute -bottom-4 left-0 right-0 bg-black/20 w-8 h-2 rounded-[50%]"></div>
                         </div>

                         {/* Timer */}
                         <div className="absolute top-2 right-2 text-white font-mono text-xs bg-black/50 px-2 py-1 rounded">
                             TIME: {sprintTime.toFixed(1)}s
                         </div>
                    </>
                )}
            </div>

            {/* --- CONTROLS / UI --- */}
            
            {gameState === 'intro' && (
                <div className="text-center">
                    <p className="text-white text-xs mb-4 leading-relaxed">
                        {gameType === 'penalty' ? 'Use LEFT/RIGHT arrows to aim, then SPACE or TAP to Shoot!' : 'Alternate LEFT/RIGHT arrows as fast as you can to run!'}
                    </p>
                    <button 
                        onClick={() => gameType === 'sprint' ? startSprint() : setGameState('playing')}
                        className="bg-yellow-400 text-black px-6 py-3 border-b-4 border-yellow-700 active:border-b-0 active:mt-1 font-bold rounded"
                    >
                        START GAME
                    </button>
                </div>
            )}

            {gameState === 'playing' && gameType === 'penalty' && (
                 <div className="flex flex-col gap-4">
                     <div className="flex justify-center gap-4">
                         <button onClick={() => setAimDirection('left')} className={`p-4 bg-slate-700 border-2 ${aimDirection==='left'?'border-yellow-400':'border-slate-500'} rounded`}>⬅️</button>
                         <button onClick={() => setAimDirection('center')} className={`p-4 bg-slate-700 border-2 ${aimDirection==='center'?'border-yellow-400':'border-slate-500'} rounded`}>⬆️</button>
                         <button onClick={() => setAimDirection('right')} className={`p-4 bg-slate-700 border-2 ${aimDirection==='right'?'border-yellow-400':'border-slate-500'} rounded`}>➡️</button>
                     </div>
                     <button onClick={handleKick} className="w-full bg-red-500 text-white py-4 border-b-4 border-red-800 active:border-b-0 active:mt-1 rounded font-bold uppercase tracking-widest shadow-lg">
                         SHOOT!
                     </button>
                 </div>
            )}

            {gameState === 'playing' && gameType === 'sprint' && (
                 <div className="grid grid-cols-2 gap-4">
                     <button 
                        onMouseDown={() => handleSprintTap('left')}
                        onTouchStart={(e) => { e.preventDefault(); handleSprintTap('left'); }}
                        className="bg-slate-700 hover:bg-slate-600 py-8 border-b-4 border-slate-900 active:border-b-0 rounded text-2xl active:bg-blue-500"
                     >
                        L
                     </button>
                     <button 
                        onMouseDown={() => handleSprintTap('right')}
                        onTouchStart={(e) => { e.preventDefault(); handleSprintTap('right'); }}
                        className="bg-slate-700 hover:bg-slate-600 py-8 border-b-4 border-slate-900 active:border-b-0 rounded text-2xl active:bg-blue-500"
                     >
                        R
                     </button>
                 </div>
            )}

            {gameState === 'result' && (
                <div className="text-center animate-in zoom-in duration-300">
                    <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-xl text-white mb-2 uppercase">{message}</h3>
                    <div className="text-green-400 text-sm mb-6">+ {xpWon} XP EARNED</div>
                    <button 
                        onClick={handleClaim}
                        className="bg-blue-500 text-white px-8 py-3 border-b-4 border-blue-800 active:border-b-0 active:mt-1 font-bold rounded w-full"
                    >
                        CONTINUE
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
