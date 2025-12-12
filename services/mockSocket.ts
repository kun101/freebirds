import { Player, RoomId, ChatMessage, getRoomDetails } from '../types';

// Simulation constants
const BOT_NAMES = ['Frosty', 'Pingu', 'Waddles', 'Snowball', 'IceCube', 'Flipper', 'Slippy'];
const BOT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const BOT_MESSAGES = [
  "Anyone want to play hide and seek?",
  "This room is cool!",
  "Where is the secret party?",
  "Hello everyone!",
  "Brr it's cold.",
  "Check out my new color!",
  "Let's go to the beach!"
];

type EventHandler = (data: any) => void;

class MockSocketService {
  private listeners: Record<string, EventHandler[]> = {};
  private players: Record<string, Player> = {};
  private currentUserId: string | null = null;
  private intervalIds: number[] = [];
  
  // Connect "to server"
  connect(userConfig: { name: string; color: string }) {
    // Simulate network delay
    setTimeout(() => {
      this.currentUserId = 'user-' + Date.now();
      const newPlayer: Player = {
        id: this.currentUserId,
        name: userConfig.name,
        color: userConfig.color,
        room: RoomId.ENTRANCE,
        x: getRoomDetails(RoomId.ENTRANCE).spawn.x,
        y: getRoomDetails(RoomId.ENTRANCE).spawn.y,
        facing: 'down',
        isMoving: false
      };
      
      this.players[this.currentUserId] = newPlayer;
      
      this.emitToClient('connect', { id: this.currentUserId });
      this.emitToClient('gameState', {
        players: this.players,
        room: RoomId.ENTRANCE
      });
      
      this.startBotSimulation();
    }, 500);
  }

  // Client sends data to "server"
  emit(event: string, payload: any) {
    if (event === 'move') {
      this.handleMove(payload);
    } else if (event === 'chat') {
      this.handleChat(payload);
    } else if (event === 'joinRoom') {
      this.handleJoinRoom(payload);
    }
  }

  // Register client-side listener
  on(event: string, callback: EventHandler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: EventHandler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  // Internal: Emit data back to client
  private emitToClient(event: string, payload: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(payload));
    }
  }

  private handleMove(pos: { x: number; y: number }) {
    if (!this.currentUserId || !this.players[this.currentUserId]) return;
    
    // Update server state
    const player = this.players[this.currentUserId];
    player.targetX = pos.x;
    player.targetY = pos.y;
    player.isMoving = true;
    
    // Broadcast to "everyone" (in this demo, just back to client with others)
    this.emitToClient('playerMoved', { id: this.currentUserId, x: pos.x, y: pos.y });
  }

  private handleChat(text: string) {
    if (!this.currentUserId) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      playerId: this.currentUserId,
      playerName: this.players[this.currentUserId].name,
      text,
      timestamp: Date.now()
    };
    this.emitToClient('chatMessage', msg);
  }

  private handleJoinRoom(roomId: RoomId) {
    if (!this.currentUserId) return;
    
    // Cleanup old bots
    this.stopBotSimulation();
    
    // Update player
    const player = this.players[this.currentUserId];
    player.room = roomId;
    const spawn = getRoomDetails(roomId).spawn;
    player.x = spawn.x;
    player.y = spawn.y;
    player.targetX = undefined;
    player.targetY = undefined;
    player.isMoving = false;

    // Reset players list for new room (remove old room's players, keep current user)
    this.players = { [this.currentUserId]: player };

    // Ack join
    this.emitToClient('roomJoined', { roomId, players: this.players });
    
    // Spawn new bots for this room
    this.startBotSimulation();
  }

  // === Simulation Logic ===
  
  private startBotSimulation() {
    // Create 3-6 bots
    const botCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < botCount; i++) {
      const id = `bot-${i}`;
      this.players[id] = {
        id,
        name: BOT_NAMES[i % BOT_NAMES.length],
        color: BOT_COLORS[i % BOT_COLORS.length],
        room: RoomId.ENTRANCE, // Doesn't matter for local sim
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
        facing: 'down',
        isMoving: false
      };
      // Notify client of new player
      this.emitToClient('playerJoined', this.players[id]);
    }

    // Move bots periodically
    const moveInterval = window.setInterval(() => {
      const botIds = Object.keys(this.players).filter(id => id.startsWith('bot-'));
      const randomBot = botIds[Math.floor(Math.random() * botIds.length)];
      if (randomBot) {
        const targetX = Math.random() * 600 + 100;
        const targetY = Math.random() * 400 + 100;
        this.players[randomBot].targetX = targetX;
        this.players[randomBot].targetY = targetY;
        this.players[randomBot].isMoving = true;
        this.emitToClient('playerMoved', { id: randomBot, x: targetX, y: targetY });
      }
    }, 2000);

    // Bots chat periodically
    const chatInterval = window.setInterval(() => {
      if (Math.random() > 0.7) return; // 30% chance
      const botIds = Object.keys(this.players).filter(id => id.startsWith('bot-'));
      const randomBot = botIds[Math.floor(Math.random() * botIds.length)];
      if (randomBot) {
        const msg: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          playerId: randomBot,
          playerName: this.players[randomBot].name,
          text: BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)],
          timestamp: Date.now()
        };
        this.emitToClient('chatMessage', msg);
      }
    }, 4000);

    this.intervalIds.push(moveInterval, chatInterval);
  }

  private stopBotSimulation() {
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
  }
}

export const socketService = new MockSocketService();