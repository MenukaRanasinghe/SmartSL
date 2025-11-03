"use client";

import Navbar from "@/src/components/Navbar";
import { usePathname } from "next/navigation";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideLayout = ["/login", "/register"].includes(pathname);

  return (
    <html lang="en">
      <body>
        {!hideLayout && <Navbar />}
        {children}
      </body>
    </html>
  );
}
