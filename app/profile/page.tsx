"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type Visit = {
  id: string;
  name: string;
  image?: string;
  visitedAt?: number; // ms
};

type PlaceCard = {
  id: string;
  name: string;
  image: string;
  category: Preference;
  city?: string;
  distanceKm?: number;
  desc?: string;
};

function abortableFetch(url: string, options: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

const FALLBACK_IMG = "/fallback.jpg";

const CURATED_SRI_LANKA: PlaceCard[] = [
  {
    id: "gl",
    name: "Galle Fort",
    image: "https://images.unsplash.com/photo-1558980664-10eaaff9e372?q=80&w=1200&auto=format&fit=crop",
    category: "historical sites",
    city: "Galle",
    desc: "UNESCO-listed Dutch fort with ramparts & sea views.",
  },
  {
    id: "sr",
    name: "Sigiriya Rock",
    image: "https://images.unsplash.com/photo-1602416584693-97c4a0d2972a?q=80&w=1200&auto=format&fit=crop",
    category: "natural spots",
    city: "Dambulla",
    desc: "Ancient rock fortress with jaw-dropping panoramas.",
  },
  {
    id: "kcc",
    name: "Kandy Cultural Show",
    image: "https://images.unsplash.com/photo-1532561191419-7b52f7c20d02?q=80&w=1200&auto=format&fit=crop",
    category: "cultural events",
    city: "Kandy",
    desc: "Traditional dance & drums near the Temple of the Tooth.",
  },
  {
    id: "gg",
    name: "Gangaramaya Temple",
    image: "https://images.unsplash.com/photo-1583417319070-4a0e2860f1ea?q=80&w=1200&auto=format&fit=crop",
    category: "religious sites",
    city: "Colombo",
    desc: "Modern + traditional Buddhist architecture by Beira Lake.",
  },
  {
    id: "jl",
    name: "Jaffna Local Eats",
    image: "https://images.unsplash.com/photo-1533779283484-280a5b9e2852?q=80&w=1200&auto=format&fit=crop",
    category: "local food spots",
    city: "Jaffna",
    desc: "Spicy crab curry & street snacks worth a detour.",
  },
];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [visited, setVisited] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | null; text?: string }>({ type: null });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Preference[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (e: any) {
          console.error("Anonymous sign-in failed:", e);
          setMsg({ type: "error", text: e?.message || "Enable Anonymous Auth in Firebase." });
        }
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, []);

  async function loadProfile(u: User) {
    setLoading(true);
    setMsg({ type: null });
    try {
      const url = u.email
        ? `/api/profile?email=${encodeURIComponent(u.email)}`
        : `/api/profile?uid=${encodeURIComponent(u.uid)}`;
      const r = await abortableFetch(url, { cache: "no-store" }, 8000);
      const j = await r.json();
      if (r.ok) {
        if (Array.isArray(j.preferences)) setPrefs(j.preferences);
        if (Array.isArray(j.visited)) setVisited(j.visited);
        setLastSync(Date.now());
      } else {
        throw new Error(j?.error || "Failed to load profile");
      }
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
  const toggleDraft = (cat: Preference) => {
    setDraft((d) => (d.includes(cat) ? d.filter((x) => x !== cat) : [...d, cat]));
  };

  const save = async () => {
    if (!user?.uid) {
      setMsg({ type: "error", text: "No user ID yet. Try again in a second." });
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
      console.error("Save API error:", e);
      setMsg({
        type: "error",
        text: e?.name === "AbortError" ? "Request timed out. Please try again." : e?.message || "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const emailLabel = user?.email ?? (user ? "Anonymous" : "—");
  const fmtDate = (ms?: number) =>
    !ms ? "" : new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  const forYou: PlaceCard[] = useMemo(() => {
    if (!prefs.length) return CURATED_SRI_LANKA.slice(0, 6);
    const scored = CURATED_SRI_LANKA.map((p) => ({
      place: p,
      score: prefs.includes(p.category) ? 2 : 1,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.place).slice(0, 6);
  }, [prefs]);

  const saved: PlaceCard[] = [];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Your Travel Hub</h1>
          <p className="mt-1 text-sm text-gray-600">
            Plan smarter — preferences & history in one place.
          </p>
        </div>
        <span
          title={emailLabel}
          className="inline-flex max-w-[50vw] items-center gap-2 truncate rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7l8 5 8-5" />
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
          <span className="truncate">{emailLabel}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
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
              {forYou.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="relative h-32 w-full overflow-hidden">
                    <img
                      src={p.image || FALLBACK_IMG}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="truncate text-sm font-semibold text-gray-900">{p.name}</div>
                      <span className="ml-2 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] capitalize text-gray-700">
                        {p.category}
                      </span>
                    </div>
                    {p.city && <div className="mt-1 text-xs text-gray-500">{p.city}</div>}
                    {p.desc && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{p.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Saved places</h3>
              <Link href="/my-places" className="text-sm text-[#16a085] hover:underline">
                View all
              </Link>
            </div>
            {saved.length ? (
              <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-1">
                {saved.map((s) => (
                  <div key={s.id} className="w-48 min-w-[12rem] flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="relative h-28 w-full overflow-hidden">
                      <img src={s.image || FALLBACK_IMG} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-3">
                      <div className="truncate text-sm font-semibold text-gray-900">{s.name}</div>
                      <div className="mt-1 text-[11px] text-gray-500 capitalize">{s.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">You haven’t saved any places yet.</p>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Visited places</h3>
            </div>
            {visited.length ? (
              <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-1">
                {visited.map((v) => (
                  <div key={v.id} className="w-48 min-w-[12rem] flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="relative h-28 w-full overflow-hidden">
                      <img
                        src={v.image || FALLBACK_IMG}
                        alt={v.name}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3">
                      <div className="truncate text-sm font-semibold text-gray-900">{v.name}</div>
                      {v.visitedAt && <div className="mt-1 text-[11px] text-gray-500">Visited: {fmtDate(v.visitedAt)}</div>}
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
              💡 <span className="font-medium">Pro tip:</span> Set your preferences first — home & search will adapt to
              what you love.
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your preferences</h3>
                <button onClick={openModal} className="text-sm font-medium text-[#16a085] hover:underline">
                  Edit
                </button>
              </div>

              {loading ? (
                <p className="mt-4 text-sm text-gray-500">Loading…</p>
              ) : prefs.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {prefs.map((p) => (
                    <span
                      key={p}
                      className="capitalize text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No preferences yet — tap Edit to personalize.</p>
              )}

              {msg.type === "error" && <p className="mt-3 text-sm text-rose-700">⚠️ {msg.text}</p>}
              {msg.type === "success" && <p className="mt-3 text-sm text-emerald-700">✅ {msg.text}</p>}
            </div>
          </div>
        </aside>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Update preferences</h4>
              <button
                aria-label="Close"
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <p className="mb-3 text-sm text-gray-600">Choose the categories you’re interested in:</p>

            <div className="grid grid-cols-1 gap-2">
              {CATEGORIES.map((cat) => {
                const active = draft.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleDraft(cat)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm capitalize ${
                      active
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                    }`}
                    disabled={saving}
                  >
                    <span>{cat}</span>
                    {active && <span>✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className={`rounded-md px-4 py-2 text-white ${
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
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
