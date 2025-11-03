"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PlaceDetails() {
  const sp = useSearchParams();
  const router = useRouter();

  const name = decodeURIComponent(sp.get("name") || "Unknown Place");
  const desc = decodeURIComponent(sp.get("desc") || "");
  const lat = sp.get("lat");
  const lon = sp.get("lon");
  const image = sp.get("image") || "/fallback.jpg";

  const [address, setAddress] = useState("");

  useEffect(() => {
    // Optional: fetch a nicer address, but DO NOT change the title
    if (!lat || !lon) return;
    (async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
          {
            headers: {
              "Accept-Language": "en",
              "User-Agent": "YourAppName/1.0 (contact@example.com)",
            },
            cache: "no-store",
          }
        );
        const j = await r.json();
        setAddress(j?.display_name || "");
      } catch {
      }
    })();
  }, [lat, lon]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="text-[#16a085] font-medium mb-4 hover:underline">
          ← Back
        </button>

        <div className="rounded-2xl overflow-hidden shadow-md mb-4 aspect-[16/9] bg-gray-200">
          <div className="relative w-full h-full">
            <Image
              src={decodeURIComponent(image)}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-[#16a085] mb-2">{name}</h1>

        {address && <p className="text-sm text-gray-600 mb-3">{address}</p>}

        {desc && <p className="text-gray-800 leading-relaxed text-base">{desc}</p>}
      </div>
    </div>
  );
}
