"use client";

import { useEffect, useState } from "react";
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

function abortableFetch(url: string, options: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | null; text?: string }>({ type: null });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Preference[]>([]);
  const [saving, setSaving] = useState(false);

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

  async function loadPrefs(u: User) {
    setLoading(true);
    setMsg({ type: null });
    try {
      const url = u.email
        ? `/api/profile?email=${encodeURIComponent(u.email)}`
        : `/api/profile?uid=${encodeURIComponent(u.uid)}`;

      const r = await abortableFetch(url, { cache: "no-store" }, 8000);
      const j = await r.json();
      if (r.ok && Array.isArray(j.preferences)) {
        setPrefs(j.preferences);
      }
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to load preferences." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadPrefs(user);

    const onVis = () => {
      if (document.visibilityState === "visible" && user) loadPrefs(user);
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

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Profile</h2>

        <div className="flex justify-end">
          <span
            title={emailLabel}
            className="inline-flex max-w-[60vw] items-center gap-2 truncate rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16v16H4z" opacity="0.2" />
              <path d="M4 7l8 5 8-5" />
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
            <span className="truncate">{emailLabel}</span>
          </span>
        </div>
      </div>

      <p className="mb-6 text-sm text-gray-600">Saved places and preferences will appear here.</p>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your preferences</h3>
          <button
            onClick={openModal}
            className="text-sm font-medium text-[#16a085] hover:underline"
          >
            Add preferences
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
          <p className="mt-4 text-sm text-gray-500">No preferences yet.</p>
        )}

        {msg.type === "error" && (
          <p className="mt-3 text-sm text-rose-700">⚠️ {msg.text}</p>
        )}
        {msg.type === "success" && (
          <p className="mt-3 text-sm text-emerald-700">✅ {msg.text}</p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Add preferences</h4>
              <button
                aria-label="Close"
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <p className="mb-3 text-sm text-gray-600">
              Choose the categories you’re interested in:
            </p>

            <div className="grid grid-cols-1 gap-2">
              {CATEGORIES.map((cat) => {
                const active = draft.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setDraft((d) => (active ? d.filter((x) => x !== cat) : [...d, cat]))}
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
    </div>
  );
}
