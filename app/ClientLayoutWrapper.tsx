"use client";

import React from "react";
import Navbar from "@/src/components/Navbar";
import { usePathname } from "next/navigation";

interface WrapperProps {
  children: React.ReactNode;
}

export default function ClientLayoutWrapper({ children }: WrapperProps) {
  const pathname = usePathname();
  const hide = ["/login", "/register"].includes(pathname);

  return (
    <>
      {!hide && <Navbar />}
      {children}
    </>
  );
}
