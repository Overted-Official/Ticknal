import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/metrics": [
      "./Data/psi_*best*.csv",
      "./src/strategies/QuantumExhaustion-v2/deploy/**/*",
    ],
    "/api/signals": [
      "./Data/psi_*best*.csv",
      "./src/strategies/QuantumExhaustion-v2/deploy/**/*",
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
