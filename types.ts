


export const TILE_SIZE = 32;
export const g = (n: number) => n * TILE_SIZE;

export enum RoomId {
  ENTRANCE = 'entrance',
  QUAD = 'quad',
  LIBRARY = 'library',
  CAFE = 'cafe',
  TRACK = 'track',
  // Courses
  COURSE_CS = 'course_cs',
  COURSE_MATH = 'course_math',
  COURSE_ART = 'course_art',
  COURSE_HISTORY = 'course_history',
  // Dynamic
  HOSTEL = 'hostel' // Used as prefix
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapObject extends Rect {
  type: 'wall' | 'building' | 'desk' | 'study_desk' | 'tree' | 'bush' | 'flower' | 'water' | 'grass' | 'floor_wood' | 'floor_tile' | 'floor_stone' | 'floor_clay' | 'bench' | 'column' | 'chair' | 'computer' | 'blackboard' | 'prop_laptop' | 'prop_easel' | 'prop_globe' | 'prop_books' | 'prop_papers' | 'soccer_goal' | 'penalty_spot' | 'sign' | 'flag' | 'stadium_seating' | 'university_gate' | 'bed' | 'prop_coffee' | 'prop_plant';
  color?: string;
  label?: string; // For building signs
}

export interface Warp extends Rect {
  targetRoom: string;
  targetX: number;
  targetY: number;
  facing: Direction;
  label?: string;
}

export interface NPC {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: Direction;
  color: string;
  dialogues: string[];
  role: 'professor' | 'student' | 'visitor' | 'quiz_master';
  department?: 'cs' | 'math' | 'art' | 'history'; // For professors
}

export interface Question {
  q: string;
  options: string[];
  correct: number; // Index
  tier: 1 | 2 | 3; // 1=Easy, 2=Med, 3=Hard
}

export interface Quiz {
  topic: string; // Course Name
  questions: Question[];
  xpReward: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface PlayerColor {
  body: string;
  belly: string;
  beak: string;
}

export interface DormConfig {
  floorColor: string;
  bedColor: string;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  room: string;
  x: number;
  y: number;
  facing: Direction;
  isMoving: boolean;
  targetX?: number;
  targetY?: number;
  hat?: string;
  glasses?: string;
  emote?: 'wave' | 'dance' | 'heart' | 'exclaim' | null;
  lastMessage?: { text: string; timestamp: number };
}

export interface UserProfile {
  id: string;
  name: string;
  major: string;
  year: string;
  bio: string;
  enrolledCourses: string[];
  friends: string[];
  xp: number;
  level: number;
  hat?: string;
  glasses?: string;
  photoURL?: string; // Sometimes used for color
  color?: string; // Sometimes used for color
  dormConfig?: DormConfig;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

export interface GameState {
  currentUser: Player | null;
  players: Record<string, Player>;
  currentRoom: string;
  messages: ChatMessage[];
  isConnected: boolean;
}

export interface RoomConfig {
  name: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  type: 'public' | 'course' | 'private';
  baseTile: string;
  objects?: MapObject[];
  npcs?: NPC[];
  warps?: Warp[];
}

// --- COURSE SYSTEM ---
export interface Course {
  id: string;
  name: string;
  department: 'cs' | 'math' | 'art' | 'history';
  description: string;
  syllabus: string[];
}

export const COURSE_CATALOG: Course[] = [
  // CS
  { 
    id: 'cs_web', 
    name: 'Web Development 101', 
    department: 'cs', 
    description: 'HTML, CSS, JS basics',
    syllabus: ['HTML Structure & Semantics', 'CSS Box Model & Flexbox', 'JavaScript Syntax Basics', 'DOM Manipulation', 'Event Handling', 'Fetch API & JSON', 'React Components']
  },
  { 
    id: 'cs_dsa', 
    name: 'Data Structures & Algo', 
    department: 'cs', 
    description: 'Trees, Graphs, O-Notation',
    syllabus: ['Big O Notation', 'Arrays & Strings', 'Linked Lists', 'Stacks & Queues', 'Recursion', 'Sorting Algorithms', 'Binary Trees'] 
  },
  { 
    id: 'cs_os', 
    name: 'Operating Systems', 
    department: 'cs', 
    description: 'Processes, Threads, Memory',
    syllabus: ['Process Management', 'Threads & Concurrency', 'CPU Scheduling', 'Deadlocks', 'Memory Management', 'Virtual Memory', 'File Systems']
  },
  { 
    id: 'cs_ai', 
    name: 'Intro to AI', 
    department: 'cs', 
    description: 'Basics of ML and Neural Nets',
    syllabus: ['Search Algorithms', 'Knowledge Representation', 'Probability & Uncertainty', 'Machine Learning Basics', 'Neural Networks', 'Computer Vision', 'Natural Language Processing']
  },
  // Math
  { 
    id: 'math_calc1', 
    name: 'Calculus I', 
    department: 'math', 
    description: 'Limits and Derivatives',
    syllabus: ['Functions & Limits', 'Continuity', 'Derivatives Definition', 'Rules of Differentiation', 'Chain Rule', 'Implicit Differentiation', 'Applications of Derivatives']
  },
  { 
    id: 'math_stats', 
    name: 'Statistics', 
    department: 'math', 
    description: 'Probability and Distributions',
    syllabus: ['Data Types & Visualization', 'Measures of Central Tendency', 'Probability Basics', 'Random Variables', 'Normal Distribution', 'Hypothesis Testing', 'Regression']
  },
  { 
    id: 'math_la', 
    name: 'Linear Algebra', 
    department: 'math', 
    description: 'Vectors and Matrices',
    syllabus: ['Systems of Linear Equations', 'Matrix Operations', 'Determinants', 'Vector Spaces', 'Eigenvalues & Eigenvectors', 'Linear Transformations', 'Orthogonality']
  },
  // Art
  { 
    id: 'art_hist', 
    name: 'Art History', 
    department: 'art', 
    description: 'Renaissance to Modern',
    syllabus: ['Prehistoric Art', 'Classical Greek & Roman', 'The Renaissance', 'Baroque & Rococo', 'Impressionism', 'Cubism & Surrealism', 'Contemporary Art']
  },
  { 
    id: 'art_color', 
    name: 'Color Theory', 
    department: 'art', 
    description: 'Mixing and Palettes',
    syllabus: ['The Color Wheel', 'Hue, Saturation, Value', 'Warm vs Cool Colors', 'Complementary Colors', 'Color Psychology', 'Pigments & Mixing', 'Digital Color']
  },
  { 
    id: 'art_sketch', 
    name: 'Sketching Basics', 
    department: 'art', 
    description: 'Perspectives and Shading',
    syllabus: ['Line & Contour', 'Shape & Form', 'Value & Shading', 'One-Point Perspective', 'Two-Point Perspective', 'Human Proportions', 'Gesture Drawing']
  },
  // History
  { 
    id: 'hist_world', 
    name: 'World History', 
    department: 'history', 
    description: 'Ancient Civilizations',
    syllabus: ['The Fertile Crescent', 'Ancient Egypt', 'Indus Valley Civilization', 'Ancient China', 'The Silk Road', 'The Age of Discovery', 'Industrial Revolution']
  },
  { 
    id: 'hist_eu', 
    name: 'European History', 
    department: 'history', 
    description: 'Middle Ages to Cold War',
    syllabus: ['The Fall of Rome', 'Feudalism & Middle Ages', 'The Renaissance', 'The Reformation', 'The Enlightenment', 'French Revolution', 'The World Wars']
  },
  { 
    id: 'hist_civ', 
    name: 'Civics', 
    department: 'history', 
    description: 'Government and Politics',
    syllabus: ['Foundations of Government', 'The Constitution', 'Legislative Branch', 'Executive Branch', 'Judicial Branch', 'Civil Rights & Liberties', 'International Relations']
  },
];

export const QUAD_WIDTH = g(32);
export const QUAD_HEIGHT = g(32);

export const QUAD_NPCS: NPC[] = [
  { 
    id: 'npc_prof', name: 'Prof. Pingu', x: g(15), y: g(8), facing: 'down', color: '#4b5563', role: 'professor',
    dialogues: ["Remember to cite your sources!", "The library is a quiet place for study.", "I'm late for my lecture on Fish History."]
  },
  { 
    id: 'npc_student1', name: 'Freshman Fred', x: g(12), y: g(18), facing: 'right', color: '#3b82f6', role: 'student',
    dialogues: ["I can't find the Math Hall...", "Is there a party tonight?", "This campus is huge!"]
  },
  { 
    id: 'npc_student2', name: 'Senior Sarah', x: g(20), y: g(18), facing: 'left', color: '#ec4899', role: 'student',
    dialogues: ["I'm so stressed about finals.", "Have you been to the cafe? The latte is great.", "I practically live in the CS Lab."]
  }
];

export const QUESTION_BANK: Record<string, Question[]> = {
    'cs': [
        { q: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyperlink Text Mode", "Home Tool Markup"], correct: 0, tier: 1 },
        { q: "Which symbol is used for ID in CSS?", options: [".", "#", "@", "!"], correct: 1, tier: 1 },
        { q: "What is 2 + '2' in JavaScript?", options: ["4", "22", "NaN", "Error"], correct: 1, tier: 1 },
        { q: "What is the Big O of Binary Search?", options: ["O(n)", "O(n^2)", "O(log n)", "O(1)"], correct: 2, tier: 2 },
        { q: "What data structure uses LIFO?", options: ["Queue", "Array", "Stack", "Tree"], correct: 2, tier: 2 },
    ],
    'math': [
        { q: "What is the derivative of x^2?", options: ["x", "2x", "x^2", "2"], correct: 1, tier: 1 },
        { q: "What is pi approx?", options: ["3.14", "2.14", "4.14", "3.41"], correct: 0, tier: 1 },
        { q: "Solve for x: 2x + 4 = 10", options: ["2", "3", "4", "5"], correct: 1, tier: 1 },
        { q: "Integral of 1/x?", options: ["ln(x)", "e^x", "1/x^2", "x"], correct: 0, tier: 2 },
    ],
    'art': [
        { q: "Primary colors are?", options: ["Red, Green, Blue", "Red, Yellow, Blue", "Orange, Green, Purple", "Cyan, Magenta, Yellow"], correct: 1, tier: 1 },
        { q: "Who painted the Mona Lisa?", options: ["Van Gogh", "Picasso", "Da Vinci", "Michelangelo"], correct: 2, tier: 1 },
    ],
    'history': [
        { q: "Who was the first US President?", options: ["Lincoln", "Washington", "Jefferson", "Adams"], correct: 1, tier: 1 },
        { q: "When did WWII end?", options: ["1940", "1945", "1950", "1939"], correct: 1, tier: 1 },
    ]
};

export const STATIC_ROOM_CONFIGS: Record<string, RoomConfig> = {
  [RoomId.ENTRANCE]: {
    name: 'Campus Gates',
    width: g(20), // 640
    height: g(20), // 640
    spawn: { x: g(10), y: g(10) },
    type: 'public',
    baseTile: 'grass',
    objects: [
      { x: g(8), y: 0, w: g(4), h: g(20), type: 'floor_stone' }, // Main path
      { x: g(6), y: g(19), w: g(8), h: g(1), type: 'wall' }, // Bottom wall
      
      // -- UNIVERSITY GATE --
      { x: g(3), y: g(5), w: g(14), h: g(4), type: 'university_gate', label: 'Welcome to Birdie University' },
      
      // Collision Walls for Pillars
      { x: g(3), y: g(5), w: g(2), h: g(2), type: 'wall' }, 
      { x: g(15), y: g(5), w: g(2), h: g(2), type: 'wall' },
      
      // -- DECORATION: FLOWERS & BUSHES --
      { x: g(6), y: g(10), w: g(1), h: g(1), type: 'flower', color: '#ef4444' },
      { x: g(13), y: g(10), w: g(1), h: g(1), type: 'flower', color: '#ef4444' },
      { x: g(6), y: g(12), w: g(1), h: g(1), type: 'flower', color: '#3b82f6' },
      { x: g(13), y: g(12), w: g(1), h: g(1), type: 'flower', color: '#3b82f6' },
      { x: g(6), y: g(14), w: g(1), h: g(1), type: 'flower', color: '#f59e0b' },
      { x: g(13), y: g(14), w: g(1), h: g(1), type: 'flower', color: '#f59e0b' },
      
      { x: g(5), y: g(8), w: g(1), h: g(1), type: 'bush' },
      { x: g(14), y: g(8), w: g(1), h: g(1), type: 'bush' },
      { x: g(5), y: g(16), w: g(1), h: g(1), type: 'bush' },
      { x: g(14), y: g(16), w: g(1), h: g(1), type: 'bush' },
      
      // Random Grass Tufts/Flowers
      { x: g(2), y: g(18), w: g(1), h: g(1), type: 'flower', color: '#fff' },
      { x: g(18), y: g(2), w: g(1), h: g(1), type: 'flower', color: '#fff' },
    ],
    warps: [
      { x: g(8), y: 0, w: g(4), h: g(1), targetRoom: RoomId.QUAD, targetX: g(16), targetY: g(29), facing: 'up', label: 'Enter Campus' }
    ]
  },
  [RoomId.QUAD]: {
    name: 'University Quad',
    width: QUAD_WIDTH,
    height: QUAD_HEIGHT,
    spawn: { x: g(16), y: g(16) },
    type: 'public',
    baseTile: 'grass',
    npcs: QUAD_NPCS,
    objects: [
      // -- Paving --
      { x: 0, y: g(15), w: QUAD_WIDTH, h: g(2), type: 'floor_stone' }, // Center Horizontal
      { x: g(15), y: g(7), w: g(2), h: g(7), type: 'floor_stone' }, // Center Top Vertical
      { x: g(15), y: g(17), w: g(2), h: g(15), type: 'floor_stone' }, // Center Bottom Vertical
      
      // Expanded Central Plaza (6x6) to allow walking around 2x2 fountain
      { x: g(13), y: g(13), w: g(6), h: g(6), type: 'floor_stone' }, 

      // -- Pathways to Buildings --
      { x: g(6), y: g(7), w: g(1), h: g(8), type: 'floor_stone' }, // Path to Cafe
      { x: g(25), y: g(7), w: g(1), h: g(8), type: 'floor_stone' }, // Path to Art
      { x: g(2), y: g(15), w: g(1), h: g(10), type: 'floor_stone' }, // Vertical Left (Dorm/CS)
      { x: g(2), y: g(24), w: g(5), h: g(1), type: 'floor_stone' }, // Path to Dorm
      { x: g(29), y: g(15), w: g(1), h: g(10), type: 'floor_stone' }, // Vertical Right (History/Math)
      { x: g(25), y: g(24), w: g(5), h: g(1), type: 'floor_stone' }, // Path to History

      // -- Central Fountain --
      { x: g(15), y: g(15), w: g(2), h: g(2), type: 'water' },
      // Fountain Border
      { x: g(14.5), y: g(14.5), w: g(0.5), h: g(3), type: 'wall', color: '#94a3b8' },
      { x: g(17), y: g(14.5), w: g(0.5), h: g(3), type: 'wall', color: '#94a3b8' },
      { x: g(15), y: g(14.5), w: g(2), h: g(0.5), type: 'wall', color: '#94a3b8' },
      { x: g(15), y: g(17), w: g(2), h: g(0.5), type: 'wall', color: '#94a3b8' },

      // -- Signage --
      { x: g(5), y: g(8), w: g(1), h: g(1), type: 'sign', label: 'Cafe' },
      { x: g(14), y: g(7), w: g(1), h: g(1), type: 'sign', label: 'Library' }, // Moved next to building entrance
      { x: g(24), y: g(8), w: g(1), h: g(1), type: 'sign', label: 'Art Hall' },
      { x: g(5), y: g(15), w: g(1), h: g(1), type: 'sign', label: 'CS Lab' }, // Moved off path to grass
      { x: g(26), y: g(15), w: g(1), h: g(1), type: 'sign', label: 'Math' }, // Moved off path to grass
      { x: g(1), y: g(22), w: g(1), h: g(1), type: 'sign', label: 'Dorms' },

      // -- Nature / Beautification --
      { x: g(8), y: g(7), w: g(1), h: g(1), type: 'bush' },
      { x: g(12), y: g(20), w: g(1), h: g(1), type: 'bush' },
      { x: g(19), y: g(20), w: g(1), h: g(1), type: 'bush' },
      
      // FLOWER GARDEN (Around Fountain) - Moved outwards to avoid overlap with new wider path
      { x: g(12), y: g(12), w: g(1), h: g(1), type: 'flower', color: '#ec4899' },
      { x: g(19), y: g(12), w: g(1), h: g(1), type: 'flower', color: '#ec4899' },
      { x: g(12), y: g(19), w: g(1), h: g(1), type: 'flower', color: '#ec4899' },
      { x: g(19), y: g(19), w: g(1), h: g(1), type: 'flower', color: '#ec4899' },
      
      { x: g(12), y: g(14), w: g(1), h: g(1), type: 'flower', color: '#f59e0b' },
      { x: g(19), y: g(14), w: g(1), h: g(1), type: 'flower', color: '#f59e0b' },
      { x: g(12), y: g(17), w: g(1), h: g(1), type: 'flower', color: '#f59e0b' },
      { x: g(19), y: g(17), w: g(1), h: g(1), type: 'flower', color: '#f59e0b' },

      // Flowers near buildings (Updated to avoid overlap)
      
      // Near Cafe (Building x:3-9, y:4-6. Path x:6)
      { x: g(4), y: g(8), w: g(1), h: g(1), type: 'flower', color: '#fff' }, 
      { x: g(8), y: g(8), w: g(1), h: g(1), type: 'flower', color: '#fff' },
      
      // Near Art (Building x:22-28, y:4-6. Path x:25)
      { x: g(23), y: g(8), w: g(1), h: g(1), type: 'flower', color: '#3b82f6' }, 
      { x: g(27), y: g(8), w: g(1), h: g(1), type: 'flower', color: '#3b82f6' },
      
      // Near Dorms (Building x:4-8, y:21-23. Path x:2 and y:24)
      { x: g(3), y: g(22), w: g(1), h: g(1), type: 'flower', color: '#a855f7' }, 
      { x: g(9), y: g(22), w: g(1), h: g(1), type: 'flower', color: '#a855f7' }, 

      // Near History (Building x:23-27, y:21-23. Path x:29)
      { x: g(28), y: g(22), w: g(1), h: g(1), type: 'flower', color: '#ef4444' }, 
      { x: g(22), y: g(22), w: g(1), h: g(1), type: 'flower', color: '#ef4444' },

      // -- Buildings --
      { x: g(12), y: g(3), w: g(8), h: g(4), type: 'building', label: 'LIBRARY', color: '#b91c1c' }, 
      { x: g(3), y: g(4), w: g(7), h: g(3), type: 'building', label: 'CAFE', color: '#854d0e' },
      { x: g(22), y: g(4), w: g(7), h: g(3), type: 'building', label: 'ARTS', color: '#f59e0b' },
      { x: g(1), y: g(12), w: g(5), h: g(3), type: 'building', label: 'CS LAB', color: '#1e293b' },
      { x: g(3), y: g(15), w: g(1), h: g(1), type: 'floor_stone' },
      { x: g(26), y: g(12), w: g(5), h: g(3), type: 'building', label: 'MATH', color: '#334155' },
      { x: g(28), y: g(15), w: g(1), h: g(1), type: 'floor_stone' },
      { x: g(23), y: g(21), w: g(5), h: g(3), type: 'building', label: 'HISTORY', color: '#7f1d1d' },
      { x: g(4), y: g(21), w: g(5), h: g(3), type: 'building', label: 'DORMS', color: '#4c1d95' },

      // -- Walls/Boundaries --
      { x: 0, y: 0, w: QUAD_WIDTH, h: g(1), type: 'wall' }, 
      { x: 0, y: 0, w: g(1), h: QUAD_HEIGHT, type: 'wall' },
      { x: g(31), y: 0, w: g(1), h: g(15), type: 'wall' }, 
      { x: g(31), y: g(17), w: g(1), h: g(15), type: 'wall' }, 
      { x: 0, y: g(31), w: g(14), h: g(1), type: 'wall' }, 
      { x: g(18), y: g(31), w: g(14), h: g(1), type: 'wall' }, 
    ],
    warps: [
      { x: g(15), y: g(31), w: g(2), h: g(1), targetRoom: RoomId.ENTRANCE, targetX: g(10), targetY: g(2), facing: 'down', label: 'Exit Campus' },
      { x: g(31), y: g(15), w: g(1), h: g(2), targetRoom: RoomId.TRACK, targetX: g(2), targetY: g(10), facing: 'right', label: 'Track & Field' },
      { x: g(15), y: g(6), w: g(2), h: g(1), targetRoom: RoomId.LIBRARY, targetX: g(8), targetY: g(10), facing: 'up' },
      { x: g(6), y: g(6), w: g(1), h: g(1), targetRoom: RoomId.CAFE, targetX: g(6), targetY: g(8), facing: 'up' },
      { x: g(3), y: g(14), w: g(1), h: g(1), targetRoom: RoomId.COURSE_CS, targetX: g(6), targetY: g(10), facing: 'up' },
      { x: g(28), y: g(14), w: g(1), h: g(1), targetRoom: RoomId.COURSE_MATH, targetX: g(6), targetY: g(10), facing: 'up' },
      { x: g(25), y: g(6), w: g(1), h: g(1), targetRoom: RoomId.COURSE_ART, targetX: g(6), targetY: g(10), facing: 'up' },
      { x: g(25), y: g(23), w: g(1), h: g(1), targetRoom: RoomId.COURSE_HISTORY, targetX: g(6), targetY: g(10), facing: 'up' },
      { x: g(6), y: g(23), w: g(1), h: g(1), targetRoom: RoomId.HOSTEL, targetX: g(5), targetY: g(8), facing: 'down', label: 'To Dorms' },
    ]
  },
  [RoomId.TRACK]: {
    name: 'Track & Field',
    width: g(24),
    height: g(20),
    spawn: { x: g(2), y: g(10) },
    type: 'public',
    baseTile: 'grass',
    objects: [
        // Stadium Seating Ring
        { x: 0, y: 0, w: g(24), h: g(2), type: 'stadium_seating' },
        { x: 0, y: g(18), w: g(24), h: g(2), type: 'stadium_seating' },
        { x: g(22), y: g(2), w: g(2), h: g(16), type: 'stadium_seating' },
        
        { x: 0, y: g(2), w: g(2), h: g(7), type: 'stadium_seating' }, 
        { x: 0, y: g(11), w: g(2), h: g(7), type: 'stadium_seating' }, 

        { x: 0, y: g(9), w: g(2), h: g(2), type: 'floor_stone' },
        { x: g(2), y: g(2), w: g(20), h: g(16), type: 'floor_clay' },
        
        // Lane Markings
        { x: g(3), y: g(2), w: 2, h: g(16), type: 'floor_tile', color: 'rgba(255,255,255,0.4)' },
        { x: g(4), y: g(2), w: 2, h: g(16), type: 'floor_tile', color: 'rgba(255,255,255,0.4)' },
        { x: g(20), y: g(2), w: 2, h: g(16), type: 'floor_tile', color: 'rgba(255,255,255,0.4)' },
        { x: g(21), y: g(2), w: 2, h: g(16), type: 'floor_tile', color: 'rgba(255,255,255,0.4)' },
        { x: g(2), y: g(3), w: g(20), h: 2, type: 'floor_tile', color: 'rgba(255,255,255,0.4)' },
        { x: g(2), y: g(4), w: g(20), h: 2, type: 'floor_tile', color: 'rgba(255,255,255,0.4)' },
        { x: g(2), y: g(16), w: g(20), h: 2, type: 'floor_tile', color: 'rgba(255,255,255,0.4)' },
        { x: g(2), y: g(17), w: g(20), h: 2, type: 'floor_tile', color: 'rgba(255,255,255,0.4)' },

        // Inner Grass
        { x: g(5), y: g(4), w: g(14), h: g(12), type: 'grass' }, 
        { x: g(5), y: g(9.9), w: g(14), h: g(0.2), type: 'floor_tile', color: 'rgba(255,255,255,0.9)' },
        { x: g(11.5), y: g(9.5), w: g(1), h: g(1), type: 'penalty_spot', label: 'decoration', color: '#fff' }, 

        // Penalty Box
        { x: g(9), y: g(4), w: g(0.2), h: g(3), type: 'floor_tile', color: 'rgba(255,255,255,0.9)' }, 
        { x: g(15), y: g(4), w: g(0.2), h: g(3), type: 'floor_tile', color: 'rgba(255,255,255,0.9)' }, 
        { x: g(9), y: g(7), w: g(6.2), h: g(0.2), type: 'floor_tile', color: 'rgba(255,255,255,0.9)' }, 
        { x: g(10), y: g(4), w: g(0.2), h: g(1.5), type: 'floor_tile', color: 'rgba(255,255,255,0.9)' }, 
        { x: g(14), y: g(4), w: g(0.2), h: g(1.5), type: 'floor_tile', color: 'rgba(255,255,255,0.9)' }, 
        { x: g(10), y: g(5.5), w: g(4.2), h: g(0.2), type: 'floor_tile', color: 'rgba(255,255,255,0.9)' }, 

        { x: g(11.5), y: g(6), w: g(1), h: g(1), type: 'penalty_spot' },
        { x: g(11), y: g(2.5), w: g(2), h: g(1.5), type: 'soccer_goal' },

        { x: g(9), y: g(15), w: g(1), h: g(2), type: 'flag', label: 'START_SPRINT', color: '#000' }, 
        { x: g(12), y: g(15), w: g(1), h: g(1), type: 'sign', label: '100m Dash' },

        { x: g(2), y: g(2), w: g(1), h: g(2), type: 'flag', color: '#3b82f6' },
        { x: g(21), y: g(2), w: g(1), h: g(2), type: 'flag', color: '#f59e0b' },
        { x: g(2), y: g(16), w: g(1), h: g(2), type: 'flag', color: '#10b981' },
        { x: g(21), y: g(16), w: g(1), h: g(2), type: 'flag', color: '#ec4899' },
    ],
    warps: [
        { x: 0, y: g(9), w: g(1), h: g(2), targetRoom: RoomId.QUAD, targetX: g(30), targetY: g(16), facing: 'left', label: 'Back to Quad' }
    ]
  },
  [RoomId.LIBRARY]: {
    name: 'Grand Library',
    width: g(16),
    height: g(12),
    spawn: { x: g(8), y: g(10) },
    type: 'public',
    baseTile: 'floor_tile',
    npcs: [
       { id: 'npc_lib', name: 'Librarian', x: g(8), y: g(3), facing: 'down', color: '#9ca3af', role: 'professor', dialogues: ["Shhh!", "Books returned late will incur a fine.", "The restricted section is closed."] }
    ],
    objects: [
        { x: g(6), y: g(2), w: g(4), h: g(2), type: 'desk' },
        { x: g(2), y: g(4), w: g(2), h: g(6), type: 'desk' },
        { x: g(12), y: g(4), w: g(2), h: g(6), type: 'desk' },
        { x: g(4), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(4), y: g(8), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(10), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(10), y: g(8), w: g(2), h: g(1), type: 'study_desk' },
    ],
    warps: [
        { x: g(7), y: g(11), w: g(2), h: g(1), targetRoom: RoomId.QUAD, targetX: g(16), targetY: g(8), facing: 'down', label: 'Exit' }
    ]
  },
  [RoomId.COURSE_CS]: {
    name: 'Computer Science Lab',
    width: g(12),
    height: g(14),
    spawn: { x: g(6), y: g(12) }, // Spawn at bottom
    type: 'course',
    baseTile: 'floor_tile',
    npcs: [
       { id: 'npc_prof_cs', name: 'Prof. Bitwise', x: g(6), y: g(2), facing: 'down', color: '#10b981', role: 'quiz_master', department: 'cs', dialogues: ["Ready to test your algorithm knowledge?", "Coding is poetry.", "Debugging is the essence of life."] },
       { id: 'npc_student_cs1', name: 'Coder Cody', x: g(2), y: g(5), facing: 'right', color: '#3b82f6', role: 'student', dialogues: ["My code compiles but it does nothing.", "Have you tried turning it off and on again?", "I love Python!"] }
    ],
    objects: [
        { x: g(3), y: g(0), w: g(6), h: g(1), type: 'blackboard', label: 'CS' },
        { x: g(4.5), y: g(3), w: g(3), h: g(1), type: 'desk' }, 
        { x: g(5.5), y: g(3) + 4, w: g(1), h: g(1), type: 'prop_laptop' },
        { x: g(4.8), y: g(3) + 8, w: 20, h: 16, type: 'prop_papers' },
        { x: g(2), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(5), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(8), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(2), y: g(9), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(5), y: g(9), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(8), y: g(9), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(0), y: g(1), w: g(2), h: g(4), type: 'computer' },
        { x: g(10), y: g(1), w: g(2), h: g(4), type: 'computer' },
    ],
    warps: [
        { x: g(5), y: g(13), w: g(2), h: g(1), targetRoom: RoomId.QUAD, targetX: g(3), targetY: g(16), facing: 'down', label: 'Exit' }
    ]
  },
  [RoomId.COURSE_MATH]: {
    name: 'Mathematics Hall',
    width: g(12),
    height: g(14),
    spawn: { x: g(6), y: g(12) },
    type: 'course',
    baseTile: 'floor_tile',
    npcs: [
       { id: 'npc_prof_math', name: 'Prof. Algebra', x: g(6), y: g(2), facing: 'down', color: '#6366f1', role: 'quiz_master', department: 'math', dialogues: ["Numbers never lie.", "Can you solve for X?", "Calculus is beautiful."] },
       { id: 'npc_student_math1', name: 'Mathematician Mike', x: g(8), y: g(5), facing: 'left', color: '#f59e0b', role: 'student', dialogues: ["I dreamt of numbers last night.", "Geometry is pointless... wait, no it's not."] }
    ],
    objects: [
        { x: g(3), y: g(0), w: g(6), h: g(1), type: 'blackboard', label: 'MATH' },
        { x: g(4.5), y: g(3), w: g(3), h: g(1), type: 'desk' },
        { x: g(6), y: g(3) + 4, w: g(1), h: g(1), type: 'prop_books' },
        { x: g(5), y: g(3) + 8, w: 20, h: 16, type: 'prop_papers' },
        { x: g(3), y: g(6), w: g(2), h: g(1), type: 'study_desk' }, 
        { x: g(7), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(3), y: g(9), w: g(2), h: g(1), type: 'study_desk' }, 
        { x: g(7), y: g(9), w: g(2), h: g(1), type: 'study_desk' },
    ],
    warps: [
        { x: g(5), y: g(13), w: g(2), h: g(1), targetRoom: RoomId.QUAD, targetX: g(29), targetY: g(16), facing: 'down', label: 'Exit' }
    ]
  },
  [RoomId.CAFE]: {
    name: 'Student Cafe',
    width: g(16), // Widened slightly
    height: g(14),
    spawn: { x: g(8), y: g(11) },
    type: 'public',
    baseTile: 'floor_wood',
    objects: [
        { x: 0, y: 0, w: g(16), h: g(2), type: 'desk' }, 
        { x: g(2), y: g(0.5), w: g(1), h: g(1), type: 'prop_coffee' },
        { x: g(12), y: g(0.5), w: g(1), h: g(1), type: 'prop_coffee' },
        { x: g(7.5), y: g(0.5), w: g(1), h: g(1), type: 'prop_plant' },
        { x: g(3), y: g(5), w: g(3), h: g(2), type: 'desk' },
        { x: g(4), y: g(5), w: g(1), h: g(1), type: 'prop_coffee' }, 
        { x: g(3), y: g(4), w: g(1), h: g(1), type: 'chair' },
        { x: g(5), y: g(4), w: g(1), h: g(1), type: 'chair' },
        { x: g(3), y: g(7), w: g(1), h: g(1), type: 'chair' },
        { x: g(5), y: g(7), w: g(1), h: g(1), type: 'chair' },
        { x: g(10), y: g(5), w: g(3), h: g(2), type: 'desk' },
        { x: g(11), y: g(5), w: g(1), h: g(1), type: 'prop_plant' },
        { x: g(10), y: g(4), w: g(1), h: g(1), type: 'chair' }, 
        { x: g(12), y: g(4), w: g(1), h: g(1), type: 'chair' },
        { x: g(10), y: g(7), w: g(1), h: g(1), type: 'chair' },
        { x: g(12), y: g(7), w: g(1), h: g(1), type: 'chair' },
        { x: g(0), y: g(12), w: g(1), h: g(2), type: 'prop_plant' },
        { x: g(15), y: g(12), w: g(1), h: g(2), type: 'prop_plant' },
    ],
    warps: [
        { x: g(7), y: g(13), w: g(2), h: g(1), targetRoom: RoomId.QUAD, targetX: g(6), targetY: g(8), facing: 'down', label: 'Exit' }
    ]
  },
  [RoomId.COURSE_ART]: {
    name: 'Art Studio',
    width: g(12),
    height: g(14),
    spawn: { x: g(6), y: g(12) },
    type: 'course',
    baseTile: 'floor_wood',
    npcs: [
       { id: 'npc_prof_art', name: 'Prof. Palette', x: g(6), y: g(2), facing: 'down', color: '#f43f5e', role: 'quiz_master', department: 'art', dialogues: ["Express yourself!", "There are no mistakes, only happy accidents."] },
       { id: 'npc_student_art1', name: 'Artsy Anna', x: g(2), y: g(5), facing: 'right', color: '#ec4899', role: 'student', dialogues: ["I ran out of blue paint again.", "This sculpture speaks to me.", "Abstract art is the best."] }
    ],
    objects: [
        { x: g(3), y: g(0), w: g(6), h: g(1), type: 'blackboard', label: 'ART' },
        { x: g(4.5), y: g(3), w: g(3), h: g(1), type: 'desk' },
        { x: g(7.5), y: g(3), w: g(1), h: g(2), type: 'prop_easel' }, 
        { x: g(5), y: g(3) + 8, w: 20, h: 16, type: 'prop_papers' },
        { x: g(2), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(8), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(2), y: g(9), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(8), y: g(9), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(5), y: g(7), w: g(2), h: g(2), type: 'desk' }, // Statue Stand
    ],
    warps: [
        { x: g(5), y: g(13), w: g(2), h: g(1), targetRoom: RoomId.QUAD, targetX: g(25), targetY: g(9), facing: 'down', label: 'Exit' }
    ]
  },
  [RoomId.COURSE_HISTORY]: {
    name: 'History Hall',
    width: g(12),
    height: g(14),
    spawn: { x: g(6), y: g(12) },
    type: 'course',
    baseTile: 'floor_wood',
    npcs: [
       { id: 'npc_prof_hist', name: 'Prof. Ancient', x: g(6), y: g(2), facing: 'down', color: '#78350f', role: 'quiz_master', department: 'history', dialogues: ["Those who forget history are doomed to repeat it.", "The past is alive here."] },
       { id: 'npc_student_hist1', name: 'History Hank', x: g(8), y: g(5), facing: 'left', color: '#4b5563', role: 'student', dialogues: ["I wish I could time travel.", "The Roman Empire was fascinating.", "Did you finish the reading on the Cold War?"] }
    ],
    objects: [
        { x: g(3), y: g(0), w: g(6), h: g(1), type: 'blackboard', label: 'HISTORY' },
        { x: g(4.5), y: g(3), w: g(3), h: g(1), type: 'desk' },
        { x: g(4.8), y: g(3) + 4, w: g(1), h: g(1), type: 'prop_globe' },
        { x: g(6), y: g(3) + 8, w: 20, h: 16, type: 'prop_papers' },
        { x: g(2), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(8), y: g(6), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(2), y: g(9), w: g(2), h: g(1), type: 'study_desk' },
        { x: g(8), y: g(9), w: g(2), h: g(1), type: 'study_desk' },
    ],
    warps: [
        { x: g(5), y: g(13), w: g(2), h: g(1), targetRoom: RoomId.QUAD, targetX: g(25), targetY: g(24), facing: 'down', label: 'Exit' }
    ]
  }
};

export const getRoomDetails = (roomId: string): RoomConfig => {
  if (STATIC_ROOM_CONFIGS[roomId]) {
    return STATIC_ROOM_CONFIGS[roomId];
  }
  
  if (roomId.startsWith('hostel_')) {
    return {
      name: "Dorm Room",
      width: g(10),
      height: g(10),
      spawn: { x: g(5), y: g(8) },
      type: 'private',
      baseTile: 'floor_wood', // Default, but can be overridden by App.tsx logic
      objects: [
          // Use 'bed' type instead of generic desk
          { x: g(1), y: g(1), w: g(3), h: g(4), type: 'bed' }, 
          { x: g(6), y: g(1), w: g(3), h: g(1), type: 'study_desk' }, // Desk
          { x: g(6), y: g(2), w: g(1), h: g(1), type: 'chair' }, // Chair
          { x: g(9), y: g(0), w: g(1), h: g(2), type: 'prop_plant' }, // Pot in Top Right Corner
      ],
      warps: [
          // Exiting dorm puts you near the dorm building in the quad
          { x: g(4), y: g(9), w: g(2), h: g(1), targetRoom: RoomId.QUAD, targetX: g(7), targetY: g(24), facing: 'down', label: 'To Quad' }
      ]
    };
  }

  // Fallback
  return STATIC_ROOM_CONFIGS[RoomId.ENTRANCE];
};
