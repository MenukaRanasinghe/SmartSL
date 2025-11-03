"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PlaceDetails() {
  const { id } = useParams();
  const router = useRouter();
  const [place, setPlace] = useState<any>(null);

  useEffect(() => {
    async function getPlaceDetails() {
      const apiKey = "YOUR_GOOGLE_MAPS_API_KEY";
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&key=${apiKey}`
      );
      const data = await res.json();
      setPlace(data.result);
    }

    getPlaceDetails();
  }, [id]);

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

        {place.photos?.length > 0 && (
          <div className="rounded-2xl overflow-hidden shadow-md mb-4 aspect-[16/9]">
            <img
              src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=YOUR_GOOGLE_MAPS_API_KEY`}
              alt={place.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h1 className="text-3xl font-bold text-[#16a085] mb-3">{place.name}</h1>
        <p className="text-gray-800 leading-relaxed text-base">
          {place.formatted_address}
        </p>
        <p className="mt-2 text-gray-600">
          ⭐ Rating: {place.rating || "N/A"} ({place.user_ratings_total || 0} reviews)
        </p>
      </div>
    </div>
  );
}
