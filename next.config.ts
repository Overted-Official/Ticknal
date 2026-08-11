import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/metrics": ["./Data/psi_*best*.csv"],
    "/api/signals": ["./Data/psi_*best*.csv"],
  },
};

export default nextConfig;
