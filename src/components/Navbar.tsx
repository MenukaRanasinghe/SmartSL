"use client";

import { MapPin, Bell, User, Home, Compass, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const tabs = [
  { name: "Home", path: "/home", icon: <Home className="w-5 h-5" /> },
  { name: "Explore", path: "/explore", icon: <Compass className="w-5 h-5" /> },
  { name: "Profile", path: "/profile", icon: <UserCircle className="w-5 h-5" /> },
];

export default function Navbar() {
  const pathname = usePathname();
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
    <>
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

      <nav className="fixed bottom-0 left-0 w-full bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.1)] border-t border-gray-100 flex justify-around py-2 z-50">
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center justify-center text-xs font-medium transition-colors ${
                active ? "text-[#16a085]" : "text-gray-500"
              }`}
            >
              <div className="mb-1">{tab.icon}</div>
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
