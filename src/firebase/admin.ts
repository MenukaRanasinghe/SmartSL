import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase, ServerValue } from "firebase-admin/database";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");

  const sa = JSON.parse(raw);

  sa.private_key = (sa.private_key || "").replace(/\\n/g, "\n");

  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error("Service account JSON missing project_id/client_email/private_key");
  }
  if (!String(sa.private_key).includes("BEGIN PRIVATE KEY")) {
    throw new Error("private_key is not a PEM key");
  }

  return sa;
}

const serviceAccount = loadServiceAccount();

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DB_URL,
    });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminRtdb = getDatabase(app);
export const RTDBServerTime = ServerValue.TIMESTAMP;
