import { NextResponse } from "next/server";
import { adminDb } from "@/src/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = adminDb();

    await db.collection("health").doc("_ping").set(
      { at: new Date() },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      projectId: process.env.FIREBASE_PROJECT_ID || null,
    });
  } catch (e: any) {
    console.error("firestore-health error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
