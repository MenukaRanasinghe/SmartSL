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
     domains: [
      "upload.wikimedia.org",
      "dynamic-media-cdn.tripadvisor.com",
      "media-cdn.tripadvisor.com",
      "www.lovesrilanka.org",
      "nexttravelsrilanka.com",
      "www.saltinourhair.com",
      "resources.travellocal.com",
      "www.sundayobserver.lk",
      "www.liigo.world",
      "encrypted-tbn0.gstatic.com",
      "lh3.googleusercontent.com",
      "images.unsplash.com",
      "cdn.britannica.com",
      "static.toiimg.com",
      "assets.simpleviewinc.com",
    ],
    unoptimized: true,
  },
  output: "export",
};

export default nextConfig;
