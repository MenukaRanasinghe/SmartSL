"use client";

import { MapPin, User, Home, Compass, UserCircle, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const tabs = [
  { name: "Home", path: "/home", icon: <Home className="w-5 h-5" /> },
  { name: "Explore", path: "/explore", icon: <Compass className="w-5 h-5" /> },
  { name: "Profile", path: "/profile", icon: <UserCircle className="w-5 h-5" /> },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [location, setLocation] = useState<string>("Detecting...");
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocation("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();

          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.state ||
            "Unknown location";

          setLocation(city);
        } catch {
          setLocation("Location unavailable");
        }
      },
      () => setLocation("Location unavailable")
    );
  }, []);

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);

      await fetch("/api/logout", {
        method: "POST",
      });

      router.replace("/login");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoggingOut(false);
      setShowLogout(false);
    }
  };

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

        <button
          type="button"
          onClick={() => setShowLogout(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          aria-haspopup="dialog"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
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

      {showLogout && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Confirm</h3>
              <button
                aria-label="Close"
                onClick={() => setShowLogout(false)}
                className="text-gray-500 hover:text-gray-800 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to log out?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 pb-4">
              <button
                onClick={() => setShowLogout(false)}
                className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                disabled={loggingOut}
              >
                Cancel
              </button>

              <button
                onClick={confirmLogout}
                className={`px-4 py-2 rounded-md text-white text-sm ${
                  loggingOut ? "bg-gray-300" : "bg-[#16a085] hover:bg-[#13856d]"
                }`}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
