import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.225"],
  transpilePackages: [
    "remotion",
    "@remotion/player",
    "@remotion/media-utils",
    "@remotion/google-fonts",
  ],
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "@remotion/lambda",
    "@remotion/cli",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
