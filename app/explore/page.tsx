"use client";

import { useEffect, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useLoadScript } from "@react-google-maps/api";

type BusyLevel = "Quiet" | "Moderate" | "Busy" | "Very Busy";

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  busyLevel: BusyLevel;
}

const containerStyle = { width: "100%", height: "70vh" };

const textColors: Record<BusyLevel, string> = {
  Quiet: "#16a34a",       
  Moderate: "#eab308",    
  Busy: "#f97316",        
  "Very Busy": "#dc2626", 
};

const pinIcons: Record<BusyLevel, string> = {
  Quiet: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  Moderate: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
  Busy: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
  "Very Busy": "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
};

export default function ExplorePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: ["places"],
  });

  useEffect(() => {
    if (!isLoaded) return;

    const fetchPlaces = async () => {
      try {
        const res = await fetch("/api/places");
        const data: Place[] = await res.json();
        setPlaces(data.filter((p) => p.lat && p.lon));
      } catch (err) {
        console.error("❌ Error fetching places:", err);
      }
    };

    fetchPlaces();
  }, [isLoaded]);

  if (loadError) return <div>❌ Map failed to load</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-32">
      <h1 className="text-2xl font-bold text-[#222222] mb-4 text-center mt-6">
        Live Availability
      </h1>

      <div className="mx-4 rounded-2xl overflow-hidden shadow-md">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={{ lat: 7.8731, lng: 80.7718 }}
          zoom={8}
        >
          {places.map((place) => (
            <Marker
              key={place.id}
              position={{ lat: place.lat, lng: place.lon }}
              title={`${place.name}: ${place.busyLevel}`}
              icon={{
                url: pinIcons[place.busyLevel],
                scaledSize: new google.maps.Size(34, 34),
              }}
              onClick={() => setSelected(place)}
            />
          ))}

          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lon }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="text-sm">
                <h3 className="font-bold text-[#16a085]">{selected.name}</h3>
                <p style={{ color: textColors[selected.busyLevel], fontWeight: "bold" }}>
                  Crowd Level: {selected.busyLevel}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div className="mt-5 mx-6 bg-white rounded-xl shadow-md p-4">
        <h2 className="text-md font-semibold text-gray-900 mb-3">
          Crowd Level Legend
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-800">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 bg-green-500 rounded-full"></span>
            <span>Quiet</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 bg-yellow-400 rounded-full"></span>
            <span>Moderate</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 bg-orange-500 rounded-full"></span>
            <span>Busy</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 bg-red-600 rounded-full"></span>
            <span>Very Busy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
