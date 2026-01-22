import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/admin-portal',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
