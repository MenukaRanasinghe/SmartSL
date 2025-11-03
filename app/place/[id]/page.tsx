"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PlaceDetails() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const image = searchParams.get("image");

  const [place, setPlace] = useState<any>(null);

  useEffect(() => {
    if (!lat || !lon) return;

    async function fetchPlaceDetails() {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      setPlace({
        name: data.name || data.display_name || "Unknown Place",
        address: data.display_name || "",
      });
    }

    fetchPlaceDetails();
  }, [lat, lon]);

  if (!place) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-[#16a085] font-medium mb-4 hover:underline"
        >
          ← Back
        </button>

        <div className="rounded-2xl overflow-hidden shadow-md mb-4 aspect-[16/9] bg-gray-200 flex items-center justify-center">
          {image ? (
            <img src={image} alt={place.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-500">No image available</span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-[#16a085] mb-3">{place.name}</h1>
        <p className="text-gray-800 leading-relaxed text-base">{place.address}</p>
      </div>
    </div>
  );
}
