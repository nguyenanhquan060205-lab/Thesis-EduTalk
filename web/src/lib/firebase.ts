import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAyUa1TtWKibBwEZCBVnWojmzT78LxjKJs",
  authDomain: "thesis-edutalk.firebaseapp.com",
  projectId: "thesis-edutalk",
  storageBucket: "thesis-edutalk.firebasestorage.app",
  messagingSenderId: "912812536868",
  appId: "1:912812536868:web:ae2ae958db460052bf94b1",
  measurementId: "G-7R3EW470XZ"
};

// Initialize Firebase only if it hasn't been initialized yet (avoid errors in Next.js SSR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
