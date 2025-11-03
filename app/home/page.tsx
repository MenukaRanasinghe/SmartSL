"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  image?: string;
  description?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [location, setLocation] = useState("Detecting...");
  const [places, setPlaces] = useState<Place[]>([]);
  const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const GOOGLE_CX = process.env.NEXT_PUBLIC_GOOGLE_CX_ID;
  const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  useEffect(() => {
    const detectAndLoad = async () => {
      if (!navigator.geolocation) {
        setLocation("Geolocation not supported");
        return;
      }

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();
        const addr = data.address;
        const detectedDistrict =
          addr.district ||
          addr.county ||
          addr.state_district ||
          addr.state ||
          addr.city ||
          "Sri Lanka";
        setLocation(detectedDistrict);

        const overpassQuery = `
          [out:json][timeout:25];
          (
            node["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:10000,${latitude},${longitude});
            way["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:10000,${latitude},${longitude});
            relation["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:10000,${latitude},${longitude});
          );
          out center tags;
        `;
        const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: overpassQuery,
        });
        const overpassData = await overpassRes.json();

        const loadedPlaces: Place[] = await Promise.all(
          overpassData.elements
            .filter((el: any) => el.tags?.name)
            .map(async (el: any) => {
              const name = el.tags.name;
              let image: string | undefined;

              const cached = localStorage.getItem(`image-${name}`);
              if (cached) {
                return {
                  id: el.id.toString(),
                  name,
                  lat: el.lat || el.center?.lat,
                  lon: el.lon || el.center?.lon,
                  image: cached,
                  description: el.tags?.description || el.tags?.note || "",
                };
              }

              try {
                const googleRes = await fetch(
                  `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
                    name + " Sri Lanka"
                  )}&cx=${GOOGLE_CX}&searchType=image&num=1&key=${GOOGLE_KEY}`
                );
                const googleData = await googleRes.json();
                image = googleData.items?.[0]?.link;
              } catch (err) {
                console.error("Google image fetch failed:", err);
              }

              if (!image) {
                try {
                  const wikiRes = await fetch(
                    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
                  );
                  const wikiData = await wikiRes.json();
                  image = wikiData?.originalimage?.source || wikiData?.thumbnail?.source;
                } catch {}
              }

              if (!image && UNSPLASH_KEY) {
                try {
                  const unsplashRes = await fetch(
                    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
                      name + " Sri Lanka"
                    )}&client_id=${UNSPLASH_KEY}&per_page=1`
                  );
                  const unsplashData = await unsplashRes.json();
                  image = unsplashData.results?.[0]?.urls?.regular;
                } catch {}
              }

              if (!image) image = "/fallback.jpg";

              localStorage.setItem(`image-${name}`, image);

              return {
                id: el.id.toString(),
                name,
                lat: el.lat || el.center?.lat,
                lon: el.lon || el.center?.lon,
                image,
                description: el.tags?.description || el.tags?.note || "",
              };
            })
        );

        setPlaces(loadedPlaces);
      });
    };

    detectAndLoad();
  }, [GOOGLE_KEY, GOOGLE_CX, UNSPLASH_KEY]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <h1 className="text-xl font-bold text-[#16a085] mb-3">Suggestions</h1>

      {places.length > 0 ? (
        <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
          {places.map((place) => (
            <div
              key={place.id}
              onClick={() =>
                router.push(`/place/${place.id}?lat=${place.lat}&lon=${place.lon}`)
              }
              className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
            >
              <div className="w-full h-36 overflow-hidden">
                {place.image ? (
                  <Image
                    src={place.image}
                    alt={place.name}
                    width={240}
                    height={144}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                    No image
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-bold text-md text-gray-900 truncate">{place.name}</h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {place.description || "A beautiful place to visit near you."}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 mt-10 text-center">
          Detecting nearby places to visit...
        </p>
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
