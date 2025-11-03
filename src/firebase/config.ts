// src/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1qfkPQPEa9n8ni-Iai94x9F5ujUMPqgQ",
  authDomain: "smartsl-794e8.firebaseapp.com",
  projectId: "smartsl-794e8",
  storageBucket: "smartsl-794e8.appspot.com",
  messagingSenderId: "921202442603",
  appId: "1:921202442603:web:91344c0039ee2cde438c2e",
  databaseURL: "https://smartsl-794e8-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// ✅ Initialize app safely (prevents duplicate initialization)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ✅ Export Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
