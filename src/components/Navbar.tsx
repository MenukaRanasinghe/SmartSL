"use client";

import { MapPin, Bell, User } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [location, setLocation] = useState<string>("Detecting...");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.state ||
            "Unknown location";
          setLocation(city);
        },
        () => setLocation("Location unavailable")
      );
    } else {
      setLocation("Geolocation not supported");
    }
  }, []);

  return (
    <header
      className="w-full flex items-center justify-between px-4 py-3 shadow-md text-white"
      style={{ backgroundColor: "#16a085" }}
    >
      <User className="w-7 h-7" />

      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        <p className="text-base font-medium">{location}</p>
      </div>

      <Bell className="w-6 h-6" />
    </header>
  );
}
