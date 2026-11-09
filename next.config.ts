import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.133"],
  cacheComponents: true,
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
