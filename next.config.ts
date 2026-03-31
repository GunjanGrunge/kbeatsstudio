import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
