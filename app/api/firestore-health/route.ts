import { NextResponse } from "next/server";
import { getAdminDb } from "@/src/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getAdminDb();

    await db.collection("health").doc("_ping").set(
      { at: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
