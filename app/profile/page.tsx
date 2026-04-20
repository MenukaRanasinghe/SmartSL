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
  isHiddenGem?: boolean;
  busyLevel?: "Quiet" | "Moderate" | "Busy" | "Very Busy";
};

// Dissertation §1.3 — opt-in notification types
type NotifPrefs = {
  quietTime: boolean;
  peakWarning: boolean;
  eventFestival: boolean;
  weatherSafety: boolean;
};

const CATEGORY_ICON: Record<Preference, string> = {
  "historical sites": "🏛️",
  "natural spots": "🌿",
  "cultural events": "🎭",
  "religious sites": "🛕",
  "local food spots": "🍜",
};

const CURATED_SRI_LANKA_BASE: Omit<PlaceCard, "image">[] = [
  {
    id: "gl",
    name: "Galle Fort",
    category: "historical sites",
    city: "Galle",
    desc: "UNESCO-listed Dutch fort with ramparts & sea views.",
    busyLevel: "Moderate",
  },
  {
    id: "sr",
    name: "Sigiriya Rock",
    category: "natural spots",
    city: "Dambulla",
    desc: "Ancient rock fortress with jaw-dropping panoramas.",
    busyLevel: "Busy",
  },
  {
    id: "kcc",
    name: "Kandy Cultural Show",
    category: "cultural events",
    city: "Kandy",
    desc: "Traditional dance & drums near the Temple of the Tooth.",
    busyLevel: "Moderate",
  },
  {
    id: "gg",
    name: "Gangaramaya Temple",
    category: "religious sites",
    city: "Colombo",
    desc: "Modern + traditional Buddhist architecture by Beira Lake.",
    busyLevel: "Busy",
  },
  {
    id: "jl",
    name: "Jaffna Local Eats",
    category: "local food spots",
    city: "Jaffna",
    desc: "Spicy crab curry & street snacks worth a detour.",
    busyLevel: "Quiet",
  },
  {
    id: "pd",
    name: "Pidurangala Rock",
    category: "natural spots",
    city: "Dambulla",
    desc: "Quieter neighbour of Sigiriya with the best view of the rock.",
    isHiddenGem: true,
    busyLevel: "Quiet",
  },
  {
    id: "sb",
    name: "Sembuwatta Lake",
    category: "natural spots",
    city: "Matale",
    desc: "Emerald man-made lake tucked above a tea estate.",
    isHiddenGem: true,
    busyLevel: "Quiet",
  },
];

const LANGUAGE_PHRASES = [
  { english: "Hello", sinhala: "Āyubōwan (ආයුබෝවන්)", tamil: "Vaṇakkam (வணக்கம்)" },
  { english: "Thank you", sinhala: "Bohoma sthūthi (බොහොම ස්තූතියි)", tamil: "Naṉṟi (நன்றி)" },
  { english: "How much?", sinhala: "Kīyada? (කීයද?)", tamil: "Evvaḷavu? (எவ்வளவு?)" },
  { english: "Where is...?", sinhala: "...koheda? (...කොහෙද?)", tamil: "...eṅkē? (...எங்கே?)" },
  { english: "Excuse me", sinhala: "Samāvenna (සමාවෙන්න)", tamil: "Mannikkavum (மன்னிக்கவும்)" },
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
          if (thumb) wikiThumb = thumb.replace(/^\/\//, "https://");
        }

        if (wikiThumb) {
          if (typeof window !== "undefined") localStorage.setItem(cacheKey, wikiThumb);
          return wikiThumb;
        }
      } catch { }

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
        } catch { }
      }
    }

    if (typeof window !== "undefined") localStorage.setItem(cacheKey, INLINE_FALLBACK);
    return INLINE_FALLBACK;
  } catch {
    return INLINE_FALLBACK;
  }
}

const busyBadgeClass = (lvl?: string) => {
  const map: Record<string, string> = {
    Quiet: "bg-emerald-50 border-emerald-200 text-emerald-700",
    Moderate: "bg-sky-50 border-sky-200 text-sky-700",
    Busy: "bg-amber-50 border-amber-200 text-amber-700",
    "Very Busy": "bg-rose-50 border-rose-200 text-rose-700",
  };
  return map[lvl || ""] || "bg-gray-50 border-gray-200 text-gray-600";
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [visited, setVisited] = useState<Visit[]>([]);
  const [saved, setSaved] = useState<string[]>([]); // place ids
  const [lastLocation, setLastLocation] = useState<LastLocation | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | null; text?: string }>({
    type: null,
  });

  // Preferences modal
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Preference[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Notification settings (dissertation §1.3 + §5.2)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    quietTime: true,
    peakWarning: true,
    eventFestival: true,
    weatherSafety: true,
  });
  const [shareLocation, setShareLocation] = useState<boolean>(true);

  // Modals
  const [showLanguage, setShowLanguage] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [curated, setCurated] = useState<PlaceCard[]>(
    CURATED_SRI_LANKA_BASE.map((p) => ({ ...p, image: undefined }))
  );

  // Load saved local state for notification prefs + saved places
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const n = localStorage.getItem("notif-prefs");
      if (n) setNotifPrefs(JSON.parse(n));
      const s = localStorage.getItem("saved-places");
      if (s) setSaved(JSON.parse(s));
      const sl = localStorage.getItem("share-location");
      if (sl) setShareLocation(sl === "true");
    } catch { }
  }, []);

  // Persist notification prefs & saved places locally (optimistic)
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("notif-prefs", JSON.stringify(notifPrefs));
  }, [notifPrefs]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("saved-places", JSON.stringify(saved));
  }, [saved]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("share-location", String(shareLocation));
  }, [shareLocation]);

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

  // Hydrate curated list with images
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
      if (Array.isArray(j.visited)) setVisited(j.visited);

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

  const toggleSave = (id: string) =>
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const emailLabel = user?.email ?? (user ? "Anonymous" : "—");

  const fmtDate = (ms: number | undefined) =>
    !ms
      ? ""
      : new Date(ms).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  // For-you: if user has prefs, show their categories first, then hidden gems, then the rest
  const forYouSeed: PlaceCard[] = useMemo(() => {
    const scored = curated.map((p) => ({
      place: p,
      score:
        (prefs.includes(p.category) ? 3 : 0) +
        (p.isHiddenGem ? 1 : 0) +
        (p.image ? 0.1 : 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map((s) => s.place);
  }, [prefs, curated]);

  // Stats
  const stats = useMemo(
    () => ({
      visited: visited.length,
      saved: saved.length,
      prefs: prefs.length,
      categoriesSeen: new Set(visited.map((v) => v.name.toLowerCase())).size,
    }),
    [visited, saved, prefs]
  );

  // Hidden gems for a dedicated strip
  const hiddenGems = useMemo(() => curated.filter((c) => c.isHiddenGem), [curated]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-4 sm:px-6 lg:px-8 lg:py-6 pb-24">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Your Travel Hub</h1>
          <p className="mt-1 text-sm text-gray-600">
            Plan smarter — preferences, history, and alerts in one place.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLanguage(true)}
            className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            title="Local language phrases"
            aria-label="Local language phrases"
          >
            <span className="text-sm">🈁</span>
          </button>

          <button
            onClick={() => setShowPrivacy(true)}
            className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            title="Privacy & location"
            aria-label="Privacy settings"
          >
            <span className="text-sm">🛡️</span>
          </button>

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
      </div>

      {/* Stats strip */}
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Visited", value: stats.visited, icon: "🗺️", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          { label: "Saved", value: stats.saved, icon: "⭐", tone: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: "Preferences", value: stats.prefs, icon: "🎯", tone: "text-sky-700 bg-sky-50 border-sky-200" },
          {
            label: "Districts seen",
            value: stats.categoriesSeen,
            icon: "📍",
            tone: "text-violet-700 bg-violet-50 border-violet-200",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border ${s.tone} p-3 flex items-center gap-3`}
          >
            <div className="text-2xl">{s.icon}</div>
            <div>
              <div className="text-xs opacity-70">{s.label}</div>
              <div className="text-lg font-bold">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={openModal}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              🎯 Update preferences
            </button>

            <Link
              href="/home"
              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm font-medium text-sky-800 hover:bg-sky-100"
            >
              📍 Find nearby places
            </Link>

            <Link
              href="/routes"
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-sm font-medium text-indigo-800 hover:bg-indigo-100"
            >
              🧭 Crowd-aware routes
            </Link>

            <Link
              href="/hidden-gems"
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left text-sm font-medium text-violet-800 hover:bg-violet-100"
            >
              💎 Hidden gems
            </Link>
          </div>

          {/* For you */}
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-gray-900">For you</h3>
              <div className="flex items-center gap-3">
                {prefs.length > 0 && (
                  <span className="text-[11px] text-gray-500">
                    Matched to: {prefs.map((p) => CATEGORY_ICON[p]).join(" ")}
                  </span>
                )}
                {lastSync && (
                  <span className="text-xs text-gray-500">Updated {fmtDate(lastSync)}</span>
                )}
              </div>
            </div>

            {prefs.length === 0 && (
              <div className="mb-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3 text-xs text-emerald-800">
                💡 Set your preferences to get personalised suggestions.{" "}
                <button onClick={openModal} className="font-semibold underline">
                  Set now
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {forYouSeed.map((p) => {
                const isSaved = saved.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm relative group"
                  >
                    <div className="relative h-32 w-full overflow-hidden">
                      <Image
                        src={p.image || INLINE_FALLBACK}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      {p.isHiddenGem && (
                        <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white">
                          Hidden Gem
                        </span>
                      )}
                      <button
                        onClick={() => toggleSave(p.id)}
                        className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition ${isSaved
                            ? "bg-amber-500 text-white"
                            : "bg-white/90 text-gray-600 hover:bg-white"
                          }`}
                        aria-label={isSaved ? "Unsave" : "Save"}
                        title={isSaved ? "Remove from saved" : "Save for later"}
                      >
                        {isSaved ? "★" : "☆"}
                      </button>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900">
                            {p.name}
                          </div>
                          {p.city && (
                            <div className="text-xs text-gray-500">{p.city}</div>
                          )}
                        </div>
                        <span className="ml-2 text-[10px] capitalize rounded-full border px-2 py-0.5 bg-gray-50 border-gray-200 text-gray-700 whitespace-nowrap">
                          {CATEGORY_ICON[p.category]} {p.category}
                        </span>
                      </div>

                      {p.busyLevel && (
                        <span
                          className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full border ${busyBadgeClass(
                            p.busyLevel
                          )}`}
                        >
                          {p.busyLevel}
                        </span>
                      )}

                      {p.desc && (
                        <p className="mt-1.5 text-xs text-gray-600 line-clamp-2">
                          {p.desc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Hidden gems strip (promotes lesser-known places — dissertation §1.6) */}
          {hiddenGems.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">💎 Hidden gems for you</h3>
                <Link
                  href="/hidden-gems"
                  className="text-xs text-violet-700 hover:underline"
                >
                  See all
                </Link>
              </div>

              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
                {hiddenGems.map((g) => (
                  <div
                    key={`gem-${g.id}`}
                    className="min-w-[13rem] w-52 flex-shrink-0 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm relative"
                  >
                    <div className="relative h-28 w-full overflow-hidden">
                      <Image
                        src={g.image || INLINE_FALLBACK}
                        alt={g.name}
                        fill
                        sizes="208px"
                        className="object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white">
                        Hidden Gem
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {g.name}
                      </div>
                      {g.city && <div className="text-[11px] text-gray-500">{g.city}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Last detected location */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Last detected location
            </h3>

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
                    <div
                      className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full border ${busyBadgeClass(
                        lastLocation.busy
                      )}`}
                    >
                      {lastLocation.busy}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Detected: {fmtDate(lastLocation.timestamp)}
                  </p>

                  {lastLocation.desc && (
                    <p className="mt-2 text-xs text-gray-600 line-clamp-3">
                      {lastLocation.desc}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
                <div className="text-3xl mb-1">🧭</div>
                <p className="text-sm text-gray-700 font-medium">
                  No location saved yet
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Submit live feedback from the map to save your first location.
                </p>
                <Link
                  href="/explore"
                  className="inline-block mt-3 text-xs px-3 py-1.5 rounded-full bg-[#16a085] text-white hover:bg-[#13856d]"
                >
                  Open live map
                </Link>
              </div>
            )}
          </section>

          {/* Visited places */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Visited places</h3>

            {visited.length ? (
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
                {visited.map((v) => (
                  <div
                    key={v.id}
                    className="min-w-[12rem] w-48 flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
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
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {v.name}
                      </div>
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
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
                <div className="text-3xl mb-1">🏝️</div>
                <p className="text-sm text-gray-700 font-medium">No trips logged yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Your visited places will appear here as you explore.
                </p>
              </div>
            )}
          </section>

          {/* Pro tip */}
          <section>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
              💡 <span className="font-medium">Pro tip:</span> Enable event/festival and
              weather alerts to explain sudden crowd changes and avoid surprises on
              natural trails.
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-4 space-y-4">
            {/* Preferences */}
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
                      {CATEGORY_ICON[p]} {p}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-3">
                    No preferences yet — tap <span className="font-medium">Edit</span> to
                    personalise your feed.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setDraft([c]);
                          setOpen(true);
                        }}
                        className="text-[11px] capitalize px-2 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        {CATEGORY_ICON[c]} {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg.type === "error" && (
                <p className="mt-3 text-sm text-rose-700">⚠️ {msg.text}</p>
              )}
              {msg.type === "success" && (
                <p className="mt-3 text-sm text-emerald-700">✅ {msg.text}</p>
              )}
            </div>

            {/* Notification preferences (dissertation §1.3 + §5.2) */}
            <div className="rounded-2xl border bg-white shadow-sm p-5 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Notification settings
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Control which alerts you receive.
              </p>

              <div className="space-y-2.5">
                {(
                  [
                    {
                      key: "quietTime",
                      label: "Quiet-time reminders",
                      hint: "Get a ping when a place is less crowded.",
                      icon: "🟢",
                    },
                    {
                      key: "peakWarning",
                      label: "Peak-time warnings",
                      hint: "Avoid surprise crowds.",
                      icon: "⚠️",
                    },
                    {
                      key: "eventFestival",
                      label: "Event & festival alerts",
                      hint: "Explains crowd spikes.",
                      icon: "🎉",
                    },
                    {
                      key: "weatherSafety",
                      label: "Weather & safety alerts",
                      hint: "Important for natural spots.",
                      icon: "🌧️",
                    },
                  ] as { key: keyof NotifPrefs; label: string; hint: string; icon: string }[]
                ).map((n) => {
                  const on = notifPrefs[n.key];
                  return (
                    <label
                      key={n.key}
                      className="flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span>{n.icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {n.label}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {n.hint}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setNotifPrefs((prev) => ({ ...prev, [n.key]: !prev[n.key] }))
                        }
                        className={`relative w-10 h-5 rounded-full transition flex-shrink-0 ${on ? "bg-[#16a085]" : "bg-gray-300"
                          }`}
                        aria-pressed={on}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition ${on ? "translate-x-5" : ""
                            }`}
                        />
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Live confidence strip — teaches the user about the transparency features */}
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-4 text-xs text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">
                🧠 How crowd predictions work
              </p>
              <p className="leading-snug">
                Crowd levels combine historical trends, nearby hotel availability, and
                optional live check-ins. Each prediction shows a confidence score and{" "}
                <span className="font-medium">"last updated"</span> time so you can judge
                reliability.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Preferences modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
              Choose the categories you're interested in:
            </p>

            <div className="grid gap-2 grid-cols-1">
              {CATEGORIES.map((cat) => {
                const active = draft.includes(cat);
                return (
                  <button
                    key={cat}
                    disabled={saving}
                    onClick={() => toggleDraft(cat)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm capitalize ${active
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                      }`}
                  >
                    <span>
                      {CATEGORY_ICON[cat]} {cat}
                    </span>
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
                className={`px-4 py-2 rounded-md text-white ${saving ? "bg-gray-300" : "bg-[#16a085] hover:bg-[#13856d]"
                  }`}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language phrases modal */}
      {showLanguage && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLanguage(false)}
        >
          <div
            className="max-w-md w-full bg-white rounded-2xl shadow-xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-900">Local phrases</h4>
              <button
                onClick={() => setShowLanguage(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Handy Sinhala and Tamil phrases — useful when signage or menus aren't in
              English.
            </p>

            <div className="space-y-2">
              {LANGUAGE_PHRASES.map((p) => (
                <div
                  key={p.english}
                  className="p-3 rounded-lg border border-gray-100 bg-gray-50"
                >
                  <p className="text-sm font-semibold text-gray-900">{p.english}</p>
                  <p className="text-xs text-gray-700 mt-1">
                    <span className="font-medium">SI:</span> {p.sinhala}
                  </p>
                  <p className="text-xs text-gray-700">
                    <span className="font-medium">TA:</span> {p.tamil}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Privacy modal (dissertation §3.7) */}
      {showPrivacy && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPrivacy(false)}
        >
          <div
            className="max-w-md w-full bg-white rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-900">Privacy & location</h4>
              <button
                onClick={() => setShowPrivacy(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Location sharing is optional. Community check-ins are always anonymous. We
              only save coarse location — never a continuous trail.
            </p>

            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Share coarse location
                </div>
                <div className="text-[11px] text-gray-500">
                  Lets the app detect your district for "Near me" filtering.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareLocation((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition flex-shrink-0 ${shareLocation ? "bg-[#16a085]" : "bg-gray-300"
                  }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition ${shareLocation ? "translate-x-5" : ""
                    }`}
                />
              </button>
            </label>

            <div className="mt-4 text-[11px] text-gray-500 leading-snug">
              Turning this off disables "Near me", the detected city card, and
              district-aware recommendations. Your saved places and preferences are
              unaffected.
            </div>

            <button
              onClick={() => setShowPrivacy(false)}
              className="mt-5 w-full py-2 rounded-lg bg-[#16a085] text-white text-sm hover:bg-[#13856d]"
            >
              Done
            </button>
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