import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase, ServerValue } from "firebase-admin/database";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getAdminApp() {
  if (getApps().length) return getApp();

  const privateKey = mustGetEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const serviceAccount = {
    projectId: mustGetEnv("FIREBASE_PROJECT_ID"),
    clientEmail: mustGetEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey,
  };

  return initializeApp({
    credential: cert(serviceAccount as any),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
export const adminRtdb = () => getDatabase(getAdminApp());
export const RTDBServerTime = ServerValue.TIMESTAMP;
