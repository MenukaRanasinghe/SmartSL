import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FB_PROJECT_ID,
      clientEmail: process.env.FB_CLIENT_EMAIL,
      privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const session = await admin.auth().createSessionCookie(token, {
      expiresIn: 60 * 60 * 24 * 5 * 1000, 
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("session", session, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    return response;
  } catch (e) {
    return NextResponse.json({ error: "Session failed" }, { status: 500 });
  }
}
