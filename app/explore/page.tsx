"use client";

import { useEffect, useState } from "react";
import { GoogleMap, useLoadScript, OverlayView } from "@react-google-maps/api";

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  busyLevel: "Busy" | "Moderate" | "Quiet";
}

const containerStyle = {
  width: "100%",
  height: "70vh",
};

const baseIconUrl = "https://img.icons8.com/?size=100&id=86816&format=png&color=000000";

const textColors = {
  Busy: "red",
  Moderate: "orange",
  Quiet: "blue",
};

const iconFilters = {
  Busy: "invert(21%) sepia(97%) saturate(7485%) hue-rotate(358deg) brightness(90%) contrast(90%)",
  Moderate: "invert(89%) sepia(7%) saturate(7443%) hue-rotate(357deg) brightness(100%) contrast(100%)",
  Quiet: "invert(33%) sepia(78%) saturate(3355%) hue-rotate(200deg) brightness(95%) contrast(90%)",
};

export default function ExplorePage() {
  const [userLocation, setUserLocation] = useState({ lat: 7.8731, lng: 80.7718 });
  const [places, setPlaces] = useState<Place[]>([]);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    setPlaces([
      { id: "1", name: "Colombo City", lat: 6.9271, lon: 79.8612, busyLevel: "Busy" },
      { id: "2", name: "Galle Fort", lat: 6.0326, lon: 80.2160, busyLevel: "Moderate" },
      { id: "3", name: "Sigiriya", lat: 7.9576, lon: 80.7603, busyLevel: "Quiet" },
      { id: "4", name: "Nuwara Eliya", lat: 6.9497, lon: 80.7890, busyLevel: "Moderate" },
    ]);
  }, []);

  if (!isLoaded) return <div className="text-center p-10">Loading Map...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-32">
      <h1 className="text-xl font-bold text-[#16a085] mb-4 text-center mt-4">Explore Map</h1>

      <div className="mx-4 rounded-2xl overflow-hidden shadow-md">
        <GoogleMap mapContainerStyle={containerStyle} center={userLocation} zoom={7}>
          {places.map((place) => (
            <OverlayView
              key={place.id}
              position={{ lat: place.lat, lng: place.lon }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(width, height) => ({
                x: -width / 2,
                y: -height / 2,
              })}
            >
              <div className="flex flex-col items-center">
                <span
                  style={{
                    color: textColors[place.busyLevel],
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                >
                  {place.busyLevel}
                </span>
                <img
                  src={baseIconUrl}
                  alt={place.name}
                  style={{
                    width: 28,
                    height: 28,
                    filter: iconFilters[place.busyLevel],
                  }}
                />
              </div>
            </OverlayView>
          ))}
        </GoogleMap>
      </div>

      <div className="flex justify-center mt-4 space-x-6">
        {(["Busy", "Moderate", "Quiet"] as const).map((level) => (
          <div key={level} className="flex items-center space-x-2">
            <img
              src={baseIconUrl}
              alt={level}
              style={{ width: 20, height: 20, filter: iconFilters[level] }}
            />
            <span
              style={{
                color: textColors[level],
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              {level}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white border-t border-gray-200 flex justify-around p-3 fixed bottom-0 w-full">
        <a href="/home" className="flex flex-col items-center text-gray-600 hover:text-[#16a085]">
          <span>🏠</span>
          <span className="text-xs">Home</span>
        </a>
        <a href="/explore" className="flex flex-col items-center text-[#16a085] font-semibold">
          <span>🗺️</span>
          <span className="text-xs">Explore</span>
        </a>
        <a href="/profile" className="flex flex-col items-center text-gray-600 hover:text-[#16a085]">
          <span>👤</span>
          <span className="text-xs">Profile</span>
        </a>
      </div>
    </div>
  );
}
