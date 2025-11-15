import { initializeApp, getApps, cert, ServiceAccount } from "firebase-admin/app";
import { getDatabase, ServerValue } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";

const projectId   = (process.env.FIREBASE_PROJECT_ID || "").trim();
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
let privateKey    = (process.env.FIREBASE_PRIVATE_KEY || "").trim();

if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, "\n").replace(/\r/g, "");

const databaseURL = process.env.FIREBASE_DB_URL || "https://smartsl-794e8-default-rtdb.asia-southeast1.firebasedatabase.app";

const app = getApps().length
  ? getApps()[0]!
  : initializeApp({
      credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
      databaseURL,
    });

export const adminDb = getFirestore(app); 
export const adminRtdb = getDatabase(app);
export const RTDBServerTime = ServerValue.TIMESTAMP;
