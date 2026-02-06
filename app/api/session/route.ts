import { NextResponse } from "next/server";
import { getAdminAuth } from "@/src/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const adminAuth = getAdminAuth();

    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const session = await adminAuth.createSessionCookie(token, {
      expiresIn: 1000 * 60 * 60 * 24 * 5, // 5 days
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 5,
    });

    return res;
  } catch (e: any) {
    console.error("SESSION ERROR:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Session failed" },
      { status: 500 }
    );
  }
}
