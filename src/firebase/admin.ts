import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase, ServerValue } from "firebase-admin/database";

let _app: App | null = null;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

  if (!raw && !b64) return null;

  try {
    const json = raw ? raw : Buffer.from(String(b64), "base64").toString("utf8");
    const sa = JSON.parse(json);

    sa.private_key = String(sa.private_key || "").replace(/\\n/g, "\n");

    return sa;
  } catch {
    return null;
  }
}

function ensureAdminApp() {
  if (_app) return _app;
  if (getApps().length) {
    _app = getApps()[0];
    return _app;
  }

  const sa = loadServiceAccount();

  if (!sa?.project_id || !sa?.client_email || !sa?.private_key) {
    throw new Error(
      "Missing/invalid Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_SERVICE_ACCOUNT_B64) and FIREBASE_DB_URL."
    );
  }

  _app = initializeApp({
    credential: cert(sa),
    databaseURL: process.env.FIREBASE_DB_URL,
  });

  return _app;
}

export function adminAuth() {
  return getAuth(ensureAdminApp());
}

export function adminDb() {
  return getFirestore(ensureAdminApp());
}

export function adminRtdb() {
  return getDatabase(ensureAdminApp());
}

export const RTDBServerTime = ServerValue.TIMESTAMP;
