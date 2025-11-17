import { initializeApp, getApps, cert, ServiceAccount } from "firebase-admin/app";
import { getDatabase, ServerValue } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";

let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey,
};

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        databaseURL:
          process.env.FIREBASE_DB_URL ??
          "https://smartsl-794e8-default-rtdb.asia-southeast1.firebasedatabase.app",
      });

export const adminDb = getFirestore(app);
export const adminRtdb = getDatabase(app);
export const RTDBServerTime = ServerValue.TIMESTAMP;
