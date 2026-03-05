import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pino uses Node.js-only APIs (fs, os, streams). Externalize it so the
  // server-side bundle requires the native package instead of trying to
  // bundle it (which would fail on Edge Runtime or break in production).
  serverExternalPackages: ["pino", "pino-pretty"],
};

export default nextConfig;
