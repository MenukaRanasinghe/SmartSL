import { NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

if (!getApps().length) {
  initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  });
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const auth = getAuth();
    const user = await signInWithEmailAndPassword(auth, email, password);

    const token = await user.user.getIdToken();

    const response = NextResponse.json({ success: true });

    response.cookies.set("session", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      secure: true,
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
