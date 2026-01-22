import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Remove basePath since we're deploying to root domain
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
