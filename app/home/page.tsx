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

  const [detectedCity, setDetectedCity] = useState<{
    name: string;
    lat: number;
    lon: number;
    image: string;
    desc?: string;
  } | null>(null);
  const [detectingCity, setDetectingCity] = useState<boolean>(false);

  const [showDetectedModal, setShowDetectedModal] = useState(false);
  const [detectedBusy, setDetectedBusy] = useState<"Quiet" | "Moderate" | "Busy" | "Very Busy" | "">("");

  const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  const fetchPlaceImage = async (name: string): Promise<string> => {
    const cacheKey = `img-${name}`;
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return cached;
      }

      try {
        const q = `${name} Sri Lanka`;
        const wikiURL = new URL("https://en.wikipedia.org/w/api.php");
        wikiURL.searchParams.set("action", "query");
        wikiURL.searchParams.set("format", "json");
        wikiURL.searchParams.set("origin", "*");
        wikiURL.searchParams.set("prop", "pageimages");
        wikiURL.searchParams.set("generator", "search");
        wikiURL.searchParams.set("gsrsearch", q);
        wikiURL.searchParams.set("gsrlimit", "1");
        wikiURL.searchParams.set("piprop", "thumbnail");
        wikiURL.searchParams.set("pithumbsize", "1000");

        const wr = await fetch(wikiURL.toString(), { cache: "no-store" });
        const wj = await wr.json();
        const pages = wj?.query?.pages ? Object.values(wj.query.pages as any) : [];
        const wikiThumb: string | undefined = pages?.[0]?.thumbnail?.source;
        if (wikiThumb) {
          if (typeof window !== "undefined") localStorage.setItem(cacheKey, wikiThumb);
          return wikiThumb;
        }
      } catch {}

      if (UNSPLASH_KEY) {
        try {
          const u = new URL("https://api.unsplash.com/search/photos");
          u.searchParams.set("query", `${name} Sri Lanka`);
          u.searchParams.set("client_id", UNSPLASH_KEY);
          u.searchParams.set("per_page", "1");
          const r = await fetch(u.toString(), { cache: "no-store" });
          const j = await r.json();
          const url = j?.results?.[0]?.urls?.regular;
          if (url) {
            if (typeof window !== "undefined") localStorage.setItem(cacheKey, url);
            return url;
          }
        } catch {}
      }

      if (typeof window !== "undefined") localStorage.setItem(cacheKey, "/fallback.jpg");
      return "/fallback.jpg";
    } catch {
      return "/fallback.jpg";
    }
  };

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    setDetectingCity(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          const url = new URL("https://nominatim.openstreetmap.org/reverse");
          url.searchParams.set("format", "jsonv2");
          url.searchParams.set("lat", String(latitude));
          url.searchParams.set("lon", String(longitude));
          const r = await fetch(url.toString(), {
            headers: {
              "Accept-Language": "en",
              "User-Agent": "YourAppName/1.0 (contact@example.com)",
            },
            cache: "no-store",
          });
          const j = await r.json();

          const addr = j?.address || {};
          const cityName: string =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.suburb ||
            addr.state_district ||
            addr.county ||
            "Nearby City";

          const img = await fetchPlaceImage(cityName);

          setDetectedCity({
            name: cityName,
            lat: latitude,
            lon: longitude,
            image: img,
            desc: j?.display_name || "",
          });
        } catch {
          setDetectedCity(null);
        } finally {
          setDetectingCity(false);
        }
      },
      () => {
        setDetectingCity(false);
        setDetectedCity(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []); 

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
            const image = await fetchPlaceImage(p.name);
            return { ...p, image };
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
            const image = await fetchPlaceImage(name);
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

  const pushToDetails = (place: Place) => {
    const url =
      `/place/${place.id}` +
      `?name=${encodeURIComponent(place.name)}` +
      `&desc=${encodeURIComponent(place.description || "")}` +
      `&lat=${place.lat}` +
      `&lon=${place.lon}` +
      `&image=${encodeURIComponent(place.image || "/fallback.jpg")}` +
      `&busy=${encodeURIComponent(place.busyLevel || "")}`;
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <h1 className="text-xl font-bold text-[#16a085] mb-3">Discover Places</h1>

      {/* Search */}
      <div className="flex mb-4 gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type city or place name..."
          className="flex-1 p-2 border text-gray-500 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a085]"
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
          <h2 className="font-semibold text-gray-700 mb-2">Suggestions near {location}</h2>
          <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
            {searchResults.map((place) => (
              <div
                key={place.id}
                onClick={() => pushToDetails(place)}
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-700 mb-2">Suggestions</h2>

      <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
        {detectedCity && (
          <div
            key="detected-city"
            onClick={() => setShowDetectedModal(true)}
            className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
          >
            <div className="relative w-full h-36 overflow-hidden">
              <Image
                src={detectedCity.image || "/fallback.jpg"}
                alt={detectedCity.name}
                fill
                sizes="240px"
                className="object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-md text-gray-900 truncate">{detectedCity.name}</h3>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Detected
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                Click to choose a busy level…
              </p>
            </div>
          </div>
        )}

        {detectingCity && (
          <div className="w-60 flex-shrink-0 rounded-2xl bg-white border border-gray-100 shadow-md p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-36 bg-gray-200 rounded-xl" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          </div>
        )}

        {places.length > 0 ? (
          places.map((place) => (
            <div
              key={place.id}
              onClick={() => pushToDetails(place)}
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
              </div>
            </div>
          ))
        ) : (
          !detectingCity && (
            <p className="text-gray-500 mt-10 text-center flex-shrink-0">
              Detecting nearby places to visit...
            </p>
          )
        )}
      </div>

      {showDetectedModal && detectedCity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{detectedCity.name}</h3>
              <button
                aria-label="Close"
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setShowDetectedModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border mb-3">
              <div className="relative w-full h-40">
                <Image
                  src={detectedCity.image || "/fallback.jpg"}
                  alt={detectedCity.name}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
              </div>
            </div>

            {detectedCity.desc && (
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{detectedCity.desc}</p>
            )}

            <p className="text-sm text-gray-600 mb-3">Select the current busy level for this place:</p>

            <div className="grid grid-cols-2 gap-2">
              {(["Quiet", "Moderate", "Busy", "Very Busy"] as const).map((lvl) => {
                const isActive = detectedBusy === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setDetectedBusy(lvl)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      lvl === "Quiet"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : lvl === "Moderate"
                        ? "bg-sky-50 border-sky-200 text-sky-700"
                        : lvl === "Busy"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    } ${isActive ? "ring-2 ring-[#16a085]" : ""}`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setDetectedBusy("");
                  setShowDetectedModal(false);
                }}
                className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!detectedBusy}
                onClick={() => {
                  const url =
                    `/place/detected-testing` +
                    `?name=${encodeURIComponent(detectedCity.name)}` +
                    `&desc=${encodeURIComponent(detectedCity.desc || "")}` +
                    `&lat=${detectedCity.lat}` +
                    `&lon=${detectedCity.lon}` +
                    `&image=${encodeURIComponent(detectedCity.image || "/fallback.jpg")}` +
                    `&busy=${encodeURIComponent(detectedBusy)}`;
                  setShowDetectedModal(false);
                  router.push(url);
                }}
                className={`px-4 py-2 rounded-md text-white ${
                  detectedBusy ? "bg-[#16a085] hover:bg-[#13856d]" : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
