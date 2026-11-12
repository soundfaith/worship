import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.133"],
  cacheComponents: true,
  images: {
    localPatterns: [
      { pathname: "/api/images" },
      { pathname: "**", search: "" },
    ],
  },
  outputFileTracingIncludes: {
    "/api/songs": ["./data/songs.json"],
    "/api/images": ["./assets/backgrounds/**/*"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
