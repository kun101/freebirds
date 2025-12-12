
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  updateProfile,
  User 
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { UserProfile, COURSE_CATALOG } from '../types';

const MAJORS = ['Computer Science', 'Fine Arts', 'History', 'Mathematics', 'Physics', 'Biology', 'Literature'];
const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

export const api = {
  async signup(username: string, password: string | null, color: string) {
    if (!auth || !db) throw new Error("Firebase not initialized");

    let userCredential;
    
    // If password provided, use Email/Pass, otherwise Anonymous
    if (password) {
      const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${safeUsername}@penguinparty.com`; 
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } else {
      userCredential = await signInAnonymously(auth);
    }

    // Update Auth Profile
    if (userCredential.user) {
        await updateProfile(userCredential.user, {
            displayName: username,
            photoURL: color
        });
    }

    const uid = userCredential.user.uid;

    // Generate Student Data
    const randomMajor = MAJORS[Math.floor(Math.random() * MAJORS.length)];
    const randomYear = YEARS[Math.floor(Math.random() * YEARS.length)];
    
    // Assign specific Course IDs based on Major
    const enrolledCourses: string[] = [];
    
    // Helper to find courses by department
    const getCoursesByDept = (dept: string) => COURSE_CATALOG.filter(c => c.department === dept).map(c => c.id);

    if (randomMajor === 'Computer Science') enrolledCourses.push(...getCoursesByDept('cs').slice(0, 2));
    else if (randomMajor === 'Mathematics') enrolledCourses.push(...getCoursesByDept('math').slice(0, 2));
    else if (randomMajor === 'Fine Arts') enrolledCourses.push(...getCoursesByDept('art').slice(0, 2));
    else if (randomMajor === 'History') enrolledCourses.push(...getCoursesByDept('history').slice(0, 2));
    else enrolledCourses.push('cs_web', 'math_calc1'); // Default basic courses

    // Add a random elective
    const allIds = COURSE_CATALOG.map(c => c.id);
    const randomElective = allIds[Math.floor(Math.random() * allIds.length)];
    if (!enrolledCourses.includes(randomElective)) enrolledCourses.push(randomElective);

    const userProfile: UserProfile = {
      id: uid,
      name: username,
      major: randomMajor,
      year: randomYear,
      bio: "Just started my journey at the Virtual Campus!",
      enrolledCourses: enrolledCourses,
      friends: [],
      xp: 0,
      level: 1
    };

    // Save to Persistent User DB
    await set(ref(db, `users/${uid}`), userProfile);

    return {
      token: await userCredential.user.getIdToken(),
      user: userProfile
    };
  },

  async login(username: string, password: string) {
    if (!auth) throw new Error("Firebase not initialized");

    const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${safeUsername}@penguinparty.com`;
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return this.resumeSession(userCredential.user);
  },

  // New method to resume session from existing Auth User
  async resumeSession(user: User) {
    if (!db) throw new Error("Firebase not initialized");

    const uid = user.uid;

    // Fetch Profile
    const snapshot = await get(ref(db, `users/${uid}`));
    let userProfile = snapshot.val();

    // Fallback if legacy user or data missing
    if (!userProfile) {
       userProfile = {
         id: uid,
         name: user.displayName || 'Student',
         major: 'Undeclared',
         year: 'Freshman',
         bio: 'Returning student.',
         enrolledCourses: ['cs_web'], // Default to Web Dev
         friends: [],
         xp: 0,
         level: 1
       };
       await set(ref(db, `users/${uid}`), userProfile);
    } else {
      // Backfill XP/Level if missing for existing users
      if (userProfile.xp === undefined) {
         userProfile.xp = 0;
         userProfile.level = 1;
         await set(ref(db, `users/${uid}/xp`), 0);
         await set(ref(db, `users/${uid}/level`), 1);
      }
      // Migrate old RoomId[] courses to string[] if needed
      if (userProfile.enrolledCourses && userProfile.enrolledCourses.length > 0 && userProfile.enrolledCourses[0].includes('course_')) {
          const newCourses: string[] = [];
          if (userProfile.enrolledCourses.includes('course_cs')) newCourses.push('cs_web', 'cs_dsa');
          if (userProfile.enrolledCourses.includes('course_math')) newCourses.push('math_calc1');
          if (userProfile.enrolledCourses.includes('course_art')) newCourses.push('art_color');
          if (userProfile.enrolledCourses.includes('course_history')) newCourses.push('hist_world');
          
          if (newCourses.length === 0) newCourses.push('cs_web');
          
          userProfile.enrolledCourses = newCourses;
          await set(ref(db, `users/${uid}/enrolledCourses`), newCourses);
      }
    }

    return {
      token: await user.getIdToken(),
      user: {
        ...userProfile,
        color: user.photoURL || '#3b82f6'
      }
    };
  }
};
