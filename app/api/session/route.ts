import { NextResponse } from "next/server";
import { adminAuth } from "@/src/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const session = await adminAuth.createSessionCookie(token, {
      expiresIn: 60 * 60 * 24 * 5 * 1000, // 5 days
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set("session", session, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 5, // 5 days (seconds)
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Session failed" },
      { status: 500 }
    );
  }
}
