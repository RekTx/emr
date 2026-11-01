import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce memory and process footprint for Hostinger shared hosting
  experimental: {
    // Limit the number of workers used during builds
    workerThreads: false,
    cpus: 1,
  },
  // Disable source maps in production to reduce memory usage
  productionBrowserSourceMaps: false,
  // Disable powered-by header
  poweredByHeader: false,
  // Reduce image optimization memory usage
  images: {
    // Disable the default image optimization API (saves a worker process)
    unoptimized: true,
  },
};

export default nextConfig;
