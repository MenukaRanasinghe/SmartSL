"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-[100dvh] w-full bg-cover bg-center flex flex-col items-center justify-center text-white"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="bg-black/50 p-8 rounded-2xl text-center">
        <h1 className="text-5xl font-bold mb-4">Welcome to SmartSL</h1>
        <p className="text-lg mb-8">
          Predict crowd levels in real time using Google Maps and Machine Learning
        </p>
        <button
          onClick={() => router.push("/home")}
          className="px-8 py-3 bg-[#16a085] rounded-xl text-lg font-semibold shadow-lg transition hover:scale-105"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
