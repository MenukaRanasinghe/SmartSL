import { NextResponse } from "next/server";
import { getAdminRtdb, RTDBServerTime } from "@/src/firebase/admin";

export const runtime = "nodejs";

function emailKey(email: string) {
  return email.toLowerCase().replace(/[.#$[\]/]/g, "_");
}

export async function POST(req: Request) {
  try {
    const { uid, email, preferences, lastLocation } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "Missing UID" }, { status: 400 });
    }

    const allowed = new Set([
      "historical sites",
      "natural spots",
      "cultural events",
      "religious sites",
      "local food spots",
    ]);

    let cleanPrefs: string[] = [];
    if (Array.isArray(preferences)) {
      cleanPrefs = preferences.filter((p: string) => allowed.has(p));
    }

    const baseRef = getAdminRtdb().ref(`/profile/${uid}`);
    const existingSnap = await baseRef.get();
    const existing = existingSnap.val() || {};

    const updates: Record<string, any> = {};

    updates[`/profile/${uid}`] = {
      ...existing,
      ...(cleanPrefs.length ? { preferences: cleanPrefs } : {}),
      ...(email ? { email } : {}),
      ...(lastLocation ? { lastLocation } : {}),
      updatedAt: RTDBServerTime,
    };

    if (email) {
      updates[`/profileByEmail/${emailKey(email)}`] = {
        uid,
        updatedAt: RTDBServerTime,
      };
    }

    await getAdminRtdb().ref().update(updates);

    return NextResponse.json({ ok: true, store: "rtdb" });
  } catch (err: any) {
    console.error("API save error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const email = searchParams.get("email");

    let data: any = null;

    if (email) {
      const idxSnap = await getAdminRtdb()
        .ref(`/profileByEmail/${emailKey(email)}`)
        .get();

      const idx = idxSnap.val();
      if (idx?.uid) {
        const docSnap = await getAdminRtdb().ref(`/profile/${idx.uid}`).get();
        data = docSnap.val();
      }
    }

    if (!data && uid) {
      const docSnap = await getAdminRtdb().ref(`/profile/${uid}`).get();
      data = docSnap.val();
    }

    return NextResponse.json({
      preferences: Array.isArray(data?.preferences) ? data.preferences : [],
      lastLocation: data?.lastLocation || null,
      email: data?.email || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
