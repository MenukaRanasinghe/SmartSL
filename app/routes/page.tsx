"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/src/components/ProtectedRoute";

interface RouteStop {
    name: string;
    busyLevel: "Quiet" | "Moderate" | "Busy" | "Very Busy";
    arrival: string; // e.g. "9:00 AM"
    stayMin: number;
    note?: string;
}

interface CrowdRoute {
    id: string;
    title: string;
    district: string;
    theme: string;
    totalDuration: string;
    totalDistanceKm: number;
    image: string;
    summary: string;
    bestStart: string; // e.g. "Start by 8:30 AM"
    stops: RouteStop[];
    tips: string[];
}

const ROUTES: CrowdRoute[] = [
    {
        id: "colombo-calm-morning",
        title: "Calm Colombo Morning",
        district: "Colombo",
        theme: "Historical · Religious · Food",
        totalDuration: "≈ 5 hrs",
        totalDistanceKm: 9.2,
        image:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Lotus_Tower_at_dawn.jpg/1200px-Lotus_Tower_at_dawn.jpg",
        summary:
            "A quiet-first loop that hits Colombo's highlights before the crowds build. Start early and finish with a peaceful late lunch.",
        bestStart: "Start by 8:30 AM",
        stops: [
            {
                name: "Galle Face Green",
                busyLevel: "Quiet",
                arrival: "8:30 AM",
                stayMin: 40,
                note: "Morning sea breeze, almost empty — great for photos.",
            },
            {
                name: "Gangaramaya Temple",
                busyLevel: "Moderate",
                arrival: "9:30 AM",
                stayMin: 45,
                note: "Avoid mid-day pooja rush. Dress modestly.",
            },
            {
                name: "Viharamahadevi Park",
                busyLevel: "Quiet",
                arrival: "10:45 AM",
                stayMin: 30,
                note: "Shaded walk between stops.",
            },
            {
                name: "Good Market Colombo",
                busyLevel: "Moderate",
                arrival: "11:30 AM",
                stayMin: 60,
                note: "Weekend-only — skip on weekdays.",
            },
            {
                name: "Lotus Tower (observation deck)",
                busyLevel: "Moderate",
                arrival: "1:00 PM",
                stayMin: 45,
            },
        ],
        tips: [
            "Avoid Gangaramaya between 5:30 PM and 7:30 PM (evening pooja is Very Busy).",
            "Pettah Market is Very Busy on Saturday mornings — detour via Barnes Pl. Rd.",
            "Lotus Tower has shorter queues before 2 PM on weekdays.",
        ],
    },
    {
        id: "cultural-triangle-quiet",
        title: "Cultural Triangle — Quiet Loop",
        district: "Dambulla · Sigiriya",
        theme: "Historical · Natural",
        totalDuration: "≈ 7 hrs",
        totalDistanceKm: 24.5,
        image:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Sigiriya-Lion-Rock.jpg/1200px-Sigiriya-Lion-Rock.jpg",
        summary:
            "Climb Pidurangala for the best view of Sigiriya — and keep clear of the Sigiriya ticket rush.",
        bestStart: "Start by 6:00 AM",
        stops: [
            {
                name: "Pidurangala Rock",
                busyLevel: "Quiet",
                arrival: "6:00 AM",
                stayMin: 120,
                note: "Sunrise climb. Take water and grippy shoes.",
            },
            {
                name: "Popham's Arboretum",
                busyLevel: "Quiet",
                arrival: "9:00 AM",
                stayMin: 60,
                note: "Guided dry-zone forest walk.",
            },
            {
                name: "Dambulla Cave Temple",
                busyLevel: "Moderate",
                arrival: "10:30 AM",
                stayMin: 75,
                note: "Arrive before tour buses at 11:30.",
            },
            {
                name: "Sigiriya Rock",
                busyLevel: "Busy",
                arrival: "2:00 PM",
                stayMin: 150,
                note: "Afternoon light on the frescoes; cooler climb.",
            },
        ],
        tips: [
            "Skip the Sigiriya climb before 10 AM — peak entry queues.",
            "Carry cash for cave temple donations.",
            "Pidurangala after 9 AM is exposed and Hot — go early.",
        ],
    },
    {
        id: "south-coast-beach",
        title: "South Coast Beach Hop",
        district: "Galle · Matara",
        theme: "Natural · Food · Historical",
        totalDuration: "≈ 6 hrs",
        totalDistanceKm: 41.0,
        image:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Galle_Fort_aerial.jpg/1200px-Galle_Fort_aerial.jpg",
        summary:
            "Fort ramparts, hidden bay, and a seafood lunch — timed to avoid the weekend Galle Fort crowds.",
        bestStart: "Start by 7:30 AM",
        stops: [
            {
                name: "Galle Fort ramparts",
                busyLevel: "Quiet",
                arrival: "7:30 AM",
                stayMin: 90,
                note: "Lighthouse and ramparts are empty at sunrise.",
            },
            {
                name: "Galle Fort Food Lane",
                busyLevel: "Moderate",
                arrival: "9:15 AM",
                stayMin: 60,
                note: "Brunch at a Dutch-era café.",
            },
            {
                name: "Hiriketiya Bay",
                busyLevel: "Moderate",
                arrival: "11:30 AM",
                stayMin: 120,
                note: "Surf-friendly horseshoe bay.",
            },
            {
                name: "Mirissa Beach",
                busyLevel: "Busy",
                arrival: "2:30 PM",
                stayMin: 90,
                note: "Whale-watching returns; skip if avoiding crowds.",
            },
        ],
        tips: [
            "Galle Fort is Very Busy after 10 AM on weekends — finish ramparts early.",
            "Weather alerts: monsoon wind along Mirissa can be strong in the afternoon.",
            "Hiriketiya has limited parking — go via tuk-tuk from Dikwella town.",
        ],
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

export default function RoutesPage() {
    const router = useRouter();
    const [activeId, setActiveId] = useState<string>(ROUTES[0].id);

    const active = useMemo(
        () => ROUTES.find((r) => r.id === activeId) || ROUTES[0],
        [activeId]
    );

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
                    <h1 className="text-base font-semibold text-[#16a085]">Crowd-aware Routes</h1>
                    <span className="w-10" />
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Routes timed around predicted crowd patterns so you can visit more and queue less.
                </p>

                {/* Route selector tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
                    {ROUTES.map((r) => {
                        const on = r.id === activeId;
                        return (
                            <button
                                key={r.id}
                                onClick={() => setActiveId(r.id)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${on
                                        ? "bg-[#16a085] border-[#16a085] text-white"
                                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                {r.title}
                            </button>
                        );
                    })}
                </div>

                {/* Active route card */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mb-5">
                    <div className="relative w-full h-48">
                        <Image
                            src={active.image}
                            alt={active.title}
                            fill
                            sizes="100vw"
                            className="object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                            <h2 className="text-white text-lg font-bold">{active.title}</h2>
                            <p className="text-white/80 text-xs">
                                {active.district} · {active.theme}
                            </p>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="flex flex-wrap gap-2 mb-3 text-xs">
                            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                ⏱ {active.totalDuration}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                📍 {active.totalDistanceKm} km
                            </span>
                            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                🕗 {active.bestStart}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700">{active.summary}</p>
                    </div>
                </div>

                {/* Stops timeline */}
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Stops</h3>

                <div className="relative pl-5 mb-6">
                    <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-200" />

                    {active.stops.map((s, i) => (
                        <div key={`${active.id}-${i}`} className="relative mb-4">
                            <div className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-[#16a085] border-2 border-white shadow" />

                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {i + 1}. {s.name}
                                    </p>
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${busyBadgeClass(
                                            s.busyLevel
                                        )}`}
                                    >
                                        {s.busyLevel}
                                    </span>
                                </div>

                                <div className="mt-1 text-[11px] text-gray-600 flex items-center gap-3">
                                    <span>🕒 {s.arrival}</span>
                                    <span>⏳ {s.stayMin} min</span>
                                </div>

                                {s.note && (
                                    <p className="text-xs text-gray-600 mt-1.5 italic">{s.note}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tips */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        💡 Crowd-aware tips
                    </h3>
                    <ul className="space-y-1.5">
                        {active.tips.map((t, i) => (
                            <li key={i} className="text-xs text-gray-700 flex gap-2">
                                <span className="text-[#16a085]">•</span>
                                <span>{t}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* CTA */}
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push("/explore")}
                        className="flex-1 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50"
                    >
                        🗺️ See live map
                    </button>
                    <button
                        onClick={() => router.push("/home")}
                        className="flex-1 py-2.5 rounded-lg bg-[#16a085] text-white text-sm hover:bg-[#13856d]"
                    >
                        Back to Discover
                    </button>
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
        </ProtectedRoute>
    );
}