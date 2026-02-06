// src/firebase/admin.ts
import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase, ServerValue } from "firebase-admin/database";

function ensureAdminApp() {
  // Reuse existing app (important for hot reload + serverless)
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  // Validate when we attempt to init (clear error message)
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey } as any),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

const app = ensureAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminRtdb = getDatabase(app);
export const RTDBServerTime = ServerValue.TIMESTAMP;
