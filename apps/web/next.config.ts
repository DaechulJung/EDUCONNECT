import type { NextConfig } from "next";

// /api/* goes to FastAPI: localhost:8000 in development (`npm run dev:api`), the api container in compose.
// Rewrites are fixed at build time, so the container build passes API_URL (apps/web/Dockerfile).
const apiUrl = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
