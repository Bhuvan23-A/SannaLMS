import type { NextConfig } from "next";

// All admin UI API calls go to same-origin /api/... paths.
// These rewrites proxy them to Kong (the API gateway).
// - Inside the Docker network, "kong:8000" resolves to the Kong container.
// - For local development outside Docker, set KONG_INTERNAL_URL,
//   e.g. KONG_INTERNAL_URL=http://localhost:8010 in .env.local
const KONG_URL = process.env.KONG_INTERNAL_URL || "http://kong:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${KONG_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
