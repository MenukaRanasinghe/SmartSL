import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase, ServerValue } from "firebase-admin/database";

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,     // NOTE: firebase-admin accepts camelCase too
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey,
};

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
      credential: cert(serviceAccount as any),
      databaseURL: process.env.FIREBASE_DB_URL,
    });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminRtdb = getDatabase(app);
export const RTDBServerTime = ServerValue.TIMESTAMP;
