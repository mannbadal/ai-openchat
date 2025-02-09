import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Use runtime config if available, else fallback to build-time config
const env = window.__ENV__ || {
  FIREBASE_API_KEY: import.meta.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: import.meta.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: import.meta.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: import.meta.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: import.meta.env.FIREBASE_APP_ID,
};

const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const firestore = getFirestore(app);

export { auth };
