import { NextResponse } from "next/server";
import { adminRtdb, RTDBServerTime } from "../../../src/firebase/admin";
export const runtime = "nodejs";

function emailKey(email: string) {
  return email.toLowerCase().replace(/[.#$[\]/]/g, "_");
}

export async function POST(req: Request) {
  try {
    const { uid, email, preferences } = await req.json();
    if (!uid || !Array.isArray(preferences)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const allowed = new Set([
      "historical sites", "natural spots", "cultural events", "religious sites", "local food spots",
    ]);
    const clean = preferences.filter((p: string) => allowed.has(p));

    const updates: Record<string, any> = {};
    updates[`/profile/${uid}`] = {
      preferences: clean,
      email: email || null,
      updatedAt: RTDBServerTime,
    };

    if (email) {
      updates[`/profileByEmail/${emailKey(email)}`] = {
        uid,
        updatedAt: RTDBServerTime,
      };
    }

    await adminRtdb.ref().update(updates);

    return NextResponse.json({ ok: true, store: "rtdb" });
  } catch (err: any) {
    console.error("API save error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const email = searchParams.get("email");

    let data: any = null;

    if (email) {
      const idxSnap = await adminRtdb.ref(`/profileByEmail/${emailKey(email)}`).get();
      const idx = idxSnap.val();
      if (idx?.uid) {
        const docSnap = await adminRtdb.ref(`/profile/${idx.uid}`).get();
        data = docSnap.val();
      }
    }

    if (!data && uid) {
      const docSnap = await adminRtdb.ref(`/profile/${uid}`).get();
      data = docSnap.val();
    }

    return NextResponse.json({
      preferences: Array.isArray(data?.preferences) ? data.preferences : [],
      email: data?.email || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
