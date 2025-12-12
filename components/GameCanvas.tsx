import React, { useRef, useEffect, useState } from 'react';
import { Player, RoomId, getRoomDetails, Direction, MapObject, Warp, TILE_SIZE, NPC, DormConfig } from '../types';
import { audioService } from '../services/audio';

interface GameCanvasProps {
  players: Record<string, Player>;
  currentRoom: string;
  currentUserId: string | null;
  onMove: (x: number, y: number, facing: Direction) => void;
  onPlayerClick: (playerId: string) => void;
  onInteractNPC: (npc: NPC) => void;
  onStartStudy: (department: string) => void;
  onStartQuiz: (department: string) => void;
  onPlayMinigame: (game: 'penalty' | 'sprint') => void;
  onWarp: (targetRoom: string, targetX: number, targetY: number, facing: Direction) => void;
  inputDirection: Direction | null; // From Virtual Gamepad
  interactionTrigger: number; // Increment to trigger interaction from Gamepad
  disableControls?: boolean;
  dormConfig?: DormConfig; // Pass custom dorm config to override defaults
}

// Resolution for 16:9 Retro Feel (was 320x240)
const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 270;
const MOVEMENT_SPEED = 2; // Pixels per frame

// Asset Generator
const createPatterns = (ctx: CanvasRenderingContext2D) => {
  const patterns: Record<string, CanvasPattern | string> = {};

  const createTile = (drawFn: (c: CanvasRenderingContext2D) => void, w: number = TILE_SIZE, h: number = TILE_SIZE) => {
    const cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    const c = cvs.getContext('2d')!;
    drawFn(c);
    return ctx.createPattern(cvs, 'repeat');
  };

  // Grass
  patterns.grass = createTile((c) => {
    c.fillStyle = '#4ade80';
    c.fillRect(0,0,32,32);
    c.fillStyle = '#22c55e';
    c.fillRect(4,4,4,4);
    c.fillRect(20,20,4,4);
    c.fillRect(24,6,2,2);
    c.fillStyle = '#86efac';
    c.fillRect(10,15,2,2);
  }) || '#4ade80';

  // Stone Path (Cobblestone)
  patterns.floor_stone = createTile((c) => {
    c.fillStyle = '#d6d3d1'; // lighter stone
    c.fillRect(0,0,32,32);
    c.fillStyle = '#a8a29e';
    c.fillRect(2,2, 12,12);
    c.fillRect(18,2, 12,12);
    c.fillRect(2,18, 12,12);
    c.fillRect(18,18, 12,12);
  }) || '#d6d3d1';
  
  // Clay Track (Red/Orange)
  patterns.floor_clay = createTile((c) => {
    c.fillStyle = '#c2410c'; // Red/Orange Clay
    c.fillRect(0,0,32,32);
    c.fillStyle = '#9a3412'; // Texture
    for(let i=0; i<32; i+=4) {
        if(Math.random() > 0.5) c.fillRect(Math.random()*32, Math.random()*32, 2, 2);
    }
  }) || '#c2410c';

  // Water (Animated separately in render loop now, this is fallback/base)
  patterns.water = createTile((c) => {
    c.fillStyle = '#3b82f6';
    c.fillRect(0,0,32,32);
    c.fillStyle = '#60a5fa';
    c.fillRect(0,4,32,4);
    c.fillRect(0,20,32,4);
  }) || '#3b82f6';

  // Wood Floor (Birch / Light Wood)
  patterns.floor_wood = createTile((c) => {
    c.fillStyle = '#fef3c7'; // Base: Amber-50 (Very light)
    c.fillRect(0,0,32,32);
    c.fillStyle = '#fde68a'; // Detail: Amber-200
    for(let y=0; y<32; y+=8) {
        c.fillRect(0, y, 32, 1); // Planks
    }
    c.fillStyle = '#fcd34d'; // Grain: Amber-300
    c.fillRect(8,0,1,32); // Random vertical grain
    c.fillRect(24,0,1,32); 
  }) || '#fef3c7';

  // Indoor Tile (Warmer/Darker to prevent eye strain)
  patterns.floor_tile = createTile((c) => {
    c.fillStyle = '#e7e5e4'; // Stone-200 (Warm Grey)
    c.fillRect(0,0,32,32);
    c.fillStyle = '#d6d3d1'; // Stone-300 (Grout/Detail)
    c.fillRect(0,0,32,1);
    c.fillRect(0,0,1,32);
    c.fillStyle = '#f5f5f4'; // Stone-100 (Highlight Checker)
    c.fillRect(0,0,16,16);
    c.fillRect(16,16,16,16);
  }) || '#e7e5e4';

  // Stadium Seating (Blue/Concrete with random crowd)
  patterns.stadium_seating = createTile((c) => {
    c.fillStyle = '#1e293b'; // Dark foundation
    c.fillRect(0,0,32,32);
    // Rows
    c.fillStyle = '#334155';
    c.fillRect(0,0,32,10);
    c.fillRect(0,16,32,10);
    // Crowd dots
    for(let i=0; i<20; i++) {
        c.fillStyle = ['#ef4444', '#3b82f6', '#eab308', '#fff'][Math.floor(Math.random()*4)];
        c.fillRect(Math.random()*32, Math.random()*30, 2, 2);
    }
  }) || '#1e293b';

  // Brick Wall
  patterns.brick = createTile((c) => {
    c.fillStyle = '#7f1d1d';
    c.fillRect(0,0,32,32);
    c.fillStyle = '#991b1b';
    c.fillRect(0,0,32,14);
    c.fillRect(0,16,32,14);
    c.fillStyle = '#5c1414'; // mortar
    c.fillRect(0,14,32,2);
    c.fillRect(0,30,32,2);
    c.fillRect(16,0,2,14);
    c.fillRect(8,16,2,14);
  }) || '#7f1d1d';

  return patterns;
};

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  players, 
  currentRoom, 
  currentUserId, 
  onMove, 
  onPlayerClick, 
  onInteractNPC,
  onStartStudy,
  onStartQuiz,
  onPlayMinigame,
  onWarp,
  inputDirection,
  interactionTrigger,
  disableControls,
  dormConfig
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roomConfig = getRoomDetails(currentRoom);
  
  // State
  const keysPressed = useRef<Set<string>>(new Set());
  const assets = useRef<Record<string, CanvasPattern | string>>({});
  const isLoaded = useRef(false);
  
  // Movement State
  const playerState = useRef({
    gridX: 0,
    gridY: 0,
    pixelX: 0,
    pixelY: 0,
    targetX: 0,
    targetY: 0,
    isMoving: false,
    facing: 'down' as Direction,
    moveProgress: 0
  });

  const lastInteractionRef = useRef(0);

  // Initialize Player Position
  useEffect(() => {
    if (currentUserId && players[currentUserId]) {
      const p = players[currentUserId];
      // Snap to grid
      const gx = Math.round(p.x / TILE_SIZE);
      const gy = Math.round(p.y / TILE_SIZE);
      
      // Only reset if far away (warp/spawn)
      const dist = Math.abs(gx - playerState.current.gridX) + Math.abs(gy - playerState.current.gridY);
      
      if (dist > 2 || !isLoaded.current) {
        playerState.current = {
          gridX: gx,
          gridY: gy,
          pixelX: gx * TILE_SIZE,
          pixelY: gy * TILE_SIZE,
          targetX: gx * TILE_SIZE,
          targetY: gy * TILE_SIZE,
          isMoving: false,
          facing: p.facing || 'down',
          moveProgress: 0
        };
        isLoaded.current = true;
      }
    }
  }, [currentUserId, players, currentRoom]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keys if controls are disabled
      if (disableControls) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'e'].includes(e.key.toLowerCase())) {
        keysPressed.current.add(e.key.toLowerCase());
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disableControls]);

  const getWarpAt = (gx: number, gy: number): Warp | null => {
    if (!roomConfig.warps) return null;
    const x = gx * TILE_SIZE;
    const y = gy * TILE_SIZE;
    return roomConfig.warps.find(w => 
      x < w.x + w.w && x + TILE_SIZE > w.x &&
      y < w.y + w.h && y + TILE_SIZE > w.y
    ) || null;
  };

  // Check Collision (Grid Based)
  const isBlocked = (gx: number, gy: number): boolean => {
    // 1. Boundary
    if (gx < 0 || gy < 0 || gx * TILE_SIZE >= roomConfig.width || gy * TILE_SIZE >= roomConfig.height) {
      return true;
    }

    // 2. Warp Priority: If it's a door, we can walk on it regardless of walls under it
    if (getWarpAt(gx, gy)) {
      return false;
    }

    // 3. Objects
    if (roomConfig.objects) {
      const x = gx * TILE_SIZE;
      const y = gy * TILE_SIZE;
      // Simple AABB overlap check against tile
      for (const obj of roomConfig.objects) {
         // Cast to string to avoid "no overlap" error if types are narrowed
         const type = obj.type as string;
         if (type === 'floor_tile' || type === 'floor_wood' || type === 'floor_stone' || type === 'grass' || type === 'floor_clay') continue; // walkable
         
         // Flowers and some bushes are walkable for better feel? Let's make small stuff walkable
         if (obj.type === 'flower' || obj.type === 'penalty_spot' || obj.type === 'university_gate') continue; 
         if (obj.type.startsWith('prop_') || obj.type === 'blackboard') continue; 
         
         // Special case: start line is walkable (deprecated but kept for safety)
         if (obj.label === 'START_SPRINT') {
             // If it's a flag, it should be solid, but interaction is proximity based.
             // If it's a tile, it's walkable.
             if (obj.type === 'floor_tile') continue;
         }

         // If object overlaps this tile
         if (x < obj.x + obj.w && x + TILE_SIZE > obj.x &&
             y < obj.y + obj.h && y + TILE_SIZE > obj.y) {
             return true;
         }
      }
    }
    return false;
  };

  // Interaction Logic
  const handleInteraction = () => {
    const ps = playerState.current;
    
    // Player center in pixels
    const px = ps.pixelX + TILE_SIZE / 2;
    const py = ps.pixelY + TILE_SIZE / 2;

    // Use a slightly generous range to ensure if visual hint is there, it works
    const INTERACTION_RANGE = TILE_SIZE * 2; 

    let closestDist = Infinity;
    let action: (() => void) | null = null;

    // Helper to update closest action
    const check = (x: number, y: number, cb: () => void) => {
        const dist = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
        if (dist <= INTERACTION_RANGE && dist < closestDist) {
            closestDist = dist;
            action = cb;
        }
    };

    // 1. Check Interactive Objects
    if (roomConfig.objects) {
       roomConfig.objects.forEach(obj => {
           // Filter for interactive types
           if (
               obj.type === 'study_desk' || 
               (obj.type === 'penalty_spot' && obj.label !== 'decoration') || 
               (obj.type === 'flag' && obj.label === 'START_SPRINT')
           ) {
               const ox = obj.x + obj.w / 2;
               const oy = obj.y + obj.h / 2;
               
               check(ox, oy, () => {
                   if (obj.type === 'study_desk') {
                       let dept = 'general';
                       if (currentRoom.includes('cs')) dept = 'cs';
                       else if (currentRoom.includes('math')) dept = 'math';
                       else if (currentRoom.includes('art')) dept = 'art';
                       else if (currentRoom.includes('hist')) dept = 'history';
                       onStartStudy(dept);
                   } else if (obj.type === 'penalty_spot') {
                       onPlayMinigame('penalty');
                   } else if (obj.type === 'flag') {
                       onPlayMinigame('sprint');
                   }
               });
           }
       });
    }

    // 2. Check NPCs
    if (roomConfig.npcs) {
      roomConfig.npcs.forEach(npc => {
        const nx = npc.x + TILE_SIZE / 2;
        const ny = npc.y + TILE_SIZE / 2;
        check(nx, ny, () => {
            if (npc.role === 'quiz_master' && npc.department) {
                onStartQuiz(npc.department);
            } else {
                onInteractNPC(npc);
            }
        });
      });
    }

    // 3. Check Other Players
    Object.values(players).forEach(p => {
        if (p.id === currentUserId) return;
        const ppx = p.x + TILE_SIZE / 2;
        const ppy = p.y + TILE_SIZE / 2;
        check(ppx, ppy, () => {
            onPlayerClick(p.id);
        });
    });

    // Execute closest action
    if (action) {
        (action as () => void)();
    }
  };

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Generate patterns once
    if (Object.keys(assets.current).length === 0) {
        assets.current = createPatterns(ctx);
    }

    ctx.imageSmoothingEnabled = false;
    let animationFrameId: number;

    const render = () => {
      // --- Update Logic ---
      const ps = playerState.current;

      // Handle Interaction Input
      const isEPressed = keysPressed.current.has('e');
      const isInteractTriggered = interactionTrigger > lastInteractionRef.current;
      
      // If controls are disabled, just allow finishing current movement, no new inputs
      const controlsAllowed = !disableControls;

      if ((isEPressed || isInteractTriggered) && !ps.isMoving && controlsAllowed) {
         handleInteraction();
         if (isInteractTriggered) lastInteractionRef.current = interactionTrigger;
         keysPressed.current.delete('e'); 
      }

      if (ps.isMoving) {
        ps.moveProgress += MOVEMENT_SPEED;
        
        // Play Step Sound periodically
        if (Math.abs(ps.moveProgress % TILE_SIZE - TILE_SIZE / 2) < MOVEMENT_SPEED) {
             audioService.playSFX('step');
        }

        if (ps.moveProgress >= TILE_SIZE) {
            ps.pixelX = ps.targetX;
            ps.pixelY = ps.targetY;
            ps.gridX = Math.round(ps.targetX / TILE_SIZE);
            ps.gridY = Math.round(ps.targetY / TILE_SIZE);
            ps.isMoving = false;
            ps.moveProgress = 0;
            
            const warp = getWarpAt(ps.gridX, ps.gridY);
            if (warp) {
                audioService.playSFX('warp');
                onWarp(warp.targetRoom, warp.targetX, warp.targetY, warp.facing);
            } else {
                onMove(ps.pixelX, ps.pixelY, ps.facing);
            }
        } else {
            if (ps.facing === 'up') ps.pixelY -= MOVEMENT_SPEED;
            if (ps.facing === 'down') ps.pixelY += MOVEMENT_SPEED;
            if (ps.facing === 'left') ps.pixelX -= MOVEMENT_SPEED;
            if (ps.facing === 'right') ps.pixelX += MOVEMENT_SPEED;
        }
      } else if (controlsAllowed) {
        let dx = 0;
        let dy = 0;
        let nextFacing = ps.facing;

        // Combine inputs (Keyboard + Virtual Gamepad)
        if (inputDirection) {
            if (inputDirection === 'up') { dy = -1; nextFacing = 'up'; }
            if (inputDirection === 'down') { dy = 1; nextFacing = 'down'; }
            if (inputDirection === 'left') { dx = -1; nextFacing = 'left'; }
            if (inputDirection === 'right') { dx = 1; nextFacing = 'right'; }
        } else {
            if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) { dy = -1; nextFacing = 'up'; }
            else if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) { dy = 1; nextFacing = 'down'; }
            else if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) { dx = -1; nextFacing = 'left'; }
            else if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) { dx = 1; nextFacing = 'right'; }
        }

        if (dx !== 0 || dy !== 0) {
            ps.facing = nextFacing;
            const nextGX = ps.gridX + dx;
            const nextGY = ps.gridY + dy;
            
            if (!isBlocked(nextGX, nextGY)) {
                ps.isMoving = true;
                ps.targetX = nextGX * TILE_SIZE;
                ps.targetY = nextGY * TILE_SIZE;
                onMove(ps.pixelX, ps.pixelY, ps.facing); 
            } else if (ps.facing !== nextFacing) {
                onMove(ps.pixelX, ps.pixelY, ps.facing);
            }
        }
      }

      // --- Draw Logic ---
      
      let camX = Math.floor(ps.pixelX + TILE_SIZE/2 - VIEW_WIDTH/2);
      let camY = Math.floor(ps.pixelY + TILE_SIZE/2 - VIEW_HEIGHT/2);
      
      camX = Math.max(0, Math.min(camX, roomConfig.width - VIEW_WIDTH));
      camY = Math.max(0, Math.min(camY, roomConfig.height - VIEW_HEIGHT));
      // Center if room is smaller than view
      if (roomConfig.width < VIEW_WIDTH) camX = -(VIEW_WIDTH - roomConfig.width)/2;
      if (roomConfig.height < VIEW_HEIGHT) camY = -(VIEW_HEIGHT - roomConfig.height)/2;

      ctx.fillStyle = '#000';
      ctx.fillRect(0,0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(-Math.floor(camX), -Math.floor(camY));

      const basePat = assets.current[roomConfig.baseTile] || assets.current.grass;
      ctx.fillStyle = basePat;
      // Override floor color if in own dorm and configured
      if (dormConfig && currentRoom.startsWith('hostel_')) {
          // Draw Base Color
          ctx.fillStyle = dormConfig.floorColor;
          ctx.fillRect(0,0, roomConfig.width, roomConfig.height);
          
          // Draw Pattern (Simple Grid Overlay)
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          for(let dx = 0; dx < roomConfig.width; dx += TILE_SIZE) {
              for(let dy = 0; dy < roomConfig.height; dy += TILE_SIZE) {
                  if ((dx/TILE_SIZE + dy/TILE_SIZE) % 2 === 0) {
                      ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
                  }
              }
          }
      } else {
          ctx.fillRect(0,0, roomConfig.width, roomConfig.height);
      }

      if (roomConfig.objects) {
          // Draw Floor Objects First
          roomConfig.objects.forEach(obj => {
              if (obj.type.startsWith('floor_') || obj.type === 'grass') {
                  // Use specific color if provided, else pattern
                  if (obj.color) {
                      ctx.fillStyle = obj.color;
                  } else {
                      ctx.fillStyle = assets.current[obj.type] || assets.current.floor_tile;
                  }
                  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);

                  if (obj.label === 'START_SPRINT' && obj.type === 'floor_tile') {
                      // Checkered line (fallback if someone has old data)
                      ctx.fillStyle = '#fff';
                      for(let i=0; i<obj.w; i+=16) {
                          ctx.fillRect(obj.x + i, obj.y, 8, 8);
                          ctx.fillRect(obj.x + i + 8, obj.y + 8, 8, 8);
                      }
                  }
              }
          });

          // Sort non-floor objects by Y for simple depth sorting
          // Exclude University Gate from this pass to draw it last (on top)
          const renderableObjects = roomConfig.objects
              .filter(o => !o.type.startsWith('floor_') && o.type !== 'grass' && o.type !== 'university_gate')
              .sort((a,b) => {
                  if (a.y !== b.y) return a.y - b.y;
                  // If Y is same, ensure small props appear on top of desks
                  if (a.type.startsWith('prop_') && !b.type.startsWith('prop_')) return 1;
                  if (!a.type.startsWith('prop_') && b.type.startsWith('prop_')) return -1;
                  return 0;
              });
          
          renderableObjects.forEach(obj => {
             if (obj.type === 'computer') {
                 // Draw Server Rack
                 ctx.fillStyle = '#1e293b';
                 ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                 // Lights
                 ctx.fillStyle = (Date.now() % 1000 < 500) ? '#10b981' : '#059669';
                 ctx.fillRect(obj.x + 4, obj.y + 4, 4, 4);
                 ctx.fillStyle = (Date.now() % 800 < 400) ? '#ef4444' : '#991b1b';
                 ctx.fillRect(obj.x + 12, obj.y + 4, 4, 4);
             } else if (obj.type === 'study_desk') {
                 // Pixel Art Desk
                 ctx.fillStyle = '#78350f'; // Dark wood legs
                 ctx.fillRect(obj.x + 4, obj.y + 10, 4, obj.h - 10);
                 ctx.fillRect(obj.x + obj.w - 8, obj.y + 10, 4, obj.h - 10);
                 
                 ctx.fillStyle = '#92400e'; // Table top
                 ctx.fillRect(obj.x, obj.y, obj.w, 12);
                 ctx.fillStyle = '#713f12'; // Edge shadow
                 ctx.fillRect(obj.x, obj.y + 12, obj.w, 2);

                 // Book
                 ctx.fillStyle = '#f8fafc'; // Pages
                 ctx.fillRect(obj.x + 10, obj.y + 2, 12, 8);
                 ctx.fillStyle = '#cbd5e1'; // Text lines
                 ctx.fillRect(obj.x + 12, obj.y + 4, 8, 1);
                 ctx.fillRect(obj.x + 12, obj.y + 6, 8, 1);
                 
             } else if (obj.type === 'bed') {
                 // Bed Logic
                 const bedColor = (dormConfig && currentRoom.startsWith('hostel_')) ? dormConfig.bedColor : '#3b82f6';
                 ctx.fillStyle = '#78350f'; 
                 ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                 ctx.fillStyle = '#f8fafc';
                 ctx.fillRect(obj.x + 2, obj.y + 2, obj.w - 4, obj.h - 4);
                 ctx.fillStyle = '#e2e8f0';
                 ctx.fillRect(obj.x + 4, obj.y + 4, obj.w - 8, 16);
                 ctx.fillStyle = bedColor;
                 ctx.fillRect(obj.x + 2, obj.y + 32, obj.w - 4, obj.h - 34);
             } else if (obj.type === 'chair') {
                 ctx.fillStyle = '#78350f'; // Dark Wood
                 ctx.fillRect(obj.x + 4, obj.y + 12, 4, 12);
                 ctx.fillRect(obj.x + 24, obj.y + 12, 4, 12);
                 ctx.fillStyle = '#b45309';
                 ctx.fillRect(obj.x + 2, obj.y + 12, 28, 6);
                 ctx.fillStyle = '#78350f';
                 ctx.fillRect(obj.x + 4, obj.y, 24, 12);
             } else if (obj.type === 'prop_coffee') {
                 ctx.fillStyle = '#fff';
                 ctx.beginPath();
                 ctx.arc(obj.x + 16, obj.y + 24, 6, 0, Math.PI * 2);
                 ctx.fill();
                 ctx.fillStyle = '#3f2e18';
                 ctx.beginPath();
                 ctx.arc(obj.x + 16, obj.y + 24, 4, 0, Math.PI * 2);
                 ctx.fill();
                 ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                 ctx.lineWidth = 1;
                 const steamOffset = (Date.now() / 200) % 4;
                 ctx.beginPath();
                 ctx.moveTo(obj.x + 16, obj.y + 16 - steamOffset);
                 ctx.lineTo(obj.x + 16, obj.y + 10 - steamOffset);
                 ctx.stroke();
             } else if (obj.type === 'prop_plant') {
                 ctx.fillStyle = '#ea580c';
                 ctx.fillRect(obj.x + 8, obj.y + 20, 16, 12);
                 ctx.fillStyle = '#16a34a';
                 ctx.beginPath();
                 ctx.arc(obj.x + 16, obj.y + 16, 10, 0, Math.PI * 2);
                 ctx.fill();
                 ctx.beginPath();
                 ctx.arc(obj.x + 8, obj.y + 12, 8, 0, Math.PI * 2);
                 ctx.fill();
                 ctx.beginPath();
                 ctx.arc(obj.x + 24, obj.y + 12, 8, 0, Math.PI * 2);
                 ctx.fill();
             } else if (obj.type === 'blackboard') {
                 ctx.fillStyle = '#1e293b'; // Board frame/bg
                 ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                 ctx.fillStyle = '#0f172a'; // Board surface
                 ctx.fillRect(obj.x + 2, obj.y + 2, obj.w - 4, obj.h - 4);
                 ctx.fillStyle = 'rgba(255,255,255,0.7)';
                 ctx.font = '8px monospace';
                 if (obj.label === 'CS') {
                     ctx.fillText('if(x){', obj.x + 8, obj.y + 12);
                     ctx.fillText('  run();', obj.x + 8, obj.y + 22);
                     ctx.fillText('}', obj.x + 8, obj.y + 32);
                 } else if (obj.label === 'MATH') {
                      ctx.fillText('a²+b²=c²', obj.x + 8, obj.y + 16);
                      ctx.font = '6px monospace';
                      ctx.fillText('x = (-b±√Δ)/2a', obj.x + 6, obj.y + 28);
                 } else if (obj.label === 'ART') {
                     ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                     ctx.beginPath(); ctx.arc(obj.x + 20, obj.y + 16, 8, 0, Math.PI*2); ctx.stroke();
                     ctx.fillText('Perspective', obj.x + 40, obj.y + 16);
                 } else if (obj.label === 'HISTORY') {
                     ctx.fillText('Timeline:', obj.x + 8, obj.y + 12);
                     ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                     ctx.beginPath(); 
                     ctx.moveTo(obj.x + 10, obj.y + 24); 
                     ctx.lineTo(obj.x + 80, obj.y + 24); 
                     ctx.stroke();
                     ctx.fillText('1776', obj.x + 10, obj.y + 34);
                 } else {
                     ctx.fillText('E=mc²', obj.x + 10, obj.y + 12);
                 }
             } else if (obj.type === 'prop_laptop') {
                 ctx.fillStyle = '#94a3b8'; // Silver Base
                 ctx.fillRect(obj.x + 4, obj.y + 12, 16, 6);
                 ctx.fillStyle = '#cbd5e1'; // Silver Screen Back
                 ctx.fillRect(obj.x + 4, obj.y, 16, 12);
                 ctx.fillStyle = '#1e293b'; // Screen
                 ctx.fillRect(obj.x + 6, obj.y + 2, 12, 8);
                 ctx.fillStyle = '#3b82f6'; // Screen glow
                 ctx.fillRect(obj.x + 8, obj.y + 4, 4, 4);
             } else if (obj.type === 'prop_books') {
                 ctx.fillStyle = '#ef4444'; 
                 ctx.fillRect(obj.x + 4, obj.y + 10, 12, 4);
                 ctx.fillStyle = '#3b82f6'; 
                 ctx.fillRect(obj.x + 6, obj.y + 6, 10, 4);
                 ctx.fillStyle = '#10b981'; 
                 ctx.fillRect(obj.x + 5, obj.y + 2, 11, 4);
             } else if (obj.type === 'prop_papers') {
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(obj.x+2, obj.y+2, obj.w, obj.h);
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(obj.x + 3, obj.y + 4, obj.w - 6, 2);
                ctx.fillRect(obj.x + 3, obj.y + 8, obj.w - 6, 2);
                ctx.fillRect(obj.x + 3, obj.y + 12, obj.w - 10, 2);
             } else if (obj.type === 'prop_easel') {
                 ctx.strokeStyle = '#78350f';
                 ctx.lineWidth = 2;
                 ctx.beginPath();
                 ctx.moveTo(obj.x + 8, obj.y);
                 ctx.lineTo(obj.x + 2, obj.y + 24);
                 ctx.moveTo(obj.x + 8, obj.y);
                 ctx.lineTo(obj.x + 14, obj.y + 24);
                 ctx.stroke();
                 ctx.fillStyle = '#fef3c7';
                 ctx.fillRect(obj.x + 2, obj.y + 4, 12, 16);
                 ctx.fillStyle = '#ef4444';
                 ctx.beginPath();
                 ctx.arc(obj.x + 8, obj.y + 10, 3, 0, Math.PI*2);
                 ctx.fill();
             } else if (obj.type === 'prop_globe') {
                 ctx.fillStyle = '#78350f';
                 ctx.fillRect(obj.x + 6, obj.y + 12, 4, 4);
                 ctx.fillRect(obj.x + 4, obj.y + 16, 8, 2);
                 ctx.fillStyle = '#3b82f6';
                 ctx.beginPath();
                 ctx.arc(obj.x + 8, obj.y + 8, 7, 0, Math.PI*2);
                 ctx.fill();
                 ctx.fillStyle = '#10b981';
                 ctx.beginPath();
                 ctx.arc(obj.x + 6, obj.y + 6, 2, 0, Math.PI*2);
                 ctx.fill();
                 ctx.beginPath();
                 ctx.arc(obj.x + 10, obj.y + 9, 3, 0, Math.PI*2);
                 ctx.fill();
             } else if (obj.type === 'soccer_goal') {
                 ctx.fillStyle = 'rgba(255,255,255,0.3)';
                 ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                 ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                 ctx.lineWidth = 1;
                 ctx.beginPath();
                 for(let i=0; i<obj.w; i+=4) { ctx.moveTo(obj.x+i, obj.y); ctx.lineTo(obj.x+i, obj.y+obj.h); }
                 for(let i=0; i<obj.h; i+=4) { ctx.moveTo(obj.x, obj.y+i); ctx.lineTo(obj.x+obj.w, obj.y+i); }
                 ctx.stroke();
                 ctx.strokeStyle = '#fff';
                 ctx.lineWidth = 3;
                 ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
             } else if (obj.type === 'penalty_spot') {
                 const bx = obj.x + obj.w/2;
                 const by = obj.y + obj.h/2;
                 ctx.fillStyle = obj.color || '#fff';
                 ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI*2); ctx.fill();
                 if (obj.label !== 'decoration') {
                     ctx.fillStyle = '#000';
                     ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI*2); ctx.fill();
                 }
             } else if (obj.type === 'flag') {
                 const cx = obj.x + obj.w/2;
                 const groundY = obj.y + obj.h;
                 ctx.strokeStyle = '#cbd5e1'; // silver
                 ctx.lineWidth = 2;
                 ctx.beginPath();
                 ctx.moveTo(cx, groundY);
                 ctx.lineTo(cx, groundY - 24);
                 ctx.stroke();
                 if (obj.label === 'START_SPRINT') {
                    const size = 6;
                    for (let r=0; r<4; r++) {
                        for (let c=0; c<5; c++) {
                            ctx.fillStyle = (r+c)%2===0 ? '#000' : '#fff';
                            ctx.fillRect(cx + c*size, groundY - 24 - r*size, size, size);
                        }
                    }
                 } else {
                    const time = Date.now();
                    const offset = obj.x + obj.y;
                    const wave = Math.sin((time + offset) / 200) * 3;
                    ctx.fillStyle = obj.color || '#ef4444';
                    ctx.beginPath();
                    ctx.moveTo(cx, groundY - 24);
                    ctx.lineTo(cx + 16, groundY - 20 + wave); // Top right
                    ctx.lineTo(cx + 16, groundY - 12 + wave); // Bottom right
                    ctx.lineTo(cx, groundY - 12);
                    ctx.fill();
                 }
             } else if (obj.type === 'stadium_seating') {
                 const pat = assets.current.stadium_seating || '#1e293b';
                 ctx.fillStyle = pat;
                 ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
             } else if (obj.type === 'sign') {
                 const cx = obj.x + obj.w/2;
                 const by = obj.y + obj.h;
                 ctx.fillStyle = '#78350f'; // Dark wood
                 ctx.fillRect(cx - 2, by - 16, 4, 16);
                 ctx.fillStyle = '#b45309'; // Light wood
                 ctx.fillRect(cx - 14, by - 24, 28, 12);
                 ctx.strokeStyle = '#3e1c05';
                 ctx.strokeRect(cx - 14, by - 24, 28, 12);
                 if (obj.label) {
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(cx - 10, by - 21, 20, 2);
                    ctx.fillRect(cx - 10, by - 17, 14, 2);
                 }
             } else if (obj.type === 'building') {
                  // ... Urban Building Logic ...
                  const roofH = 12;
                  let doorW = 32;
                  if (obj.label === 'LIBRARY') doorW = 64; // Increase door size for Library
                  const doorH = 32;
                  const doorX = obj.x + obj.w/2 - doorW/2;
                  const doorY = obj.y + obj.h - doorH;
                  
                  // Label Logic
                  let labelRect = null;
                  if (obj.label) {
                      ctx.font = '10px "Press Start 2P"';
                      const textMetrics = ctx.measureText(obj.label);
                      const textW = textMetrics.width + 16;
                      const textH = 20;
                      const labelY = doorY - textH - 4;
                      labelRect = { x: obj.x + obj.w/2 - textW/2, y: labelY, w: textW, h: textH };
                  }

                  ctx.fillStyle = obj.color || '#334155';
                  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                  ctx.fillStyle = '#1e293b'; // Dark roof
                  ctx.fillRect(obj.x, obj.y, obj.w, roofH);
                  ctx.fillStyle = '#0f172a'; // Roof trim
                  ctx.fillRect(obj.x, obj.y + roofH - 2, obj.w, 2);
                  ctx.fillStyle = '#475569';
                  if (obj.w > 64) {
                    ctx.fillRect(obj.x + 10, obj.y + 4, 16, 4);
                    ctx.fillRect(obj.x + obj.w - 26, obj.y + 4, 16, 4);
                  }

                  // Windows
                  const winW = 12;
                  const winH = 20;
                  const gapX = 14;
                  const gapY = 12;
                  const startY = obj.y + roofH + gapY;
                  const endY = obj.y + obj.h - 10; 
                  for(let wy = startY; wy < endY - winH; wy += winH + gapY) {
                      for(let wx = obj.x + 10; wx < obj.x + obj.w - 10; wx += winW + gapX) {
                          const wRect = { x: wx, y: wy, w: winW, h: winH };
                          const doorPad = 4;
                          if (
                              wRect.x < doorX + doorW + doorPad &&
                              wRect.x + wRect.w > doorX - doorPad &&
                              wRect.y < doorY + doorH + doorPad &&
                              wRect.y + wRect.h > doorY - doorPad
                          ) continue;
                          if (labelRect) {
                              const labelPad = 4;
                              if (
                                  wRect.x < labelRect.x + labelRect.w + labelPad &&
                                  wRect.x + wRect.w > labelRect.x - labelPad &&
                                  wRect.y < labelRect.y + labelRect.h + labelPad &&
                                  wRect.y + wRect.h > labelRect.y - labelPad
                              ) continue;
                          }
                          if (wx + winW > obj.x + obj.w - 4) continue;
                          ctx.fillStyle = '#3b82f6';
                          ctx.fillRect(wx, wy, winW, winH);
                          ctx.fillStyle = 'rgba(255,255,255,0.3)';
                          ctx.beginPath();
                          ctx.moveTo(wx, wy + winH);
                          ctx.lineTo(wx + winW, wy);
                          ctx.lineTo(wx + winW, wy + 6);
                          ctx.lineTo(wx + 6, wy + winH);
                          ctx.fill();
                          ctx.strokeStyle = '#1e3a8a';
                          ctx.lineWidth = 1;
                          ctx.strokeRect(wx, wy, winW, winH);
                      }
                  }

                  ctx.fillStyle = '#1e293b'; 
                  ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, doorH + 2);
                  ctx.fillStyle = '#020617'; 
                  ctx.fillRect(doorX, doorY, doorW, doorH);
                  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
                  ctx.fillRect(doorX + 2, doorY + 2, 12, 28);
                  ctx.fillRect(doorX + 18, doorY + 2, 12, 28);
                  ctx.fillStyle = '#94a3b8';
                  ctx.fillRect(doorX + 12, doorY + 16, 2, 6);
                  ctx.fillRect(doorX + 18, doorY + 16, 2, 6);

                  if (labelRect && obj.label) {
                      ctx.fillStyle = '#0f172a';
                      ctx.fillRect(labelRect.x, labelRect.y, labelRect.w, labelRect.h);
                      ctx.strokeStyle = '#fff';
                      ctx.lineWidth = 2;
                      ctx.strokeRect(labelRect.x, labelRect.y, labelRect.w, labelRect.h);
                      ctx.fillStyle = '#fff';
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.font = '10px "Press Start 2P"';
                      ctx.fillText(obj.label, labelRect.x + labelRect.w/2, labelRect.y + labelRect.h/2 + 1);
                      ctx.textBaseline = 'alphabetic'; 
                  }
              } else if (obj.type === 'tree') {
                  ctx.fillStyle = '#15803d'; 
                  for(let tx=obj.x; tx < obj.x+obj.w; tx+=TILE_SIZE) {
                      for(let ty=obj.y; ty < obj.y+obj.h; ty+=TILE_SIZE) {
                         ctx.save();
                         ctx.translate(tx,ty);
                         ctx.fill(new Path2D("M16 2 C8 2 2 10 2 18 C2 26 8 30 16 30 C24 30 30 26 30 18 C30 10 24 2 16 2 Z"));
                         ctx.fillStyle = '#22c55e'; 
                         ctx.beginPath();
                         ctx.arc(10, 10, 6, 0, Math.PI*2);
                         ctx.fill();
                         ctx.restore();
                         ctx.fillStyle = '#15803d';
                      }
                  }
              } else if (obj.type === 'bush') {
                  const cx = obj.x + obj.w/2;
                  const cy = obj.y + obj.h/2;
                  const sway = 0; // Animation removed
                  ctx.fillStyle = '#15803d'; 
                  ctx.beginPath(); ctx.arc(cx + sway, cy - 2, 10, 0, Math.PI*2); ctx.fill();
                  ctx.beginPath(); ctx.arc(cx - 6 + sway, cy + 5, 8, 0, Math.PI*2); ctx.fill();
                  ctx.beginPath(); ctx.arc(cx + 6 + sway, cy + 5, 8, 0, Math.PI*2); ctx.fill();
              } else if (obj.type === 'flower') {
                  const cx = obj.x + obj.w/2;
                  const cy = obj.y + obj.h/2;
                  
                  // Sway Animation
                  const time = Date.now();
                  const sway = Math.sin((time + obj.x)/600) * 3;

                  // Stem
                  ctx.fillStyle = '#22c55e';
                  ctx.beginPath();
                  ctx.moveTo(cx, cy + 8); // Root
                  ctx.quadraticCurveTo(cx + sway, cy + 4, cx + sway, cy);
                  ctx.stroke();
                  ctx.fillRect(cx - 1 + sway, cy, 2, 8);
                  
                  // Flower head
                  ctx.fillStyle = obj.color || '#ec4899'; 
                  ctx.beginPath();
                  ctx.arc(cx + sway, cy - 2, 3, 0, Math.PI*2);
                  ctx.fill();
                  
                  // Center
                  ctx.fillStyle = '#fef08a';
                  ctx.beginPath();
                  ctx.arc(cx + sway, cy - 2, 1.5, 0, Math.PI*2);
                  ctx.fill();
              } else if (obj.type === 'water') {
                  // Animated Water
                  ctx.fillStyle = '#3b82f6';
                  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                  
                  const time = Date.now();
                  const rippleShift = Math.sin(time / 500) * 4;
                  
                  ctx.fillStyle = 'rgba(255,255,255,0.2)';
                  // Draw ripples
                  for(let i=0; i < obj.w; i+=16) {
                      for(let j=0; j < obj.h; j+=16) {
                          const size = 2 + Math.sin((time + i + j)/300) * 2;
                          ctx.fillRect(obj.x + i + 8 + rippleShift, obj.y + j + 8, size, size);
                      }
                  }
              } else if (obj.type === 'bench') {
                  ctx.fillStyle = '#78350f'; 
                  ctx.fillRect(obj.x, obj.y+4, obj.w, obj.h-8);
                  ctx.fillStyle = '#92400e'; 
                  for(let i=0; i<obj.w; i+=8) {
                    ctx.fillRect(obj.x+i, obj.y+4, 6, obj.h-8);
                  }
              } else {
                  if (obj.color) ctx.fillStyle = obj.color;
                  else if (obj.type === 'wall') ctx.fillStyle = '#1e293b'; 
                  else if (obj.type === 'desk') ctx.fillStyle = '#854d0e';
                  else ctx.fillStyle = '#000';
                  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
              }
          });
      }

      // Draw Hints (E) - Improved Stability with Distance Check
      const drawHint = (x: number, y: number, text?: string) => {
         const floatY = Math.sin(Date.now() / 200) * 2;
         const label = text || 'E';
         ctx.font = '8px "Press Start 2P"';
         const textW = ctx.measureText(label).width + 8;
         ctx.fillStyle = '#fff';
         ctx.fillRect(x - textW/2, y - 20 + floatY, textW, 12);
         ctx.strokeStyle = '#000';
         ctx.lineWidth = 1;
         ctx.strokeRect(x - textW/2, y - 20 + floatY, textW, 12);
         ctx.fillStyle = '#000';
         ctx.textAlign = 'center';
         ctx.fillText(label, x, y - 11 + floatY);
      };

      // Check proximity for Hints
      const px = ps.pixelX + TILE_SIZE/2;
      const py = ps.pixelY + TILE_SIZE/2;

      if (roomConfig.objects) {
         roomConfig.objects.forEach(obj => {
            if (obj.type === 'study_desk' || (obj.type === 'penalty_spot' && obj.label !== 'decoration') || (obj.type === 'flag' && obj.label === 'START_SPRINT')) {
               const ox = obj.x + obj.w/2;
               const oy = obj.y + obj.h/2;
               const dist = Math.sqrt(Math.pow(px - ox, 2) + Math.pow(py - oy, 2));
               if (dist < TILE_SIZE * 2) {
                   drawHint(ox, obj.y);
               }
            } else if (obj.type === 'sign' && obj.label) {
                const ox = obj.x + obj.w/2;
                const oy = obj.y + obj.h/2;
                const dist = Math.sqrt(Math.pow(px - ox, 2) + Math.pow(py - oy, 2));
                if (dist < TILE_SIZE * 1.5) {
                    drawHint(ox, obj.y, obj.label);
                }
            }
         });
      }
      if (roomConfig.npcs) {
          roomConfig.npcs.forEach(npc => {
              const nx = npc.x + TILE_SIZE/2;
              const ny = npc.y + TILE_SIZE/2;
              const dist = Math.sqrt(Math.pow(px - nx, 2) + Math.pow(py - ny, 2));
              if (dist < TILE_SIZE * 1.5) {
                  drawHint(nx, npc.y);
              }
          });
      }

      // Draw Warps (Doors)
      if (roomConfig.warps) {
          roomConfig.warps.forEach(w => {
              // Draw hint for public room entrances
              if (roomConfig.type === 'public') {
                  // Transparent hint for where the warp is
                  ctx.fillStyle = 'rgba(0,0,0,0.3)';
                  ctx.fillRect(w.x, w.y, w.w, w.h);
              } else {
                  // Inside rooms, showing exit
                  ctx.fillStyle = 'rgba(0,0,0,0.3)';
                  ctx.fillRect(w.x, w.y, w.w, w.h);
              }
          });
      }

      // Draw Players & NPCs
      const characters = [
          ...Object.values(players).map(p => ({ ...p, type: 'player' })),
          ...(roomConfig.npcs || []).map(n => ({ ...n, type: 'npc' }))
      ];

      // Sort characters by Y position for depth
      characters.sort((a,b) => a.y - b.y);

      characters.forEach((char: any) => {
          const isMe = char.type === 'player' && char.id === currentUserId;
          let dx = char.x;
          let dy = char.y;
          let facing = char.facing || 'down';
          let isMoving = false;

          if (isMe) {
              dx = ps.pixelX;
              dy = ps.pixelY;
              facing = ps.facing;
              isMoving = ps.isMoving;
          } else if (char.type === 'player' && char.isMoving && char.targetX !== undefined) {
              dx = char.x + (char.targetX - char.x) * 0.2;
              dy = char.y + (char.targetY - char.y) * 0.2;
              if (Math.abs(dx - char.targetX) < 1) dx = char.targetX;
              if (Math.abs(dy - char.targetY) < 1) dy = char.targetY;
              isMoving = true;
          }
          
          const px = Math.floor(dx) + TILE_SIZE/2;
          const frame = Math.floor(Date.now() / 200) % 2;
          const bounce = isMoving ? (frame === 0 ? -1 : 1) : 0;
          
          // NPC Idle Bounce
          const npcBounce = (char.type === 'npc' && !isMoving) ? Math.sin(Date.now()/500) * 1.5 : 0;
          
          let py = Math.floor(dy) + TILE_SIZE/2 + bounce + npcBounce;

          // Emote Effects (modify pos or add visual)
          let offsetX = 0;
          if (char.emote === 'dance') {
              const danceTime = Date.now() / 150;
              offsetX = Math.sin(danceTime) * 3;
              py += Math.abs(Math.cos(danceTime)) * -2;
          }

          const drawX = px + offsetX;

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.ellipse(drawX, py+6, 6, 3, 0, 0, Math.PI*2);
          ctx.fill();

          // Body
          ctx.fillStyle = char.color;
          ctx.fillRect(drawX-5, py-10, 10, 8); 
          ctx.fillRect(drawX-6, py-4, 12, 10); 
          ctx.fillStyle = '#fff';
          ctx.fillRect(drawX-3, py-3, 6, 8); 

          // Face
          ctx.fillStyle = '#000';
          if (facing === 'down') {
              ctx.fillRect(drawX-3, py-8, 2, 2);
              ctx.fillRect(drawX+1, py-8, 2, 2);
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(drawX-1, py-6, 2, 2);
          } else if (facing === 'left') {
              ctx.fillRect(drawX-4, py-8, 2, 2);
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(drawX-6, py-6, 2, 2);
          } else if (facing === 'right') {
              ctx.fillRect(drawX+2, py-8, 2, 2);
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(drawX+4, py-6, 2, 2);
          }

          // --- ACCESSORIES ---
          if (char.glasses) {
              ctx.fillStyle = '#000'; // Frame color
              if (facing === 'down') {
                  ctx.fillRect(drawX-1, py-8, 2, 1);
                  ctx.strokeStyle = '#000';
                  ctx.lineWidth = 1;
                  ctx.fillStyle = 'rgba(255,255,255,0.3)';
                  ctx.fillRect(drawX-5, py-9, 4, 3); 
                  ctx.strokeRect(drawX-5, py-9, 4, 3);
                  ctx.fillRect(drawX+1, py-9, 4, 3);
                  ctx.strokeRect(drawX+1, py-9, 4, 3);
              } else if (facing === 'left') {
                  ctx.fillStyle = 'rgba(255,255,255,0.3)';
                  ctx.strokeStyle = '#000';
                  ctx.fillRect(drawX-7, py-9, 4, 3);
                  ctx.strokeRect(drawX-7, py-9, 4, 3);
                  ctx.fillStyle = '#000';
                  ctx.fillRect(drawX-3, py-8, 4, 1);
              } else if (facing === 'right') {
                  ctx.fillStyle = 'rgba(255,255,255,0.3)';
                  ctx.strokeStyle = '#000';
                  ctx.fillRect(drawX+3, py-9, 4, 3);
                  ctx.strokeRect(drawX+3, py-9, 4, 3);
                  ctx.fillStyle = '#000';
                  ctx.fillRect(drawX-1, py-8, 4, 1);
              }
          }

          if (char.hat) {
              if (char.hat === 'cap_red') {
                  ctx.fillStyle = '#ef4444'; // Red
                  ctx.fillRect(drawX-5, py-13, 10, 4); // Base
                  if (facing === 'down') ctx.fillRect(drawX-5, py-10, 10, 2);
                  if (facing === 'left') ctx.fillRect(drawX-7, py-10, 4, 2);
                  if (facing === 'right') ctx.fillRect(drawX+3, py-10, 4, 2);
              } else if (char.hat === 'cap_blue') {
                  ctx.fillStyle = '#3b82f6'; // Blue
                  ctx.fillRect(drawX-5, py-13, 10, 4); 
                  if (facing === 'down') ctx.fillRect(drawX-5, py-10, 10, 2);
                  if (facing === 'left') ctx.fillRect(drawX-7, py-10, 4, 2);
                  if (facing === 'right') ctx.fillRect(drawX+3, py-10, 4, 2);
              } else if (char.hat === 'top_hat') {
                  ctx.fillStyle = '#1e293b'; // Black
                  ctx.fillRect(drawX-4, py-20, 8, 10); // Tall part
                  ctx.fillRect(drawX-6, py-11, 12, 2); // Brim
                  ctx.fillStyle = '#ef4444'; // Band
                  ctx.fillRect(drawX-4, py-13, 8, 2);
              } else if (char.hat === 'beanie') {
                  ctx.fillStyle = '#f59e0b'; // Orange
                  ctx.beginPath();
                  ctx.arc(drawX, py-11, 5, Math.PI, 0); // Dome
                  ctx.fill();
                  ctx.fillRect(drawX-5, py-11, 10, 3); // Cuff
                  ctx.fillStyle = '#fff';
                  ctx.beginPath();
                  ctx.arc(drawX, py-14, 2, 0, Math.PI*2);
                  ctx.fill();
              }
          }

          // --- EMOTE OVERLAYS ---
          if (char.emote === 'wave') {
              const waveTime = Date.now() / 100;
              const waveAngle = Math.sin(waveTime) * 0.5;
              ctx.save();
              ctx.translate(drawX + 8, py - 8);
              ctx.rotate(waveAngle);
              ctx.fillStyle = '#f59e0b'; // Hand color
              ctx.fillRect(0, -4, 4, 4);
              ctx.restore();
          } else if (char.emote === 'heart') {
              const floatY = Math.sin(Date.now() / 200) * 2;
              ctx.fillStyle = '#ef4444';
              ctx.font = '10px sans-serif';
              ctx.fillText('❤', drawX - 3, py - 24 + floatY);
          } else if (char.emote === 'exclaim') {
              const floatY = Math.sin(Date.now() / 200) * 2;
              ctx.fillStyle = '#eab308';
              ctx.font = '12px "Press Start 2P"';
              ctx.fillText('!', drawX - 2, py - 24 + floatY);
          }

          // Name Tag
          if (!isMe) {
              ctx.font = '8px "Press Start 2P"';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#000';
              ctx.fillText(char.name, drawX + 1, py - 16 - (char.hat === 'top_hat' ? 8 : 0));
              ctx.fillStyle = '#fff';
              ctx.fillText(char.name, drawX, py - 17 - (char.hat === 'top_hat' ? 8 : 0));
          } else {
              ctx.fillStyle = '#ef4444';
              const indicatorY = py - 20 - (char.hat === 'top_hat' ? 8 : 0);
              ctx.beginPath();
              ctx.moveTo(drawX, indicatorY);
              ctx.lineTo(drawX-3, indicatorY-4);
              ctx.lineTo(drawX+3, indicatorY-4);
              ctx.fill();
          }

          // Message
          if (char.type === 'player' && char.lastMessage) {
               const timeDiff = Date.now() - char.lastMessage.timestamp;
               if (timeDiff < 6000) {
                   ctx.font = '8px "Press Start 2P"';
                   const w = ctx.measureText(char.lastMessage.text).width + 8;
                   ctx.fillStyle = '#fff';
                   ctx.fillRect(drawX - w/2, py - 30, w, 12);
                   ctx.strokeRect(drawX - w/2, py - 30, w, 12);
                   ctx.fillStyle = '#000';
                   ctx.textAlign = 'left';
                   ctx.fillText(char.lastMessage.text, drawX - w/2 + 4, py - 22);
               }
          }
      });

      // --- FOREGROUND RENDER PASS (Objects drawn ON TOP of characters) ---
      if (roomConfig.objects) {
          const foregroundObjects = roomConfig.objects.filter(o => o.type === 'university_gate');
          
          foregroundObjects.forEach(obj => {
             if (obj.type === 'university_gate') {
                 // Pillars
                 const pillarW = TILE_SIZE * 2;
                 const pillarH = obj.h;
                 ctx.fillStyle = '#1e293b'; 
                 ctx.fillRect(obj.x, obj.y, pillarW, pillarH);
                 ctx.fillRect(obj.x + obj.w - pillarW, obj.y, pillarW, pillarH);
                 ctx.fillStyle = '#334155';
                 ctx.fillRect(obj.x + 4, obj.y + 4, pillarW - 8, pillarH - 8);
                 ctx.fillRect(obj.x + obj.w - pillarW + 4, obj.y + 4, pillarW - 8, pillarH - 8);

                 // Header
                 const headerH = TILE_SIZE * 1.8;
                 const overhang = 4;
                 ctx.fillStyle = '#0f172a'; 
                 ctx.fillRect(obj.x - overhang, obj.y, obj.w + (overhang * 2), headerH);
                 ctx.strokeStyle = '#f59e0b'; 
                 ctx.lineWidth = 4;
                 ctx.strokeRect(obj.x - overhang, obj.y, obj.w + (overhang * 2), headerH);

                 // Text
                 if (obj.label) {
                     ctx.fillStyle = '#ffffff';
                     ctx.textAlign = 'center';
                     ctx.textBaseline = 'middle';
                     ctx.font = 'bold 12px "Press Start 2P"';
                     ctx.shadowColor = 'black';
                     ctx.shadowBlur = 4;
                     ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + headerH / 2);
                     ctx.shadowBlur = 0;
                 }
                 ctx.textBaseline = 'alphabetic';
             }
          });
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [players, currentRoom, currentUserId, roomConfig, inputDirection, interactionTrigger, disableControls, dormConfig]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
        <canvas 
            ref={canvasRef}
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            className="w-full h-full object-contain image-pixelated"
            style={{ imageRendering: 'pixelated' }}
        />
    </div>
  );
};