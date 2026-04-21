"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type BusyLevel = "Quiet" | "Moderate" | "Busy" | "Very Busy";

type ForecastItem = {
  iso: string;
  hour: number;
  level: BusyLevel;
  score: number;
  is?: boolean;
};

type CrowdPlace = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  image?: string;
  busyLevel?: string;
  description?: string;
  is?: boolean;
};

const LEVEL_SCORE: Record<BusyLevel, number> = {
  Quiet: 25,
  Moderate: 50,
  Busy: 72,
  "Very Busy": 90,
};

const FALLBACK_ALTS: CrowdPlace[] = [
  {
    id: "fallback-alt-galle-face",
    name: "Galle Face Green",
    lat: 6.9271,
    lon: 79.8441,
    busyLevel: "Moderate",
    description: "Oceanfront promenade with more space to walk around.",
    image: "/fallback.jpg",
    is: true,
  },
  {
    id: "fallback-alt-viharamahadevi",
    name: "Viharamahadevi Park",
    lat: 6.9159,
    lon: 79.8614,
    busyLevel: "Quiet",
    description: "Open public park that is usually calmer than packed tourist hotspots.",
    image: "/fallback.jpg",
    is: true,
  },
  {
    id: "fallback-alt-horton",
    name: "Horton Plains",
    lat: 6.8096,
    lon: 80.8,
    busyLevel: "Quiet",
    description: "A quieter nature option when city attractions feel too crowded.",
    image: "/fallback.jpg",
    is: true,
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeBusyLevel(value?: string | null): BusyLevel | "" {
  if (!value) return "";
  if (value === "Quiet") return "Quiet";
  if (value === "Moderate") return "Moderate";
  if (value === "Busy") return "Busy";
  if (value === "Very Busy") return "Very Busy";
  return "";
}

function scoreToLevel(score: number): BusyLevel {
  if (score < 38) return "Quiet";
  if (score < 60) return "Moderate";
  if (score < 80) return "Busy";
  return "Very Busy";
}

function badgeClass(level?: string) {
  if (level === "Quiet") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (level === "Moderate") return "bg-sky-50 text-sky-700 border-sky-200";
  if (level === "Busy") return "bg-amber-50 text-amber-700 border-amber-200";
  if (level === "Very Busy") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

function inferFallbackBusyLevel(placeName: string): BusyLevel {
  const name = placeName.toLowerCase();
  const seed = hashString(placeName);
  const hour = new Date().getHours();

  let score = 48 + (seed % 18);

  if (/(market|bazaar|fort|beach|temple|kovil|mall|museum|park)/.test(name)) {
    score += 10;
  }

  if (/(forest|falls|waterfall|arboretum|viewpoint|lake|plains|hill)/.test(name)) {
    score -= 12;
  }

  if (hour >= 11 && hour <= 14) score += 8;
  if (hour >= 17 && hour <= 20) score += 6;
  if (hour >= 6 && hour <= 8) score -= 10;

  return scoreToLevel(Math.max(18, Math.min(94, score)));
}

function generateForecast(placeName: string, busyHint?: string): ForecastItem[] {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  const normalizedHint = normalizeBusyLevel(busyHint);
  const baseLevel = normalizedHint || inferFallbackBusyLevel(placeName);
  const baseScore = LEVEL_SCORE[baseLevel];
  const placeSeed = hashString(placeName);

  return Array.from({ length: 8 }, (_, i) => {
    const dt = new Date(start);
    dt.setHours(start.getHours() + i);

    const hour = dt.getHours();
    const day = dt.getDay();
    const variation = (hashString(`${placeName}-${i}`) % 15) - 7;

    let score = baseScore + variation;

    if (hour >= 11 && hour <= 14) score += 8;
    if (hour >= 18 && hour <= 20) score += 10;
    if (hour >= 6 && hour <= 8) score -= 10;
    if (day === 0 || day === 6) score += 5;
    if (placeSeed % 3 === 0 && hour >= 15 && hour <= 17) score += 4;

    score = Math.max(15, Math.min(95, score));

    return {
      iso: dt.toISOString(),
      hour,
      level: scoreToLevel(score),
      score,
      is: true,
    };
  });
}

function pickBestForecast(items: ForecastItem[]): ForecastItem | null {
  if (!items.length) return null;
  return [...items].sort((a, b) => a.score - b.score || a.iso.localeCompare(b.iso))[0];
}

function formatUpdatedLabel(iso?: string) {
  if (!iso) return "";
  try {
    const dt = new Date(iso);
    const diffMin = Math.max(1, Math.round((Date.now() - dt.getTime()) / 60000));
    if (diffMin < 60) return `Updated ${diffMin} min ago`;
    const diffHr = Math.round(diffMin / 60);
    return `Updated ${diffHr} hr ago`;
  } catch {
    return "";
  }
}

function getFallbackAlt(currentName: string): CrowdPlace | null {
  return (
    FALLBACK_ALTS.find((p) => p.name.toLowerCase() !== currentName.toLowerCase()) || null
  );
}

export default function PlaceDetails() {
  const sp = useSearchParams();
  const router = useRouter();

  const name = decodeURIComponent(sp.get("name") || "Unknown Place");
  const desc = decodeURIComponent(sp.get("desc") || "");
  const lat = sp.get("lat");
  const lon = sp.get("lon");
  const confidence = sp.get("confidence");
  const updated = decodeURIComponent(sp.get("updated") || "");
  const isPlace = sp.get("") === "1";

  const imageParam = sp.get("image");
  const image = (() => {
    try {
      return imageParam ? decodeURIComponent(imageParam) : "/fallback.jpg";
    } catch {
      return "/fallback.jpg";
    }
  })();

  const busyParam = decodeURIComponent(sp.get("busy") || "");

  const [address, setAddress] = useState("");
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [best, setBest] = useState<ForecastItem | null>(null);
  const [busyNow, setBusyNow] = useState<string>(busyParam);
  const [usingBusy, setUsingBusy] = useState(false);
  const [usingForecast, setUsingForecast] = useState(false);

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

      if (UNSPLASH_KEY) {
        try {
          const u = new URL("https://api.unsplash.com/search/photos");
          u.searchParams.set("query", placeName + " Sri Lanka");
          u.searchParams.set("client_id", UNSPLASH_KEY);
          u.searchParams.set("per_page", "1");

          const r = await fetch(u.toString());
          const j = await r.json();

          const url: string | undefined = j?.results?.[0]?.urls?.regular;

          if (url) {
            if (typeof window !== "undefined") {
              localStorage.setItem(cacheKey, url);
            }
            return url;
          }
        } catch { }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, "/fallback.jpg");
      }
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
              "User-Agent": "CrowdPlaces/1.0",
            },
          }
        );
        const j = await r.json();
        setAddress(j?.display_name || "");
      } catch { }
    })();
  }, [lat, lon]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/crowd?place=${encodeURIComponent(name)}&limit=12`);
        const j = await r.json();

        const forecastData: ForecastItem[] = Array.isArray(j?.forecast) ? j.forecast : [];
        const bestData: ForecastItem | null = j?.best || null;

        if (forecastData.length > 0) {
          setForecast(forecastData);
          setBest(bestData || pickBestForecast(forecastData));
          setUsingForecast(false);
          return;
        }
      } catch { }

      const fallbackForecast = generateForecast(name, busyParam || busyNow);
      setForecast(fallbackForecast);
      setBest(pickBestForecast(fallbackForecast));
      setUsingForecast(true);
    })();
  }, [name, busyParam, busyNow]);

  useEffect(() => {
    if (busyParam) {
      setBusyNow(busyParam);
      setUsingBusy(isPlace);
      return;
    }

    (async () => {
      try {
        const r = await fetch("/api/crowd");
        const list: CrowdPlace[] = await r.json();

        const match = list.find(
          (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
        );

        if (match?.busyLevel) {
          setBusyNow(match.busyLevel);
          setUsingBusy(false);
          return;
        }
      } catch { }

      setBusyNow(inferFallbackBusyLevel(name));
      setUsingBusy(true);
    })();
  }, [busyParam, name, isPlace]);

  useEffect(() => {
    const b = (busyNow || "").toLowerCase();
    if (!(b === "busy" || b === "very busy")) {
      setAlt(null);
      return;
    }

    (async () => {
      setLoadingAlt(true);

      try {
        const r = await fetch("/api/crowd");
        const list: CrowdPlace[] = await r.json();

        const altPlace =
          list.find(
            (p) =>
              p.name.toLowerCase() !== name.toLowerCase() &&
              p.busyLevel === "Quiet"
          ) ||
          list.find(
            (p) =>
              p.name.toLowerCase() !== name.toLowerCase() &&
              p.busyLevel === "Moderate"
          ) ||
          getFallbackAlt(name);

        if (altPlace && !altPlace.image) {
          altPlace.image = await fetchPlaceImage(altPlace.name);
        }

        setAlt(altPlace);
      } catch {
        const fallbackAlt = getFallbackAlt(name);
        if (fallbackAlt && !fallbackAlt.image) {
          fallbackAlt.image = await fetchPlaceImage(fallbackAlt.name);
        }
        setAlt(fallbackAlt);
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
      : dt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

    return `Best time to visit: ${hh}:00-${nextHour}:00 ${dayWord} (${best.level}).`;
  }, [best]);

  const pushToDetails = (p: CrowdPlace) => {
    const is = p.is || p.id.startsWith("fallback-alt-") ? "1" : "0";

    const url =
      `/place/${p.id}` +
      `?name=${encodeURIComponent(p.name)}` +
      `&desc=${encodeURIComponent(p.description || "")}` +
      `&lat=${p.lat}` +
      `&lon=${p.lon}` +
      `&image=${encodeURIComponent(p.image || "/fallback.jpg")}` +
      `&busy=${encodeURIComponent(p.busyLevel || "")}` +
      `&=${is}`;

    router.push(url);
  };

  const crowdLabel = usingBusy || usingForecast || isPlace ? "Estimated" : "Live";
  const updatedLabel = formatUpdatedLabel(updated);

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-[#16a085] font-medium mb-4 hover:underline"
        >
          ← Back
        </button>

        <div className="rounded-2xl overflow-hidden shadow-md mb-4 aspect-[16/9] bg-gray-200">
          <div className="relative w-full h-full">
            <Image
              src={image}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h1 className="text-3xl font-bold text-[#16a085]">{name}</h1>
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
            {crowdLabel} crowd data
          </span>
        </div>

        {address && <p className="text-sm text-gray-600 mb-3">{address}</p>}
        {desc && (
          <p className="text-gray-800 leading-relaxed text-base mb-4">{desc}</p>
        )}

        <div className="mb-6 rounded-2xl bg-white shadow-md border border-gray-100 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm text-gray-500">Current crowd level</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${badgeClass(
                    busyNow
                  )}`}
                >
                  {busyNow || "Moderate"}
                </span>
                {(usingBusy || isPlace) && (
                  <span className="text-xs text-gray-500"></span>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-500 space-y-1 text-right">
              {confidence && <p>{confidence}% confidence</p>}
              {updatedLabel && <p>{updatedLabel}</p>}
            </div>
          </div>
        </div>

        {["Busy", "Very Busy"].includes(busyNow) && (
          <div className="mb-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
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
                      Try <span className="font-semibold">{alt.name}</span> -{" "}
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
                  <p className="text-xs text-amber-800 mt-2">
                    No quieter alternatives found right now.
                  </p>
                )
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-md border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <h2 className="font-semibold text-gray-800">Next hours busyness</h2>
            {usingForecast && (
              <span className="text-xs text-gray-500">Showing  fallback forecast</span>
            )}
          </div>

          {forecast.length ? (
            <>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {forecast.map((f) => {
                  const dt = new Date(f.iso);
                  const hh = dt.getHours().toString().padStart(2, "0");
                  const isBest = best && best.iso === f.iso;

                  const badgeColors = badgeClass(f.level);

                  return (
                    <div
                      key={f.iso}
                      className={`min-w-[84px] rounded-xl border px-3 py-2 text-center ${badgeColors} ${isBest ? "ring-2 ring-[#16a085]" : ""
                        }`}
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
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </div>
  );
}
