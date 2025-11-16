"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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

type Busy = "Quiet" | "Moderate" | "Busy" | "Very Busy" | "";

const NEAREST_CITY_ALIAS: Record<string, string[]> = {
  mampe: ["Piliyandala", "Kesbewa"],
};

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
    busyLevel?: string;
  } | null>(null);

  const [detectingCity, setDetectingCity] = useState<boolean>(false);
  const [showDetectedModal, setShowDetectedModal] = useState(false);
  const [detectedBusy, setDetectedBusy] = useState<Busy>("");

  const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  const dedupe = (arr: Place[]) => {
    const map = new Map<string, Place>();
    arr.forEach((p) => {
      const key = `${p.id}-${p.lat}-${p.lon}`;
      if (!map.has(key)) map.set(key, p);
    });
    return Array.from(map.values());
  };

  const uniquePlaces = useMemo(() => dedupe(places), [places]);
  const uniqueSearchResults = useMemo(
    () => dedupe(searchResults),
    [searchResults]
  );

  const buildDetectedImageQueries = (detectedName: string, addr: any): string[] => {
    const dn = (detectedName || "").toLowerCase();
    const aliasMatch = Object.entries(NEAREST_CITY_ALIAS).find(([alias]) =>
      dn.includes(alias)
    );
    const aliasCities = aliasMatch ? aliasMatch[1] : [];

    const addrParts = [
      addr?.city,
      addr?.town,
      addr?.municipality,
      addr?.state_district,
      addr?.county,
    ].filter(Boolean) as string[];

    return [...aliasCities, ...addrParts, detectedName, "Colombo"]
      .filter(Boolean)
      .map((s) => s.trim())
      .filter(
        (v, i, a) =>
          a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i
      );
  };

  const fetchPlaceImageByName = async (queries: string[] | string): Promise<string> => {
    const list = Array.isArray(queries) ? queries : [queries];
    const cacheKey = `img-name-${list.join("|")}`;

    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return cached;
      }

      for (const raw of list) {
        const q = `${raw} Sri Lanka`;

        try {
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
          const pages = wj?.query?.pages ? Object.values(wj.query.pages as any[]) : [];
          let wikiThumb: string | undefined = pages?.[0]?.thumbnail?.source;
          if (wikiThumb) wikiThumb = wikiThumb.replace(/^\/\//, "https://");
          if (wikiThumb) {
            if (typeof window !== "undefined") {
              localStorage.setItem(cacheKey, wikiThumb);
            }
            return wikiThumb;
          }
        } catch {
        }

        if (UNSPLASH_KEY) {
          try {
            const u = new URL("https://api.unsplash.com/search/photos");
            u.searchParams.set("query", q);
            u.searchParams.set("client_id", UNSPLASH_KEY);
            u.searchParams.set("per_page", "1");
            const r = await fetch(u.toString(), { cache: "no-store" });
            const j = await r.json();
            const url = j?.results?.[0]?.urls?.regular;
            if (url) {
              if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, url);
              }
              return url;
            }
          } catch {
          }
        }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, "/fallback.jpg");
      }
      return "/fallback.jpg";
    } catch {
      return "/fallback.jpg";
    }
  };

  const fetchWikidataImageByCoords = async (
    lat: number,
    lon: number
  ): Promise<string | null> => {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("zoom", "16");
      url.searchParams.set("extratags", "1");

      const r = await fetch(url.toString(), {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "CrowdPlaces/1.0 (contact@example.com)",
        },
        cache: "no-store",
      });
      const j = await r.json();
      const qid: string | undefined = j?.extratags?.wikidata;
      if (!qid) return null;

      const wd = await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(
          qid
        )}.json`,
        { cache: "no-store" }
      ).then((res) => res.json());

      const entity = wd?.entities?.[qid];
      const p18 = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (!p18) return null;

      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
        p18
      )}?width=1200`;
    } catch {
      return null;
    }
  };

  const fetchWikipediaGeoImage = async (lat: number, lon: number) => {
    try {
      const api = new URL("https://en.wikipedia.org/w/api.php");
      api.searchParams.set("action", "query");
      api.searchParams.set("format", "json");
      api.searchParams.set("origin", "*");
      api.searchParams.set("prop", "pageimages|coordinates");
      api.searchParams.set("generator", "geosearch");
      api.searchParams.set("ggscoord", `${lat}|${lon}`);
      api.searchParams.set("ggsradius", "10000");
      api.searchParams.set("ggslimit", "10");
      api.searchParams.set("pithumbsize", "1200");

      const resp = await fetch(api.toString(), { cache: "no-store" });
      const data = await resp.json();
      const pages = data?.query?.pages ? Object.values(data.query.pages as any) : [];

      const withThumb = pages.filter((p: any) => p?.thumbnail?.source);
      const pick = (withThumb[0] || pages[0]) as any;
      if (!pick) return null;

      let url = pick?.thumbnail?.source;
      if (url) url = url.replace(/^\/\//, "https://");

      return url ? { url } : null;
    } catch {
      return null;
    }
  };

  const fetchImageByCoordsFirst = async (
    lat: number,
    lon: number,
    detectedName: string,
    addr: any
  ): Promise<string> => {
    const cacheKey = `img-geo-${lat.toFixed(4)},${lon.toFixed(4)}`;
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return cached;
      }

      const wdImg = await fetchWikidataImageByCoords(lat, lon);
      if (wdImg) {
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, wdImg);
        }
        return wdImg;
      }

      const geoImg = await fetchWikipediaGeoImage(lat, lon);
      if (geoImg?.url) {
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, geoImg.url);
        }
        return geoImg.url;
      }

      const candidates = buildDetectedImageQueries(detectedName, addr);
      const named = await fetchPlaceImageByName(candidates);

      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, named);
      }
      return named;
    } catch {
      return "/fallback.jpg";
    }
  };

  async function logDetection(payload: {
    name: string;
    lat: number;
    lon: number;
    image: string;
    desc?: string;
    busy?: string;
  }) {
    try {
      const now = new Date();
      await fetch("/api/last-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          lat: payload.lat,
          lon: payload.lon,
          image: payload.image,
          desc: payload.desc || "",
          busy: payload.busy ?? "",
          timestamp: now.getTime(),
          hour: `${now.getHours().toString().padStart(2, "0")}:00`,
          date: now.toISOString().slice(0, 10),
        }),
      });
    } catch (err) {
      console.error("Failed to log detection", err);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
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
          url.searchParams.set("extratags", "1");

          const r = await fetch(url.toString(), {
            headers: {
              "Accept-Language": "en",
              "User-Agent": "CrowdPlaces/1.0",
            },
            cache: "no-store",
          });

          const j = await r.json();

          const addr = j?.address || {};
          const cityName =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.suburb ||
            addr.state_district ||
            addr.county ||
            "Nearby City";

          let img = await fetchImageByCoordsFirst(
            latitude,
            longitude,
            cityName,
            addr
          );

          if (!img || img === "undefined" || img.trim() === "") {
            img = "/fallback.jpg";
          }

          setDetectedCity({
            name: cityName,
            lat: latitude,
            lon: longitude,
            image: img,
            desc: j?.display_name || "",
            busyLevel: "",
          });

          await logDetection({
            name: cityName,
            lat: latitude,
            lon: longitude,
            image: img,
            desc: j?.display_name || "",
          });
        } catch (e) {
          console.error("Detection failed:", e);
          setDetectedCity(null);
        } finally {
          setDetectingCity(false);
        }
      },
      (err) => {
        console.warn("Geolocation error:", err);
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
        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data: Place[] = await res.json();

        const withImages = await Promise.all(
          data.map(async (p) => ({
            ...p,
            image: await fetchPlaceImageByName([p.name, "Colombo"]),
          }))
        );

        setPlaces(withImages);
      } catch (e) {
        console.error(e);
        setError("Failed to load Colombo attractions.");
      } finally {
        setLoading(false);
      }
    };

    fetchColomboPlaces();
  }, [UNSPLASH_KEY]);

  const handleSearch = async () => {
    if (!searchQuery) return setSearchResults([]);

    setLoading(true);
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}+Sri+Lanka`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "CrowdPlaces/1.0",
          },
        }
      ).then((r) => r.json());

      if (!geo[0]) return setSearchResults([]);

      const { lat, lon } = geo[0];

      const overpassQuery = `
      [out:json][timeout:25];
      (
        node["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:20000,${lat},${lon});
        way["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:20000,${lat},${lon});
        relation["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:20000,${lat},${lon});
      );
      out center tags;`;

      const o = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
        headers: { "Content-Type": "text/plain" },
      }).then((r) => r.json());

      const results: Place[] = await Promise.all(
        (o.elements || [])
          .filter((el: any) => el.tags?.name)
          .map(async (el: any, idx: number) => ({
            id: String(el.id ?? idx),
            name: el.tags.name,
            lat: el.lat || el.center?.lat,
            lon: el.lon || el.center?.lon,
            image: await fetchPlaceImageByName([el.tags.name, searchQuery]),
            description: el.tags?.description || el.tags?.note || "",
          }))
      );

      setSearchResults(results);
      setLocation(searchQuery);
    } catch (e) {
      console.error(e);
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

  const showDetectedCard = useMemo(
    () => !!detectedCity && !detectingCity,
    [detectedCity, detectingCity]
  );

  const saveDetectedPlace = async () => {
    if (!detectedCity || !detectedBusy) return;

    await logDetection({
      name: detectedCity.name,
      lat: detectedCity.lat,
      lon: detectedCity.lon,
      image: detectedCity.image,
      desc: detectedCity.desc,
      busy: detectedBusy,
    });
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
          className="flex-1 p-2 border text-gray-500 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a085]"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-[#16a085] text-white px-4 rounded-lg hover:bg-[#13856d]"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      {uniqueSearchResults.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-2">
            Suggestions near {location}
          </h2>

          <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
            {uniqueSearchResults.map((place) => (
              <div
                key={`${place.id}-${place.lat}-${place.lon}`}
                onClick={() => pushToDetails(place)}
                className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer border border-gray-100"
              >
                <div className="relative w-full h-36 overflow-hidden">
                  <Image
                    src={place.image || "/fallback.jpg"}
                    alt={place.name}
                    fill
                    sizes="240px"
                    className="object-cover hover:scale-105 transition-transform"
                  />
                </div>

                <div className="p-3">
                  <h3 className="font-bold text-md text-gray-900 truncate">
                    {place.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-700 mb-2">Suggestions</h2>

      <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
        {showDetectedCard && detectedCity && (
          <div
            key="detected-city"
            onClick={() => setShowDetectedModal(true)}
            className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md cursor-pointer hover:shadow-xl transition border border-gray-100"
          >
            <div className="relative w-full h-36 overflow-hidden">
              <Image
                src={detectedCity.image || "/fallback.jpg"}
                alt={detectedCity.name}
                fill
                sizes="240px"
                className="object-cover hover:scale-105 transition-transform"
              />
            </div>

            <div className="p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-md text-gray-900 truncate">
                  {detectedCity.name}
                </h3>

                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Detected
                </span>
              </div>

              {detectedCity.busyLevel && (
                <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  {detectedCity.busyLevel}
                </span>
              )}

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

        {uniquePlaces.length > 0 ? (
          uniquePlaces.map((place) => (
            <div
              key={`${place.id}-${place.lat}-${place.lon}`}
              onClick={() => pushToDetails(place)}
              className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
            >
              <div className="relative w-full h-36 overflow-hidden">
                <Image
                  src={place.image || "/fallback.jpg"}
                  alt={place.name}
                  fill
                  sizes="240px"
                  className="object-cover hover:scale-105 transition-transform"
                />
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-md text-gray-900 truncate">
                    {place.name}
                  </h3>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {detectedCity.name}
              </h3>
              <button
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
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {detectedCity.desc}
              </p>
            )}

            <p className="text-sm text-gray-600 mb-3">
              Select the current busy level:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {(["Quiet", "Moderate", "Busy", "Very Busy"] as const).map((lvl) => {
                const isActive = detectedBusy === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setDetectedBusy(lvl)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      {
                        Quiet: "bg-emerald-50 border-emerald-200 text-emerald-700",
                        Moderate: "bg-sky-50 border-sky-200 text-sky-700",
                        Busy: "bg-amber-50 border-amber-200 text-amber-700",
                        "Very Busy": "bg-rose-50 border-rose-200 text-rose-700",
                      }[lvl]
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
                onClick={async () => {
                  await saveDetectedPlace();

                  setDetectedCity((prev) =>
                    prev ? { ...prev, busyLevel: detectedBusy } : prev
                  );

                  setShowDetectedModal(false);
                }}
                className={`px-4 py-2 rounded-md text-white ${
                  detectedBusy
                    ? "bg-[#16a085] hover:bg-[#13856d]"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
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
