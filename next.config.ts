import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.lovesrilanka.org" },
      { protocol: "https", hostname: "www.saltinourhair.com" },
      { protocol: "https", hostname: "nexttravelsrilanka.com" },
      { protocol: "https", hostname: "resources.travellocal.com" },
      { protocol: "https", hostname: "dynamic-media-cdn.tripadvisor.com" },
      { protocol: "https", hostname: "www.sundayobserver.lk" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
