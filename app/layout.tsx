"use client";

import "./globals.css";
import Navbar from "@/src/components/Navbar";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  return (
    <html lang="en">
      <body className={isLandingPage ? "bg-transparent" : "min-h-screen bg-gray-50"}>
        {!isLandingPage && <Navbar />}
        <main>{children}</main>
      </body>
    </html>
  );
}
