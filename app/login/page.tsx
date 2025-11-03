"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { auth } from "@/src/firebase/config";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/home");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-2xl w-[400px] shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-lg text-black"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-lg text-black"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[#16a085] rounded-lg font-semibold hover:scale-105 transition"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          Don’t have an account?{" "}
          <Link href="/register" className="text-[#16a085] hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
