"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

type ForecastItem = {
  iso: string;
  hour: number;
  level: string; 
  score: number; 
  date?: string;
};

type CrowdPlace = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  image?: string;
  busyLevel?: string;
  description?: string;
};

export default function PlaceDetails() {
  const sp = useSearchParams();
  const router = useRouter();

  const name = decodeURIComponent(sp.get("name") || "Unknown Place");
  const desc = decodeURIComponent(sp.get("desc") || "");
  const lat = sp.get("lat");
  const lon = sp.get("lon");
  const image = sp.get("image") || "/fallback.jpg";
  const busyParam = decodeURIComponent(sp.get("busy") || "");

  const [address, setAddress] = useState("");
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [best, setBest] = useState<ForecastItem | null>(null);

  const [busyNow, setBusyNow] = useState<string>(busyParam);

  const [alt, setAlt] = useState<CrowdPlace | null>(null);
  const [loadingAlt, setLoadingAlt] = useState(false);

  const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  const fetchPlaceImage = async (placeName: string): Promise<string> => {
    const cacheKey = `img-${placeName}`;
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return cached;
      }

      try {
        const q = `${placeName} Sri Lanka`;
        const wikiURL = new URL("https://en.wikipedia.org/w/api.php");
        wikiURL.searchParams.set("action", "query");
        wikiURL.searchParams.set("format", "json");
        wikiURL.searchParams.set("origin", "*");
        wikiURL.searchParams.set("prop", "pageimages");
        wikiURL.searchParams.set("generator", "search");
        wikiURL.searchParams.set("gsrsearch", q);
        wikiURL.searchParams.set("gsrlimit", "1");
        wikiURL.searchParams.set("piprop", "thumbnail");
        wikiURL.searchParams.set("pithumbsize", "800");

        const wr = await fetch(wikiURL.toString(), { cache: "no-store" });
        const wj = await wr.json();
        const pages = Object.values(wj?.query?.pages || {}) as {
  thumbnail?: { source?: string };
}[];

const wikiThumb = pages[0]?.thumbnail?.source;


        if (wikiThumb) {
          if (typeof window !== "undefined") localStorage.setItem(cacheKey, wikiThumb);
          return wikiThumb;
        }
      } catch {}

      if (UNSPLASH_KEY) {
        try {
          const u = new URL("https://api.unsplash.com/search/photos");
          u.searchParams.set("query", `${placeName} Sri Lanka`);
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
      } catch {}
    })();
  }, [lat, lon]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/crowd?place=${encodeURIComponent(name)}&limit=12`, { cache: "no-store" });
        const j = await r.json();
        setForecast(Array.isArray(j?.forecast) ? j.forecast : []);
        setBest(j?.best || null);
      } catch {
        setForecast([]);
        setBest(null);
      }
    })();
  }, [name]);

  useEffect(() => {
    if (busyParam) return;
    (async () => {
      try {
        const r = await fetch("/api/crowd", { cache: "no-store" });
        const list: CrowdPlace[] = await r.json();
        const match = list.find(
          (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (match?.busyLevel) setBusyNow(match.busyLevel);
      } catch {}
    })();
  }, [busyParam, name]);

  useEffect(() => {
    const b = (busyNow || "").toLowerCase();
    const isBusy = b === "busy" || b === "very busy";
    if (!isBusy) return;

    (async () => {
      setLoadingAlt(true);
      try {
        const r = await fetch("/api/crowd", { cache: "no-store" });
        const list: CrowdPlace[] = await r.json();

        const altPlace =
          list.find(
            (p) =>
              p.name.trim().toLowerCase() !== name.trim().toLowerCase() &&
              p.busyLevel === "Quiet"
          ) ||
          list.find(
            (p) =>
              p.name.trim().toLowerCase() !== name.trim().toLowerCase() &&
              p.busyLevel === "Moderate"
          ) ||
          null;

        if (altPlace) {
          if (!altPlace.image) {
            altPlace.image = await fetchPlaceImage(altPlace.name);
          }
        }
        setAlt(altPlace);
      } catch {
        setAlt(null);
      } finally {
        setLoadingAlt(false);
      }
    })();
  }, [busyNow, name]);

  const bestHint = useMemo(() => {
    if (!best) return "";
    const dt = new Date(best.iso);
    const hh = dt.getHours().toString().padStart(2, "0");
    const nextHour = ((best.hour + 1) % 24).toString().padStart(2, "0");
    const today = new Date();
    const sameDay =
      dt.getFullYear() === today.getFullYear() &&
      dt.getMonth() === today.getMonth() &&
      dt.getDate() === today.getDate();
    const dayWord = sameDay
      ? "today"
      : dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    return `Best time to visit: ${hh}:00–${nextHour}:00 ${dayWord} (${best.level}).`;
  }, [best]);

  const pushToDetails = (p: CrowdPlace) => {
    const url =
      `/place/${p.id}` +
      `?name=${encodeURIComponent(p.name)}` +
      `&desc=${encodeURIComponent(p.description || "")}` +
      `&lat=${p.lat}` +
      `&lon=${p.lon}` +
      `&image=${encodeURIComponent(p.image || "/fallback.jpg")}` +
      `&busy=${encodeURIComponent(p.busyLevel || "")}`;
    router.push(url);
  };

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
        {desc && <p className="text-gray-800 leading-relaxed text-base mb-6">{desc}</p>}

        {["Busy", "Very Busy"].includes(busyNow || "") && (
          <div className="mb-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  This place is currently <span className="font-semibold">{busyNow}</span>.
                </p>
                {loadingAlt && <span className="text-xs">Finding alternatives…</span>}
              </div>

              {alt ? (
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-white border">
                    <Image
                      src={alt.image || "/fallback.jpg"}
                      alt={alt.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">
                      Try <span className="font-semibold">{alt.name}</span> —{" "}
                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {alt.busyLevel}
                      </span>
                    </div>
                    <button
                      className="mt-2 text-xs bg-[#16a085] text-white px-3 py-1 rounded-md hover:bg-[#13856d]"
                      onClick={() => pushToDetails(alt)}
                    >
                      View {alt.name}
                    </button>
                  </div>
                </div>
              ) : (
                !loadingAlt && (
                  <p className="text-xs text-amber-800 mt-2">No quieter alternatives found right now.</p>
                )
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-md border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">Next hours busyness</h2>
          </div>

          {forecast.length ? (
            <>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {forecast.map((f) => {
                  const dt = new Date(f.iso);
                  const hh = dt.getHours().toString().padStart(2, "0");
                  const isBest = best && best.iso === f.iso;
                  const badgeColors =
                    f.level === "Quiet"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : f.level === "Moderate"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : f.level === "Busy"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200";
                  return (
                    <div
                      key={f.iso}
                      className={`min-w-[84px] rounded-xl border px-3 py-2 text-center ${badgeColors} ${isBest ? "ring-2 ring-[#16a085]" : ""}`}
                      title={new Date(f.iso).toLocaleString()}
                    >
                      <div className="text-xs font-medium">{hh}:00</div>
                      <div className="text-[11px]">{f.level}</div>
                    </div>
                  );
                })}
              </div>

              {best && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  {bestHint}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">No forecast found for this place.</p>
          )}
        </div>

        <style jsx>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    </div>
  );
}
