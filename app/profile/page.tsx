"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { auth } from "../../src/firebase/config";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";

const CATEGORIES = [
  "historical sites",
  "natural spots",
  "cultural events",
  "religious sites",
  "local food spots",
] as const;

type Preference = (typeof CATEGORIES)[number];

type Visit = { id: string; name: string; image?: string; visitedAt?: number };

type LastLocation = {
  name: string;
  desc?: string;
  lat: number;
  lon: number;
  image?: string;
  busy?: string;
  timestamp: number;
};

type PlaceCard = {
  id: string;
  name: string;
  image?: string;
  category: Preference;
  city?: string;
  distanceKm?: number;
  desc?: string;
};

const CURATED_SRI_LANKA_BASE: Omit<PlaceCard, "image">[] = [
  {
    id: "gl",
    name: "Galle Fort",
    category: "historical sites",
    city: "Galle",
    desc: "UNESCO-listed Dutch fort with ramparts & sea views.",
  },
  {
    id: "sr",
    name: "Sigiriya Rock",
    category: "natural spots",
    city: "Dambulla",
    desc: "Ancient rock fortress with jaw-dropping panoramas.",
  },
  {
    id: "kcc",
    name: "Kandy Cultural Show",
    category: "cultural events",
    city: "Kandy",
    desc: "Traditional dance & drums near the Temple of the Tooth.",
  },
  {
    id: "gg",
    name: "Gangaramaya Temple",
    category: "religious sites",
    city: "Colombo",
    desc: "Modern + traditional Buddhist architecture by Beira Lake.",
  },
  {
    id: "jl",
    name: "Jaffna Local Eats",
    category: "local food spots",
    city: "Jaffna",
    desc: "Spicy crab curry & street snacks worth a detour.",
  },
];

const INLINE_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop stop-color='#e5f9f4' offset='0'/><stop stop-color='#d1f2eb' offset='1'/>
      </linearGradient></defs>
      <rect fill='url(#g)' width='100%' height='100%'/>
      <text x='50%' y='50%' text-anchor='middle' font-family='system-ui,Segoe UI,Arial' font-size='28' fill='#13856d'>Image unavailable</text>
    </svg>`
  );

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

async function fetchPlaceImageByName(queries: string[] | string): Promise<string> {
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
        const wiki = new URL("https://en.wikipedia.org/w/api.php");
        wiki.searchParams.set("action", "query");
        wiki.searchParams.set("format", "json");
        wiki.searchParams.set("origin", "*");
        wiki.searchParams.set("prop", "pageimages");
        wiki.searchParams.set("generator", "search");
        wiki.searchParams.set("gsrsearch", q);
        wiki.searchParams.set("gsrlimit", "1");
        wiki.searchParams.set("piprop", "thumbnail");
        wiki.searchParams.set("pithumbsize", "1000");

        const wr = await fetch(wiki.toString(), { cache: "no-store" });
        const wj: {
          query?: {
            pages?: Record<string, { thumbnail?: { source?: string } }>;
          };
        } = await wr.json();

        const rawPages = wj.query?.pages ?? {};
        const pages = Object.values(rawPages);

        let wikiThumb: string | undefined;

        if (pages.length > 0) {
          const thumb = pages[0]?.thumbnail?.source;
          if (thumb) {
            wikiThumb = thumb.replace(/^\/\//, "https://");
          }
        }

        if (wikiThumb) {
          if (typeof window !== "undefined") localStorage.setItem(cacheKey, wikiThumb);
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

          const img: string | undefined = j?.results?.[0]?.urls?.regular;
          if (img) {
            if (typeof window !== "undefined") localStorage.setItem(cacheKey, img);
            return img;
          }
        } catch {
        }
      }
    }

    if (typeof window !== "undefined") localStorage.setItem(cacheKey, INLINE_FALLBACK);
    return INLINE_FALLBACK;
  } catch {
    return INLINE_FALLBACK;
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [visited, setVisited] = useState<Visit[]>([]);
  const [lastLocation, setLastLocation] = useState<LastLocation | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | null; text?: string }>({ type: null });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Preference[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const [curated, setCurated] = useState<PlaceCard[]>(
    CURATED_SRI_LANKA_BASE.map((p) => ({ ...p, image: undefined }))
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const withImgs = await Promise.all(
        CURATED_SRI_LANKA_BASE.map(async (p) => {
          const img = await fetchPlaceImageByName([p.name, p.city ?? "Sri Lanka"]);
          return { ...p, image: img };
        })
      );
      if (!cancelled) setCurated(withImgs);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!visited.length) return;

    let cancelled = false;

    (async () => {
      const next = await Promise.all(
        visited.map(async (v) => {
          if (v.image?.startsWith("http")) return v;
          const img = await fetchPlaceImageByName([v.name]);
          return { ...v, image: img };
        })
      );

      if (!cancelled) setVisited(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [visited.length]);

  function abortableFetch(url: string, opt: RequestInit = {}, ms = 8000) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opt, signal: ctrl.signal }).finally(() => clearTimeout(id));
  }

  async function loadProfile(u: User) {
    setLoading(true);
    setMsg({ type: null });

    try {
      const url = u.email
        ? `/api/profile?email=${encodeURIComponent(u.email)}`
        : `/api/profile?uid=${encodeURIComponent(u.uid)}`;

      const r = await abortableFetch(url, { cache: "no-store" });
      const j = await r.json();

      if (!r.ok) throw new Error(j?.error || "Failed to load profile");

      if (Array.isArray(j.preferences)) setPrefs(j.preferences);
      if (j.lastLocation) setLastLocation(j.lastLocation);

      setLastSync(Date.now());
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to load profile." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadProfile(user);

    const onVis = () => {
      if (document.visibilityState === "visible" && user) loadProfile(user);
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user?.uid, user?.email]);

  const openModal = () => {
    setDraft(prefs);
    setMsg({ type: null });
    setOpen(true);
  };

  const toggleDraft = (cat: Preference) =>
    setDraft((d) => (d.includes(cat) ? d.filter((x) => x !== cat) : [...d, cat]));

  const save = async () => {
    if (!user?.uid) {
      setMsg({ type: "error", text: "No user ID yet. Try again." });
      return;
    }

    setSaving(true);
    setMsg({ type: null });

    const next = [...draft];
    setPrefs(next);

    try {
      const res = await abortableFetch(
        "/api/profile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email || null,
            preferences: next,
          }),
        },
        8000
      );

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Save failed (${res.status})`);
      }

      setMsg({ type: "success", text: "Preferences saved!" });
      setOpen(false);
      setLastSync(Date.now());
    } catch (e: any) {
      setMsg({
        type: "error",
        text: e?.name === "AbortError" ? "Request timed out." : e?.message || "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const emailLabel = user?.email ?? (user ? "Anonymous" : "—");

  const fmtDate = (ms: number | undefined) =>
    !ms
      ? ""
      : new Date(ms).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

  const forYouSeed: PlaceCard[] = useMemo(() => {
    if (!prefs.length) return curated.slice(0, 6);

    const scored = curated.map((p) => ({
      place: p,
      score: p.image ? (prefs.includes(p.category) ? 2 : 1) : 0,
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map((s) => s.place);
  }, [prefs, curated]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Your Travel Hub</h1>
          <p className="mt-1 text-sm text-gray-600">Plan smarter — preferences & history in one place.</p>
        </div>

        <span className="inline-flex max-w-[50vw] items-center gap-2 truncate rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 7l8 5 8-5" />
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
          <span className="truncate">{emailLabel}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              onClick={openModal}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              🎯 Update preferences
            </button>

            <Link
              href="/"
              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm font-medium text-sky-800 hover:bg-sky-100"
            >
              📍 Find nearby places
            </Link>

            <Link
              href="/my-places"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              ⭐ Saved places
            </Link>
          </div>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-gray-900">For you</h3>
              {lastSync && <span className="text-xs text-gray-500">Updated {fmtDate(lastSync)}</span>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {forYouSeed.map((p) => (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  <div className="relative h-32 w-full overflow-hidden">
                    <Image
                      src={p.image || INLINE_FALLBACK}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="truncate text-sm font-semibold text-gray-900">{p.name}</div>
                      <span className="ml-2 text-[10px] capitalize rounded-full border px-2 py-0.5 bg-gray-50 border-gray-200 text-gray-700">
                        {p.category}
                      </span>
                    </div>

                    {p.city && <div className="mt-1 text-xs text-gray-500">{p.city}</div>}
                    {p.desc && (
                      <p className="mt-1 text-xs text-gray-600 line-clamp-2">{p.desc}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Last detected location</h3>

            {lastLocation ? (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="relative h-36 w-full">
                  <Image
                    src={lastLocation.image || INLINE_FALLBACK}
                    alt={lastLocation.name}
                    fill
                    sizes="400px"
                    className="object-cover"
                  />
                </div>

                <div className="p-3">
                  <div className="font-semibold text-gray-900">{lastLocation.name}</div>
                  {lastLocation.busy && (
                    <div className="text-xs mt-1 text-amber-700 bg-amber-50 border border-amber-200 inline-block px-2 py-0.5 rounded-full">
                      {lastLocation.busy}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Detected: {fmtDate(lastLocation.timestamp)}
                  </p>

                  {lastLocation.desc && (
                    <p className="mt-2 text-xs text-gray-600 line-clamp-3">{lastLocation.desc}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No location saved yet.</p>
            )}
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Visited places</h3>

            {visited.length ? (
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
                {visited.map((v) => (
                  <div
                    key={v.id}
                    className="min-w-[12rem] w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                  >
                    <div className="relative h-28 w-full overflow-hidden">
                      <Image
                        src={v.image || INLINE_FALLBACK}
                        alt={v.name}
                        fill
                        sizes="200px"
                        className="object-cover hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="p-3">
                      <div className="truncate text-sm font-semibold text-gray-900">{v.name}</div>

                      {v.visitedAt && (
                        <div className="mt-1 text-[11px] text-gray-500">
                          Visited: {fmtDate(v.visitedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No visited places yet.</p>
            )}
          </section>

          <section>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
              💡 <span className="font-medium">Pro tip:</span> Set your preferences — your homepage &
              recommendations update instantly.
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-4">
            <div className="rounded-2xl border bg-white shadow-sm p-5 border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your preferences</h3>
                <button
                  onClick={openModal}
                  className="text-sm font-medium text-[#16a085] hover:underline"
                >
                  Edit
                </button>
              </div>

              {loading ? (
                <p className="mt-4 text-sm text-gray-500">Loading...</p>
              ) : prefs.length ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  {prefs.map((p) => (
                    <span
                      key={p}
                      className="capitalize text-xs px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  No preferences yet — tap Edit to personalize.
                </p>
              )}

              {msg.type === "error" && (
                <p className="mt-3 text-sm text-rose-700">⚠️ {msg.text}</p>
              )}
              {msg.type === "success" && (
                <p className="mt-3 text-sm text-emerald-700">✅ {msg.text}</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Update preferences</h4>
              <button
                disabled={saving}
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              Choose the categories you’re interested in:
            </p>

            <div className="grid gap-2 grid-cols-1">
              {CATEGORIES.map((cat) => {
                const active = draft.includes(cat);
                return (
                  <button
                    key={cat}
                    disabled={saving}
                    onClick={() => toggleDraft(cat)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm capitalize ${
                      active
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <span>{cat}</span>
                    {active && <span>✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                disabled={saving}
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                disabled={saving}
                onClick={save}
                className={`px-4 py-2 rounded-md text-white ${
                  saving ? "bg-gray-300" : "bg-[#16a085] hover:bg-[#13856d]"
                }`}
              >
                {saving ? "Saving…" : "Save"}
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
