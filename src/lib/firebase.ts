
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "expense-tracker-6k6bv",
  "appId": "1:1046664739639:web:4ec9164da7fb6a98f138b2",
  "storageBucket": "expense-tracker-6k6bv.appspot.com",
  "apiKey": "AIzaSyC-xXzxTc1ay0yiCx_s1URVOPEtQ7Br518",
  "authDomain": "expense-tracker-6k6bv.firebaseapp.com",
  "messagingSenderId": "1046664739639"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  'display': 'popup',
  'login_hint': 'user@example.com'
});


export { app, auth, db, googleProvider };
