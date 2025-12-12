
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue } from 'firebase/database';

const firebaseConfig = {
  
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Monitor connection status
let isConnected = false;
const connectedRef = ref(db, ".info/connected");
onValue(connectedRef, (snap) => {
  isConnected = !!snap.val();
  console.log("Firebase Connection Status:", isConnected ? "Connected" : "Disconnected");
});

export { app, auth, db };
export const getFirebase = () => {
  return { app, auth, db, isConnected };
};
