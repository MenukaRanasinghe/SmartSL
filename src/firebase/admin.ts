import { initializeApp, getApps, cert, ServiceAccount } from "firebase-admin/app";
import { getDatabase, ServerValue } from "firebase-admin/database";

const projectId   = (process.env.FIREBASE_PROJECT_ID || "").trim();
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
let privateKey    = (process.env.FIREBASE_PRIVATE_KEY || "").trim();

if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, "\n").replace(/\r/g, "");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing Firebase Admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
}
if (!privateKey.startsWith("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("-----END PRIVATE KEY-----")) {
  throw new Error("Invalid PEM in FIREBASE_PRIVATE_KEY. Check quotes and \\n escapes.");
}

const databaseURL = process.env.FIREBASE_DB_URL || "https://smartsl-794e8-default-rtdb.asia-southeast1.firebasedatabase.app";

const app = getApps().length
  ? getApps()[0]!
  : initializeApp({
      credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
      databaseURL,
    });

export const adminRtdb = getDatabase(app);
export const RTDBServerTime = ServerValue.TIMESTAMP;
