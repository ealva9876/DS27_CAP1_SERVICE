import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Publish/preview and local tools often hit 127.0.0.1 while `next dev`
  // binds as localhost; without this, client bundles/HMR are blocked.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
