"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  image?: string;
  description?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [location, setLocation] = useState("Detecting...");
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const GOOGLE_CX = process.env.NEXT_PUBLIC_GOOGLE_CX_ID;
  const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  useEffect(() => {
    const detectNearby = async () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();
        const addr = data.address;
        const detectedDistrict =
          addr.district || addr.county || addr.state_district || addr.state || addr.city || "Sri Lanka";
        setLocation(detectedDistrict);

        const overpassQuery = `
          [out:json][timeout:25];
          (
            node["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:10000,${latitude},${longitude});
            way["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:10000,${latitude},${longitude});
            relation["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:10000,${latitude},${longitude});
          );
          out center tags;
        `;
        const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: overpassQuery,
        });
        const overpassData = await overpassRes.json();

        const loadedPlaces: Place[] = await Promise.all(
          overpassData.elements
            .filter((el: any) => el.tags?.name)
            .map(async (el: any, idx: number) => {
              const name = el.tags.name;
              let image: string | undefined;

              const cached = localStorage.getItem(`image-${name}`);
              if (cached) image = cached;

              if (!image && GOOGLE_KEY && GOOGLE_CX) {
                try {
                  const googleRes = await fetch(
                    `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
                      name + " Sri Lanka"
                    )}&cx=${GOOGLE_CX}&searchType=image&num=1&key=${GOOGLE_KEY}`
                  );
                  const googleData = await googleRes.json();
                  image = googleData.items?.[0]?.link;
                } catch {}
              }

              if (!image && UNSPLASH_KEY) {
                try {
                  const unsplashRes = await fetch(
                    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
                      name + " Sri Lanka"
                    )}&client_id=${UNSPLASH_KEY}&per_page=1`
                  );
                  const unsplashData = await unsplashRes.json();
                  image = unsplashData.results?.[0]?.urls?.regular;
                } catch {}
              }

              if (!image) image = "/fallback.jpg";
              localStorage.setItem(`image-${name}`, image);

              return {
                id: el.id?.toString() || idx.toString(),
                name,
                lat: el.lat || el.center?.lat,
                lon: el.lon || el.center?.lon,
                image,
                description: el.tags?.description || el.tags?.note || "",
              };
            })
        );

        setPlaces(loadedPlaces);
      });
    };

    detectNearby();
  }, [GOOGLE_KEY, GOOGLE_CX, UNSPLASH_KEY]);

  const handleSearch = async () => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}+Sri+Lanka`
      );
      const geoData = await geoRes.json();
      if (!geoData[0]) {
        setSearchResults([]);
        setLoading(false);
        return;
      }
      const { lat, lon } = geoData[0];

      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:20000,${lat},${lon});
          way["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:20000,${lat},${lon});
          relation["tourism"~"attraction|museum|zoo|theme_park|viewpoint"](around:20000,${lat},${lon});
        );
        out center tags;
      `;
      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
      });
      const overpassData = await overpassRes.json();

      const results: Place[] = await Promise.all(
        overpassData.elements
          .filter((el: any) => el.tags?.name)
          .map(async (el: any, idx: number) => {
            const name = el.tags.name;
            let image: string | undefined;

            const cached = localStorage.getItem(`image-${name}`);
            if (cached) image = cached;

            if (!image && GOOGLE_KEY && GOOGLE_CX) {
              try {
                const googleRes = await fetch(
                  `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
                    name + " Sri Lanka"
                  )}&cx=${GOOGLE_CX}&searchType=image&num=1&key=${GOOGLE_KEY}`
                );
                const googleData = await googleRes.json();
                image = googleData.items?.[0]?.link;
              } catch {}
            }

            if (!image && UNSPLASH_KEY) {
              try {
                const unsplashRes = await fetch(
                  `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
                    name + " Sri Lanka"
                  )}&client_id=${UNSPLASH_KEY}&per_page=1`
                );
                const unsplashData = await unsplashRes.json();
                image = unsplashData.results?.[0]?.urls?.regular;
              } catch {}
            }

            if (!image) image = "/fallback.jpg";
            localStorage.setItem(`image-${name}`, image);

            return {
              id: el.id?.toString() || idx.toString(),
              name,
              lat: el.lat || el.center?.lat,
              lon: el.lon || el.center?.lon,
              image,
              description: el.tags?.description || el.tags?.note || "",
            };
          })
      );

      setSearchResults(results);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <h1 className="text-xl font-bold text-[#16a085] mb-3">Discover Places</h1>

      <div className="flex mb-4 gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type city or place name..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a085]"
        />
        <button
          onClick={handleSearch}
          className="bg-[#16a085] text-white px-4 rounded-lg hover:bg-[#13856d]"
        >
          Search
        </button>
      </div>

      {loading && <p className="text-gray-500 mb-2">Loading popular places...</p>}
      {searchResults.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-2">Popular Places:</h2>
          <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
            {searchResults.map((place) => (
              <div
                key={place.id}
                onClick={() =>
                  router.push(
                    `/place/${place.id}?lat=${place.lat}&lon=${place.lon}&image=${encodeURIComponent(
                      place.image || ""
                    )}`
                  )
                }
                className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
              >
                <div className="w-full h-36 overflow-hidden">
                  <Image
                    src={place.image || "/fallback.jpg"}
                    alt={place.name}
                    width={240}
                    height={144}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-md text-gray-900 truncate">{place.name}</h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {place.description || "A beautiful place to visit."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        Suggestions Near You ({location})
      </h2>
      {places.length > 0 ? (
        <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
          {places.map((place) => (
            <div
              key={place.id}
              onClick={() =>
                router.push(
                  `/place/${place.id}?lat=${place.lat}&lon=${place.lon}&image=${encodeURIComponent(
                    place.image || ""
                  )}`
                )
              }
              className="bg-white w-60 flex-shrink-0 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
            >
              <div className="w-full h-36 overflow-hidden">
                <Image
                  src={place.image || "/fallback.jpg"}
                  alt={place.name}
                  width={240}
                  height={144}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="p-3">
                <h3 className="font-bold text-md text-gray-900 truncate">{place.name}</h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {place.description || "A beautiful place to visit near you."}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 mt-10 text-center">
          Detecting nearby places to visit...
        </p>
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
