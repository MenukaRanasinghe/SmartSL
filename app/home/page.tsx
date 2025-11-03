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
  busyLevel?: string;
}

export default function HomePage() {
  const router = useRouter();

  const [location, setLocation] = useState("Colombo District");
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const GOOGLE_CX = process.env.NEXT_PUBLIC_GOOGLE_CX_ID;
  const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  useEffect(() => {
    const fetchColomboPlaces = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/crowd", { cache: "no-store" });
        if (!res.ok) throw new Error(`API returned status ${res.status}`);
        const data: Place[] = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          setError("No Colombo district places found in Excel data.");
          setPlaces([]);
          return;
        }

        const withImages = await Promise.all(
          data.map(async (p) => {
            const cacheKey = `img-${p.name}`;
            let image =
              typeof window !== "undefined"
                ? localStorage.getItem(cacheKey) || undefined
                : undefined;

            if (!image && UNSPLASH_KEY) {
              try {
                const u = new URL("https://api.unsplash.com/search/photos");
                u.searchParams.set("query", `${p.name} Sri Lanka`);
                u.searchParams.set("client_id", UNSPLASH_KEY);
                u.searchParams.set("per_page", "1");
                const r = await fetch(u.toString());
                const j = await r.json();
                image = j?.results?.[0]?.urls?.regular || "/fallback.jpg";
                if (typeof window !== "undefined") localStorage.setItem(cacheKey, image);
              } catch {
                image = "/fallback.jpg";
              }
            }

            return {
              ...p,
              image: image || "/fallback.jpg",
            };
          })
        );

        setPlaces(withImages);
      } catch (err: any) {
        console.error("Error fetching Colombo places:", err);
        setError("Failed to load Colombo attractions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchColomboPlaces();
  }, [UNSPLASH_KEY]);

  const handleSearch = async () => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}+Sri+Lanka`,
        { headers: { "Accept-Language": "en" } }
      );
      const geoData = await geoRes.json();
      if (!geoData[0]) {
        setSearchResults([]);
        return;
      }
      const { lat, lon } = geoData[0];

      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:20000,${lat},${lon});
          way["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:20000,${lat},${lon});
          relation["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:20000,${lat},${lon});
        );
        out center tags;
      `;
      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
        headers: { "Content-Type": "text/plain" },
      });
      const overpassData = await overpassRes.json();

      const results: Place[] = await Promise.all(
        (overpassData.elements || [])
          .filter((el: any) => el.tags?.name)
          .map(async (el: any, idx: number) => {
            const name: string = el.tags.name;
            let image: string | undefined;

            const cacheKey = `image-${name}`;
            if (typeof window !== "undefined")
              image = localStorage.getItem(cacheKey) || undefined;

            if (!image && GOOGLE_KEY && GOOGLE_CX) {
              try {
                const g = new URL("https://www.googleapis.com/customsearch/v1");
                g.searchParams.set("q", `${name} Sri Lanka`);
                g.searchParams.set("cx", GOOGLE_CX);
                g.searchParams.set("searchType", "image");
                g.searchParams.set("num", "1");
                g.searchParams.set("key", GOOGLE_KEY);
                const r = await fetch(g.toString());
                const j = await r.json();
                image = j?.items?.[0]?.link;
              } catch {}
            }

            if (!image && UNSPLASH_KEY) {
              try {
                const u = new URL("https://api.unsplash.com/search/photos");
                u.searchParams.set("query", `${name} Sri Lanka`);
                u.searchParams.set("client_id", UNSPLASH_KEY);
                u.searchParams.set("per_page", "1");
                const r = await fetch(u.toString());
                const j = await r.json();
                image = j?.results?.[0]?.urls?.regular;
              } catch {}
            }

            if (!image) image = "/fallback.jpg";
            if (typeof window !== "undefined") localStorage.setItem(cacheKey, image);

            return {
              id: String(el.id ?? idx),
              name,
              lat: el.lat || el.center?.lat,
              lon: el.lon || el.center?.lon,
              image,
              description: el.tags?.description || el.tags?.note || "",
            };
          })
      );

      setSearchResults(results);
      setLocation(searchQuery);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <h1 className="text-xl font-bold text-[#16a085] mb-3">Discover Places</h1>

      <div className="flex mb-4 gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type city or place name..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a085]"
        />
        <button
          onClick={handleSearch}
          className="bg-[#16a085] text-white px-4 rounded-lg hover:bg-[#13856d]"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}
      {loading && <p className="text-gray-500 mb-2">Loading popular places...</p>}

      {searchResults.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-2">Popular Places:</h2>
          <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
            {searchResults.map((place) => (
              <div
                key={place.id}
                onClick={() => {
                  router.push(
                    `/place/${place.id}` +
                      `?name=${encodeURIComponent(place.name)}` +
                      `&desc=${encodeURIComponent(place.description || "")}` +
                      `&lat=${place.lat}` +
                      `&lon=${place.lon}` +
                      `&image=${encodeURIComponent(place.image || "/fallback.jpg")}`
                  );
                }}
                className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
              >
                <div className="relative w-full h-36 overflow-hidden">
                  <Image
                    src={place.image || "/fallback.jpg"}
                    alt={place.name}
                    fill
                    sizes="240px"
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-md text-gray-900 truncate">{place.name}</h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2"></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        Suggestions Near {location}
      </h2>
      {places.length > 0 ? (
        <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
          {places.map((place) => (
            <div
              key={place.id}
              onClick={() => {
                router.push(
                  `/place/${place.id}` +
                    `?name=${encodeURIComponent(place.name)}` +
                    `&desc=${encodeURIComponent(place.description || "")}` +
                    `&lat=${place.lat}` +
                    `&lon=${place.lon}` +
                    `&image=${encodeURIComponent(place.image || "/fallback.jpg")}`
                );
              }}
              className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
            >
              <div className="relative w-full h-36 overflow-hidden">
                <Image
                  src={place.image || "/fallback.jpg"}
                  alt={place.name}
                  fill
                  sizes="240px"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-md text-gray-900 truncate">{place.name}</h3>
                  {place.busyLevel && (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {place.busyLevel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2"></p>
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
