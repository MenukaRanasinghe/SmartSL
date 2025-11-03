"use client";

import { usePathname } from "next/navigation";
import "leaflet/dist/leaflet.css";


import "./globals.css";
import Navbar from "@/src/components/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideLayout = ["/login", "/register", "/"].includes(pathname);

  return (
    <html lang="en">
      <body>
        {!hideLayout && <Navbar />}
        {children}
      </body>
    </html>
  );
}
