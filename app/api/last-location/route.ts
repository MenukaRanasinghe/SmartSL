import { NextResponse } from "next/server";
import { db } from "@/src/firebase/config";
import { addDoc, collection } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const now = data.timestamp ? new Date(data.timestamp) : new Date();

    const payload = {
      name: data.name ?? "Unknown place",
      lat: typeof data.lat === "number" ? data.lat : 0,
      lon: typeof data.lon === "number" ? data.lon : 0,
      image: data.image || "/fallback.jpg",
      desc: data.desc || "",
      busy: data.busy || "",
      timestamp: data.timestamp ?? now.getTime(),
      hour:
        data.hour ||
        `${now.getHours().toString().padStart(2, "0")}:00`,
      date: data.date || now.toISOString().slice(0, 10),
    };

    await addDoc(collection(db, "lastLocation"), payload);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save error (last-location):", err);
    return NextResponse.json(
      { error: "Failed to save last location." },
      { status: 500 }
    );
  }
}
