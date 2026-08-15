/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["onnxruntime-node"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "framerusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.framerusercontent.com",
        pathname: "/**",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/api/metrics": [
      "./Data/psi_*best*.csv",
      "./src/strategies/QuantumExhaustion-v2/deploy/**/*",
    ],
    "/api/signals": [
      "./Data/psi_*best*.csv",
      "./src/strategies/QuantumExhaustion-v2/deploy/**/*",
    ],
    "/api/predict": [
      "./src/tools/kronos/models/**/*.onnx",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/**/*.so*",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/**/*.node",
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
