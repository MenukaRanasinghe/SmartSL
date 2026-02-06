import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

const adminFirestore = getFirestore();

export async function GET() {
  try {
    await adminFirestore
      .collection("health")
      .doc("_ping")
      .set({ at: new Date() }, { merge: true });

    return NextResponse.json({
      ok: true,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
