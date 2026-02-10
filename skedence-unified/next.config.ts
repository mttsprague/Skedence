import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Allow fallback behavior for dynamic routes
  trailingSlash: true,
};

export default nextConfig;
