"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/src/firebase/config";
import { User, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import ProtectedRoute from "@/src/components/ProtectedRoute";

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  image?: string;
  description?: string;
  busyLevel?: string;
  category?: string;
  confidence?: number;
  lastUpdated?: string;
  isHiddenGem?: boolean;
  district?: string;
}

type Busy = "Quiet" | "Moderate" | "Busy" | "Very Busy" | "";

type CategoryKey =
  | "all"
  | "historical"
  | "religious"
  | "natural"
  | "food"
  | "events"
  | "hidden";

interface AppNotification {
  id: string;
  type: "quiet" | "peak" | "event" | "weather" | "safety";
  title: string;
  message: string;
  time: string;
}

// ------------------------------------------------------------------
// Sri Lankan districts
// ------------------------------------------------------------------
const SRI_LANKA_DISTRICTS: { name: string; lat: number; lon: number }[] = [
  { name: "Colombo", lat: 6.9271, lon: 79.8612 },
  { name: "Gampaha", lat: 7.0917, lon: 80.0 },
  { name: "Kalutara", lat: 6.5854, lon: 79.9607 },
  { name: "Kandy", lat: 7.2906, lon: 80.6337 },
  { name: "Matale", lat: 7.4675, lon: 80.6234 },
  { name: "Nuwara Eliya", lat: 6.9497, lon: 80.7891 },
  { name: "Galle", lat: 6.0535, lon: 80.221 },
  { name: "Matara", lat: 5.9549, lon: 80.555 },
  { name: "Hambantota", lat: 6.1241, lon: 81.1185 },
  { name: "Jaffna", lat: 9.6615, lon: 80.0255 },
  { name: "Kilinochchi", lat: 9.3961, lon: 80.3982 },
  { name: "Mannar", lat: 8.9774, lon: 79.9044 },
  { name: "Vavuniya", lat: 8.7514, lon: 80.4971 },
  { name: "Mullaitivu", lat: 9.2671, lon: 80.8142 },
  { name: "Batticaloa", lat: 7.7102, lon: 81.6924 },
  { name: "Ampara", lat: 7.2976, lon: 81.6747 },
  { name: "Trincomalee", lat: 8.5874, lon: 81.2152 },
  { name: "Kurunegala", lat: 7.4863, lon: 80.3647 },
  { name: "Puttalam", lat: 8.0362, lon: 79.8283 },
  { name: "Anuradhapura", lat: 8.3114, lon: 80.4037 },
  { name: "Polonnaruwa", lat: 7.9403, lon: 81.0188 },
  { name: "Badulla", lat: 6.9934, lon: 81.055 },
  { name: "Monaragala", lat: 6.8728, lon: 81.351 },
  { name: "Ratnapura", lat: 6.6828, lon: 80.4036 },
  { name: "Kegalle", lat: 7.2513, lon: 80.3464 },
  { name: "Dambulla", lat: 7.857, lon: 80.651 },
];

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function findNearestDistrict(lat: number, lon: number): string {
  let best = SRI_LANKA_DISTRICTS[0];
  let bestD = Infinity;
  for (const d of SRI_LANKA_DISTRICTS) {
    const dist = distanceKm(lat, lon, d.lat, d.lon);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best.name;
}

// ------------------------------------------------------------------
// SEED PLACES
// ------------------------------------------------------------------
const SEED_PLACES: Place[] = [
  { id: "seed-galle-fort", name: "Galle Fort", lat: 6.0257, lon: 80.217, category: "historical", district: "Galle", description: "UNESCO-listed Dutch fort with ramparts & sea views.", busyLevel: "Moderate", confidence: 82, lastUpdated: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: "seed-sigiriya", name: "Sigiriya Rock", lat: 7.957, lon: 80.7603, category: "historical", district: "Dambulla", description: "Ancient rock fortress with dropping panoramas.", busyLevel: "Busy", confidence: 88, lastUpdated: new Date(Date.now() - 22 * 60000).toISOString() },
  { id: "seed-polonnaruwa", name: "Polonnaruwa Ancient City", lat: 7.9403, lon: 81.0188, category: "historical", district: "Polonnaruwa", description: "Ruins of Sri Lanka's medieval capital.", busyLevel: "Quiet", confidence: 74, lastUpdated: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: "seed-anuradhapura", name: "Anuradhapura Sacred City", lat: 8.3114, lon: 80.4037, category: "historical", district: "Anuradhapura", description: "Ancient stupas and sacred monuments.", busyLevel: "Moderate", confidence: 79, lastUpdated: new Date(Date.now() - 48 * 60000).toISOString() },
  { id: "seed-jaffna-fort", name: "Jaffna Fort", lat: 9.661, lon: 80.0, category: "historical", district: "Jaffna", description: "Dutch-era seaside fort overlooking the lagoon.", busyLevel: "Quiet", confidence: 71, lastUpdated: new Date(Date.now() - 70 * 60000).toISOString() },

  { id: "seed-dalada-maligawa", name: "Sri Dalada Maligawa", lat: 7.2936, lon: 80.6413, category: "religious", district: "Kandy", description: "Temple of the Sacred Tooth Relic.", busyLevel: "Very Busy", confidence: 91, lastUpdated: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: "seed-gangaramaya", name: "Gangaramaya Temple", lat: 6.9167, lon: 79.8566, category: "religious", district: "Colombo", description: "Colombo's eclectic Buddhist temple & museum.", busyLevel: "Busy", confidence: 85, lastUpdated: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: "seed-cave-temple", name: "Dambulla Cave Temple", lat: 7.8567, lon: 80.6492, category: "religious", district: "Dambulla", description: "Rock cave temples with Buddha statues & murals.", busyLevel: "Moderate", confidence: 80, lastUpdated: new Date(Date.now() - 27 * 60000).toISOString() },
  { id: "seed-kelaniya", name: "Kelaniya Raja Maha Vihara", lat: 6.9553, lon: 79.9219, category: "religious", district: "Colombo", description: "Historic Buddhist temple with fine murals.", busyLevel: "Quiet", confidence: 72, lastUpdated: new Date(Date.now() - 55 * 60000).toISOString() },
  { id: "seed-nallur", name: "Nallur Kandaswamy Kovil", lat: 9.6755, lon: 80.0284, category: "religious", district: "Jaffna", description: "Historic Hindu temple in Jaffna.", busyLevel: "Moderate", confidence: 82, lastUpdated: new Date(Date.now() - 18 * 60000).toISOString() },

  { id: "seed-ella-nine-arch", name: "Nine Arch Bridge", lat: 6.8764, lon: 81.0586, category: "natural", district: "Badulla", description: "Iconic colonial railway bridge in the hills.", busyLevel: "Busy", confidence: 84, lastUpdated: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: "seed-horton-plains", name: "Horton Plains", lat: 6.8096, lon: 80.8, category: "natural", district: "Nuwara Eliya", description: "Highland plateau with World's End cliff.", busyLevel: "Quiet", confidence: 77, lastUpdated: new Date(Date.now() - 42 * 60000).toISOString() },
  { id: "seed-mirissa", name: "Mirissa Beach", lat: 5.9483, lon: 80.4589, category: "natural", district: "Matara", description: "Crescent beach famed for whale watching.", busyLevel: "Moderate", confidence: 81, lastUpdated: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: "seed-devon-falls", name: "Devon Falls", lat: 6.9575, lon: 80.6, category: "natural", district: "Nuwara Eliya", description: "97m waterfall surrounded by tea country.", busyLevel: "Quiet", confidence: 70, lastUpdated: new Date(Date.now() - 65 * 60000).toISOString() },
  { id: "seed-galle-face", name: "Galle Face Green", lat: 6.9271, lon: 79.8441, category: "natural", district: "Colombo", description: "Oceanfront promenade and gathering spot.", busyLevel: "Moderate", confidence: 83, lastUpdated: new Date(Date.now() - 10 * 60000).toISOString() },
  { id: "seed-viharamahadevi", name: "Viharamahadevi Park", lat: 6.9159, lon: 79.8614, category: "natural", district: "Colombo", description: "Colombo's largest public park.", busyLevel: "Moderate", confidence: 76, lastUpdated: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "seed-diyatha-uyana", name: "Diyatha Uyana", lat: 6.9021, lon: 79.9495, category: "natural", district: "Colombo", description: "Lakeside park with musical fountains.", busyLevel: "Moderate", confidence: 78, lastUpdated: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: "seed-unawatuna", name: "Unawatuna Beach", lat: 6.0174, lon: 80.2489, category: "natural", district: "Galle", description: "Palm-lined bay with calm swimming water.", busyLevel: "Busy", confidence: 86, lastUpdated: new Date(Date.now() - 11 * 60000).toISOString() },
  { id: "seed-jungle-beach", name: "Jungle Beach", lat: 6.0066, lon: 80.2336, category: "natural", district: "Galle", description: "Secluded cove near Rumassala.", busyLevel: "Quiet", confidence: 73, lastUpdated: new Date(Date.now() - 55 * 60000).toISOString() },

  { id: "seed-pettah-market", name: "Pettah Market", lat: 6.9391, lon: 79.8566, category: "food", district: "Colombo", description: "Bustling bazaar of spices, produce and street food.", busyLevel: "Very Busy", confidence: 89, lastUpdated: new Date(Date.now() - 6 * 60000).toISOString() },
  { id: "seed-good-market", name: "Good Market Colombo", lat: 6.9097, lon: 79.8636, category: "food", district: "Colombo", description: "Weekend farmers' market with Sri Lankan artisan foods.", busyLevel: "Moderate", confidence: 76, lastUpdated: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: "seed-galle-fort-food", name: "Galle Fort Food Lane", lat: 6.0268, lon: 80.2171, category: "food", district: "Galle", description: "Seafood cafés and Dutch-era eateries.", busyLevel: "Busy", confidence: 83, lastUpdated: new Date(Date.now() - 14 * 60000).toISOString() },
  { id: "seed-nuwara-eliya-market", name: "Nuwara Eliya Central Market", lat: 6.9497, lon: 80.7891, category: "food", district: "Nuwara Eliya", description: "Tea, cheese, and hill-country produce.", busyLevel: "Quiet", confidence: 71, lastUpdated: new Date(Date.now() - 50 * 60000).toISOString() },
  { id: "seed-kandy-market", name: "Kandy Central Market", lat: 7.2906, lon: 80.6337, category: "food", district: "Kandy", description: "Historic market with spices and textiles.", busyLevel: "Busy", confidence: 78, lastUpdated: new Date(Date.now() - 20 * 60000).toISOString() },

  { id: "seed-navam-perahera", name: "Navam Perahera", lat: 6.9167, lon: 79.8566, category: "events", district: "Colombo", description: "Annual February procession of Gangaramaya Temple.", busyLevel: "Very Busy", confidence: 92, lastUpdated: new Date(Date.now() - 9 * 60000).toISOString() },
  { id: "seed-kandy-esala", name: "Kandy Esala Perahera", lat: 7.2936, lon: 80.6413, category: "events", district: "Kandy", description: "Ten-day cultural procession (July/August).", busyLevel: "Very Busy", confidence: 95, lastUpdated: new Date(Date.now() - 4 * 60000).toISOString() },
  { id: "seed-galle-literary", name: "Galle Literary Festival", lat: 6.0257, lon: 80.217, category: "events", district: "Galle", description: "January festival within the historic fort.", busyLevel: "Busy", confidence: 78, lastUpdated: new Date(Date.now() - 33 * 60000).toISOString() },
  { id: "seed-kandy-cultural-show", name: "Kandy Cultural Show", lat: 7.2906, lon: 80.6337, category: "events", district: "Kandy", description: "Nightly dance & drumming performances.", busyLevel: "Moderate", confidence: 75, lastUpdated: new Date(Date.now() - 28 * 60000).toISOString() },

  { id: "seed-pidurangala", name: "Pidurangala Rock", lat: 7.9625, lon: 80.7614, category: "natural", district: "Dambulla", description: "Quieter climb across from Sigiriya with the best view of the rock.", busyLevel: "Quiet", confidence: 73, lastUpdated: new Date(Date.now() - 40 * 60000).toISOString(), isHiddenGem: true },
  { id: "seed-sembuwatta", name: "Sembuwatta Lake", lat: 7.2997, lon: 80.7719, category: "natural", district: "Matale", description: "Emerald man-made lake tucked in the hills.", busyLevel: "Quiet", confidence: 68, lastUpdated: new Date(Date.now() - 90 * 60000).toISOString(), isHiddenGem: true },
  { id: "seed-hiriketiya", name: "Hiriketiya Bay", lat: 5.967, lon: 80.6247, category: "natural", district: "Matara", description: "Horseshoe-shaped surf bay, still low-key.", busyLevel: "Moderate", confidence: 74, lastUpdated: new Date(Date.now() - 21 * 60000).toISOString(), isHiddenGem: true },
  { id: "seed-belihuloya", name: "Belihuloya Forest", lat: 6.7547, lon: 80.7747, category: "natural", district: "Ratnapura", description: "Cool riverine trails between the hills and lowlands.", busyLevel: "Quiet", confidence: 66, lastUpdated: new Date(Date.now() - 120 * 60000).toISOString(), isHiddenGem: true },
  { id: "seed-popham", name: "Popham's Arboretum", lat: 7.855, lon: 80.653, category: "natural", district: "Dambulla", description: "Dry-zone forest arboretum for wildlife walks.", busyLevel: "Quiet", confidence: 67, lastUpdated: new Date(Date.now() - 75 * 60000).toISOString(), isHiddenGem: true },
  { id: "seed-sahas-uyana", name: "Sahas Uyana", lat: 7.2906, lon: 80.635, category: "natural", district: "Kandy", description: "Calm gardens above Kandy with a lookout.", busyLevel: "Quiet", confidence: 70, lastUpdated: new Date(Date.now() - 60 * 60000).toISOString(), isHiddenGem: true },
  { id: "seed-beira-lake", name: "Beira Lake", lat: 6.9245, lon: 79.8536, category: "natural", district: "Colombo", description: "Quiet lake walk in central Colombo.", busyLevel: "Quiet", confidence: 65, lastUpdated: new Date(Date.now() - 80 * 60000).toISOString(), isHiddenGem: true },
  { id: "seed-independence-arcade", name: "Arcade Independence Square", lat: 6.9033, lon: 79.8666, category: "food", district: "Colombo", description: "Restored colonial shopping & dining arcade.", busyLevel: "Moderate", confidence: 72, lastUpdated: new Date(Date.now() - 45 * 60000).toISOString(), isHiddenGem: true },
  { id: "seed-rumassala", name: "Rumassala Hill", lat: 6.0106, lon: 80.2253, category: "natural", district: "Galle", description: "Mythical herbal hill with ocean views.", busyLevel: "Quiet", confidence: 69, lastUpdated: new Date(Date.now() - 100 * 60000).toISOString(), isHiddenGem: true },
  { id: "seed-martin-bungalow", name: "Martin's Bungalow Viewpoint", lat: 6.8108, lon: 80.8, category: "natural", district: "Nuwara Eliya", description: "Quiet viewpoint near Horton Plains.", busyLevel: "Quiet", confidence: 64, lastUpdated: new Date(Date.now() - 110 * 60000).toISOString(), isHiddenGem: true },
];

const LANGUAGE_PHRASES: { english: string; sinhala: string; tamil: string }[] = [
  { english: "Hello", sinhala: "Āyubōwan (ආයුබෝවන්)", tamil: "Vaṇakkam (வணக்கம்)" },
  { english: "Thank you", sinhala: "Bohoma sthūthi (බොහොම ස්තූතියි)", tamil: "Naṉṟi (நன்றி)" },
  { english: "How much?", sinhala: "Kīyada? (කීයද?)", tamil: "Evvaḷavu? (எவ்வளவு?)" },
  { english: "Where is...?", sinhala: "...koheda? (...කොහෙද?)", tamil: "...eṅkē? (...எங்கே?)" },
  { english: "Excuse me", sinhala: "Samāvenna (සමාවෙන්න)", tamil: "Mannikkavum (மன்னிக்கவும்)" },
  { english: "Yes / No", sinhala: "Ov / Nǣ (ඔව් / නෑ)", tamil: "Ām / Illai (ஆම் / இல்லை)" },
];

type Festival = {
  name: string;
  district: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  note: string;
};

const FESTIVALS: Festival[] = [
  { name: "Galle Literary Festival", district: "Galle", startMonth: 1, startDay: 20, endMonth: 1, endDay: 25, note: "Literary festival inside the historic fort — expect busy cafés." },
  { name: "Navam Perahera", district: "Colombo", startMonth: 2, startDay: 20, endMonth: 2, endDay: 25, note: "Procession begins ~6:30 PM near Gangaramaya — heavy crowds." },
  { name: "Sinhala & Tamil New Year", district: "All", startMonth: 4, startDay: 13, endMonth: 4, endDay: 15, note: "National new year — shops close, roads quieter then very busy." },
  { name: "Vesak Festival", district: "All", startMonth: 5, startDay: 10, endMonth: 5, endDay: 15, note: "Lantern displays across temples — evenings very busy." },
  { name: "Poson Poya", district: "Anuradhapura", startMonth: 6, startDay: 1, endMonth: 6, endDay: 15, note: "Mihintale & Anuradhapura draw large pilgrim crowds." },
  { name: "Kandy Esala Perahera", district: "Kandy", startMonth: 7, startDay: 25, endMonth: 8, endDay: 15, note: "Ten-day cultural procession — Kandy centre very congested." },
  { name: "Nallur Festival", district: "Jaffna", startMonth: 8, startDay: 15, endMonth: 9, endDay: 10, note: "25-day temple festival — expect heavy crowds near Nallur Kovil." },
  { name: "Deepavali", district: "All", startMonth: 10, startDay: 20, endMonth: 11, endDay: 5, note: "Hindu festival of lights — temples and markets busy." },
  { name: "Unduvap Poya", district: "Anuradhapura", startMonth: 12, startDay: 1, endMonth: 12, endDay: 15, note: "Commemorates arrival of Sri Maha Bodhi sapling." },
];

function inFestivalWindow(f: Festival, d: Date): boolean {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const start = f.startMonth * 100 + f.startDay;
  const end = f.endMonth * 100 + f.endDay;
  const now = m * 100 + day;
  if (start <= end) return now >= start && now <= end;
  return now >= start || now <= end;
}

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  const [location, setLocation] = useState("Colombo District");
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<string[]>([]);

  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguageHelp, setShowLanguageHelp] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [detectedDistrict, setDetectedDistrict] = useState<string | null>(null);

  // Search mode overrides district filter
  const [searchMode, setSearchMode] = useState<null | {
    query: string;
    district: string;
    lat: number;
    lon: number;
  }>(null);

  const inferCategory = (p: Place): string => {
    if (p.category) return p.category;
    const n = (p.name || "").toLowerCase();
    if (/(temple|kovil|church|mosque|vihara|dagoba|stupa|maligawa)/.test(n)) return "religious";
    if (/(fort|museum|heritage|ruin|palace|monument|archae|ancient|polonnaruwa|anuradhapura)/.test(n)) return "historical";
    if (/(beach|waterfall|falls|park|forest|mountain|cliff|lake|bay|lagoon|rock|peak|plains)/.test(n)) return "natural";
    if (/(market|restaurant|cafe|food|bazaar|street|lane)/.test(n)) return "food";
    if (/(festival|parade|event|show|perahera)/.test(n)) return "events";
    return "other";
  };

  function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function fillMissingMeta(p: Place): Place {
    if (p.confidence != null && p.lastUpdated && p.busyLevel) return p;
    const seed = hashString(p.id + p.name);
    const confidence = p.confidence ?? 60 + (seed % 35);
    const minutesAgo = 5 + (seed % 90);
    const lastUpdated = p.lastUpdated ?? new Date(Date.now() - minutesAgo * 60000).toISOString();
    const busyOptions: Busy[] = ["Quiet", "Moderate", "Busy", "Very Busy"];
    const busyLevel = p.busyLevel || busyOptions[seed % busyOptions.length];
    return { ...p, confidence, lastUpdated, busyLevel };
  }

  const [detectedCity, setDetectedCity] = useState<{
    name: string;
    lat: number;
    lon: number;
    image: string;
    desc?: string;
    busyLevel?: Busy;
  } | null>(null);

  const [detectingCity, setDetectingCity] = useState<boolean>(false);
  const [showDetectedModal, setShowDetectedModal] = useState(false);
  const [detectedBusy, setDetectedBusy] = useState<Busy>("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  const dedupe = (arr: Place[]) => {
    const map = new Map();
    arr.forEach((p) => {
      const key = `${p.id}-${p.lat}-${p.lon}`;
      if (!map.has(key)) map.set(key, p);
    });
    return Array.from(map.values());
  };

  const allPlaces = useMemo(() => {
    const merged = dedupe([...places, ...SEED_PLACES]);
    return merged.map(fillMissingMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  // FILTER: search takes priority over detected district
  const placesInDistrict = useMemo(() => {
    if (searchMode) {
      const byDistrict = allPlaces.filter(
        (p) => (p.district || "").toLowerCase() === searchMode.district.toLowerCase()
      );
      if (byDistrict.length > 0) return byDistrict;

      const nearby = allPlaces.filter(
        (p) => distanceKm(p.lat, p.lon, searchMode.lat, searchMode.lon) <= 50
      );
      return nearby.length > 0 ? nearby : allPlaces;
    }

    if (!detectedDistrict) return allPlaces;
    const inDistrict = allPlaces.filter(
      (p) => (p.district || "").toLowerCase() === detectedDistrict.toLowerCase()
    );
    return inDistrict.length > 0 ? inDistrict : allPlaces;
  }, [allPlaces, detectedDistrict, searchMode]);

  const filteredPlaces = useMemo(() => {
    if (activeCategory === "all") return placesInDistrict;
    if (activeCategory === "hidden") return placesInDistrict.filter((p) => p.isHiddenGem);
    return placesInDistrict.filter((p) => inferCategory(p) === activeCategory);
  }, [placesInDistrict, activeCategory]);

  const hiddenGems = useMemo(
    () => placesInDistrict.filter((p) => p.isHiddenGem).slice(0, 10),
    [placesInDistrict]
  );

  const fetchPlaceImageByName = async (queries: string[] | string): Promise<string> => {
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
          const wikiURL = new URL("https://en.wikipedia.org/w/api.php");
          wikiURL.searchParams.set("action", "query");
          wikiURL.searchParams.set("format", "json");
          wikiURL.searchParams.set("origin", "*");
          wikiURL.searchParams.set("prop", "pageimages");
          wikiURL.searchParams.set("generator", "search");
          wikiURL.searchParams.set("gsrsearch", q);
          wikiURL.searchParams.set("gsrlimit", "1");
          wikiURL.searchParams.set("piprop", "thumbnail");
          wikiURL.searchParams.set("pithumbsize", "1000");

          const wr = await fetch(wikiURL.toString(), { cache: "no-store" });
          const wj = await wr.json();
          const pages = wj?.query?.pages ? Object.values(wj.query.pages as any[]) : [];
          let wikiThumb: string | undefined = pages?.[0]?.thumbnail?.source;
          if (wikiThumb) wikiThumb = wikiThumb.replace(/^\/\//, "https://");

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
            const url = j?.results?.[0]?.urls?.regular;

            if (url) {
              if (typeof window !== "undefined") localStorage.setItem(cacheKey, url);
              return url;
            }
          } catch { }
        }
      }

      if (typeof window !== "undefined") localStorage.setItem(cacheKey, "/fallback.jpg");
      return "/fallback.jpg";
    } catch {
      return "/fallback.jpg";
    }
  };

  // AUTH + load profile (preferences + last reported busy level cached)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
        try {
          const res = await fetch(`/api/profile?uid=${u.uid}`);
          const data = await res.json();
          setPreferences(data?.preferences || []);

          if (data?.lastLocation?.busyLevel && typeof window !== "undefined") {
            (window as any).__lastLocation = data.lastLocation;
          }
        } catch { }
      }
    });
    return () => unsub();
  }, []);

  // Restore previously-submitted busy level when detectedCity loads
  useEffect(() => {
    if (!detectedCity || detectedCity.busyLevel) return;
    const last = typeof window !== "undefined" ? (window as any).__lastLocation : null;
    if (!last || !last.busyLevel) return;

    const sameSpot =
      Math.abs(last.lat - detectedCity.lat) < 0.005 &&
      Math.abs(last.lon - detectedCity.lon) < 0.005;
    const sameName = (last.name || "").toLowerCase() === detectedCity.name.toLowerCase();
    const recent = last.timestamp && Date.now() - last.timestamp < 6 * 60 * 60 * 1000;

    if ((sameSpot || sameName) && recent) {
      setDetectedCity((prev) => (prev ? { ...prev, busyLevel: last.busyLevel } : prev));
    }
  }, [detectedCity]);

  // Hydrate seed images
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const imgs = await Promise.all(
        SEED_PLACES.map(async (p) =>
          p.image ? p.image : await fetchPlaceImageByName([p.name, p.district || "Sri Lanka"])
        )
      );
      if (!cancelled) {
        SEED_PLACES.forEach((p, i) => {
          if (!p.image) p.image = imgs[i];
        });
        setPlaces((prev) => [...prev]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time weather + events — uses searched location if search active
  const alertContext = useMemo(() => {
    if (searchMode) {
      return {
        name: searchMode.query,
        lat: searchMode.lat,
        lon: searchMode.lon,
        district: searchMode.district,
      };
    }
    if (detectedCity) {
      return {
        name: detectedCity.name,
        lat: detectedCity.lat,
        lon: detectedCity.lon,
        district: detectedDistrict || "",
      };
    }
    return null;
  }, [searchMode, detectedCity, detectedDistrict]);

  useEffect(() => {
    if (!alertContext) return;
    const ctx = alertContext;

    const buildAlerts = async () => {
      const alerts: AppNotification[] = [];

      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(ctx.lat));
        url.searchParams.set("longitude", String(ctx.lon));
        url.searchParams.set(
          "current",
          "temperature_2m,precipitation,weather_code,wind_speed_10m"
        );
        url.searchParams.set("hourly", "precipitation_probability,precipitation");
        url.searchParams.set("forecast_days", "1");
        url.searchParams.set("timezone", "auto");

        const r = await fetch(url.toString(), { cache: "no-store" });
        const j = await r.json();

        const cur = j?.current || {};
        const code = cur.weather_code;
        const temp = cur.temperature_2m;
        const wind = cur.wind_speed_10m;
        const precipNow = cur.precipitation ?? 0;

        const hourlyProbs: number[] = j?.hourly?.precipitation_probability || [];
        const hourlyPrecip: number[] = j?.hourly?.precipitation || [];
        const hourlyTimes: string[] = j?.hourly?.time || [];

        const now = new Date();
        const currentHourISO = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours()
        )
          .toISOString()
          .slice(0, 13);
        const idx = hourlyTimes.findIndex((t) => t.startsWith(currentHourISO));
        const nextProbs = idx >= 0 ? hourlyProbs.slice(idx, idx + 3) : [];
        const nextPrecip = idx >= 0 ? hourlyPrecip.slice(idx, idx + 3) : [];
        const maxProb = nextProbs.length ? Math.max(...nextProbs) : 0;
        const anyRain = nextPrecip.some((p) => p > 0.2);

        const weatherDesc = weatherCodeToText(code);

        alerts.push({
          id: "weather-now",
          type: "weather",
          title: `Weather in ${ctx.name}`,
          message: `${weatherDesc}, ${Math.round(temp)}°C · wind ${Math.round(wind)} km/h.`,
          time: "Just now",
        });

        if (precipNow > 0.2 || (anyRain && maxProb >= 60)) {
          alerts.push({
            id: "weather-rain",
            type: "weather",
            title: "Rain expected soon",
            message: `Rain likely in the next 1–2 hours near ${ctx.name} (${maxProb}% chance) — trails may be slippery.`,
            time: "Just now",
          });
        } else if (maxProb >= 40) {
          alerts.push({
            id: "weather-chance",
            type: "weather",
            title: "Possible showers",
            message: `There is a ${maxProb}% chance of showers near ${ctx.name} in the next few hours.`,
            time: "Just now",
          });
        }

        if (wind >= 35) {
          alerts.push({
            id: "weather-wind",
            type: "safety",
            title: "Strong winds",
            message: `Winds around ${Math.round(wind)} km/h near ${ctx.name} — take care on viewpoints and beaches.`,
            time: "Just now",
          });
        }
      } catch { }

      try {
        const today = new Date();
        const active = FESTIVALS.filter((f) => inFestivalWindow(f, today));
        const relevant = active.filter(
          (f) => f.district === "All" || f.district.toLowerCase() === ctx.district.toLowerCase()
        );

        relevant.forEach((f, i) => {
          alerts.push({
            id: `event-${i}-${f.name}`,
            type: "event",
            title: `Festival: ${f.name}`,
            message: f.note,
            time: "Today",
          });
        });

        if (relevant.length === 0) {
          const upcoming = FESTIVALS.map((f) => {
            const y = today.getFullYear();
            const start = new Date(y, f.startMonth - 1, f.startDay);
            if (start < today) start.setFullYear(y + 1);
            return { f, start };
          }).sort((a, b) => a.start.getTime() - b.start.getTime())[0];

          if (upcoming) {
            const days = Math.round(
              (upcoming.start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (days <= 30) {
              alerts.push({
                id: `event-upcoming-${upcoming.f.name}`,
                type: "event",
                title: `Upcoming: ${upcoming.f.name}`,
                message: `In ${days} days in ${upcoming.f.district}. ${upcoming.f.note}`,
                time: "Upcoming",
              });
            }
          }
        }
      } catch { }

      const hr = new Date().getHours();
      if (hr >= 6 && hr <= 8) {
        alerts.push({
          id: "quiet-morning",
          type: "quiet",
          title: "Quiet window",
          message: `Early morning is usually the quietest time to visit popular spots in ${ctx.name}.`,
          time: "Just now",
        });
      } else if (hr >= 14 && hr <= 16) {
        alerts.push({
          id: "quiet-afternoon",
          type: "quiet",
          title: "Quiet window",
          message: `Mid-afternoon tends to be calmer than evenings near ${ctx.name}.`,
          time: "Just now",
        });
      }

      setNotifications(alerts);
    };

    buildAlerts();
    const iv = setInterval(buildAlerts, 10 * 60 * 1000);
    return () => clearInterval(iv);
  }, [alertContext?.lat, alertContext?.lon, alertContext?.district, alertContext?.name]);

  function weatherCodeToText(code?: number): string {
    if (code == null) return "Conditions unavailable";
    if (code === 0) return "Clear sky";
    if ([1, 2, 3].includes(code)) return "Partly cloudy";
    if ([45, 48].includes(code)) return "Foggy";
    if ([51, 53, 55].includes(code)) return "Drizzle";
    if ([61, 63, 65].includes(code)) return "Rain";
    if ([66, 67].includes(code)) return "Freezing rain";
    if ([71, 73, 75, 77].includes(code)) return "Snow";
    if ([80, 81, 82].includes(code)) return "Rain showers";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Mixed weather";
  }

  const fetchWikidataImageByCoords = async (
    lat: number,
    lon: number
  ): Promise<string | null> => {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("zoom", "16");
      url.searchParams.set("extratags", "1");

      const r = await fetch(url.toString(), {
        headers: { "Accept-Language": "en", "User-Agent": "CrowdPlaces/1.0" },
        cache: "no-store",
      });

      const j = await r.json();
      const qid = j?.extratags?.wikidata;
      if (!qid) return null;

      const wd = await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`,
        { cache: "no-store" }
      ).then((res) => res.json());

      const entity = wd?.entities?.[qid];
      const p18 = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (!p18) return null;

      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p18)}?width=1200`;
    } catch {
      return null;
    }
  };

  const fetchWikipediaGeoImage = async (lat: number, lon: number): Promise<any | null> => {
    try {
      const api = new URL("https://en.wikipedia.org/w/api.php");
      api.searchParams.set("action", "query");
      api.searchParams.set("format", "json");
      api.searchParams.set("origin", "*");
      api.searchParams.set("prop", "pageimages|coordinates");
      api.searchParams.set("generator", "geosearch");
      api.searchParams.set("ggscoord", `${lat}|${lon}`);
      api.searchParams.set("ggsradius", "10000");
      api.searchParams.set("ggslimit", "10");
      api.searchParams.set("pithumbsize", "1200");

      const resp = await fetch(api.toString(), { cache: "no-store" });
      const data = await resp.json();

      const pages = data?.query?.pages ? Object.values(data.query.pages as any) : [];
      const withThumb = pages.filter((p: any) => p?.thumbnail?.source);
      const pick = (withThumb[0] || pages[0]) as any;

      if (!pick) return null;

      let url = pick?.thumbnail?.source as string | undefined;
      if (url) url = url.replace(/^\/\//, "https://");

      if (url) return { url };
      return null;
    } catch {
      return null;
    }
  };

  const fetchImageByCoordsFirst = async (
    lat: number,
    lon: number,
    detectedName: string,
    addr: any
  ): Promise<string> => {
    const cacheKey = `img-geo-${lat.toFixed(4)},${lon.toFixed(4)}`;
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return cached;
      }

      const wd = await fetchWikidataImageByCoords(lat, lon);
      if (wd) {
        if (typeof window !== "undefined") localStorage.setItem(cacheKey, wd);
        return wd;
      }

      const geo = await fetchWikipediaGeoImage(lat, lon);
      if (geo?.url) {
        if (typeof window !== "undefined") localStorage.setItem(cacheKey, geo.url);
        return geo.url;
      }

      const named = await fetchPlaceImageByName(
        [detectedName, addr?.city, addr?.town, "Colombo"].filter(Boolean) as string[]
      );
      if (typeof window !== "undefined") localStorage.setItem(cacheKey, named);
      return named;
    } catch {
      return "/fallback.jpg";
    }
  };

  // Geolocation
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    setDetectingCity(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          const url = new URL("https://nominatim.openstreetmap.org/reverse");
          url.searchParams.set("format", "jsonv2");
          url.searchParams.set("lat", String(latitude));
          url.searchParams.set("lon", String(longitude));
          url.searchParams.set("extratags", "1");

          const r = await fetch(url.toString(), {
            headers: { "Accept-Language": "en", "User-Agent": "CrowdPlaces/1.0" },
            cache: "no-store",
          });

          const j = await r.json();
          const addr = j?.address || {};

          const cityName =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.suburb ||
            addr.state_district ||
            addr.county ||
            "Nearby City";

          const candidateDistrict: string =
            addr.state_district || addr.county || addr.region || "";
          const normalizedCandidate = candidateDistrict.replace(/ District$/i, "").trim();

          const knownDistrict = SRI_LANKA_DISTRICTS.find(
            (d) => d.name.toLowerCase() === normalizedCandidate.toLowerCase()
          );

          const district = knownDistrict
            ? knownDistrict.name
            : findNearestDistrict(latitude, longitude);
          setDetectedDistrict(district);

          const img = await fetchImageByCoordsFirst(latitude, longitude, cityName, addr);

          setDetectedCity({
            name: cityName,
            lat: latitude,
            lon: longitude,
            image: img,
            desc: j?.display_name || "",
          });
        } catch {
          setDetectedCity(null);
        } finally {
          setDetectingCity(false);
        }
      },
      () => {
        setDetectingCity(false);
        setDetectedCity(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // /api/crowd fetch
  useEffect(() => {
    const fetchColomboPlaces = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/crowd", { cache: "no-store" });
        if (!res.ok) throw new Error(`API returned status ${res.status}`);

        const data: Place[] = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          setPlaces([]);
          return;
        }

        const withImages = await Promise.all(
          data.map(async (p) => {
            const image = await fetchPlaceImageByName([p.name, "Colombo"]);
            return { ...p, image };
          })
        );

        setPlaces(withImages);
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchColomboPlaces();
  }, [UNSPLASH_KEY]);

  // SEARCH
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchMode(null);
      setLocation(detectedDistrict ? `${detectedDistrict} District` : "Colombo District");
      return;
    }

    setLoading(true);

    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}+Sri+Lanka`,
        { headers: { "Accept-Language": "en", "User-Agent": "CrowdPlaces/1.0" } }
      );

      const geoData = await geoRes.json();
      if (!geoData[0]) {
        setSearchMode(null);
        return;
      }

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);

      let district = findNearestDistrict(lat, lon);

      try {
        const rUrl = new URL("https://nominatim.openstreetmap.org/reverse");
        rUrl.searchParams.set("format", "jsonv2");
        rUrl.searchParams.set("lat", String(lat));
        rUrl.searchParams.set("lon", String(lon));
        const rRes = await fetch(rUrl.toString(), {
          headers: { "Accept-Language": "en", "User-Agent": "CrowdPlaces/1.0" },
          cache: "no-store",
        });
        const rJson = await rRes.json();
        const candidate = (rJson?.address?.state_district || rJson?.address?.county || "")
          .replace(/ District$/i, "")
          .trim();
        const known = SRI_LANKA_DISTRICTS.find(
          (d) => d.name.toLowerCase() === candidate.toLowerCase()
        );
        if (known) district = known.name;
      } catch { }

      setSearchMode({ query: q, district, lat, lon });
      setActiveCategory("all");
      setLocation(q);
    } catch {
      setSearchMode(null);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchMode(null);
    setLocation(detectedDistrict ? `${detectedDistrict} District` : "Colombo District");
  };

  // Push to details — includes dummy=1 flag for seed places
  const pushToDetails = (place: Place) => {
    const isDummy = place.id?.toString().startsWith("seed-") ? "1" : "0";

    const url =
      `/place/${place.id}` +
      `?name=${encodeURIComponent(place.name)}` +
      `&desc=${encodeURIComponent(place.description || "")}` +
      `&lat=${place.lat}` +
      `&lon=${place.lon}` +
      `&image=${encodeURIComponent(place.image || "/fallback.jpg")}` +
      `&busy=${encodeURIComponent(place.busyLevel || "")}` +
      `&confidence=${encodeURIComponent(String(place.confidence ?? ""))}` +
      `&updated=${encodeURIComponent(place.lastUpdated || "")}` +
      `&district=${encodeURIComponent(place.district || "")}` +
      `&category=${encodeURIComponent(place.category || "")}` +
      `&dummy=${isDummy}`;

    router.push(url);
  };

  const showDetectedCard = useMemo(
    () => !!detectedCity && !detectingCity && !searchMode,
    [detectedCity, detectingCity, searchMode]
  );

  const busyBadgeClass = (lvl?: string) => {
    const map: Record<string, string> = {
      Quiet: "bg-emerald-50 border-emerald-200 text-emerald-700",
      Moderate: "bg-sky-50 border-sky-200 text-sky-700",
      Busy: "bg-amber-50 border-amber-200 text-amber-700",
      "Very Busy": "bg-rose-50 border-rose-200 text-rose-700",
    };
    return map[lvl || ""] || "bg-gray-50 border-gray-200 text-gray-600";
  };

  const formatLastUpdated = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const diffMin = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
      if (diffMin < 60) return `Updated ${diffMin} min ago`;
      const h = Math.round(diffMin / 60);
      return `Updated ${h} hr ago`;
    } catch {
      return "";
    }
  };

  const notificationIcon = (t: AppNotification["type"]) => {
    const map: Record<AppNotification["type"], string> = {
      quiet: "🟢",
      peak: "⚠️",
      event: "🎉",
      weather: "🌧️",
      safety: "🛟",
    };
    return map[t];
  };

  const categories: { key: CategoryKey; label: string; icon: string }[] = [
    { key: "all", label: "All", icon: "✨" },
    { key: "historical", label: "Historical", icon: "🏛️" },
    { key: "religious", label: "Religious", icon: "🛕" },
    { key: "natural", label: "Natural", icon: "🌿" },
    { key: "food", label: "Food & Markets", icon: "🍜" },
    { key: "events", label: "Events", icon: "🎭" },
    { key: "hidden", label: "Hidden Gems", icon: "💎" },
  ];

  const bannerAlert = useMemo(
    () =>
      notifications.find((n) => n.type === "weather" && n.id !== "weather-now") ||
      notifications.find((n) => n.type === "safety"),
    [notifications]
  );

  const eventAlert = useMemo(() => notifications.find((n) => n.type === "event"), [notifications]);

  const saveDetectedBusyLevel = async () => {
    if (!detectedCity || !detectedBusy) return;
    setSavingFeedback(true);
    try {
      const now = new Date();
      const uid = user?.uid || "anonymous";
      const email = user?.email || null;

      const lastLocation = {
        name: detectedCity.name,
        lat: detectedCity.lat,
        lon: detectedCity.lon,
        image: detectedCity.image,
        desc: detectedCity.desc || "",
        busyLevel: detectedBusy,
        timestamp: now.getTime(),
        hour: `${now.getHours().toString().padStart(2, "0")}:00`,
        date: now.toISOString().slice(0, 10),
        district: detectedDistrict || null,
      };

      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, email, lastLocation }),
      });

      try {
        await fetch("/api/crowd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            placeName: detectedCity.name,
            lat: detectedCity.lat,
            lon: detectedCity.lon,
            busyLevel: detectedBusy,
            district: detectedDistrict || null,
            timestamp: now.toISOString(),
            source: "user_feedback",
          }),
        });
      } catch { }

      if (typeof window !== "undefined") {
        (window as any).__lastLocation = lastLocation;
      }

      setDetectedCity((prev) => (prev ? { ...prev, busyLevel: detectedBusy } : prev));
      setShowDetectedModal(false);
      setDetectedBusy("");
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSavingFeedback(false);
    }
  };

  const activeLocationLabel = searchMode
    ? `${searchMode.query} (${searchMode.district} District)`
    : detectedDistrict
      ? `${detectedDistrict} District`
      : null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-[#16a085]">Discover Places</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLanguageHelp(true)}
              className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
              title="Local language phrases"
              aria-label="Local language phrases"
            >
              <span className="text-sm">🈁</span>
            </button>

            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
              title="Notifications"
              aria-label="Notifications"
            >
              <span className="text-sm">🔔</span>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active location */}
        {activeLocationLabel && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <p className="text-xs text-gray-500">
              📍 Showing places near{" "}
              <span className="font-semibold text-gray-700">{activeLocationLabel}</span>
            </p>
            {searchMode && (
              <button
                onClick={clearSearch}
                className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              >
                Clear search ✕
              </button>
            )}
          </div>
        )}

        {/* Weather banner */}
        {bannerAlert && (
          <div className="mb-3 flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50">
            <span className="text-lg leading-none mt-0.5">{notificationIcon(bannerAlert.type)}</span>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900">{bannerAlert.title}</p>
              <p className="text-amber-800">{bannerAlert.message}</p>
            </div>
          </div>
        )}

        {/* Event chip */}
        {eventAlert && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 text-sm">
            <span>{notificationIcon(eventAlert.type)}</span>
            <span className="font-semibold text-fuchsia-900">{eventAlert.title}:</span>
            <span className="text-fuchsia-800 truncate">{eventAlert.message}</span>
          </div>
        )}

        {/* Search */}
        <div className="flex mb-4 gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Type city or place name..."
            className="flex-1 p-2 border text-gray-500 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a085]"
          />
          <button
            onClick={handleSearch}
            className="bg-[#16a085] text-white px-4 rounded-lg hover:bg-[#13856d]"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => router.push("/explore")}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs border border-[#16a085] bg-white text-[#16a085] hover:bg-[#16a085] hover:text-white transition"
          >
            🗺️ Live availability map
          </button>
          <button
            onClick={() => router.push("/routes")}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            🧭 Crowd-aware routes
          </button>
          <button
            onClick={() => router.push("/hidden-gems")}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            💎 Hidden gems
          </button>
          <button
            onClick={() => setShowNotifications(true)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            🔔 Alerts
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar">
          {categories.map((c) => {
            const active = activeCategory === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${active
                    ? "bg-[#16a085] border-[#16a085] text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <span className="mr-1">{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </div>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        {/* Hidden gems strip */}
        {hiddenGems.length > 0 && activeCategory === "all" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-700">💎 Hidden Gems</h2>
              <button
                onClick={() => router.push("/hidden-gems")}
                className="text-xs text-[#16a085] hover:underline"
              >
                See all
              </button>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
              {hiddenGems.map((place) => (
                <div
                  key={`gem-${place.id}-${place.lat}-${place.lon}`}
                  onClick={() => pushToDetails(place)}
                  className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100 relative"
                >
                  <div className="absolute top-2 left-2 z-10 text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white">
                    Hidden Gem
                  </div>
                  <div className="relative w-full h-36 overflow-hidden">
                    <Image
                      src={place.image || "/fallback.jpg"}
                      alt={place.name}
                      fill
                      sizes="240px"
                      className="object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-md text-gray-900 truncate">{place.name}</h3>
                      {place.busyLevel && (
                        <span
                          className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${busyBadgeClass(
                            place.busyLevel
                          )}`}
                        >
                          {place.busyLevel}
                        </span>
                      )}
                    </div>
                    {place.district && (
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{place.district}</p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500">
                      {typeof place.confidence === "number" && (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16a085]" />
                          {place.confidence}% confidence
                        </span>
                      )}
                      {place.lastUpdated && <span>{formatLastUpdated(place.lastUpdated)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main suggestions */}
        <h2 className="text-lg font-semibold text-gray-700 mb-2">
          Suggestions
          {activeCategory !== "all" && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              · {categories.find((c) => c.key === activeCategory)?.label}
            </span>
          )}
          {(searchMode || detectedDistrict) && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              in {searchMode ? searchMode.district : detectedDistrict}
            </span>
          )}
        </h2>

        <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
          {showDetectedCard && detectedCity && activeCategory === "all" && (
            <div
              key="detected-city"
              onClick={() => setShowDetectedModal(true)}
              className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer border border-gray-100"
            >
              <div className="relative w-full h-36 overflow-hidden">
                <Image
                  src={detectedCity.image || "/fallback.jpg"}
                  alt={detectedCity.name}
                  fill
                  sizes="240px"
                  className="object-cover hover:scale-105 transition-transform"
                />
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-md text-gray-900 truncate">{detectedCity.name}</h3>

                  {detectedCity.busyLevel && (
                    <span
                      className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border ${busyBadgeClass(
                        detectedCity.busyLevel
                      )}`}
                    >
                      {detectedCity.busyLevel}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {detectedCity.busyLevel
                    ? `You reported: ${detectedCity.busyLevel}`
                    : "Tap to report the busy level"}
                </p>
              </div>
            </div>
          )}

          {detectingCity && activeCategory === "all" && !searchMode && (
            <div className="w-60 flex-shrink-0 rounded-2xl bg-white border border-gray-100 shadow-md p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-36 bg-gray-200 rounded-xl" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          )}

          {filteredPlaces.length > 0 ? (
            filteredPlaces.map((place) => (
              <div
                key={`${place.id}-${place.lat}-${place.lon}`}
                onClick={() => pushToDetails(place)}
                className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
              >
                <div className="relative w-full h-36 overflow-hidden">
                  <Image
                    src={place.image || "/fallback.jpg"}
                    alt={place.name}
                    fill
                    sizes="240px"
                    className="object-cover hover:scale-105 transition-transform"
                  />
                  {place.isHiddenGem && (
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white">
                      Hidden Gem
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-md text-gray-900 truncate">{place.name}</h3>
                    {place.busyLevel && (
                      <span
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${busyBadgeClass(
                          place.busyLevel
                        )}`}
                      >
                        {place.busyLevel}
                      </span>
                    )}
                  </div>

                  {place.district && (
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{place.district}</p>
                  )}

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500">
                    {typeof place.confidence === "number" && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16a085]" />
                        {place.confidence}% confidence
                      </span>
                    )}
                    {place.lastUpdated && <span>{formatLastUpdated(place.lastUpdated)}</span>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            !detectingCity && (
              <p className="text-gray-500 mt-10 text-center flex-shrink-0">
                {activeCategory === "all"
                  ? "Detecting nearby places to visit..."
                  : `No ${categories.find((c) => c.key === activeCategory)?.label} found in this area yet.`}
              </p>
            )
          )}
        </div>

        {/* Detected city modal */}
        {showDetectedModal && detectedCity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{detectedCity.name}</h3>
                <button
                  className="text-gray-500 hover:text-gray-800"
                  onClick={() => setShowDetectedModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="rounded-xl overflow-hidden border mb-3">
                <div className="relative w-full h-40">
                  <Image
                    src={detectedCity.image || "/fallback.jpg"}
                    alt={detectedCity.name}
                    fill
                    sizes="400px"
                    className="object-cover"
                  />
                </div>
              </div>

              {detectedCity.desc && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{detectedCity.desc}</p>
              )}

              <p className="text-sm text-gray-600 mb-3">How busy is it right now?</p>

              <div className="grid grid-cols-2 gap-2">
                {(["Quiet", "Moderate", "Busy", "Very Busy"] as const).map((lvl) => {
                  const isActive = detectedBusy === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => setDetectedBusy(lvl)}
                      className={`px-3 py-2 rounded-lg border text-sm ${busyBadgeClass(lvl)} ${isActive ? "ring-2 ring-[#16a085]" : ""
                        }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  onClick={() => {
                    setShowDetectedModal(false);
                    setDetectedBusy("");
                  }}
                  className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                  disabled={savingFeedback}
                >
                  Cancel
                </button>

                <button
                  disabled={!detectedBusy || savingFeedback}
                  onClick={saveDetectedBusyLevel}
                  className={`px-4 py-2 rounded-md text-white ${detectedBusy && !savingFeedback
                      ? "bg-[#16a085] hover:bg-[#13856d]"
                      : "bg-gray-300 cursor-not-allowed"
                    }`}
                >
                  {savingFeedback ? "Saving..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications panel */}
        {showNotifications && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-end bg-black/40"
            onClick={() => setShowNotifications(false)}
          >
            <div
              className="bg-white w-full max-w-sm h-full shadow-xl p-5 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <button
                  className="text-gray-500 hover:text-gray-800"
                  onClick={() => setShowNotifications(false)}
                  aria-label="Close notifications"
                >
                  ✕
                </button>
              </div>

              {activeLocationLabel && (
                <p className="text-xs text-gray-500 mb-3">Live alerts for {activeLocationLabel}</p>
              )}

              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">You're all caught up.</p>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((n) => (
                    <li key={n.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none mt-0.5">{notificationIcon(n.type)}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                            <span className="text-[10px] text-gray-500">{n.time}</span>
                          </div>
                          <p className="text-xs text-gray-700 mt-0.5">{n.message}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-[10px] text-gray-400 mt-5">
                Alerts include quiet-time reminders, peak warnings, event/festival alerts, and live
                weather & safety updates.
              </p>
            </div>
          </div>
        )}

        {/* Language phrases modal */}
        {showLanguageHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowLanguageHelp(false)}
          >
            <div
              className="bg-white w-full max-w-md rounded-2xl shadow-xl p-5 m-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Local Phrases</h3>
                <button
                  className="text-gray-500 hover:text-gray-800"
                  onClick={() => setShowLanguageHelp(false)}
                  aria-label="Close language helper"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-3">
                A few handy Sinhala and Tamil phrases — useful when signage or menus aren't in
                English.
              </p>

              <div className="space-y-2">
                {LANGUAGE_PHRASES.map((p) => (
                  <div key={p.english} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
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