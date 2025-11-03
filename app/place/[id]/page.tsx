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

export default function PlaceDetails() {
  const sp = useSearchParams();
  const router = useRouter();

  const name = decodeURIComponent(sp.get("name") || "Unknown Place");
  const desc = decodeURIComponent(sp.get("desc") || "");
  const lat = sp.get("lat");
  const lon = sp.get("lon");
  const image = sp.get("image") || "/fallback.jpg";

  const [address, setAddress] = useState("");
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [best, setBest] = useState<ForecastItem | null>(null);
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      try {
        const r = await fetch(`/api/crowd?place=${encodeURIComponent(name)}&limit=12`, { cache: "no-store" });
        const j = await r.json();
        setForecast(Array.isArray(j?.forecast) ? j.forecast : []);
        setBest(j?.best || null);
      } catch {
        setForecast([]);
        setBest(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [name]);

  const bestHint = useMemo(() => {
    if (!best) return "";
    const dt = new Date(best.iso);
    const hh = dt.getHours().toString().padStart(2, "0");
    const dd = dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const nextHour = ((best.hour + 1) % 24).toString().padStart(2, "0");
    const today = new Date();
    const sameDay = dt.getFullYear() === today.getFullYear() &&
                    dt.getMonth() === today.getMonth() &&
                    dt.getDate() === today.getDate();
    const dayWord = sameDay ? "today" : dd;
    return `Best time to visit: ${hh}:00–${nextHour}:00 ${dayWord} (${best.level}).`;
  }, [best]);

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

        <div className="rounded-2xl bg-white shadow-md border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">Next hours busyness</h2>
            {loading && <span className="text-xs text-gray-500">Loading…</span>}
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
