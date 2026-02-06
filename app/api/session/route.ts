import { NextResponse } from "next/server";
import { adminAuth } from "@/src/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body?.token;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    const decoded = await adminAuth.verifyIdToken(token);

    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: 5 * 24 * 60 * 60 * 1000,
    });

    const res = NextResponse.json({ success: true, uid: decoded.uid });
    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 5 * 24 * 60 * 60,
    });

    return res;
  } catch (e: any) {
    console.error("SESSION ERROR:", e?.message || e);
    if (e?.errorInfo) console.error("SESSION ERROR INFO:", e.errorInfo);

    return NextResponse.json(
      { error: e?.message || "Session failed" },
      { status: 500 }
    );
  }
}
