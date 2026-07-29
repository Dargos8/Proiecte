// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // <-- AM ADĂUGAT ASTA

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDkSyIpKwyTVZn3AZccDl86AavC0M7HQS0",
  authDomain: "hackathon-894e5.firebaseapp.com",
  projectId: "hackathon-894e5",
  storageBucket: "hackathon-894e5.firebasestorage.app",
  messagingSenderId: "337683330877",
  appId: "1:337683330877:web:e09f0f9240b9f5d6757754",
  measurementId: "G-E1YE2R5DHC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exportăm toate serviciile necesare
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
export const auth = getAuth(app); // <-- ȘI AM EXPORTAT AUTH AICI