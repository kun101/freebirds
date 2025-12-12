
import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand } from 'lucide-react';

interface VirtualGamepadProps {
  onDirectionChange: (direction: 'up' | 'down' | 'left' | 'right' | null) => void;
  onInteract: () => void;
}

export const VirtualGamepad: React.FC<VirtualGamepadProps> = ({ onDirectionChange, onInteract }) => {
  const handleTouchStart = (dir: 'up' | 'down' | 'left' | 'right') => (e: React.TouchEvent) => {
    e.preventDefault(); 
    onDirectionChange(dir);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    onDirectionChange(null);
  };

  const btnClass = "w-14 h-14 bg-slate-800/80 backdrop-blur-sm border-2 border-slate-600 rounded-lg flex items-center justify-center active:bg-blue-600/80 active:border-blue-400 touch-none shadow-lg";
  const actionBtnClass = "w-16 h-16 bg-red-600/80 backdrop-blur-sm border-2 border-red-400 rounded-full flex items-center justify-center active:bg-red-500 shadow-lg touch-none";

  return (
    <>
      {/* D-Pad */}
      <div className="fixed bottom-6 left-6 z-50 grid grid-cols-3 gap-2 p-2 select-none touch-none">
        <div />
        <div 
          className={btnClass}
          onTouchStart={handleTouchStart('up')} 
          onTouchEnd={handleTouchEnd}
        >
          <ArrowUp className="text-white w-8 h-8" />
        </div>
        <div />
        
        <div 
          className={btnClass}
          onTouchStart={handleTouchStart('left')} 
          onTouchEnd={handleTouchEnd}
        >
          <ArrowLeft className="text-white w-8 h-8" />
        </div>
        <div />
        <div 
          className={btnClass}
          onTouchStart={handleTouchStart('right')} 
          onTouchEnd={handleTouchEnd}
        >
          <ArrowRight className="text-white w-8 h-8" />
        </div>
        
        <div />
        <div 
          className={btnClass}
          onTouchStart={handleTouchStart('down')} 
          onTouchEnd={handleTouchEnd}
        >
          <ArrowDown className="text-white w-8 h-8" />
        </div>
        <div />
      </div>

      {/* Action Button */}
      <div className="fixed bottom-12 right-12 z-50 select-none touch-none">
         <div 
            className={actionBtnClass}
            onTouchStart={(e) => { e.preventDefault(); onInteract(); }}
         >
            <span className="text-white font-bold text-xl font-['Press_Start_2P']">E</span>
         </div>
      </div>
    </>
  );
};
