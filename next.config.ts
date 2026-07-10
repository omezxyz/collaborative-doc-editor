import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // This satisfies Next.js 16's requirement and silences the build error
  // while allowing the Webpack-based PWA plugin to work perfectly.
  turbopack: {},
};

export default withPWA(nextConfig);