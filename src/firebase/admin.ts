import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase, ServerValue } from "firebase-admin/database";

type ServiceAccountLike = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function loadServiceAccount(): ServiceAccountLike {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    const sa = JSON.parse(rawJson) as ServiceAccountLike;
    if (sa.private_key) sa.private_key = String(sa.private_key).replace(/\\n/g, "\n");
    return sa;
  }

  const rawB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (rawB64) {
    const decoded = Buffer.from(rawB64, "base64").toString("utf8");
    const sa = JSON.parse(decoded) as ServiceAccountLike;
    if (sa.private_key) sa.private_key = String(sa.private_key).replace(/\\n/g, "\n");
    return sa;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) privateKey = privateKey.replace(/\\n/g, "\n");

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function normalizeServiceAccount(sa: ServiceAccountLike) {
  const projectId = sa.projectId ?? sa.project_id;
  const clientEmail = sa.clientEmail ?? sa.client_email;
  const privateKey = (sa.privateKey ?? sa.private_key ?? "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_SERVICE_ACCOUNT_B64) OR set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY. Also set FIREBASE_DB_URL."
    );
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY must be the full PEM private key (-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----) with \\n line breaks."
    );
  }

  return { projectId, clientEmail, privateKey };
}

function ensureAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const saRaw = loadServiceAccount();
  const sa = normalizeServiceAccount(saRaw);

  const databaseURL =
    process.env.FIREBASE_DB_URL || process.env.FIREBASE_DB_URL;

  if (!databaseURL) {
    throw new Error("Missing FIREBASE_DB_URL");
  }

  return initializeApp({
    credential: cert({
      projectId: sa.projectId,
      clientEmail: sa.clientEmail,
      privateKey: sa.privateKey,
    } as any),
    databaseURL,
  });
}

export function getAdminAuth() {
  return getAuth(ensureAdminApp());
}

export function getAdminDb() {
  return getFirestore(ensureAdminApp());
}

export function getAdminRtdb() {
  return getDatabase(ensureAdminApp());
}

export const RTDBServerTime = ServerValue.TIMESTAMP;
