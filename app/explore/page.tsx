"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  Circle,
  useLoadScript,
} from "@react-google-maps/api";

type BusyLevel = "Quiet" | "Moderate" | "Busy" | "Very Busy";
type Category = "historical" | "religious" | "natural" | "food" | "events" | "other";

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  busyLevel: BusyLevel;
  category?: Category;
  district?: string;
  confidence?: number;
  updatedAt?: string;
  description?: string;
  isHiddenGem?: boolean;
  /** Hourly busyness preview for the next few hours (dissertation Fig 9) */
  nextHours?: { hour: string; level: BusyLevel }[];
}

interface MapEvent {
  id: string;
  title: string;
  lat: number;
  lon: number;
  time: string;
  district: string;
  note: string;
}

interface WeatherAlert {
  id: string;
  area: string; // name
  lat: number;
  lon: number;
  radiusKm: number;
  title: string;
  message: string;
}

const containerStyle = { width: "100%", height: "100%" };

const COLORS: Record<
  BusyLevel,
  { hex: string; tw: string; bg: string; border: string; text: string }
> = {
  Quiet: {
    hex: "#16a34a",
    tw: "bg-green-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  Moderate: {
    hex: "#eab308",
    tw: "bg-yellow-400",
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
  },
  Busy: {
    hex: "#f97316",
    tw: "bg-orange-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  "Very Busy": {
    hex: "#dc2626",
    tw: "bg-red-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
  },
};

const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  historical: { label: "Historical", icon: "🏛️" },
  religious: { label: "Religious", icon: "🛕" },
  natural: { label: "Natural", icon: "🌿" },
  food: { label: "Food & Markets", icon: "🍜" },
  events: { label: "Events", icon: "🎭" },
  other: { label: "Other", icon: "📍" },
};

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

// -------------------------------------------------------------------
// DUMMY / SEED DATA — so the map is never empty and every district
// has something. Merged with /api/places and de-duped.
// -------------------------------------------------------------------
const makePreview = (seed: BusyLevel[]): { hour: string; level: BusyLevel }[] => {
  const now = new Date();
  return seed.map((level, i) => {
    const d = new Date(now.getTime() + i * 60 * 60 * 1000);
    return {
      hour: `${d.getHours().toString().padStart(2, "0")}:00`,
      level,
    };
  });
};

const SEED_PLACES: Place[] = [
  // ---- Colombo district ----
  {
    id: "seed-galle-face",
    name: "Galle Face Green",
    lat: 6.9231,
    lon: 79.8453,
    busyLevel: "Moderate",
    category: "natural",
    district: "Colombo",
    confidence: 82,
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    description: "Ocean-front promenade — breezy evenings, kite flyers, street food.",
    nextHours: makePreview(["Moderate", "Busy", "Busy", "Very Busy", "Busy", "Moderate"]),
  },
  {
    id: "seed-gangaramaya",
    name: "Gangaramaya Temple",
    lat: 6.9167,
    lon: 79.8566,
    busyLevel: "Busy",
    category: "religious",
    district: "Colombo",
    confidence: 85,
    updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    description: "Eclectic Buddhist temple & museum in central Colombo.",
    nextHours: makePreview(["Busy", "Busy", "Very Busy", "Very Busy", "Busy", "Moderate"]),
  },
  {
    id: "seed-lotus-tower",
    name: "Lotus Tower",
    lat: 6.9244,
    lon: 79.8608,
    busyLevel: "Moderate",
    category: "historical",
    district: "Colombo",
    confidence: 78,
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    description: "350m observation tower with sweeping city views.",
    nextHours: makePreview(["Moderate", "Moderate", "Busy", "Busy", "Busy", "Moderate"]),
  },
  {
    id: "seed-vihara-park",
    name: "Viharamahadevi Park",
    lat: 6.917,
    lon: 79.862,
    busyLevel: "Quiet",
    category: "natural",
    district: "Colombo",
    confidence: 74,
    updatedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    description: "Colombo's oldest public park — shaded lawns and old trees.",
    nextHours: makePreview(["Quiet", "Quiet", "Moderate", "Moderate", "Quiet", "Quiet"]),
  },
  {
    id: "seed-pettah",
    name: "Pettah Market",
    lat: 6.9391,
    lon: 79.8566,
    busyLevel: "Very Busy",
    category: "food",
    district: "Colombo",
    confidence: 91,
    updatedAt: new Date(Date.now() - 3 * 60000).toISOString(),
    description: "Busiest bazaar in the country — spices, textiles, produce.",
    nextHours: makePreview(["Very Busy", "Very Busy", "Very Busy", "Busy", "Busy", "Moderate"]),
  },
  {
    id: "seed-good-market",
    name: "Good Market Colombo",
    lat: 6.9097,
    lon: 79.8636,
    busyLevel: "Moderate",
    category: "food",
    district: "Colombo",
    confidence: 76,
    updatedAt: new Date(Date.now() - 26 * 60000).toISOString(),
    description: "Weekend farmers' market with artisan food makers.",
  },
  {
    id: "seed-diyatha",
    name: "Diyatha Uyana",
    lat: 6.9039,
    lon: 79.9208,
    busyLevel: "Quiet",
    category: "natural",
    district: "Colombo",
    confidence: 72,
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    description: "Waterside park beside Diyawanna lake — Battaramulla.",
  },
  {
    id: "seed-kelaniya",
    name: "Kelaniya Raja Maha Vihara",
    lat: 6.9553,
    lon: 79.9219,
    busyLevel: "Moderate",
    category: "religious",
    district: "Colombo",
    confidence: 75,
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    description: "Historic Buddhist temple with fine 20th-century murals.",
  },
  {
    id: "seed-dehiwala-zoo",
    name: "Dehiwala Zoo",
    lat: 6.854,
    lon: 79.8744,
    busyLevel: "Busy",
    category: "natural",
    district: "Colombo",
    confidence: 80,
    updatedAt: new Date(Date.now() - 11 * 60000).toISOString(),
    description: "One of Asia's oldest zoological gardens.",
  },
  {
    id: "seed-mount-lavinia",
    name: "Mount Lavinia Beach",
    lat: 6.8295,
    lon: 79.8638,
    busyLevel: "Moderate",
    category: "natural",
    district: "Colombo",
    confidence: 77,
    updatedAt: new Date(Date.now() - 19 * 60000).toISOString(),
    description: "Colombo's closest swimmable beach, sunset dining spot.",
    isHiddenGem: false,
  },
  {
    id: "seed-independence",
    name: "Independence Square",
    lat: 6.9066,
    lon: 79.8688,
    busyLevel: "Quiet",
    category: "historical",
    district: "Colombo",
    confidence: 70,
    updatedAt: new Date(Date.now() - 33 * 60000).toISOString(),
    description: "Arcaded monument and jogging track.",
  },
  {
    id: "seed-navam",
    name: "Navam Perahera",
    lat: 6.9167,
    lon: 79.8566,
    busyLevel: "Very Busy",
    category: "events",
    district: "Colombo",
    confidence: 92,
    updatedAt: new Date(Date.now() - 7 * 60000).toISOString(),
    description: "Gangaramaya's February procession — heavy street crowds.",
  },

  // ---- Kandy district ----
  {
    id: "seed-dalada",
    name: "Sri Dalada Maligawa",
    lat: 7.2936,
    lon: 80.6413,
    busyLevel: "Very Busy",
    category: "religious",
    district: "Kandy",
    confidence: 93,
    updatedAt: new Date(Date.now() - 2 * 60000).toISOString(),
    description: "Temple of the Sacred Tooth Relic — pooja times are busiest.",
    nextHours: makePreview(["Very Busy", "Busy", "Moderate", "Busy", "Very Busy", "Busy"]),
  },
  {
    id: "seed-peradeniya",
    name: "Royal Botanical Gardens",
    lat: 7.2699,
    lon: 80.5938,
    busyLevel: "Moderate",
    category: "natural",
    district: "Kandy",
    confidence: 81,
    updatedAt: new Date(Date.now() - 14 * 60000).toISOString(),
    description: "Historic gardens in Peradeniya.",
  },
  {
    id: "seed-kandy-lake",
    name: "Kandy Lake Walk",
    lat: 7.2906,
    lon: 80.6337,
    busyLevel: "Quiet",
    category: "natural",
    district: "Kandy",
    confidence: 73,
    updatedAt: new Date(Date.now() - 22 * 60000).toISOString(),
  },
  {
    id: "seed-sahas-uyana",
    name: "Sahas Uyana",
    lat: 7.2906,
    lon: 80.635,
    busyLevel: "Quiet",
    category: "natural",
    district: "Kandy",
    confidence: 70,
    updatedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    isHiddenGem: true,
  },
  {
    id: "seed-esala",
    name: "Kandy Esala Perahera",
    lat: 7.2936,
    lon: 80.6413,
    busyLevel: "Very Busy",
    category: "events",
    district: "Kandy",
    confidence: 95,
    updatedAt: new Date(Date.now() - 4 * 60000).toISOString(),
    description: "Ten-day procession in July/August.",
  },

  // ---- Dambulla district ----
  {
    id: "seed-sigiriya",
    name: "Sigiriya Rock",
    lat: 7.957,
    lon: 80.7603,
    busyLevel: "Busy",
    category: "historical",
    district: "Dambulla",
    confidence: 88,
    updatedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    description: "Ancient rock fortress with frescoes and water gardens.",
    nextHours: makePreview(["Busy", "Very Busy", "Very Busy", "Busy", "Moderate", "Quiet"]),
  },
  {
    id: "seed-pidurangala",
    name: "Pidurangala Rock",
    lat: 7.9625,
    lon: 80.7614,
    busyLevel: "Quiet",
    category: "natural",
    district: "Dambulla",
    confidence: 70,
    updatedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    description: "Quieter neighbour of Sigiriya with the best view of the rock.",
    isHiddenGem: true,
  },
  {
    id: "seed-cave-temple",
    name: "Dambulla Cave Temple",
    lat: 7.8567,
    lon: 80.6492,
    busyLevel: "Moderate",
    category: "religious",
    district: "Dambulla",
    confidence: 80,
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: "seed-popham",
    name: "Popham's Arboretum",
    lat: 7.855,
    lon: 80.653,
    busyLevel: "Quiet",
    category: "natural",
    district: "Dambulla",
    confidence: 67,
    updatedAt: new Date(Date.now() - 75 * 60000).toISOString(),
    isHiddenGem: true,
  },

  // ---- Nuwara Eliya district ----
  {
    id: "seed-horton",
    name: "Horton Plains",
    lat: 6.8096,
    lon: 80.8,
    busyLevel: "Quiet",
    category: "natural",
    district: "Nuwara Eliya",
    confidence: 77,
    updatedAt: new Date(Date.now() - 35 * 60000).toISOString(),
    description: "Cloud-forest plateau with World's End cliff.",
  },
  {
    id: "seed-devon",
    name: "Devon Falls",
    lat: 6.9575,
    lon: 80.6,
    busyLevel: "Quiet",
    category: "natural",
    district: "Nuwara Eliya",
    confidence: 68,
    updatedAt: new Date(Date.now() - 55 * 60000).toISOString(),
  },
  {
    id: "seed-adams",
    name: "Adam's Peak",
    lat: 6.8096,
    lon: 80.4997,
    busyLevel: "Moderate",
    category: "religious",
    district: "Nuwara Eliya",
    confidence: 72,
    updatedAt: new Date(Date.now() - 40 * 60000).toISOString(),
  },
  {
    id: "seed-gregory",
    name: "Gregory Lake",
    lat: 6.9553,
    lon: 80.7772,
    busyLevel: "Moderate",
    category: "natural",
    district: "Nuwara Eliya",
    confidence: 74,
    updatedAt: new Date(Date.now() - 28 * 60000).toISOString(),
  },

  // ---- Galle / Matara / South ----
  {
    id: "seed-galle-fort",
    name: "Galle Fort",
    lat: 6.0257,
    lon: 80.217,
    busyLevel: "Moderate",
    category: "historical",
    district: "Galle",
    confidence: 82,
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    description: "UNESCO-listed Dutch fort with ramparts & sea views.",
  },
  {
    id: "seed-mirissa",
    name: "Mirissa Beach",
    lat: 5.9483,
    lon: 80.4589,
    busyLevel: "Moderate",
    category: "natural",
    district: "Matara",
    confidence: 81,
    updatedAt: new Date(Date.now() - 22 * 60000).toISOString(),
  },
  {
    id: "seed-hiriketiya",
    name: "Hiriketiya Bay",
    lat: 5.967,
    lon: 80.6247,
    busyLevel: "Moderate",
    category: "natural",
    district: "Matara",
    confidence: 74,
    updatedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    isHiddenGem: true,
  },
  {
    id: "seed-hikkaduwa",
    name: "Hikkaduwa Beach",
    lat: 6.1395,
    lon: 80.1061,
    busyLevel: "Busy",
    category: "natural",
    district: "Galle",
    confidence: 83,
    updatedAt: new Date(Date.now() - 13 * 60000).toISOString(),
  },
  {
    id: "seed-unawatuna",
    name: "Unawatuna Beach",
    lat: 6.0108,
    lon: 80.2492,
    busyLevel: "Moderate",
    category: "natural",
    district: "Galle",
    confidence: 79,
    updatedAt: new Date(Date.now() - 21 * 60000).toISOString(),
  },

  // ---- Ella / Badulla ----
  {
    id: "seed-nine-arch",
    name: "Nine Arch Bridge",
    lat: 6.8764,
    lon: 81.0586,
    busyLevel: "Busy",
    category: "natural",
    district: "Ella",
    confidence: 84,
    updatedAt: new Date(Date.now() - 17 * 60000).toISOString(),
  },
  {
    id: "seed-little-adams",
    name: "Little Adam's Peak",
    lat: 6.8697,
    lon: 81.0647,
    busyLevel: "Moderate",
    category: "natural",
    district: "Ella",
    confidence: 77,
    updatedAt: new Date(Date.now() - 24 * 60000).toISOString(),
  },

  // ---- Anuradhapura / Polonnaruwa ----
  {
    id: "seed-anuradhapura",
    name: "Anuradhapura Sacred City",
    lat: 8.3114,
    lon: 80.4037,
    busyLevel: "Moderate",
    category: "historical",
    district: "Anuradhapura",
    confidence: 79,
    updatedAt: new Date(Date.now() - 48 * 60000).toISOString(),
  },
  {
    id: "seed-polonnaruwa",
    name: "Polonnaruwa Ancient City",
    lat: 7.9403,
    lon: 81.0188,
    busyLevel: "Quiet",
    category: "historical",
    district: "Polonnaruwa",
    confidence: 74,
    updatedAt: new Date(Date.now() - 62 * 60000).toISOString(),
  },
  {
    id: "seed-ritigala",
    name: "Ritigala Ruins",
    lat: 8.1167,
    lon: 80.6667,
    busyLevel: "Quiet",
    category: "historical",
    district: "Anuradhapura",
    confidence: 65,
    updatedAt: new Date(Date.now() - 90 * 60000).toISOString(),
    isHiddenGem: true,
    description: "Forest-draped monastic ruins.",
  },

  // ---- Matale / Kegalle ----
  {
    id: "seed-sembuwatta",
    name: "Sembuwatta Lake",
    lat: 7.2997,
    lon: 80.7719,
    busyLevel: "Quiet",
    category: "natural",
    district: "Matale",
    confidence: 66,
    updatedAt: new Date(Date.now() - 120 * 60000).toISOString(),
    isHiddenGem: true,
  },
  {
    id: "seed-pinnawala",
    name: "Pinnawala Elephant Orphanage",
    lat: 7.2964,
    lon: 80.3883,
    busyLevel: "Busy",
    category: "natural",
    district: "Kegalle",
    confidence: 83,
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
  },
];

// Festivals / events overlay markers
const EVENTS: MapEvent[] = [
  {
    id: "ev-navam",
    title: "Navam Perahera",
    lat: 6.9167,
    lon: 79.8566,
    time: "Today · 6:30 PM",
    district: "Colombo",
    note: "Procession route around Gangaramaya — heavy crowds on Hunupitiya & Beira Lake.",
  },
  {
    id: "ev-galle-lit",
    title: "Galle Literary Festival",
    lat: 6.0257,
    lon: 80.217,
    time: "Fri–Sun",
    district: "Galle",
    note: "Fort venues hit peak after 4 PM. Book early sessions for calmer rooms.",
  },
];

// Weather / safety alerts overlay (circles on the map)
const WEATHER_ALERTS: WeatherAlert[] = [
  {
    id: "wx-hikkaduwa",
    area: "Hikkaduwa",
    lat: 6.1395,
    lon: 80.1061,
    radiusKm: 20,
    title: "Rain in 45 min",
    message: "Trails & reef tours may be slippery. Plan a covered alternative.",
  },
  {
    id: "wx-horton",
    area: "Horton Plains",
    lat: 6.8096,
    lon: 80.8,
    radiusKm: 15,
    title: "Low visibility",
    message: "Mist rolling in after 10 AM — start climbs before 8 AM.",
  },
];

// -------------------------------------------------------------------
// District centres for "Near me" → map to nearest district and filter
// -------------------------------------------------------------------
const DISTRICT_CENTRES: { name: string; lat: number; lon: number }[] = [
  { name: "Colombo", lat: 6.9271, lon: 79.8612 },
  { name: "Gampaha", lat: 7.0873, lon: 79.999 },
  { name: "Kalutara", lat: 6.5854, lon: 79.9607 },
  { name: "Kandy", lat: 7.2906, lon: 80.6337 },
  { name: "Matale", lat: 7.4675, lon: 80.6234 },
  { name: "Nuwara Eliya", lat: 6.9497, lon: 80.7891 },
  { name: "Galle", lat: 6.0535, lon: 80.221 },
  { name: "Matara", lat: 5.9485, lon: 80.5353 },
  { name: "Hambantota", lat: 6.1246, lon: 81.1185 },
  { name: "Dambulla", lat: 7.8567, lon: 80.6492 },
  { name: "Anuradhapura", lat: 8.3114, lon: 80.4037 },
  { name: "Polonnaruwa", lat: 7.9403, lon: 81.0188 },
  { name: "Ella", lat: 6.8764, lon: 81.0586 },
  { name: "Badulla", lat: 6.9895, lon: 81.055 },
  { name: "Kegalle", lat: 7.2513, lon: 80.3464 },
  { name: "Ratnapura", lat: 6.6828, lon: 80.3992 },
  { name: "Trincomalee", lat: 8.5874, lon: 81.2152 },
  { name: "Jaffna", lat: 9.6615, lon: 80.0255 },
];

// -------------------------------------------------------------------
function formatUpdated(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
    if (diff < 60) return `${diff} min ago`;
    const h = Math.round(diff / 60);
    if (h < 24) return `${h} hr ago`;
    return `${Math.round(h / 24)} d ago`;
  } catch {
    return "";
  }
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function nearestDistrict(loc: { lat: number; lon: number }) {
  let best = DISTRICT_CENTRES[0];
  let bestDist = Infinity;
  for (const d of DISTRICT_CENTRES) {
    const km = haversineKm(loc, d);
    if (km < bestDist) {
      best = d;
      bestDist = km;
    }
  }
  return { ...best, km: bestDist };
}

function dedupePlaces(arr: Place[]): Place[] {
  const map = new Map<string, Place>();
  for (const p of arr) {
    const key = `${p.name.toLowerCase()}-${p.lat.toFixed(3)}-${p.lon.toFixed(3)}`;
    if (!map.has(key)) map.set(key, p);
  }
  return Array.from(map.values());
}

export default function ExplorePage() {
  const router = useRouter();

  const [livePlaces, setLivePlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Filters
  const [busyFilters, setBusyFilters] = useState<Set<BusyLevel>>(
    new Set<BusyLevel>(["Quiet", "Moderate", "Busy", "Very Busy"])
  );
  const [catFilter, setCatFilter] = useState<Category | "all">("all");
  const [searchText, setSearchText] = useState("");
  const [showPanel, setShowPanel] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showWeather, setShowWeather] = useState(true);

  // Near-me state: when enabled we snap to the detected district and
  // only show places in that district.
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [nearDistrict, setNearDistrict] = useState<string | null>(null);

  // Community check-in toast
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInLevel, setCheckInLevel] = useState<BusyLevel | "">("");
  const [checkInToast, setCheckInToast] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: ["places"],
  });

  // Fetch API data, then merge with seed
  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/places", { cache: "no-store" });
      const data: Place[] = res.ok ? await res.json() : [];
      const ok = Array.isArray(data) ? data.filter((p) => p && p.lat && p.lon) : [];
      setLivePlaces(ok);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("❌ Error fetching places:", err);
      setLivePlaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    fetchPlaces();
    const t = setInterval(fetchPlaces, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // All places = live + seed, de-duped (seed fills gaps, live wins)
  const allPlaces = useMemo(
    () => dedupePlaces([...livePlaces, ...SEED_PLACES]),
    [livePlaces]
  );

  // ---------- Filtering ----------
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return allPlaces.filter((p) => {
      if (!busyFilters.has(p.busyLevel)) return false;
      if (catFilter !== "all" && (p.category || "other") !== catFilter) return false;
      if (q && !(`${p.name} ${p.district || ""}`.toLowerCase().includes(q))) return false;
      if (nearDistrict) {
        // Only places in the detected district (string match)
        if ((p.district || "").toLowerCase() !== nearDistrict.toLowerCase()) return false;
      }
      return true;
    });
  }, [allPlaces, busyFilters, catFilter, searchText, nearDistrict]);

  // Quieter alternatives (same category, Quiet/Moderate, nearest 3)
  const quieterAlts = useMemo(() => {
    if (!selected || (selected.busyLevel !== "Busy" && selected.busyLevel !== "Very Busy"))
      return [];
    return allPlaces
      .filter(
        (p) =>
          p.id !== selected.id &&
          (p.category || "other") === (selected.category || "other") &&
          (p.busyLevel === "Quiet" || p.busyLevel === "Moderate")
      )
      .map((p) => ({ p, km: haversineKm(p, selected) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 3);
  }, [selected, allPlaces]);

  // Counts per busy level, respecting category filter AND district filter
  const busyCounts = useMemo(() => {
    const c: Record<BusyLevel, number> = {
      Quiet: 0,
      Moderate: 0,
      Busy: 0,
      "Very Busy": 0,
    };
    allPlaces.forEach((p) => {
      if (catFilter !== "all" && (p.category || "other") !== catFilter) return;
      if (
        nearDistrict &&
        (p.district || "").toLowerCase() !== nearDistrict.toLowerCase()
      )
        return;
      c[p.busyLevel] = (c[p.busyLevel] || 0) + 1;
    });
    return c;
  }, [allPlaces, catFilter, nearDistrict]);

  // Events within district filter if active
  const filteredEvents = useMemo(() => {
    if (!nearDistrict) return EVENTS;
    return EVENTS.filter(
      (e) => e.district.toLowerCase() === nearDistrict.toLowerCase()
    );
  }, [nearDistrict]);

  // ---------- Handlers ----------
  const toggleBusy = (lvl: BusyLevel) => {
    setBusyFilters((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const u = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLoc(u);
        const d = nearestDistrict(u);
        setNearDistrict(d.name);
        mapRef.current?.panTo({ lat: d.lat, lng: d.lon });
        mapRef.current?.setZoom(11);
      },
      (err) => {
        console.warn("Geolocation denied:", err.message);
        // Fallback: default to Colombo so the button still does something
        const fallback = DISTRICT_CENTRES[0];
        setNearDistrict(fallback.name);
        mapRef.current?.panTo({ lat: fallback.lat, lng: fallback.lon });
        mapRef.current?.setZoom(11);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const clearNearMe = () => {
    setNearDistrict(null);
    setUserLoc(null);
    mapRef.current?.setZoom(8);
    mapRef.current?.panTo({ lat: 7.8731, lng: 80.7718 });
  };

  const flyTo = (p: Place) => {
    mapRef.current?.panTo({ lat: p.lat, lng: p.lon });
    mapRef.current?.setZoom(13);
    setSelected(p);
  };

  const clearFilters = () => {
    setBusyFilters(new Set<BusyLevel>(["Quiet", "Moderate", "Busy", "Very Busy"]));
    setCatFilter("all");
    setSearchText("");
    setNearDistrict(null);
    setUserLoc(null);
  };

  // Optional community check-in (dissertation §3.7 — live feedback)
  const submitCheckIn = async () => {
    if (!selected || !checkInLevel) return;
    try {
      await fetch("/api/crowd/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: selected.id,
          name: selected.name,
          lat: selected.lat,
          lon: selected.lon,
          level: checkInLevel,
          at: new Date().toISOString(),
        }),
      });
    } catch {
      // silent — fallback to local update
    }
    // Optimistic update so the map reflects the vote immediately
    setLivePlaces((prev) => {
      const idx = prev.findIndex((p) => p.id === selected.id);
      const updated: Place = {
        ...selected,
        busyLevel: checkInLevel as BusyLevel,
        updatedAt: new Date().toISOString(),
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
    setSelected((prev) =>
      prev ? { ...prev, busyLevel: checkInLevel as BusyLevel, updatedAt: new Date().toISOString() } : prev
    );
    setCheckInToast(`Thanks — marked ${selected.name} as ${checkInLevel}`);
    setTimeout(() => setCheckInToast(null), 2500);
    setCheckInOpen(false);
    setCheckInLevel("");
  };

  if (loadError)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        ❌ Map failed to load
      </div>
    );
  if (!isLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="animate-pulse">Loading map…</div>
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>

        <div className="text-center">
          <h1 className="text-lg font-bold text-[#222222]">Live Availability</h1>
          {lastRefresh && (
            <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Updated {formatUpdated(lastRefresh.toISOString())}
            </p>
          )}
        </div>

        <button
          onClick={fetchPlaces}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
          title="Refresh"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {/* District-scope banner when Near me is on */}
      {nearDistrict && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 min-w-0">
            <span>📍</span>
            <p className="text-xs text-emerald-900 truncate">
              Showing places in <span className="font-semibold">{nearDistrict}</span>{" "}
              district
            </p>
          </div>
          <button
            onClick={clearNearMe}
            className="text-[11px] text-emerald-700 underline hover:text-emerald-900 whitespace-nowrap"
          >
            Show all
          </button>
        </div>
      )}

      {/* Search + "Near me" */}
      <div className="px-4 mt-3 flex gap-2">
        <div className="relative flex-1">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search places or districts…"
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a085] text-gray-700"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            🔍
          </span>
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={nearDistrict ? clearNearMe : useMyLocation}
          className={`text-xs px-3 rounded-lg border whitespace-nowrap transition ${nearDistrict
              ? "bg-[#16a085] border-[#16a085] text-white"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
        >
          📍 Near me
        </button>
      </div>

      {/* Category filter */}
      <div className="px-4 mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
        {(
          [
            { key: "all", label: "✨ All", icon: "" },
            ...Object.entries(CATEGORY_META).map(([k, v]) => ({
              key: k as Category,
              label: v.label,
              icon: v.icon,
            })),
          ] as { key: Category | "all"; label: string; icon: string }[]
        ).map((c) => {
          const on = catFilter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCatFilter(c.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${on
                  ? "bg-[#16a085] border-[#16a085] text-white"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
            >
              {c.icon && <span className="mr-1">{c.icon}</span>}
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Busy toggles with counts */}
      <div className="px-4 mt-2 flex gap-2 overflow-x-auto hide-scrollbar">
        {(["Quiet", "Moderate", "Busy", "Very Busy"] as BusyLevel[]).map((lvl) => {
          const on = busyFilters.has(lvl);
          return (
            <button
              key={lvl}
              onClick={() => toggleBusy(lvl)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${on
                  ? `${COLORS[lvl].bg} ${COLORS[lvl].border} ${COLORS[lvl].text}`
                  : "bg-white border-gray-200 text-gray-400 line-through"
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${COLORS[lvl].tw}`} />
              {lvl}
              <span className="opacity-70">({busyCounts[lvl] || 0})</span>
            </button>
          );
        })}

        {(busyFilters.size < 4 ||
          catFilter !== "all" ||
          searchText ||
          nearDistrict) && (
            <button
              onClick={clearFilters}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            >
              Clear ×
            </button>
          )}
      </div>

      {/* Overlay toggles */}
      <div className="px-4 mt-2 flex gap-2 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setShowEvents((v) => !v)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] border transition ${showEvents
              ? "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700"
              : "bg-white border-gray-200 text-gray-400 line-through"
            }`}
        >
          🎉 Event/festival pins
        </button>
        <button
          onClick={() => setShowWeather((v) => !v)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] border transition ${showWeather
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-white border-gray-200 text-gray-400 line-through"
            }`}
        >
          🌧️ Weather alerts
        </button>
      </div>

      {/* Map */}
      <div
        className="mx-4 mt-3 rounded-2xl overflow-hidden shadow-md relative"
        style={{ height: "55vh" }}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={{ lat: 7.8731, lng: 80.7718 }}
          zoom={8}
          onLoad={(m) => {
            mapRef.current = m;
          }}
          options={{
            styles: MAP_STYLE,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            clickableIcons: false,
          }}
        >
          {/* User location dot */}
          {userLoc && (
            <Marker
              position={{ lat: userLoc.lat, lng: userLoc.lon }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#2563eb",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 3,
              }}
              title="You are here"
            />
          )}

          {/* Weather alert circles */}
          {showWeather &&
            WEATHER_ALERTS.filter(
              (w) =>
                !nearDistrict ||
                // show weather if inside a reasonable radius of the picked district centre
                (() => {
                  const c = DISTRICT_CENTRES.find(
                    (d) => d.name.toLowerCase() === nearDistrict.toLowerCase()
                  );
                  return c ? haversineKm(w, c) <= 60 : true;
                })()
            ).map((w) => (
              <Circle
                key={w.id}
                center={{ lat: w.lat, lng: w.lon }}
                radius={w.radiusKm * 1000}
                options={{
                  fillColor: "#f59e0b",
                  fillOpacity: 0.1,
                  strokeColor: "#f59e0b",
                  strokeOpacity: 0.45,
                  strokeWeight: 1.5,
                  clickable: false,
                }}
              />
            ))}

          {/* Event markers */}
          {showEvents &&
            filteredEvents.map((e) => (
              <Marker
                key={e.id}
                position={{ lat: e.lat, lng: e.lon }}
                label={{
                  text: "🎉",
                  fontSize: "16px",
                }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 13,
                  fillColor: "#c026d3",
                  fillOpacity: 0.95,
                  strokeColor: "#fff",
                  strokeWeight: 2,
                }}
                onClick={() =>
                  alert(`${e.title}\n${e.time} · ${e.district}\n\n${e.note}`)
                }
                title={`${e.title} — ${e.time}`}
              />
            ))}

          {/* Crowd pins */}
          {filtered.map((place) => (
            <Marker
              key={place.id}
              position={{ lat: place.lat, lng: place.lon }}
              title={`${place.name}: ${place.busyLevel}`}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: place.id === selected?.id ? 12 : 9,
                fillColor: COLORS[place.busyLevel].hex,
                fillOpacity: 0.95,
                strokeColor: "#fff",
                strokeWeight: 2,
              }}
              onClick={() => setSelected(place)}
            />
          ))}

          {/* Rich info window */}
          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lon }}
              onCloseClick={() => setSelected(null)}
              options={{ pixelOffset: new google.maps.Size(0, -10) }}
            >
              <div className="text-sm min-w-[240px] max-w-[280px]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-[#16a085] truncate">{selected.name}</h3>
                  {selected.isHiddenGem && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-600 text-white">
                      Gem
                    </span>
                  )}
                </div>

                {selected.district && (
                  <p className="text-[11px] text-gray-500 mb-1.5">
                    {CATEGORY_META[selected.category || "other"].icon}{" "}
                    {CATEGORY_META[selected.category || "other"].label} ·{" "}
                    {selected.district}
                  </p>
                )}

                <div
                  className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${COLORS[selected.busyLevel].bg} ${COLORS[selected.busyLevel].border} ${COLORS[selected.busyLevel].text}`}
                >
                  {selected.busyLevel}
                </div>

                {(selected.confidence || selected.updatedAt) && (
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    {selected.confidence ? `${selected.confidence}% confidence` : ""}
                    {selected.confidence && selected.updatedAt ? " · " : ""}
                    {selected.updatedAt
                      ? `updated ${formatUpdated(selected.updatedAt)}`
                      : ""}
                  </p>
                )}

                {selected.description && (
                  <p className="text-xs text-gray-700 mt-2 line-clamp-2">
                    {selected.description}
                  </p>
                )}

                {/* Best time windows (next 6 hours) */}
                {selected.nextHours && selected.nextHours.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-700 mb-1">
                      Next 6 hours
                    </p>
                    <div className="flex gap-1">
                      {selected.nextHours.slice(0, 6).map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center"
                          title={`${h.hour} — ${h.level}`}
                        >
                          <span
                            className={`block w-full h-1.5 rounded ${COLORS[h.level].tw}`}
                          />
                          <span className="text-[9px] text-gray-500 mt-0.5">
                            {h.hour.slice(0, 2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quieter alternatives */}
                {quieterAlts.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-700 mb-1">
                      Quieter nearby:
                    </p>
                    <ul className="space-y-1">
                      {quieterAlts.map(({ p, km }) => (
                        <li key={p.id}>
                          <button
                            onClick={() => flyTo(p)}
                            className="text-[11px] text-left w-full hover:underline"
                          >
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${COLORS[p.busyLevel].tw}`}
                            />
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-500">
                              {" "}
                              · {km.toFixed(1)} km
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() =>
                      router.push(
                        `/place/${selected.id}?name=${encodeURIComponent(
                          selected.name
                        )}&lat=${selected.lat}&lon=${selected.lon}&busy=${encodeURIComponent(
                          selected.busyLevel
                        )}`
                      )
                    }
                    className="flex-1 text-[11px] py-1 rounded bg-[#16a085] text-white hover:bg-[#13856d]"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setCheckInOpen(true)}
                    className="flex-1 text-[11px] py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    ✋ Check-in
                  </button>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1.5 text-[11px] text-center py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  🧭 Directions
                </a>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* Floating controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={() => setShowPanel((v) => !v)}
            className="bg-white border border-gray-200 rounded-lg shadow px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            title="Toggle list panel"
          >
            {showPanel ? "Hide list" : "Show list"}
          </button>
        </div>

        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur border border-gray-100 rounded-full shadow px-3 py-1 text-xs text-gray-700">
          {filtered.length} of {allPlaces.length} places
        </div>

        {/* Check-in toast */}
        {checkInToast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#16a085] text-white text-xs px-3 py-1.5 rounded-full shadow">
            {checkInToast}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-gray-900">Crowd Level Legend</h2>
          <span className="text-[10px] text-gray-400">Refreshes every minute</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-700">
          {(["Quiet", "Moderate", "Busy", "Very Busy"] as BusyLevel[]).map((lvl) => (
            <div key={lvl} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${COLORS[lvl].tw}`} />
              <span>{lvl}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-fuchsia-600" />
            <span>Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-amber-500 bg-amber-500/20" />
            <span>Weather alert</span>
          </div>
        </div>
      </div>

      {/* List panel */}
      {showPanel && (
        <div className="mt-4 mx-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Places ({filtered.length})
            {nearDistrict && (
              <span className="font-normal text-gray-500"> · {nearDistrict}</span>
            )}
          </h2>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-500">
              No places match these filters.
              <br />
              <button
                onClick={clearFilters}
                className="mt-2 text-[#16a085] hover:underline text-xs"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => {
                const on = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => flyTo(p)}
                    className={`w-full bg-white rounded-xl border shadow-sm p-3 flex items-center justify-between gap-3 text-left transition ${on
                        ? "border-[#16a085] ring-2 ring-[#16a085]/20"
                        : "border-gray-100 hover:border-gray-200"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLORS[p.busyLevel].tw}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {p.name}
                          </p>
                          {p.isHiddenGem && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-600 text-white">
                              Gem
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {p.category && CATEGORY_META[p.category].icon}{" "}
                          {p.district || "Sri Lanka"}
                          {userLoc && (
                            <>
                              {" · "}
                              {haversineKm(p, userLoc).toFixed(1)} km
                            </>
                          )}
                          {p.confidence ? ` · ${p.confidence}%` : ""}
                          {p.updatedAt ? ` · ${formatUpdated(p.updatedAt)}` : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${COLORS[p.busyLevel].bg} ${COLORS[p.busyLevel].border} ${COLORS[p.busyLevel].text}`}
                    >
                      {p.busyLevel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Check-in modal */}
      {checkInOpen && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCheckInOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                How busy is it now?
              </h3>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setCheckInOpen(false)}
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              Share a quick, anonymous update for{" "}
              <span className="font-medium">{selected.name}</span>. Your feedback helps
              everyone plan better.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {(["Quiet", "Moderate", "Busy", "Very Busy"] as BusyLevel[]).map((lvl) => {
                const active = checkInLevel === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setCheckInLevel(lvl)}
                    className={`px-3 py-2 rounded-lg border text-sm ${COLORS[lvl].bg} ${COLORS[lvl].border} ${COLORS[lvl].text} ${active ? "ring-2 ring-[#16a085]" : ""
                      }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setCheckInOpen(false);
                  setCheckInLevel("");
                }}
                className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!checkInLevel}
                onClick={submitCheckIn}
                className={`px-4 py-2 rounded-md text-white text-sm ${checkInLevel
                    ? "bg-[#16a085] hover:bg-[#13856d]"
                    : "bg-gray-300 cursor-not-allowed"
                  }`}
              >
                Submit
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