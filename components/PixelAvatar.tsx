
import React from 'react';

interface PixelAvatarProps {
  color: string;
  hat?: string;
  glasses?: string;
  facing?: 'down' | 'left' | 'right' | 'up';
  isMoving?: boolean;
  scale?: number;
}

export const PixelAvatar: React.FC<PixelAvatarProps> = ({ 
  color, 
  hat, 
  glasses, 
  facing = 'down', 
  isMoving = false, 
  scale = 1 
}) => {
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

             {/* --- ACCESSORIES --- */}
             
             {/* Glasses */}
             {glasses === 'sunglasses' && facing === 'down' && (
                 <>
                    <div className="absolute -top-[8px] -left-[1px] w-[2px] h-[1px] bg-black"></div>
                    <div className="absolute -top-[9px] -left-[5px] w-[4px] h-[3px] bg-black/80 border border-black"></div>
                    <div className="absolute -top-[9px] left-[1px] w-[4px] h-[3px] bg-black/80 border border-black"></div>
                 </>
             )}
             
             {/* Hats */}
             {hat === 'cap_red' && (
                 <>
                    <div className="absolute -top-[13px] -left-[5px] w-[10px] h-[4px] bg-red-500"></div>
                    {facing === 'down' && <div className="absolute -top-[10px] -left-[5px] w-[10px] h-[2px] bg-red-500"></div>}
                 </>
             )}
             {hat === 'cap_blue' && (
                 <>
                    <div className="absolute -top-[13px] -left-[5px] w-[10px] h-[4px] bg-blue-500"></div>
                    {facing === 'down' && <div className="absolute -top-[10px] -left-[5px] w-[10px] h-[2px] bg-blue-500"></div>}
                 </>
             )}
             {hat === 'top_hat' && (
                 <>
                    <div className="absolute -top-[20px] -left-[4px] w-[8px] h-[10px] bg-slate-900"></div>
                    <div className="absolute -top-[11px] -left-[6px] w-[12px] h-[2px] bg-slate-900"></div>
                    <div className="absolute -top-[13px] -left-[4px] w-[8px] h-[2px] bg-red-500"></div>
                 </>
             )}
             {hat === 'beanie' && (
                 <>
                    <div className="absolute -top-[11px] -left-[5px] w-[10px] h-[5px] bg-orange-500 rounded-t-full"></div>
                    <div className="absolute -top-[11px] -left-[5px] w-[10px] h-[3px] bg-orange-500"></div>
                    <div className="absolute -top-[14px] -left-[2px] w-[4px] h-[4px] bg-white rounded-full"></div>
                 </>
             )}
        </div>
    </div>
  );
};
