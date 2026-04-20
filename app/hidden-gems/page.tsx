"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/src/components/ProtectedRoute";

interface Gem {
    id: string;
    name: string;
    district: string;
    category: "natural" | "historical" | "religious" | "food" | "cultural";
    lat: number;
    lon: number;
    image: string;
    description: string;
    accessNote: string; // how to get there
    difficulty: "Easy" | "Moderate" | "Hard";
    busyLevel: "Quiet" | "Moderate" | "Busy" | "Very Busy";
    bestTime: string;
    respectNote?: string;
}

const GEMS: Gem[] = [
    {
        id: "pidurangala",
        name: "Pidurangala Rock",
        district: "Dambulla",
        category: "natural",
        lat: 7.9625,
        lon: 80.7614,
        image:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Pidurangala_Rock.jpg/1200px-Pidurangala_Rock.jpg",
        description:
            "A quieter climb just across from Sigiriya that delivers the best wide-angle view of the Lion Rock itself.",
        accessNote: "Tuk-tuk from Sigiriya village (~15 min). Last stretch is a boulder scramble.",
        difficulty: "Moderate",
        busyLevel: "Quiet",
        bestTime: "Sunrise (5:45–6:30 AM)",
        respectNote: "Active Buddhist temple at the base — cover shoulders & knees.",
    },
    {
        id: "sembuwatta",
        name: "Sembuwatta Lake",
        district: "Matale",
        category: "natural",
        lat: 7.2997,
        lon: 80.7719,
        image:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Sembuwatta_Lake%2C_Elkaduwa.jpg/1200px-Sembuwatta_Lake%2C_Elkaduwa.jpg",
        description:
            "An emerald man-made lake tucked above the Campbell's Lane tea estate in Elkaduwa.",
        accessNote: "Drive via Elkaduwa, small entry fee. Walking paths are well marked.",
        difficulty: "Easy",
        busyLevel: "Quiet",
        bestTime: "Weekday mornings",
    },
    {
        id: "hiriketiya",
        name: "Hiriketiya Bay",
        district: "Dikwella",
        category: "natural",
        lat: 5.967,
        lon: 80.6247,
        image:
            "https://images.unsplash.com/photo-1586053985830-55e71fa5c3bb?w=1200",
        description:
            "A horseshoe-shaped surf bay that still feels like a secret on weekday mornings.",
        accessNote: "Tuk-tuk from Dikwella town centre (~10 min). Parking is tight.",
        difficulty: "Easy",
        busyLevel: "Moderate",
        bestTime: "Before 9:00 AM",
    },
    {
        id: "belihuloya",
        name: "Belihuloya Forest Trails",
        district: "Ratnapura",
        category: "natural",
        lat: 6.7547,
        lon: 80.7747,
        image:
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200",
        description:
            "Cool riverine trails stitched between the wet zone and the hill country — ideal for a slow hike.",
        accessNote: "From A4 Belihuloya, several guided trailheads. Local guide recommended for longer loops.",
        difficulty: "Moderate",
        busyLevel: "Quiet",
        bestTime: "Dry season, early morning",
    },
    {
        id: "popham",
        name: "Popham's Arboretum",
        district: "Dambulla",
        category: "natural",
        lat: 7.855,
        lon: 80.653,
        image:
            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200",
        description:
            "Dry-zone forest arboretum with guided morning and evening walks for spotting wildlife.",
        accessNote: "A small visitor centre; guided walks leave at fixed times.",
        difficulty: "Easy",
        busyLevel: "Quiet",
        bestTime: "6:00 AM guided walk",
    },
    {
        id: "sahas-uyana",
        name: "Sahas Uyana",
        district: "Kandy",
        category: "natural",
        lat: 7.2906,
        lon: 80.635,
        image:
            "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
        description: "Calm gardens above Kandy with a lookout over the lake.",
        accessNote: "Short tuk-tuk ride above Kandy city centre.",
        difficulty: "Easy",
        busyLevel: "Quiet",
        bestTime: "Late afternoon",
    },
    {
        id: "ambuluwawa",
        name: "Ambuluwawa Tower",
        district: "Gampola",
        category: "historical",
        lat: 7.1664,
        lon: 80.56,
        image:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Ambuluwawa_Tower.jpg/1200px-Ambuluwawa_Tower.jpg",
        description:
            "A spiraling multi-religious temple tower with 360° hill-country views.",
        accessNote: "Steep drive up from Gampola. Final staircase is narrow — not for vertigo sufferers.",
        difficulty: "Hard",
        busyLevel: "Moderate",
        bestTime: "Weekday afternoons",
        respectNote: "A shared sacred site — maintain silence in the central shrine.",
    },
    {
        id: "lunuganga",
        name: "Lunuganga Estate",
        district: "Bentota",
        category: "cultural",
        lat: 6.4206,
        lon: 80.0281,
        image:
            "https://images.unsplash.com/photo-1505832018823-50331d70d237?w=1200",
        description:
            "Architect Geoffrey Bawa's country home — a masterclass in tropical landscape design.",
        accessNote: "Guided tours by appointment only. Book ahead via the estate.",
        difficulty: "Easy",
        busyLevel: "Quiet",
        bestTime: "Morning tour",
    },
];

const busyBadgeClass = (lvl?: string) => {
    const map: Record<string, string> = {
        Quiet: "bg-emerald-50 border-emerald-200 text-emerald-700",
        Moderate: "bg-sky-50 border-sky-200 text-sky-700",
        Busy: "bg-amber-50 border-amber-200 text-amber-700",
        "Very Busy": "bg-rose-50 border-rose-200 text-rose-700",
    };
    return map[lvl || ""] || "bg-gray-50 border-gray-200 text-gray-600";
};

const difficultyColor = (d: string) =>
    d === "Easy"
        ? "text-emerald-700"
        : d === "Moderate"
            ? "text-amber-700"
            : "text-rose-700";

type Filter = "all" | "natural" | "historical" | "religious" | "food" | "cultural";

export default function HiddenGemsPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<Filter>("all");
    const [active, setActive] = useState<Gem | null>(null);

    const filtered = useMemo(
        () => (filter === "all" ? GEMS : GEMS.filter((g) => g.category === filter)),
        [filter]
    );

    const filters: { key: Filter; label: string }[] = [
        { key: "all", label: "All" },
        { key: "natural", label: "🌿 Natural" },
        { key: "historical", label: "🏛️ Historical" },
        { key: "religious", label: "🛕 Religious" },
        { key: "food", label: "🍜 Food" },
        { key: "cultural", label: "🎭 Cultural" },
    ];

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 p-6 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={() => router.back()}
                        className="text-sm text-gray-600 hover:text-gray-900"
                    >
                        ← Back
                    </button>
                    <h1 className="text-base font-semibold text-violet-700">💎 Hidden Gems</h1>
                    <span className="w-10" />
                </div>

                {/* Hero intro */}
                <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md">
                    <p className="text-xs uppercase tracking-wider opacity-80">
                        Lesser-known places
                    </p>
                    <h2 className="text-lg font-bold mt-1">Quieter alternatives to crowded spots</h2>
                    <p className="text-xs mt-2 opacity-90">
                        Suggested when your first pick is busy — travel responsibly, keep noise low, and
                        support local communities.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar">
                    {filters.map((f) => {
                        const on = filter === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${on
                                        ? "bg-violet-600 border-violet-600 text-white"
                                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>

                {/* Grid of gems */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((g) => (
                        <div
                            key={g.id}
                            onClick={() => setActive(g)}
                            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
                        >
                            <div className="relative w-full h-44">
                                <Image
                                    src={g.image}
                                    alt={g.name}
                                    fill
                                    sizes="(min-width: 768px) 50vw, 100vw"
                                    className="object-cover"
                                />
                                <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white">
                                    Hidden Gem
                                </span>
                                <span
                                    className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full border ${busyBadgeClass(
                                        g.busyLevel
                                    )}`}
                                >
                                    {g.busyLevel}
                                </span>
                            </div>

                            <div className="p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 truncate">{g.name}</h3>
                                    <span className={`text-[11px] font-medium ${difficultyColor(g.difficulty)}`}>
                                        {g.difficulty}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">{g.district}</p>
                                <p className="text-xs text-gray-700 mt-2 line-clamp-2">{g.description}</p>
                                <p className="text-[11px] text-[#16a085] mt-2">🕗 Best: {g.bestTime}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <p className="text-gray-500 mt-10 text-center">
                        No hidden gems in this category yet. Check back soon.
                    </p>
                )}

                {/* Gem detail modal */}
                {active && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                        onClick={() => setActive(null)}
                    >
                        <div
                            className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative w-full h-56">
                                <Image
                                    src={active.image}
                                    alt={active.name}
                                    fill
                                    sizes="500px"
                                    className="object-cover"
                                />
                                <button
                                    onClick={() => setActive(null)}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700"
                                    aria-label="Close"
                                >
                                    ✕
                                </button>
                                <span className="absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white">
                                    Hidden Gem
                                </span>
                            </div>

                            <div className="p-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900">{active.name}</h3>
                                    <span
                                        className={`text-[11px] px-2 py-0.5 rounded-full border ${busyBadgeClass(
                                            active.busyLevel
                                        )}`}
                                    >
                                        {active.busyLevel}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {active.district} ·{" "}
                                    <span className={difficultyColor(active.difficulty)}>
                                        {active.difficulty}
                                    </span>
                                </p>

                                <p className="text-sm text-gray-700 mt-3">{active.description}</p>

                                <div className="mt-4 space-y-2 text-xs">
                                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                                        <p className="font-semibold text-gray-900 mb-0.5">🚗 How to get there</p>
                                        <p className="text-gray-700">{active.accessNote}</p>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                                        <p className="font-semibold text-emerald-900 mb-0.5">🕗 Best time</p>
                                        <p className="text-emerald-800">{active.bestTime}</p>
                                    </div>

                                    {active.respectNote && (
                                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                                            <p className="font-semibold text-amber-900 mb-0.5">🙏 Respect & safety</p>
                                            <p className="text-amber-800">{active.respectNote}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-5">
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${active.lat},${active.lon}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-2 text-center rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50"
                                    >
                                        📍 Open in Maps
                                    </a>
                                    <button
                                        onClick={() => setActive(null)}
                                        className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700"
                                    >
                                        Close
                                    </button>
                                </div>
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
        </ProtectedRoute>
    );
}