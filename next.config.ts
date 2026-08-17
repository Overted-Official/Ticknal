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
      "./src/strategies/PSI/data/**/*",
      "./Data/psi_*best*.csv",
      "./src/strategies/QuantumExhaustion-v2/deploy/**/*",
    ],
    "/api/signals": [
      "./src/strategies/PSI/data/**/*",
      "./Data/psi_*best*.csv",
      "./src/strategies/QuantumExhaustion-v2/deploy/**/*",
    ],
    "/api/predict": [
      "./src/tools/kronos/models/**/*.onnx",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/**/*.so*",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/**/*.node",
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
