import { NextResponse } from "next/server";
import { adminDb } from "@/src/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    await adminDb().collection("health").doc("_ping").set(
      { at: new Date() },
      { merge: true }
    );

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
