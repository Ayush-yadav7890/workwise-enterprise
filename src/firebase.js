// src/firebase.js
// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS:
//  1. Go to https://console.firebase.google.com
//  2. Create a new project (e.g. "workwise-enterprise")
//  3. Click "Add app" → Web
//  4. Copy your firebaseConfig values below
//  5. In Firebase console → Authentication → Sign-in method → enable:
//       • Email/Password
//       • Google
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";

// 🔴 REPLACE these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyD68kJF2qBDbo7hAUrye4jOARFwqiA0uBI",
  authDomain: "work-agent-b3856.firebaseapp.com",
  projectId: "work-agent-b3856",
  storageBucket: "work-agent-b3856.firebasestorage.app",
  messagingSenderId: "738293149368",
  appId: "1:738293149368:web:d9da5c485b615f876a0e4d",
  measurementId: "G-D0Z4J3MENN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const registerUser = async (name, email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred.user;
};

export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const loginWithGoogle = () =>
  signInWithPopup(auth, googleProvider);

export const logoutUser = () => signOut(auth);

export const resetPassword = (email) =>
  sendPasswordResetEmail(auth, email);

export const onAuthChange = (callback) =>
  onAuthStateChanged(auth, callback);
