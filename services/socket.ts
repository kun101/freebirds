
import { auth, db } from './firebase';
import { 
  ref, 
  set, 
  update, 
  remove, 
  onValue, 
  onChildAdded, 
  push, 
  query, 
  limitToLast, 
  onDisconnect, 
  serverTimestamp,
  get,
  DatabaseReference,
  Unsubscribe
} from 'firebase/database';
import { Player, ChatMessage, getRoomDetails, UserProfile, Direction } from '../types';

type EventHandler = (data: any) => void;

class FirebaseSocketAdapter {
  private listeners: Record<string, EventHandler[]> = {};
  public currentUserId: string | null = null;
  public currentRoomId: string | null = null;
  public currentUserProfile: UserProfile | null = null;
  
  // Firebase Refs
  private playerRef: DatabaseReference | null = null;
  private roomPlayersRef: DatabaseReference | null = null;
  
  // Unsubscribers
  private unsubPlayers: Unsubscribe | null = null;
  private unsubMessages: Unsubscribe | null = null;
  
  // Optimistic State
  private optimisticPlayer: Partial<Player> | null = null;
  
  async connect(token: string): Promise<string> {
    if (!db || !auth || !auth.currentUser) {
      throw new Error("Not connected to Firebase");
    }

    this.currentUserId = auth.currentUser.uid;
    
    try {
        const profileSnap = await get(ref(db, `users/${this.currentUserId}`));
        this.currentUserProfile = profileSnap.val();
    } catch(e) {
        console.warn("Could not fetch profile on connect", e);
    }

    // We are "connected" instantly via Firebase SDK
    setTimeout(() => this.emitLocal('connect', {}), 0);

    return this.currentUserId;
  }

  // --- Actions ---

  async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    if (!db) return null;
    try {
      const snap = await get(ref(db, `users/${userId}`));
      return snap.val() as UserProfile;
    } catch (e) {
      console.error("Error fetching profile", e);
      return null;
    }
  }

  async getUsers(userIds: string[]): Promise<UserProfile[]> {
    if (!db || userIds.length === 0) return [];
    
    const promises = userIds.map(id => get(ref(db, `users/${id}`)));
    const snapshots = await Promise.all(promises);
    
    return snapshots.map(s => s.val() as UserProfile).filter(u => !!u && !!u.id && !!u.name);
  }

  async updateUserProfile(updates: Partial<UserProfile>) {
    if (!db || !this.currentUserId) return;

    // Sanitize updates to remove undefined
    const cleanUpdates = JSON.parse(JSON.stringify(updates));

    await update(ref(db, `users/${this.currentUserId}`), cleanUpdates);

    // Update local cache
    if (this.currentUserProfile) {
        this.currentUserProfile = { ...this.currentUserProfile, ...updates };
    }
  }

  async updatePlayerVisuals(visuals: { hat?: string; glasses?: string; color?: string }) {
    if (!this.playerRef) return;
    // Ensure no undefined values
    const safeVisuals = {
        hat: visuals.hat || null,
        glasses: visuals.glasses || null,
        color: visuals.color
    };
    await update(this.playerRef, safeVisuals);
  }

  async sendEmote(emote: string) {
    if (!this.playerRef) return;
    await update(this.playerRef, { emote });
  }

  async addFriend(friendId: string) {
    if (!db || !this.currentUserId || !this.currentUserProfile) return;
    
    const friends = this.currentUserProfile.friends || [];
    if (!friends.includes(friendId)) {
      friends.push(friendId);
      this.currentUserProfile.friends = friends;
      await update(ref(db, `users/${this.currentUserId}`), { friends });
    }
  }

  // --- External API mimicking Socket.io ---

  emit(event: string, payload: any) {
    if (event === 'joinRoom') this.handleJoinRoom(payload).catch(this.reportError);
    if (event === 'move') this.handleMove(payload).catch(this.reportError);
    if (event === 'chat') this.handleChat(payload).catch(this.reportError);
  }

  on(event: string, callback: EventHandler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: string, callback: EventHandler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  disconnect() {
    this.cleanupCurrentRoom();
  }

  // --- Internal Firebase Logic ---

  private emitLocal(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
  
  private reportError = (err: any) => {
    console.error("Socket/Firebase Error:", err);
    this.emitLocal('error', { message: err.message || "Unknown database error" });
  }

  private cleanupCurrentRoom() {
    // 1. Remove self from DB if exists
    if (this.playerRef) {
      // Use catch to prevent unhandled promise rejections during cleanup
      remove(this.playerRef).catch(e => console.warn("Cleanup remove failed", e));
      onDisconnect(this.playerRef).cancel().catch(e => console.warn("Cleanup cancel failed", e));
    }
    
    // 2. Unsubscribe listeners using the stored unsubscribe functions
    if (this.unsubPlayers) {
        this.unsubPlayers();
        this.unsubPlayers = null;
    }
    if (this.unsubMessages) {
        this.unsubMessages();
        this.unsubMessages = null;
    }

    this.playerRef = null;
    this.roomPlayersRef = null;
    this.optimisticPlayer = null;
  }

  private async handleJoinRoom(payload: string | { roomId: string, spawn?: { x: number, y: number }, facing?: Direction }) {
    if (!db || !auth.currentUser) return;

    // Cleanup previous room state/listeners
    this.cleanupCurrentRoom();
    
    let roomId = '';
    let spawn: {x:number, y:number} | undefined;
    let facing: Direction | undefined;

    if (typeof payload === 'string') {
        roomId = payload;
    } else {
        roomId = payload.roomId;
        spawn = payload.spawn;
        facing = payload.facing;
    }

    this.currentRoomId = roomId;
    const user = auth.currentUser;
    const roomConfig = getRoomDetails(roomId);

    const roomRefStr = `rooms/${roomId}`;
    this.playerRef = ref(db, `${roomRefStr}/players/${user.uid}`);
    this.roomPlayersRef = ref(db, `${roomRefStr}/players`);
    const messagesQuery = query(ref(db, `${roomRefStr}/messages`), limitToLast(50));

    const playerData: Player = {
      id: user.uid,
      name: user.displayName || 'Penguin',
      color: this.currentUserProfile?.color || user.photoURL || '#3b82f6',
      room: roomId,
      x: spawn ? spawn.x : roomConfig.spawn.x,
      y: spawn ? spawn.y : roomConfig.spawn.y,
      facing: facing || 'down',
      isMoving: false,
      hat: this.currentUserProfile?.hat || '',
      glasses: this.currentUserProfile?.glasses || '',
      emote: null
    };

    // Store optimistic state so app renders player immediately
    this.optimisticPlayer = playerData;
    
    // Inject optimistic state into initial "roomJoined" event
    this.emitLocal('roomJoined', { roomId, players: { [user.uid]: playerData } });

    try {
      await set(this.playerRef, playerData);
      await onDisconnect(this.playerRef).remove();
    } catch (e: any) {
      console.error("Failed to join room (DB Write):", e);
      // Don't throw, let listeners handle sync or failure
    }

    // Subscribe to players
    this.unsubPlayers = onValue(this.roomPlayersRef, (snapshot) => {
      const val = snapshot.val() || {};
      const playersMap: Record<string, Player> = {};
      Object.keys(val).forEach(key => {
        const p = val[key];
        // Strictly validate player objects to filter out garbage data or undefined players
        if (p && typeof p === 'object') {
            const hasId = !!p.id;
            const hasName = !!p.name;
            const hasCoords = typeof p.x === 'number' && typeof p.y === 'number';
            
            if (hasId && hasName && hasCoords) {
                playersMap[key] = p as Player;
            }
        }
      });

      // Ensure we exist in the map (latency hiding) if not yet synced from server
      if (this.optimisticPlayer && !playersMap[user.uid]) {
         playersMap[user.uid] = this.optimisticPlayer as Player;
      } else if (playersMap[user.uid]) {
         // Server caught up
         this.optimisticPlayer = null;
      }

      this.emitLocal('gameState', {
        players: playersMap,
        room: roomId
      });
    }, (error: any) => {
      this.emitLocal('error', { message: `Sync Error: ${error.message}` });
    });

    // Subscribe to messages
    this.unsubMessages = onChildAdded(messagesQuery, (snapshot) => {
        const val = snapshot.val();
        if (!val) return;
        this.emitLocal('chatMessage', { ...val, id: snapshot.key });
    });
  }

  private async handleMove(payload: { x: number; y: number, facing?: Direction }) {
    if (!this.playerRef) return;
    
    // Update optimistic local state if active
    if (this.optimisticPlayer) {
        this.optimisticPlayer.x = payload.x;
        this.optimisticPlayer.y = payload.y;
        this.optimisticPlayer.facing = payload.facing || 'down';
    }

    await update(this.playerRef, {
      x: payload.x,
      y: payload.y,
      isMoving: true,
      targetX: payload.x,
      targetY: payload.y,
      facing: payload.facing || 'down',
      emote: null // Clear emote on move
    });
  }

  private async handleChat(text: string) {
    if (!db || !this.currentRoomId || !auth.currentUser) return;
    const pushRef = ref(db, `rooms/${this.currentRoomId}/messages`);
    
    const msgData = {
      playerId: auth.currentUser.uid,
      playerName: auth.currentUser.displayName,
      text: text,
      timestamp: serverTimestamp()
    };
    
    await push(pushRef, msgData);
  }
}

export const socketService = new FirebaseSocketAdapter();
